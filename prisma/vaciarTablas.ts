import type { PrismaClient } from '../src/generated/prisma/client';

// Vacía todas las tablas de la app y reinicia sus secuencias, para que los ids vuelvan a
// empezar en 1. Lo usan el seed y los tests de integración: nunca contra producción.
export async function vaciarTablas(db: Pick<PrismaClient, '$executeRawUnsafe'>): Promise<void> {
  await db.$executeRawUnsafe(
    `TRUNCATE auditoria, adjuntos, comentarios, tareas_etiquetas, etiquetas, tareas, usuarios
     RESTART IDENTITY CASCADE`,
  );
}
