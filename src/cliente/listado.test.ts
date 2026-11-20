import { describe, expect, it } from 'vitest';
import { limpiarParametros, rangoMostrado, urlListado, urlOrdenarPor } from './listado';

describe('limpiarParametros', () => {
  it('descarta los vacíos y se queda con el primer valor de los repetidos', () => {
    expect(limpiarParametros({ texto: '', estado: 'hecha', prioridad: ['alta', 'baja'], pagina: undefined, x: '  ' })).toEqual({
      estado: 'hecha',
      prioridad: 'alta',
    });
  });
});

describe('urlListado', () => {
  it('mantiene los parámetros actuales y aplica los cambios', () => {
    expect(urlListado({ estado: 'hecha', pagina: '2' }, { pagina: '3' })).toBe('/tareas?estado=hecha&pagina=3');
    expect(urlListado({ estado: 'hecha', pagina: '2' }, { pagina: null })).toBe('/tareas?estado=hecha');
    expect(urlListado({})).toBe('/tareas');
  });

  it('codifica el texto de búsqueda', () => {
    expect(urlListado({ texto: 'login & api' })).toBe('/tareas?texto=login+%26+api');
  });
});

describe('urlOrdenarPor', () => {
  const actuales = { estado: 'pendiente', pagina: '4' };

  it('ordena ascendente por una columna nueva y vuelve a la primera página', () => {
    expect(urlOrdenarPor(actuales, { campo: 'id', direccion: 'asc' }, 'prioridad')).toBe(
      '/tareas?estado=pendiente&ordenarPor=prioridad&direccion=asc',
    );
  });

  it('invierte la dirección si ya se ordena por esa columna', () => {
    expect(urlOrdenarPor(actuales, { campo: 'prioridad', direccion: 'asc' }, 'prioridad')).toContain('direccion=desc');
    expect(urlOrdenarPor(actuales, { campo: 'prioridad', direccion: 'desc' }, 'prioridad')).toContain('direccion=asc');
  });
});

describe('rangoMostrado', () => {
  it('calcula el rango de la página', () => {
    expect(rangoMostrado(1, 20, 20, 45)).toBe('1–20 de 45');
    expect(rangoMostrado(3, 20, 5, 45)).toBe('41–45 de 45');
    expect(rangoMostrado(1, 20, 0, 0)).toBe('0 de 0');
  });
});
