import type { EstadoTarea, Prioridad } from '../domain/tarea';
import type { PrismaClient } from '../generated/prisma/client';

// Consultas de lectura escritas en SQL puro con $queryRaw: agregaciones y subconsultas que
// con el query builder de Prisma serían varias consultas o se resolverían en memoria.
// Los valores van como parámetros (${...} en la plantilla), nunca concatenados, así que no
// hay inyección SQL. El análisis con EXPLAIN de cada una está en docs/sql-explain.md.
//
// En SQL el estado se lee tal cual está guardado ("en-curso"), que ya es el valor del
// dominio; COUNT devuelve bigint y se convierte a int para recibir number y no BigInt.

export type AtrasadasPorResponsable = {
  responsableId: number;
  nombre: string;
  atrasadas: number;
  fechaMasAntigua: Date;
};

// 1. Cuántas tareas abiertas con la fecha límite vencida tiene cada responsable, y desde
// cuándo arrastra la más antigua. Solo aparecen los responsables con alguna atrasada.
export function atrasadasPorResponsable(
  db: PrismaClient,
  ahora: Date = new Date(),
): Promise<AtrasadasPorResponsable[]> {
  return db.$queryRaw<AtrasadasPorResponsable[]>`
    SELECT u.id                  AS "responsableId",
           u.nombre,
           COUNT(*)::int         AS atrasadas,
           MIN(t.fecha_limite)   AS "fechaMasAntigua"
    FROM tareas t
    JOIN usuarios u ON u.id = t.responsable_id
    WHERE t.borrada_en IS NULL
      AND t.estado IN ('pendiente', 'en-curso')
      AND t.fecha_limite < ${ahora}
    GROUP BY u.id, u.nombre
    ORDER BY atrasadas DESC, u.id
  `;
}

export type ActividadTarea = {
  id: number;
  titulo: string;
  estado: EstadoTarea;
  comentarios: number;
  adjuntos: number;
  ultimoComentario: Date | null;
};

// 2. Tareas de un responsable con su actividad (nº de comentarios y adjuntos, fecha del
// último comentario), de la más reciente a la más antigua. Los LATERAL agregan cada tabla
// por separado: con dos LEFT JOIN normales las filas se multiplicarían
// (comentarios × adjuntos) y los COUNT saldrían inflados.
export function actividadDeResponsable(
  db: PrismaClient,
  responsableId: number,
  limite = 20,
): Promise<ActividadTarea[]> {
  return db.$queryRaw<ActividadTarea[]>`
    SELECT t.id,
           t.titulo,
           t.estado::text                    AS estado,
           c.total                           AS comentarios,
           a.total                           AS adjuntos,
           c.ultimo                          AS "ultimoComentario"
    FROM tareas t
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::int AS total, MAX(creado_en) AS ultimo
      FROM comentarios
      WHERE tarea_id = t.id
    ) c
    CROSS JOIN LATERAL (
      SELECT COUNT(*)::int AS total
      FROM adjuntos
      WHERE tarea_id = t.id
    ) a
    WHERE t.responsable_id = ${responsableId}
      AND t.borrada_en IS NULL
    ORDER BY c.ultimo DESC NULLS LAST, t.id
    LIMIT ${limite}
  `;
}

export type ResumenEstado = {
  estado: EstadoTarea;
  total: number;
  porPrioridad: Record<Prioridad, number>;
  atrasadas: number;
};

type FilaResumen = {
  estado: EstadoTarea;
  total: number;
  baja: number;
  media: number;
  alta: number;
  atrasadas: number;
};

// 3. Resumen del tablero en una sola pasada por la tabla: por cada estado, el total, el
// reparto por prioridad y cuántas están atrasadas (COUNT ... FILTER evita una consulta por
// cada combinación). Devuelve siempre los tres estados, aunque alguno no tenga tareas.
export async function resumenPorEstado(
  db: PrismaClient,
  ahora: Date = new Date(),
): Promise<ResumenEstado[]> {
  const filas = await db.$queryRaw<FilaResumen[]>`
    SELECT e.estado::text                                           AS estado,
           COUNT(t.id)::int                                         AS total,
           COUNT(t.id) FILTER (WHERE t.prioridad = 'baja')::int     AS baja,
           COUNT(t.id) FILTER (WHERE t.prioridad = 'media')::int    AS media,
           COUNT(t.id) FILTER (WHERE t.prioridad = 'alta')::int     AS alta,
           COUNT(t.id) FILTER (
             WHERE e.estado <> 'hecha' AND t.fecha_limite < ${ahora}
           )::int                                                   AS atrasadas
    FROM unnest(enum_range(NULL::estado_tarea)) AS e(estado)
    LEFT JOIN tareas t ON t.estado = e.estado AND t.borrada_en IS NULL
    GROUP BY e.estado
    ORDER BY e.estado
  `;
  return filas.map(({ estado, total, baja, media, alta, atrasadas }) => ({
    estado,
    total,
    porPrioridad: { baja, media, alta },
    atrasadas,
  }));
}
