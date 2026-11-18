-- Planes de ejecución de las consultas de src/repositorios/consultasSql.ts, con los
-- parámetros sustituidos por valores fijos. Ejecutar tras cargar datos-volumen.sql:
--   psql "$TEST_DATABASE_URL" -f scripts/sql/explain.sql

\set ON_ERROR_STOP on

\echo '=== 1. atrasadasPorResponsable ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.id, u.nombre, COUNT(*)::int AS atrasadas, MIN(t.fecha_limite)
FROM tareas t
JOIN usuarios u ON u.id = t.responsable_id
WHERE t.borrada_en IS NULL
  AND t.estado IN ('pendiente', 'en-curso')
  AND t.fecha_limite < timestamptz '2026-11-18'
GROUP BY u.id, u.nombre
ORDER BY atrasadas DESC, u.id;

\echo '=== 2. actividadDeResponsable ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT t.id, t.titulo, t.estado::text, c.total, a.total, c.ultimo
FROM tareas t
CROSS JOIN LATERAL (
  SELECT COUNT(*)::int AS total, MAX(creado_en) AS ultimo FROM comentarios WHERE tarea_id = t.id
) c
CROSS JOIN LATERAL (
  SELECT COUNT(*)::int AS total FROM adjuntos WHERE tarea_id = t.id
) a
WHERE t.responsable_id = 42
  AND t.borrada_en IS NULL
ORDER BY c.ultimo DESC NULLS LAST, t.id
LIMIT 20;

\echo '=== 3. resumenPorEstado ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT e.estado::text,
       COUNT(t.id)::int,
       COUNT(t.id) FILTER (WHERE t.prioridad = 'baja')::int,
       COUNT(t.id) FILTER (WHERE t.prioridad = 'media')::int,
       COUNT(t.id) FILTER (WHERE t.prioridad = 'alta')::int,
       COUNT(t.id) FILTER (WHERE e.estado <> 'hecha' AND t.fecha_limite < timestamptz '2026-11-18')::int
FROM unnest(enum_range(NULL::estado_tarea)) AS e(estado)
LEFT JOIN tareas t ON t.estado = e.estado AND t.borrada_en IS NULL
GROUP BY e.estado
ORDER BY e.estado;
