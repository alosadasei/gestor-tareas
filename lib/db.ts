import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { leerVariable } from './env';

export function crearClientePrisma(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

// Un único cliente (y pool de conexiones) por proceso. Se guarda en globalThis porque en
// desarrollo Next.js recarga los módulos en cada cambio y, sin esto, abriría un pool nuevo
// en cada recarga hasta agotar las conexiones. Se crea al primer uso, no al importar, para
// que importar este módulo no exija DATABASE_URL (build, tests unitarios).
const globalConPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function obtenerPrisma(): PrismaClient {
  globalConPrisma.prisma ??= crearClientePrisma(leerVariable('DATABASE_URL'));
  return globalConPrisma.prisma;
}

// Cierra el pool y olvida el cliente: el siguiente obtenerPrisma() crea uno nuevo.
export async function desconectarPrisma(): Promise<void> {
  await globalConPrisma.prisma?.$disconnect();
  globalConPrisma.prisma = undefined;
}
