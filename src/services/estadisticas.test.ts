import { describe, expect, it } from 'vitest';
import { porcentajeCompletado } from './estadisticas';

describe('porcentajeCompletado', () => {
  // Caso mínimo del paso 1: equipo recién creado, sin ninguna tarea.
  it('da 0 (no NaN) con un equipo sin tareas', () => {
    expect(porcentajeCompletado([])).toBe(0);
  });

  it('calcula el porcentaje correcto con un equipo que sí tiene tareas', () => {
    const tareas = [
      { id: 1, titulo: 'A', estado: 'hecha' as const },
      { id: 2, titulo: 'B', estado: 'hecha' as const },
      { id: 3, titulo: 'C', estado: 'pendiente' as const },
      { id: 4, titulo: 'D', estado: 'en-curso' as const },
    ];
    expect(porcentajeCompletado(tareas)).toBe(50);
  });
});
