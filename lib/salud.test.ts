import { describe, expect, it } from 'vitest';
import { comprobarBaseDeDatos } from './salud';

describe('comprobarBaseDeDatos', () => {
  it('es sana si la consulta responde', async () => {
    expect(await comprobarBaseDeDatos(async () => [{ '?column?': 1 }])).toBe(true);
  });

  it('está degradada si la consulta falla', async () => {
    expect(await comprobarBaseDeDatos(() => Promise.reject(new Error('ECONNREFUSED')))).toBe(false);
  });

  it('está degradada si la consulta no responde a tiempo', async () => {
    expect(await comprobarBaseDeDatos(() => new Promise(() => {}), 20)).toBe(false);
  });

  it('está degradada si ni siquiera se puede lanzar la consulta (p. ej. falta DATABASE_URL)', async () => {
    const sinConfig = () => {
      throw new Error('Variables de entorno incorrectas: DATABASE_URL es obligatoria');
    };
    expect(await comprobarBaseDeDatos(sinConfig)).toBe(false);
  });
});
