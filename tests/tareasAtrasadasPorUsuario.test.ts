import { describe, expect, it } from 'vitest';
import { tareasAtrasadasPorUsuario } from '../src/tareasAtrasadasPorUsuario';

const DIA_MS = 24 * 60 * 60 * 1000;
const ayer = () => new Date(Date.now() - DIA_MS);
const mañana = () => new Date(Date.now() + DIA_MS);

describe('tareasAtrasadasPorUsuario', () => {
  it('cuenta las tareas atrasadas de varias tareas con dos responsables', () => {
    const tareas = [
      { id: 1, titulo: 'A', estado: 'pendiente' as const, prioridad: 1, fechaLimite: ayer(), responsable: 'Ana' },
      { id: 2, titulo: 'B', estado: 'en-curso' as const, prioridad: 2, fechaLimite: ayer(), responsable: 'Ana' },
      { id: 3, titulo: 'C', estado: 'pendiente' as const, prioridad: 1, fechaLimite: mañana(), responsable: 'Ana' },
      { id: 4, titulo: 'D', estado: 'pendiente' as const, prioridad: 3, fechaLimite: ayer(), responsable: 'Bruno' },
    ];
    expect(tareasAtrasadasPorUsuario(tareas)).toEqual({ Ana: 2, Bruno: 1 });
  });

  it('devuelve {} con un array vacío', () => {
    expect(tareasAtrasadasPorUsuario([])).toEqual({});
  });

  it('no cuenta una tarea "hecha" aunque su fecha límite haya pasado', () => {
    const tareas = [
      { id: 1, titulo: 'A', estado: 'hecha' as const, prioridad: 1, fechaLimite: ayer(), responsable: 'Ana' },
    ];
    expect(tareasAtrasadasPorUsuario(tareas)).toEqual({});
  });

  it('no cuenta ni falla con una tarea sin fechaLimite', () => {
    const tareas = [
      { id: 1, titulo: 'A', estado: 'pendiente' as const, prioridad: 1, responsable: 'Ana' },
    ];
    expect(tareasAtrasadasPorUsuario(tareas)).toEqual({});
  });
});
