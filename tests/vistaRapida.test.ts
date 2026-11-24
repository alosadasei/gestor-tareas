import { describe, expect, it } from 'vitest';
import {
  estaVencida,
  formatearFecha,
  leerFiltros,
  mensajeDeError,
  queryDeLaApi,
  queryDeLaPagina,
  resumen,
  TAMANO_PAGINA,
} from '../public/vista-rapida/logica.js';

// Lógica de la vista rápida en JS vanilla (public/vista-rapida). El DOM se prueba en e2e.

describe('leerFiltros', () => {
  it('sin query, los filtros por defecto', () => {
    expect(leerFiltros('')).toEqual({ texto: '', estado: '', prioridad: '', orden: 'recientes' });
  });

  it('lee los filtros válidos de la URL', () => {
    expect(leerFiltros('?texto=%20api%20&estado=en-curso&prioridad=alta&orden=prioridad')).toEqual({
      texto: 'api',
      estado: 'en-curso',
      prioridad: 'alta',
      orden: 'prioridad',
    });
  });

  it('descarta los valores que no existen, sin romper la página', () => {
    expect(leerFiltros('?estado=archivada&prioridad=urgente&orden=__proto__')).toEqual({
      texto: '',
      estado: '',
      prioridad: '',
      orden: 'recientes',
    });
  });

  it('recorta el texto al máximo que acepta la API', () => {
    expect(leerFiltros(`?texto=${'a'.repeat(150)}`).texto).toHaveLength(100);
  });
});

describe('queryDeLaPagina', () => {
  it('solo incluye lo que no es por defecto y vuelve a leerse igual', () => {
    const filtros = { texto: 'demo', estado: 'hecha', prioridad: '', orden: 'fecha-limite' };
    const query = queryDeLaPagina(filtros);
    expect(query).toBe('?texto=demo&estado=hecha&orden=fecha-limite');
    expect(leerFiltros(query)).toEqual(filtros);
  });

  it('sin filtros, la URL queda limpia', () => {
    expect(queryDeLaPagina(leerFiltros(''))).toBe('');
  });
});

describe('queryDeLaApi', () => {
  it('traduce el orden y los filtros a los parámetros de GET /api/tareas', () => {
    const params = new URLSearchParams(
      queryDeLaApi({ texto: 'api', estado: 'pendiente', prioridad: 'alta', orden: 'prioridad' }, 3),
    );
    expect(Object.fromEntries(params)).toEqual({
      pagina: '3',
      tamanoPagina: String(TAMANO_PAGINA),
      ordenarPor: 'prioridad',
      direccion: 'desc',
      texto: 'api',
      estado: 'pendiente',
      prioridad: 'alta',
    });
  });

  it('sin filtros no manda parámetros vacíos (la API los rechazaría)', () => {
    const params = new URLSearchParams(queryDeLaApi(leerFiltros(''), 1));
    expect([...params.keys()]).toEqual(['pagina', 'tamanoPagina', 'ordenarPor', 'direccion']);
    expect(params.get('ordenarPor')).toBe('id');
    expect(params.get('direccion')).toBe('desc');
  });
});

describe('resumen', () => {
  it('describe cuántas tareas se ven', () => {
    expect(resumen(0, 0)).toBe('Ninguna tarea coincide con los filtros.');
    expect(resumen(1, 1)).toBe('1 tarea.');
    expect(resumen(8, 8)).toBe('8 tareas.');
    expect(resumen(10, 25)).toBe('Mostrando 10 de 25 tareas.');
  });
});

describe('fechas', () => {
  const AHORA = new Date(2026, 10, 24, 12); // 24 nov 2026, hora local

  it('una tarea está vencida si su día límite ya pasó y no está hecha', () => {
    const tarea = { estado: 'pendiente' as const, fechaLimite: '2026-11-23T00:00:00.000Z' };
    expect(estaVencida(tarea, AHORA)).toBe(true);
    expect(estaVencida({ ...tarea, estado: 'hecha' }, AHORA)).toBe(false);
    expect(estaVencida({ ...tarea, fechaLimite: '2026-11-24T00:00:00.000Z' }, AHORA)).toBe(false);
    expect(estaVencida({ estado: 'pendiente' }, AHORA)).toBe(false);
  });

  it('muestra el día guardado, sin cambiar de día por la zona horaria', () => {
    expect(formatearFecha('2026-11-24T00:00:00.000Z')).toBe('24 nov');
  });
});

describe('mensajeDeError', () => {
  it('usa el mensaje de la API y, si no lo hay, uno genérico', () => {
    expect(mensajeDeError({ error: { code: 'NO_ENCONTRADO', message: 'Tarea 9 no existe' } }, 404)).toBe(
      'Tarea 9 no existe',
    );
    expect(mensajeDeError(null, 502)).toBe('Error inesperado del servidor (502).');
    expect(mensajeDeError('<html>', 500)).toBe('Error inesperado del servidor (500).');
  });
});
