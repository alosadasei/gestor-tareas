import { afterEach, describe, expect, it } from 'vitest';
import { leerVariable } from './env';

describe('leerVariable', () => {
  afterEach(() => {
    delete process.env.VARIABLE_DE_PRUEBA;
  });

  it('devuelve el valor si la variable existe', () => {
    process.env.VARIABLE_DE_PRUEBA = 'hola';
    expect(leerVariable('VARIABLE_DE_PRUEBA')).toBe('hola');
  });

  it('lanza un error claro si falta', () => {
    expect(() => leerVariable('VARIABLE_DE_PRUEBA')).toThrow(/VARIABLE_DE_PRUEBA/);
  });
});
