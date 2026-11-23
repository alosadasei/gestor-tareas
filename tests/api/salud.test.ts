import { describe, expect, it } from 'vitest';
import { desconectarPrisma } from '../../lib/db';
import { GET } from '../../src/app/api/health/route';
import { urlBdDePrueba } from '../bdDePrueba';
import { peticion, usarBdDePrueba } from './apiDePrueba';

describe.skipIf(!urlBdDePrueba)('GET /api/health', () => {
  usarBdDePrueba();

  it('responde ok si la base de datos responde al SELECT 1', async () => {
    const respuesta = await GET(peticion('GET', '/api/health'), {});
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get('cache-control')).toBe('no-store');
    expect(await respuesta.json()).toEqual({ status: 'ok' });
  });

  it('responde 503 degraded si la base de datos no acepta conexiones, sin dar detalles', async () => {
    const url = process.env.DATABASE_URL;
    await desconectarPrisma();
    process.env.DATABASE_URL = 'postgresql://u:p@127.0.0.1:1/nadie';
    try {
      const respuesta = await GET(peticion('GET', '/api/health'), {});
      expect(respuesta.status).toBe(503);
      expect(await respuesta.json()).toEqual({ status: 'degraded' });
    } finally {
      await desconectarPrisma();
      process.env.DATABASE_URL = url;
    }
  });
});
