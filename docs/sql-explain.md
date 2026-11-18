# Consultas SQL y análisis con EXPLAIN

Las tres consultas de [`src/repositorios/consultasSql.ts`](../src/repositorios/consultasSql.ts)
están escritas en SQL puro (`$queryRaw`) porque son agregaciones que con el query builder de
Prisma serían varias consultas o se resolverían en memoria. Aquí está su plan de ejecución
antes y después de añadir los índices de la migración
[`20261118193029_indices`](../prisma/migrations/20261118193029_indices/migration.sql).

## Cómo reproducirlo

Con 8 tareas (el seed) Postgres siempre lee la tabla entera y el `EXPLAIN` no dice nada útil,
así que se carga un volumen realista en la **BD de tests** (el script vacía todas las tablas):

```bash
psql "$TEST_DATABASE_URL" -f scripts/sql/datos-volumen.sql   # 200 usuarios, 200.000 tareas,
                                                             # 600.000 comentarios, 50.000 adjuntos
psql "$TEST_DATABASE_URL" -f scripts/sql/explain.sql         # EXPLAIN (ANALYZE, BUFFERS) de las 3
```

Para ver el "antes", se aplican solo las migraciones anteriores a los índices (o se borran con
`DROP INDEX`). Los datos son reproducibles (`setseed`). Las cifras son de PostgreSQL 16 en local
(Apple Silicon); en otra máquina cambian los tiempos, no la forma de los planes.

## Resumen

| Consulta | Antes | Después | Índice que lo cambia |
|---|---|---|---|
| 1. Atrasadas por responsable | 11,5 ms | 4,9 ms | `tareas (estado, fecha_limite)` |
| 2. Actividad de un responsable | **16.692 ms** | **4,1 ms** | `tareas (responsable_id)`, `comentarios (tarea_id, creado_en)`, `adjuntos (tarea_id)` |
| 3. Resumen por estado | 35,7 ms | 37,0 ms | ninguno: leer toda la tabla es lo correcto |

---

## 1. Tareas atrasadas por responsable

Tareas abiertas (`pendiente` o `en-curso`) con la fecha límite vencida, agrupadas por
responsable. De 200.000 tareas cumplen la condición 8.868 (un 4,4 %).

**Antes** — recorre las 200.000 filas (en paralelo) y descarta el 95 %:

```
Parallel Seq Scan on tareas t  (actual time=0.006..7.724 rows=4434 loops=2)
  Filter: ((borrada_en IS NULL) AND (estado = ANY ('{pendiente,en-curso}')) AND (fecha_limite < '2026-11-18'))
  Rows Removed by Filter: 95566
Execution Time: 11.507 ms
```

**Después** — el índice compuesto `(estado, fecha_limite)` localiza directamente las 8.868:

```
Bitmap Heap Scan on tareas t  (actual time=0.840..3.468 rows=8868 loops=1)
  Recheck Cond: ((estado = ANY ('{pendiente,en-curso}')) AND (fecha_limite < '2026-11-18'))
  ->  Bitmap Index Scan on tareas_estado_fecha_limite_idx  (actual time=0.691..0.691 rows=8868 loops=1)
Execution Time: 4.930 ms
```

**Decisiones:**

- El orden de las columnas importa: `estado` primero porque se compara por igualdad y
  `fecha_limite` después porque es un rango. Al revés, el índice solo serviría para el rango.
- La consulta usa `estado IN ('pendiente', 'en-curso')` y no `estado <> 'hecha'`: con `<>`
  Postgres no puede usar el índice, con `IN` hace dos búsquedas por igualdad.
- Es un *bitmap* y no un *index scan* porque son miles de filas repartidas por toda la tabla:
  Postgres primero marca las páginas que necesita y luego las lee en orden.
- La mejora es moderada (×2,3) porque la tabla aún cabe entera en memoria. Al crecer, la seq
  scan crece con el total de tareas y la versión indexada solo con las atrasadas.

## 2. Actividad de las tareas de un responsable

Para cada tarea de un responsable (1.019 en el caso analizado): número de comentarios,
número de adjuntos y fecha del último comentario. Usa dos `CROSS JOIN LATERAL`, una subconsulta
agregada por tabla, porque con dos `LEFT JOIN` normales las filas se multiplicarían
(comentarios × adjuntos) y los `COUNT` saldrían inflados.

**Antes** — es el caso grave: para **cada una** de las 1.019 tareas recorre los 600.000
comentarios y los 50.000 adjuntos completos (`loops=1019`):

```
Seq Scan on tareas t  (actual time=0.007..11.619 rows=1019 loops=1)
  Filter: ((borrada_en IS NULL) AND (responsable_id = 42))
  Rows Removed by Filter: 198981
->  Seq Scan on comentarios  (actual time=4.845..14.961 rows=3 loops=1019)
      Filter: (tarea_id = t.id)
      Rows Removed by Filter: 599997
->  Seq Scan on adjuntos  (actual time=1.243..1.402 rows=0 loops=1019)
      Rows Removed by Filter: 50000
Buffers: shared hit=5726145
Execution Time: 16692.129 ms
```

**Después** — cada subconsulta es una búsqueda en un índice que ya contiene todo lo que
necesita (*index-only scan*, `Heap Fetches: 0`: ni siquiera lee la tabla):

```
Bitmap Index Scan on tareas_responsable_id_idx  (actual time=0.045..0.045 rows=1019 loops=1)
->  Index Only Scan using comentarios_tarea_id_creado_en_idx on comentarios  (actual time=0.002..0.002 rows=3 loops=1019)
      Index Cond: (tarea_id = t.id)
      Heap Fetches: 0
->  Index Only Scan using adjuntos_tarea_id_idx on adjuntos  (actual time=0.001..0.001 rows=0 loops=1019)
      Heap Fetches: 0
Buffers: shared hit=4984 read=969
Execution Time: 4.113 ms
```

**Decisiones:**

- `comentarios (tarea_id, creado_en)` y no solo `(tarea_id)`: con `creado_en` dentro del
  índice, el `COUNT` y el `MAX(creado_en)` se resuelven sin tocar la tabla.
- Postgres **no crea índices para las claves foráneas** (solo para las primarias y las
  únicas). Sin `comentarios (tarea_id)` y `adjuntos (tarea_id)`, además de esta consulta, cada
  borrado en duro de una tarea recorrería esas tablas enteras para aplicar el `ON DELETE`.
- De 5,7 millones de páginas leídas a menos de 6.000: es un problema de orden de magnitud,
  no de ajuste fino.

## 3. Resumen del tablero por estado

Por cada estado: total, reparto por prioridad y cuántas están atrasadas, en una sola pasada
(`COUNT(...) FILTER (WHERE ...)`), en lugar de una consulta por cada combinación. Parte de
`unnest(enum_range(NULL::estado_tarea))` para devolver los tres estados aunque alguno no
tenga tareas.

**Antes y después** el plan es el mismo:

```
Hash Right Join  (actual time=0.011..22.983 rows=200000 loops=1)
  ->  Seq Scan on tareas t  (actual time=0.002..10.138 rows=200000 loops=1)
        Filter: (borrada_en IS NULL)
Execution Time: 37.006 ms
```

**Decisión: no indexar.** La consulta necesita **todas** las filas para contarlas; un índice
solo añadiría saltos entre el índice y la tabla. Leerla de forma secuencial es lo más barato
y el planificador lo elige bien. Si con el volumen se volviera lenta, la solución no es un
índice sino no recalcularla en cada petición: es la candidata para la caché *cache-aside*
(PR 8).

## Otros índices de la migración

- `auditoria (tarea_id)`: la clave foránea es `ON DELETE RESTRICT`, así que cada intento de
  borrar una tarea en duro comprueba si tiene historial; sin índice, recorrería la auditoría
  entera. También es la búsqueda para mostrar el historial de una tarea.

## Lo que se ha descartado

- **Índices parciales** (`WHERE borrada_en IS NULL`): serían algo más pequeños, pero el schema
  de Prisma no los expresa y habría que mantenerlos a mano en la migración, con el riesgo de que
  una migración posterior los borre por no estar en el schema. Con muy pocas tareas borradas la
  ganancia no compensa.
- **Índice sobre `tareas (estado)` solo**: lo cubre el compuesto `(estado, fecha_limite)`,
  porque un índice sirve también para buscar por su primera columna.
