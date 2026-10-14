-- =====================================================
-- AOM 001 · Torneo de los Dioses (Age of Mythology), /aom/x7k2/
--
-- Vive en el proyecto de Supabase de Rally (xnyhgikcrzalzquzlzyu), aislado
-- en su propio esquema `aom`, que PostgREST no expone: nadie lee ni escribe
-- las tablas directo. El navegador solo tiene dos puertas, ambas
-- SECURITY DEFINER y llamadas con la llave publicable:
--
--   public.aom_inscribir(...)  da de alta (o actualiza, por teléfono) a un
--                              jugador con sus horarios. Valida y limita.
--   public.aom_publico()       lo que la página muestra: gamertags, partidas
--                              y horarios en común de las partidas por jugar.
--                              NUNCA devuelve teléfonos.
--
-- Organizar (armar la liga, agendar, capturar resultados) se hace por ahora
-- con SQL desde el panel o pidiéndoselo a Claude:
--   select aom.generar_liga();                           -- todos contra todos
--   update aom.partidas set programada_para = '2026-10-21 21:00-06',
--          estado = 'confirmada' where id = '...';
--   update aom.partidas set ganador = '<id>', estado = 'jugada' where id = '...';
--   update aom.config set grupo_url = 'https://chat.whatsapp.com/...';
--
-- disponibilidad: {"0":[9,10,11], ..., "6":[]}  día 0 = lunes, 6 = domingo;
-- cada número es la hora en que empieza un bloque de 1 h (7 = 7:00–8:00,
-- 24 = 0:00–1:00). Hora del centro de México.
-- =====================================================

CREATE SCHEMA IF NOT EXISTS aom;
REVOKE ALL ON SCHEMA aom FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS aom.config (
  id                  int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  grupo_url           text CHECK (grupo_url IS NULL OR grupo_url ~ '^https://chat\.whatsapp\.com/[A-Za-z0-9]+$'),
  cierre_inscripcion  date,
  inicio_liga         date
);
INSERT INTO aom.config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS aom.jugadores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  gamertag        text NOT NULL CHECK (length(gamertag) BETWEEN 2 AND 32),
  telefono        text NOT NULL UNIQUE CHECK (telefono ~ '^[0-9]{10}$'),
  en_grupo        boolean NOT NULL,
  disponibilidad  jsonb NOT NULL,
  activo          boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS jugadores_gamertag_uq ON aom.jugadores (lower(gamertag));

CREATE TABLE IF NOT EXISTS aom.partidas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  fase             text NOT NULL CHECK (fase IN ('liga', 'cuartos', 'semi', 'final')),
  jornada          int,
  jugador_a        uuid NOT NULL REFERENCES aom.jugadores(id),
  jugador_b        uuid NOT NULL REFERENCES aom.jugadores(id),
  programada_para  timestamptz,
  estado           text NOT NULL DEFAULT 'por_agendar'
                   CHECK (estado IN ('por_agendar', 'por_confirmar', 'confirmada', 'jugada')),
  ganador          uuid REFERENCES aom.jugadores(id),
  nota             text CHECK (nota IS NULL OR length(nota) <= 200),
  CHECK (jugador_a <> jugador_b),
  CHECK (ganador IS NULL OR ganador IN (jugador_a, jugador_b)),
  CHECK ((estado = 'jugada') = (ganador IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS partidas_liga_uq
  ON aom.partidas (least(jugador_a, jugador_b), greatest(jugador_a, jugador_b))
  WHERE fase = 'liga';

ALTER TABLE aom.config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aom.jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE aom.partidas  ENABLE ROW LEVEL SECURITY;

-- ¿El JSON de horarios tiene la forma correcta? Devuelve las horas marcadas
-- (o -1 si está mal formado).
CREATE OR REPLACE FUNCTION aom.contar_horas(p jsonb)
RETURNS int LANGUAGE plpgsql IMMUTABLE SET search_path = ''
AS $$
DECLARE
  k text; v jsonb; e jsonb; total int := 0;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN RETURN -1; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(p) LOOP
    IF k !~ '^[0-6]$' OR jsonb_typeof(v) <> 'array' OR jsonb_array_length(v) > 18 THEN RETURN -1; END IF;
    FOR e IN SELECT * FROM jsonb_array_elements(v) LOOP
      IF jsonb_typeof(e) <> 'number' OR (e #>> '{}') !~ '^([7-9]|1[0-9]|2[0-4])$' THEN RETURN -1; END IF;
      total := total + 1;
    END LOOP;
  END LOOP;
  RETURN total;
END;
$$;

-- Horas que dos jugadores tienen en común: {"0":[20,21], "4":[9]}
CREATE OR REPLACE FUNCTION aom.comun(a jsonb, b jsonb)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT coalesce(jsonb_object_agg(t.dia, t.horas), '{}'::jsonb)
  FROM (
    SELECT d.dia::text AS dia, jsonb_agg(h.hora ORDER BY h.hora) AS horas
    FROM generate_series(0, 6) AS d(dia)
    CROSS JOIN LATERAL (
      SELECT x::int AS hora FROM jsonb_array_elements_text(coalesce(a -> d.dia::text, '[]'::jsonb)) AS x
      INTERSECT
      SELECT y::int FROM jsonb_array_elements_text(coalesce(b -> d.dia::text, '[]'::jsonb)) AS y
    ) AS h
    GROUP BY d.dia
  ) AS t;
$$;

CREATE OR REPLACE FUNCTION public.aom_inscribir(
  p_gamertag text, p_telefono text, p_en_grupo boolean, p_disponibilidad jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_tag text := btrim(regexp_replace(coalesce(p_gamertag, ''), '\s+', ' ', 'g'));
  v_tel text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
  v_horas int;
  v_existe uuid;
  v_cierre date;
BEGIN
  IF length(v_tel) = 12 AND left(v_tel, 2) = '52' THEN v_tel := substr(v_tel, 3); END IF;
  IF length(v_tag) NOT BETWEEN 2 AND 32 THEN RETURN jsonb_build_object('ok', false, 'error', 'gamertag'); END IF;
  IF v_tel !~ '^[0-9]{10}$' THEN RETURN jsonb_build_object('ok', false, 'error', 'telefono'); END IF;
  IF p_en_grupo IS NOT TRUE THEN RETURN jsonb_build_object('ok', false, 'error', 'grupo'); END IF;
  v_horas := aom.contar_horas(p_disponibilidad);
  IF v_horas < 3 THEN RETURN jsonb_build_object('ok', false, 'error', 'horarios'); END IF;

  IF (SELECT count(*) FROM aom.jugadores WHERE updated_at > now() - interval '10 minutes') >= 40 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ritmo');
  END IF;

  SELECT id INTO v_existe FROM aom.jugadores WHERE telefono = v_tel;

  IF v_existe IS NULL THEN
    SELECT cierre_inscripcion INTO v_cierre FROM aom.config WHERE id = 1;
    IF v_cierre IS NOT NULL AND (now() AT TIME ZONE 'America/Mexico_City')::date > v_cierre THEN
      RETURN jsonb_build_object('ok', false, 'error', 'cerrado');
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM aom.jugadores
             WHERE lower(gamertag) = lower(v_tag) AND telefono <> v_tel) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'gamertag_ocupado');
  END IF;

  INSERT INTO aom.jugadores (gamertag, telefono, en_grupo, disponibilidad)
  VALUES (v_tag, v_tel, true, p_disponibilidad)
  ON CONFLICT (telefono) DO UPDATE
    SET gamertag = EXCLUDED.gamertag,
        en_grupo = true,
        disponibilidad = EXCLUDED.disponibilidad,
        activo = true,
        updated_at = now();

  RETURN jsonb_build_object('ok', true, 'nuevo', v_existe IS NULL, 'gamertag', v_tag);
END;
$$;
REVOKE ALL ON FUNCTION public.aom_inscribir(text, text, boolean, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aom_inscribir(text, text, boolean, jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.aom_publico()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'config', (SELECT jsonb_build_object(
                 'grupo_url', c.grupo_url,
                 'cierre_inscripcion', c.cierre_inscripcion,
                 'inicio_liga', c.inicio_liga)
               FROM aom.config c WHERE c.id = 1),
    'jugadores', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', j.id, 'gamertag', j.gamertag) ORDER BY j.created_at)
      FROM aom.jugadores j WHERE j.activo), '[]'::jsonb),
    'partidas', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'id', p.id, 'fase', p.fase, 'jornada', p.jornada,
               'a', p.jugador_a, 'b', p.jugador_b,
               'programada_para', p.programada_para,
               'estado', p.estado, 'ganador', p.ganador, 'nota', p.nota,
               'comun', CASE WHEN p.estado = 'jugada' THEN NULL
                             ELSE aom.comun(ja.disponibilidad, jb.disponibilidad) END)
             ORDER BY p.programada_para NULLS LAST, p.jornada NULLS LAST, p.created_at)
      FROM aom.partidas p
      JOIN aom.jugadores ja ON ja.id = p.jugador_a
      JOIN aom.jugadores jb ON jb.id = p.jugador_b), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.aom_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.aom_publico() TO anon, authenticated;

-- Arma todos contra todos (método del círculo) con los jugadores activos.
-- Solo para el organizador; no se expone. No duplica partidas ya creadas.
CREATE OR REPLACE FUNCTION aom.generar_liga()
RETURNS int LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  ids uuid[];
  n int; r int; i int; a uuid; b uuid; creadas int := 0;
  rot uuid[];
BEGIN
  SELECT array_agg(id ORDER BY random()) INTO ids FROM aom.jugadores WHERE activo;
  n := coalesce(array_length(ids, 1), 0);
  IF n < 2 THEN RETURN 0; END IF;
  IF n % 2 = 1 THEN ids := ids || NULL::uuid; n := n + 1; END IF;
  rot := ids;
  FOR r IN 1 .. n - 1 LOOP
    FOR i IN 1 .. n / 2 LOOP
      a := rot[i]; b := rot[n + 1 - i];
      IF a IS NOT NULL AND b IS NOT NULL THEN
        INSERT INTO aom.partidas (fase, jornada, jugador_a, jugador_b)
        VALUES ('liga', r, a, b)
        ON CONFLICT DO NOTHING;
        IF FOUND THEN creadas := creadas + 1; END IF;
      END IF;
    END LOOP;
    rot := ARRAY[rot[1]] || ARRAY[rot[n]] || rot[2:n - 1];
  END LOOP;
  RETURN creadas;
END;
$$;
REVOKE ALL ON FUNCTION aom.generar_liga() FROM PUBLIC, anon, authenticated;
