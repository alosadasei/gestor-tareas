import { describe, expect, it } from 'vitest';
import type { Tarea } from './api';
import {
  cambiarEstadoEnLista,
  cambiosTarea,
  datosNuevaTarea,
  estaVencida,
  formatearFecha,
  formatearFechaHora,
  formatearTamano,
  hoyIso,
  iniciales,
  porcentajeHechas,
  validarFormulario,
  valoresIniciales,
} from './tablero';

const AHORA = new Date('2026-11-20T12:00:00');

const tarea: Tarea = {
  id: 1,
  titulo: 'Preparar la demo',
  descripcion: 'Con datos reales',
  estado: 'pendiente',
  prioridad: 'alta',
  fechaLimite: '2026-11-10T00:00:00.000Z',
  responsableId: 2,
  etiquetas: ['demo', 'frontend'],
};

describe('fechas', () => {
  it('formatea la fecha límite sin depender de la zona horaria', () => {
    expect(formatearFecha('2026-12-01T00:00:00.000Z')).toBe('1 dic');
  });

  it('formatea fecha y hora en la zona del equipo (Madrid), sea cual sea la del servidor', () => {
    expect(formatearFechaHora('2026-11-20T13:05:00.000Z')).toBe('20 nov 2026, 14:05');
  });

  it('formatea tamaños de archivo', () => {
    expect(formatearTamano(512)).toBe('512 B');
    expect(formatearTamano(2048)).toBe('2 KB');
    expect(formatearTamano(1536)).toBe('1,5 KB');
    expect(formatearTamano(10 * 1024 * 1024)).toBe('10 MB');
  });

  it('hoyIso da el día local en formato AAAA-MM-DD', () => {
    expect(hoyIso(AHORA)).toBe('2026-11-20');
  });

  it('una tarea está vencida si su fecha pasó y no está hecha', () => {
    expect(estaVencida(tarea, AHORA)).toBe(true);
    expect(estaVencida({ ...tarea, estado: 'hecha' }, AHORA)).toBe(false);
    expect(estaVencida({ ...tarea, fechaLimite: '2026-11-20T00:00:00.000Z' }, AHORA)).toBe(false);
    expect(estaVencida({ ...tarea, fechaLimite: undefined }, AHORA)).toBe(false);
  });
});

describe('utilidades', () => {
  it('iniciales del nombre (máximo dos)', () => {
    expect(iniciales('Ana García López')).toBe('AG');
    expect(iniciales('bruno')).toBe('B');
  });

  it('cambia el estado de una tarea sin mutar la lista', () => {
    const lista = [tarea, { ...tarea, id: 2 }];
    const nueva = cambiarEstadoEnLista(lista, 2, 'hecha');
    expect(nueva.map((t) => t.estado)).toEqual(['pendiente', 'hecha']);
    expect(lista[1].estado).toBe('pendiente');
  });

  it('porcentaje de tareas hechas, 0 si no hay tareas', () => {
    expect(porcentajeHechas([])).toBe(0);
    expect(porcentajeHechas([{ estado: 'hecha' }, { estado: 'pendiente' }, { estado: 'hecha' }])).toBe(67);
  });
});

describe('formulario', () => {
  it('rellena los valores desde la tarea o con los valores por defecto', () => {
    expect(valoresIniciales(tarea)).toEqual({
      titulo: 'Preparar la demo',
      descripcion: 'Con datos reales',
      prioridad: 'alta',
      fechaLimite: '2026-11-10',
      responsableId: '2',
      etiquetas: 'demo, frontend',
    });
    expect(valoresIniciales(undefined, 5)).toMatchObject({ titulo: '', prioridad: 'media', responsableId: '5' });
  });

  it('convierte los valores en una tarea nueva: recorta, sin fecha vacía, etiquetas únicas', () => {
    const valores = { ...valoresIniciales(undefined, 1), titulo: '  Nueva ', etiquetas: 'a, b,, a ' };
    expect(datosNuevaTarea(valores)).toEqual({
      titulo: 'Nueva',
      descripcion: '',
      prioridad: 'media',
      responsableId: 1,
      etiquetas: ['a', 'b'],
    });
  });

  it('al editar solo envía lo que cambió', () => {
    expect(cambiosTarea(tarea, valoresIniciales(tarea))).toEqual({});
    expect(cambiosTarea(tarea, { ...valoresIniciales(tarea), titulo: 'Otro', etiquetas: 'demo' })).toEqual({
      titulo: 'Otro',
      etiquetas: ['demo'],
    });
  });

  it('quitar la fecha envía null; cambiarla envía la nueva', () => {
    expect(cambiosTarea(tarea, { ...valoresIniciales(tarea), fechaLimite: '' })).toEqual({ fechaLimite: null });
    expect(cambiosTarea(tarea, { ...valoresIniciales(tarea), fechaLimite: '2026-12-01' })).toEqual({
      fechaLimite: '2026-12-01',
    });
  });

  it('valida título, responsable y fecha pasada antes de enviar', () => {
    const vacio = { ...valoresIniciales(undefined), titulo: ' ', fechaLimite: '2026-11-01' };
    expect(validarFormulario(vacio, undefined, AHORA)).toMatchObject({
      titulo: 'El título es obligatorio',
      responsableId: 'Elige un responsable',
      fechaLimite: 'La fecha límite no puede ser anterior a hoy',
    });
  });

  it('usa los límites del esquema de la API (longitud del título)', () => {
    const largo = { ...valoresIniciales(undefined, 1), titulo: 'x'.repeat(201) };
    expect(validarFormulario(largo, undefined, AHORA).titulo).toMatch(/200/);
  });

  it('permite editar una tarea vencida sin tocar su fecha', () => {
    const valores = { ...valoresIniciales(tarea), titulo: 'Solo cambia el título' };
    expect(validarFormulario(valores, tarea, AHORA)).toEqual({});
  });
});
