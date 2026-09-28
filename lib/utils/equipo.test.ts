import { describe, it, expect } from 'vitest';
import { resumenEquipo } from './equipo';

function tareaHecha(id: number) {
  return { id, titulo: 'T' + id, estado: 'hecha' as const, prioridad: 1 };
}
function tareaPendiente(id: number) {
  return { id, titulo: 'T' + id, estado: 'pendiente' as const, prioridad: 1 };
}

describe('resumenEquipo', () => {
  it('cuenta el total de tareas', () => {
    const tareas = [tareaHecha(1), tareaPendiente(2), tareaPendiente(3)];
    expect(resumenEquipo(tareas).total).toBe(3);
  });

  it('calcula el porcentaje de hechas', () => {
    const tareas = [tareaHecha(1), tareaPendiente(2)];
    // Valor esperado escrito a mano (1 de 2 hechas = 50%), no recalculado con la función.
    expect(resumenEquipo(tareas).porcentajeHechas).toBe(50);
  });

  it('da porcentaje 0 (no NaN) en un equipo sin tareas', () => {
    expect(resumenEquipo([])).toEqual({ total: 0, hechas: 0, porcentajeHechas: 0 });
  });
});
