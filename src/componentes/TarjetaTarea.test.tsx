import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Tarea } from '../domain/tarea';
import { TarjetaTarea } from './TarjetaTarea';

const base = { id: 1, titulo: 'Tarea', descripcion: '', estado: 'pendiente', prioridad: 'media', responsableId: 1 };

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
