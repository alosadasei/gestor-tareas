import { describe, expect, it } from 'vitest';
import { porcentajeCompletado, resumenTareas, type Tarea } from './resumenTareas';

function tarea(overrides: Partial<Tarea>): Tarea {
  return {
    id: 1,
    titulo: 'Tarea',
    estado: 'pendiente',
    prioridad: 2,
    fechaLimite: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('resumenTareas', () => {
  it('da porcentaje 0 (no NaN) con un array vacío', () => {
    const resultado = resumenTareas([]);
    expect(resultado).toEqual({ pendientes: 0, enCurso: 0, hechas: 0, porcentaje: 0 });
  });

  it('cuenta 2 de 4 tareas hechas como 50%', () => {
    const tareas = [
      tarea({ id: 1, estado: 'hecha' }),
      tarea({ id: 2, estado: 'hecha' }),
      tarea({ id: 3, estado: 'pendiente' }),
      tarea({ id: 4, estado: 'en-curso' }),
    ];
    const resultado = resumenTareas(tareas);
    expect(resultado).toEqual({ pendientes: 1, enCurso: 1, hechas: 2, porcentaje: 50 });
  });

  it('cuenta todas las tareas hechas como 100%', () => {
    const tareas = [tarea({ id: 1, estado: 'hecha' }), tarea({ id: 2, estado: 'hecha' })];
    const resultado = resumenTareas(tareas);
    expect(resultado).toEqual({ pendientes: 0, enCurso: 0, hechas: 2, porcentaje: 100 });
  });
});

describe('porcentajeCompletado', () => {
  it('da 0 cuando el total es 0', () => {
    expect(porcentajeCompletado(0, 0)).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    expect(porcentajeCompletado(1, 3)).toBe(33);
  });
});
