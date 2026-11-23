import { describe, expect, it } from 'vitest';
import { configAlmacenamiento, configBaseDeDatos, configOpcional, ErrorConfiguracion } from './env';

const PG = 'postgresql://u:secreto@db.example.com:5432/app';

describe('configBaseDeDatos', () => {
  it('devuelve DATABASE_URL y DIRECT_URL', () => {
    expect(configBaseDeDatos({ DATABASE_URL: PG, DIRECT_URL: PG })).toEqual({ DATABASE_URL: PG, DIRECT_URL: PG });
  });

  it('DIRECT_URL es opcional y vacía cuenta como no definida', () => {
    expect(configBaseDeDatos({ DATABASE_URL: PG, DIRECT_URL: '' })).toEqual({ DATABASE_URL: PG });
  });

  it('lanza un error claro si falta DATABASE_URL', () => {
    expect(() => configBaseDeDatos({})).toThrow(ErrorConfiguracion);
    expect(() => configBaseDeDatos({ DATABASE_URL: '' })).toThrow('DATABASE_URL es obligatoria');
  });

  it('rechaza una URL que no es de Postgres sin mostrar su valor', () => {
    const lanzar = () => configBaseDeDatos({ DATABASE_URL: 'mysql://u:secreto@db/app' });
    expect(lanzar).toThrow('DATABASE_URL debe ser una URL postgres://…');
    expect(lanzar).not.toThrow(/secreto/);
  });
});

describe('configAlmacenamiento', () => {
  const completa = {
    STORAGE_ENDPOINT: 'https://cuenta.r2.cloudflarestorage.com',
    STORAGE_BUCKET: 'adjuntos',
    STORAGE_ACCESS_KEY_ID: 'id',
    STORAGE_SECRET_ACCESS_KEY: 'clave',
  };

  it('la región por defecto es auto (también si está vacía)', () => {
    expect(configAlmacenamiento(completa).STORAGE_REGION).toBe('auto');
    expect(configAlmacenamiento({ ...completa, STORAGE_REGION: '' }).STORAGE_REGION).toBe('auto');
    expect(configAlmacenamiento({ ...completa, STORAGE_REGION: 'eu-west-1' }).STORAGE_REGION).toBe('eu-west-1');
  });

  it('lista en un solo error todas las variables que faltan', () => {
    expect(() => configAlmacenamiento({ STORAGE_ENDPOINT: 'no es una url' })).toThrow(
      'STORAGE_ENDPOINT debe ser una URL http(s)://…; STORAGE_BUCKET es obligatoria; ' +
        'STORAGE_ACCESS_KEY_ID es obligatoria; STORAGE_SECRET_ACCESS_KEY es obligatoria',
    );
  });
});

describe('configOpcional', () => {
  it('sin nada definido no exige nada', () => {
    expect(configOpcional({ REDIS_URL: '', LOG_LEVEL: '' })).toEqual({});
  });

  it('valida el formato de REDIS_URL y LOG_LEVEL si están', () => {
    expect(configOpcional({ REDIS_URL: 'redis://localhost:6379/0', LOG_LEVEL: 'debug' })).toEqual({
      REDIS_URL: 'redis://localhost:6379/0',
      LOG_LEVEL: 'debug',
    });
    expect(() => configOpcional({ REDIS_URL: 'localhost:6379' })).toThrow('REDIS_URL debe ser una URL redis://…');
    expect(() => configOpcional({ LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
  });
});
