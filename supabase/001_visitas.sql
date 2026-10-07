-- =====================================================
-- 001 · Visitas de bodgar.dev (/, /es/, /plataformas/)
--
-- Vive en el proyecto de Supabase de Pasas (uxtmdhbqiphvmixtxlox) pero en
-- su propio esquema, `bodgar_dev`, que PostgREST no expone: nadie lee ni
-- escribe la tabla directo. Solo hay dos puertas, ambas SECURITY DEFINER:
--
--   public.bodgardev_registrar(...)  la llama el navegador con la llave
--                                    publicable; valida y limita el ritmo.
--   public.bodgardev_resumen(clave)  la llama /stats/; sin la clave correcta
--                                    no devuelve nada.
--
-- Sin datos personales: el visitante es un id anónimo que genera su
-- navegador. `ref` es el código que va en el enlace del correo frío
-- (?r=...), para saber qué destinatario abrió la página.
--
-- La clave de /stats/ NO está en este archivo: se guarda aparte su sha256
--   insert into bodgar_dev.config (clave_sha256)
--   values (encode(extensions.digest('<clave>', 'sha256'), 'hex'));
-- =====================================================

CREATE SCHEMA IF NOT EXISTS bodgar_dev;
REVOKE ALL ON SCHEMA bodgar_dev FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS bodgar_dev.eventos (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  anon_id     text NOT NULL CHECK (length(anon_id) BETWEEN 8 AND 64),
  sesion_id   text NOT NULL CHECK (length(sesion_id) BETWEEN 8 AND 64),
  pagina      text NOT NULL CHECK (pagina IN ('/', '/es/', '/plataformas/')),
  -- vista    abrió la página
  -- seccion  una sección entró en pantalla (detalle = id de la sección)
  -- scroll   pasó el 25/50/75/100 % de la página
  -- clic     tocó un botón o enlace marcado (detalle = id del botón)
  -- tiempo   segundos visibles acumulados al salir o cambiar de pestaña
  evento      text NOT NULL CHECK (evento IN ('vista', 'seccion', 'scroll', 'clic', 'tiempo')),
  detalle     text CHECK (length(detalle) <= 80),
  ref         text CHECK (length(ref) <= 40),
  fuente      text CHECK (length(fuente) <= 60),
  referer     text CHECK (length(referer) <= 120),
  movil       boolean,
  zona        text CHECK (length(zona) <= 60),
  interno     boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_bd_eventos_created ON bodgar_dev.eventos (created_at);
CREATE INDEX IF NOT EXISTS idx_bd_eventos_sesion  ON bodgar_dev.eventos (sesion_id);
CREATE INDEX IF NOT EXISTS idx_bd_eventos_anon    ON bodgar_dev.eventos (anon_id, created_at);
CREATE INDEX IF NOT EXISTS idx_bd_eventos_ref     ON bodgar_dev.eventos (ref) WHERE ref IS NOT NULL;

ALTER TABLE bodgar_dev.eventos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS bodgar_dev.config (
  id            boolean PRIMARY KEY DEFAULT true CHECK (id),
  clave_sha256  text NOT NULL
);
ALTER TABLE bodgar_dev.config ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────
-- Registrar un evento. Devuelve false si algo no cuadra (no lanza error:
-- el navegador no tiene nada que hacer con él).
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bodgardev_registrar(
  p_anon_id   text,
  p_sesion_id text,
  p_pagina    text,
  p_evento    text,
  p_detalle   text    DEFAULT NULL,
  p_ref       text    DEFAULT NULL,
  p_fuente    text    DEFAULT NULL,
  p_referer   text    DEFAULT NULL,
  p_movil     boolean DEFAULT NULL,
  p_zona      text    DEFAULT NULL,
  p_interno   boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF length(coalesce(p_anon_id, '')) NOT BETWEEN 8 AND 64
     OR length(coalesce(p_sesion_id, '')) NOT BETWEEN 8 AND 64
     OR p_pagina NOT IN ('/', '/es/', '/plataformas/')
     OR p_evento NOT IN ('vista', 'seccion', 'scroll', 'clic', 'tiempo')
     OR (p_evento IN ('scroll', 'tiempo') AND coalesce(p_detalle, '') !~ '^[0-9]{1,5}$') THEN
    RETURN false;
  END IF;

  -- Ritmo: una persona real no manda 300 eventos en una hora.
  IF (SELECT count(*) FROM bodgar_dev.eventos
      WHERE anon_id = p_anon_id AND created_at > now() - interval '1 hour') >= 300 THEN
    RETURN false;
  END IF;

  INSERT INTO bodgar_dev.eventos
    (anon_id, sesion_id, pagina, evento, detalle, ref, fuente, referer, movil, zona, interno)
  VALUES (
    p_anon_id, p_sesion_id, p_pagina, p_evento,
    left(nullif(p_detalle, ''), 80),
    left(nullif(regexp_replace(coalesce(p_ref, ''), '[^A-Za-z0-9_-]', '', 'g'), ''), 40),
    left(nullif(p_fuente, ''), 60),
    left(nullif(p_referer, ''), 120),
    p_movil,
    left(nullif(p_zona, ''), 60),
    coalesce(p_interno, false)
  );
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.bodgardev_registrar(text, text, text, text, text, text, text, text, boolean, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bodgardev_registrar(text, text, text, text, text, text, text, text, boolean, text, boolean) TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Resumen para /stats/. Una sesión cuenta como "leyó" si pasó del 25 %
-- o estuvo 10 s o más: separa a las personas de los escáneres de correo
-- (Outlook, Gmail, Proofpoint) que abren el enlace sin que nadie lo vea.
-- ─────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.bodgardev_resumen(
  p_clave   text,
  p_dias    int     DEFAULT 30,
  p_interno boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_desde timestamptz := now() - make_interval(days => least(greatest(coalesce(p_dias, 30), 1), 365));
  v_out   jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM bodgar_dev.config
    WHERE clave_sha256 = encode(extensions.digest(coalesce(p_clave, ''), 'sha256'), 'hex')
  ) THEN
    RETURN NULL;
  END IF;

  WITH ev AS (
    SELECT * FROM bodgar_dev.eventos
    WHERE created_at >= v_desde AND (p_interno OR NOT interno)
  ),
  ses AS (
    SELECT
      sesion_id,
      min(anon_id)                                              AS anon_id,
      min(created_at)                                           AS inicio,
      max(created_at)                                           AS fin,
      (array_agg(pagina ORDER BY created_at))[1]                AS pagina,
      max(ref)                                                  AS ref,
      max(fuente)                                               AS fuente,
      max(referer)                                              AS referer,
      bool_or(movil)                                            AS movil,
      max(zona)                                                 AS zona,
      coalesce(max(CASE WHEN evento = 'scroll' THEN detalle::int END), 0) AS scroll_max,
      coalesce(max(CASE WHEN evento = 'tiempo' THEN detalle::int END), 0) AS segundos,
      array_remove(array_agg(DISTINCT detalle) FILTER (WHERE evento = 'clic'), NULL)    AS clics,
      array_remove(array_agg(DISTINCT detalle) FILTER (WHERE evento = 'seccion'), NULL) AS secciones
    FROM ev
    GROUP BY sesion_id
  ),
  ses2 AS (
    SELECT *, (scroll_max >= 25 OR segundos >= 10) AS leyo FROM ses
  )
  SELECT jsonb_build_object(
    'desde', v_desde,
    'paginas', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'pagina'), '[]') FROM (
        SELECT jsonb_build_object(
          'pagina', pagina,
          'visitantes', count(DISTINCT anon_id),
          'sesiones', count(*),
          'leyeron', count(*) FILTER (WHERE leyo),
          'con_clic', count(*) FILTER (WHERE cardinality(clics) > 0),
          'scroll_50', count(*) FILTER (WHERE scroll_max >= 50),
          'scroll_100', count(*) FILTER (WHERE scroll_max >= 100),
          'segundos_mediana', coalesce(percentile_cont(0.5) WITHIN GROUP (ORDER BY segundos) FILTER (WHERE leyo), 0)
        ) AS x
        FROM ses2 GROUP BY pagina
      ) t
    ),
    'por_dia', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'dia'), '[]') FROM (
        SELECT jsonb_build_object(
          'dia', to_char(inicio AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD'),
          'pagina', pagina,
          'sesiones', count(*),
          'leyeron', count(*) FILTER (WHERE leyo)
        ) AS x
        FROM ses2 GROUP BY pagina, to_char(inicio AT TIME ZONE 'America/Mexico_City', 'YYYY-MM-DD')
      ) t
    ),
    'clics', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'sesiones')::int DESC), '[]') FROM (
        SELECT jsonb_build_object('pagina', s.pagina, 'clic', c, 'sesiones', count(*)) AS x
        FROM ses2 s, unnest(s.clics) c GROUP BY s.pagina, c
      ) t
    ),
    'secciones', (
      SELECT coalesce(jsonb_agg(x), '[]') FROM (
        SELECT jsonb_build_object('pagina', s.pagina, 'seccion', c, 'sesiones', count(*)) AS x
        FROM ses2 s, unnest(s.secciones) c GROUP BY s.pagina, c
      ) t
    ),
    'fuentes', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'sesiones')::int DESC), '[]') FROM (
        SELECT jsonb_build_object(
          'fuente', coalesce(fuente, CASE WHEN ref IS NOT NULL THEN 'correo' END, referer, 'directo'),
          'sesiones', count(*), 'leyeron', count(*) FILTER (WHERE leyo)) AS x
        FROM ses2 GROUP BY coalesce(fuente, CASE WHEN ref IS NOT NULL THEN 'correo' END, referer, 'directo')
      ) t
    ),
    'refs', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'ultima' DESC), '[]') FROM (
        SELECT jsonb_build_object(
          'ref', ref,
          'primera', min(inicio), 'ultima', max(fin),
          'sesiones', count(*), 'leyo', bool_or(leyo),
          'scroll_max', max(scroll_max), 'segundos', sum(segundos),
          'paginas', array_agg(DISTINCT pagina),
          'clics', (SELECT coalesce(array_agg(DISTINCT c), '{}') FROM ses2 s2, unnest(s2.clics) c WHERE s2.ref = s.ref)
        ) AS x
        FROM ses2 s WHERE ref IS NOT NULL GROUP BY ref
      ) t
    ),
    'sesiones', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'inicio' DESC), '[]') FROM (
        SELECT jsonb_build_object(
          'inicio', inicio, 'pagina', pagina, 'ref', ref,
          'fuente', coalesce(fuente, referer), 'movil', movil, 'zona', zona,
          'scroll', scroll_max, 'segundos', segundos, 'clics', clics, 'leyo', leyo,
          'nuevo', NOT EXISTS (SELECT 1 FROM ses2 o WHERE o.anon_id = s.anon_id AND o.inicio < s.inicio)
        ) AS x
        FROM ses2 s ORDER BY inicio DESC LIMIT 100
      ) t
    )
  ) INTO v_out;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.bodgardev_resumen(text, int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bodgardev_resumen(text, int, boolean) TO anon, authenticated;
