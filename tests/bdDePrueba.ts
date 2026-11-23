import { execSync } from 'node:child_process';
import { config } from 'dotenv';
import { crearClientePrisma } from '../lib/db';
import type { PrismaClient } from '../src/generated/prisma/client';

// TEST_DATABASE_URL puede venir del entorno (CI) o de .env.local. Se lee sin volcar
// .env.local en process.env, para no alterar los tests que dependen de otras variables.
const { parsed: local = {} } = config({ path: '.env.local', processEnv: {}, quiet: true });

export const urlBdDePrueba = process.env.TEST_DATABASE_URL ?? local.TEST_DATABASE_URL;
export const urlRedisDePrueba = process.env.TEST_REDIS_URL ?? local.TEST_REDIS_URL;

// Aplica las migraciones a la BD de pruebas y devuelve su URL. Los tests la vacían en
// cada caso, así que se exige que sea una BD dedicada a tests.
export function migrarBdDePrueba(): string {
  if (!urlBdDePrueba) throw new Error('Falta TEST_DATABASE_URL');
  if (!new URL(urlBdDePrueba).pathname.includes('test')) {
    throw new Error('TEST_DATABASE_URL debe apuntar a una BD cuyo nombre contenga "test"');
  }
  execSync('npx prisma migrate deploy', {
    // También DIRECT_URL: si .env.local la define, Prisma migraría esa BD en vez de la de pruebas.
    env: { ...process.env, DATABASE_URL: urlBdDePrueba, DIRECT_URL: urlBdDePrueba },
    stdio: 'pipe',
  });
  return urlBdDePrueba;
}

// Migra la BD de pruebas y devuelve un cliente conectado a ella.
export function prepararBdDePrueba(): PrismaClient {
  return crearClientePrisma(migrarBdDePrueba());
}
