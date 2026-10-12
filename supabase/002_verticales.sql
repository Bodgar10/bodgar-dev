-- =====================================================
-- 002 · Las verticales de /plataformas/ (p. ej. /plataformas/fisioterapia/)
-- también se miden. La lista fija de páginas pasa a ser un patrón.
-- =====================================================

ALTER TABLE bodgar_dev.eventos DROP CONSTRAINT IF EXISTS eventos_pagina_check;
ALTER TABLE bodgar_dev.eventos ADD CONSTRAINT eventos_pagina_check
  CHECK (pagina ~ '^/(es/|plataformas/([a-z-]{1,40}/)?)?$');

CREATE OR REPLACE FUNCTION public.bodgardev_registrar(
  p_anon_id text, p_sesion_id text, p_pagina text, p_evento text,
  p_detalle text DEFAULT NULL, p_ref text DEFAULT NULL, p_fuente text DEFAULT NULL,
  p_referer text DEFAULT NULL, p_movil boolean DEFAULT NULL, p_zona text DEFAULT NULL,
  p_interno boolean DEFAULT false
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF length(coalesce(p_anon_id, '')) NOT BETWEEN 8 AND 64
     OR length(coalesce(p_sesion_id, '')) NOT BETWEEN 8 AND 64
     OR coalesce(p_pagina, '') !~ '^/(es/|plataformas/([a-z-]{1,40}/)?)?$'
     OR p_evento NOT IN ('vista', 'seccion', 'scroll', 'clic', 'tiempo')
     OR (p_evento IN ('scroll', 'tiempo') AND coalesce(p_detalle, '') !~ '^[0-9]{1,5}$') THEN
    RETURN false;
  END IF;
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
