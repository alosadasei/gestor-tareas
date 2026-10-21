import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../utils/tareas';
import { TarjetaTarea } from './TarjetaTarea';

const base = { id: 1, titulo: 'Tarea', estado: 'pendiente', prioridad: 1, subtareas: [] };

describe('TarjetaTarea', () => {
  it('muestra 0 etiquetas si el campo etiquetas es undefined (datos antiguos)', () => {
    const tarea = base as unknown as Tarea;
    expect(renderToStaticMarkup(<TarjetaTarea tarea={tarea} />)).toContain('0 etiquetas');
  });

  it('cuenta las etiquetas cuando existen', () => {
    const tarea = { ...base, etiquetas: ['a', 'b'] } as unknown as Tarea;
    expect(renderToStaticMarkup(<TarjetaTarea tarea={tarea} />)).toContain('2 etiquetas');
  });
});
