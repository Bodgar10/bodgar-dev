-- =====================================================
-- AOM 002 · Bajas. Un jugador con activo = false desaparece de la página
-- junto con sus partidas (aom_publico ya no las devuelve). Sirve para dar
-- de baja a alguien sin borrar nada. Se usó para ocultar los jugadores de
-- prueba (gamertag ZZtest_*).
-- =====================================================

-- (aom_publico: igual que en 001, con `AND ja.activo` / `AND jb.activo` en los JOIN)

UPDATE aom.jugadores SET activo = false WHERE gamertag ILIKE 'zztest%';
