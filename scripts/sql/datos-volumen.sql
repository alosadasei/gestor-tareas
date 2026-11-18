-- Datos de volumen para analizar los planes de ejecución con EXPLAIN (docs/sql-explain.md).
-- ¡VACÍA TODAS LAS TABLAS! Úsalo solo contra la BD de tests:
--   psql "$TEST_DATABASE_URL" -f scripts/sql/datos-volumen.sql
--
-- Reparto parecido al de un equipo real tras un par de años de uso: 200 usuarios,
-- 200.000 tareas (85 % hechas), 600.000 comentarios y 50.000 adjuntos. setseed hace que
-- random() genere siempre la misma secuencia: los datos son reproducibles.

\set ON_ERROR_STOP on
SELECT setseed(0.42);

TRUNCATE auditoria, adjuntos, comentarios, tareas_etiquetas, etiquetas, tareas, usuarios
  RESTART IDENTITY CASCADE;

INSERT INTO usuarios (nombre, email)
SELECT 'Usuario ' || i, 'usuario' || i || '@volumen.dev'
FROM generate_series(1, 200) AS i;

-- Las hechas tienen fechas repartidas en los dos últimos años; las abiertas, entre hace
-- un mes y dentro de dos (las del pasado son las atrasadas). Un 10 % no tiene fecha.
INSERT INTO tareas (titulo, estado, prioridad, fecha_limite, responsable_id, actualizada_en)
SELECT 'Tarea ' || i,
       estado::estado_tarea,
       (ARRAY['baja', 'media', 'alta'])[1 + floor(random() * 3)::int]::prioridad,
       CASE
         WHEN random() < 0.1 THEN NULL
         WHEN estado = 'hecha' THEN timestamptz '2026-11-18' - random() * interval '730 days'
         ELSE timestamptz '2026-11-18' + (random() * 90 - 30) * interval '1 day'
       END,
       1 + floor(random() * 200)::int,
       timestamptz '2026-11-18'
FROM (
  SELECT i,
         CASE WHEN r < 0.85 THEN 'hecha' WHEN r < 0.95 THEN 'pendiente' ELSE 'en-curso' END AS estado
  FROM (SELECT i, random() AS r FROM generate_series(1, 200000) AS i) AS s
) AS t;

INSERT INTO comentarios (tarea_id, autor_id, texto, creado_en)
SELECT 1 + floor(random() * 200000)::int,
       1 + floor(random() * 200)::int,
       'Comentario ' || i,
       timestamptz '2026-11-18' - random() * interval '730 days'
FROM generate_series(1, 600000) AS i;

INSERT INTO adjuntos (tarea_id, nombre_archivo, tipo_mime, tamano_bytes, clave)
SELECT 1 + floor(random() * 200000)::int,
       'archivo-' || i || '.pdf',
       'application/pdf',
       1024 + floor(random() * 1000000)::int,
       'volumen/' || i
FROM generate_series(1, 50000) AS i;

-- Estadísticas actualizadas para que el planificador estime bien las filas.
ANALYZE usuarios, tareas, comentarios, adjuntos;
