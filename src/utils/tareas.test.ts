import { describe, expect, it } from 'vitest';
import { crearTarea } from '../domain/tarea';
import { buscarTarea, contarPorEstado } from './tareas';

describe('contarPorEstado', () => {
  it('cuenta las tareas de cada estado, con 0 en los que no tienen', () => {
    expect(contarPorEstado([{ estado: 'pendiente' }, { estado: 'hecha' }, { estado: 'pendiente' }])).toEqual({
      pendiente: 2,
      'en-curso': 0,
      hecha: 1,
    });
  });
});

describe('buscarTarea', () => {
  const tareas = [crearTarea(1, { titulo: 'Uno', responsableId: 1 }), crearTarea(2, { titulo: 'Dos', responsableId: 1 })];

  it('devuelve la tarea con ese id o undefined', () => {
    expect(buscarTarea(tareas, 2)?.titulo).toBe('Dos');
    expect(buscarTarea(tareas, 3)).toBeUndefined();
  });
});
