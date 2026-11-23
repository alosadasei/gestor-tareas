import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 ya no lee los .env por su cuenta. Se cargan los mismos ficheros que usa Next.js
// (.env.local tiene prioridad); una variable ya definida en el entorno (CI, Vercel) no se pisa.
config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // process.env y no env('DATABASE_URL'): env() lanza si falta, y `prisma generate`
  // (postinstall en CI y Vercel) tiene que funcionar sin base de datos.
  // La CLI (migraciones) usa la conexión directa si la hay: en Neon, DATABASE_URL pasa por el
  // pooler (PgBouncer), que no sirve para migrar. La app conecta siempre con DATABASE_URL.
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL,
  },
});
