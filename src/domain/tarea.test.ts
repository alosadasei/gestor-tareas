import { describe, expect, it } from 'vitest';
import { asignarFechaLimite, cambiarEstado, crearTarea, editarTarea } from './tarea';

const DIA_MS = 24 * 60 * 60 * 1000;
const manana = () => new Date(Date.now() + DIA_MS);
const ayer = () => new Date(Date.now() - DIA_MS);

describe('crearTarea', () => {
  it('crea la tarea en pendiente, con prioridad media y sin etiquetas por defecto', () => {
    const tarea = crearTarea(1, { titulo: 'Diseñar el tablero', responsableId: 7 });
    expect(tarea).toEqual({
      id: 1,
      titulo: 'Diseñar el tablero',
      descripcion: '',
      estado: 'pendiente',
      prioridad: 'media',
      responsableId: 7,
      etiquetas: [],
    });
  });

  it('recorta los espacios del título y la descripción', () => {
    const tarea = crearTarea(1, { titulo: '  Título  ', descripcion: ' Detalle ', responsableId: 1 });
    expect(tarea.titulo).toBe('Título');
    expect(tarea.descripcion).toBe('Detalle');
  });

  it('rechaza un título vacío', () => {
    expect(() => crearTarea(1, { titulo: '   ', responsableId: 1 })).toThrow('título');
  });

  it('asigna la fecha límite si es futura y rechaza una pasada', () => {
    const fecha = manana();
    expect(crearTarea(1, { titulo: 'T', responsableId: 1, fechaLimite: fecha }).fechaLimite).toBe(
      fecha,
    );
    expect(() => crearTarea(1, { titulo: 'T', responsableId: 1, fechaLimite: ayer() })).toThrow(
      'anterior a hoy',
    );
  });
});

describe('asignarFechaLimite', () => {
  it('acepta la fecha de hoy', () => {
    const tarea = crearTarea(1, { titulo: 'T', responsableId: 1 });
    const hoy = new Date();
    expect(asignarFechaLimite(tarea, hoy).fechaLimite).toBe(hoy);
  });
});

describe('editarTarea', () => {
  const tarea = crearTarea(1, { titulo: 'Original', responsableId: 1 });

  it('aplica los cambios sin mutar la tarea original', () => {
    const editada = editarTarea(tarea, { titulo: ' Nuevo ', prioridad: 'alta', responsableId: 2 });
    expect(editada).toMatchObject({ titulo: 'Nuevo', prioridad: 'alta', responsableId: 2 });
    expect(tarea.titulo).toBe('Original');
  });

  it('rechaza dejar el título vacío o poner una fecha límite pasada', () => {
    expect(() => editarTarea(tarea, { titulo: '' })).toThrow('título');
    expect(() => editarTarea(tarea, { fechaLimite: ayer() })).toThrow('anterior a hoy');
  });

  it('permite editar otros campos de una tarea cuya fecha límite ya venció', () => {
    const vencida = { ...tarea, fechaLimite: ayer() };
    expect(editarTarea(vencida, { descripcion: 'Más detalle' }).descripcion).toBe('Más detalle');
  });
});

describe('cambiarEstado', () => {
  it('devuelve una copia con el nuevo estado', () => {
    const tarea = crearTarea(1, { titulo: 'T', responsableId: 1 });
    expect(cambiarEstado(tarea, 'en-curso').estado).toBe('en-curso');
    expect(tarea.estado).toBe('pendiente');
  });
});
