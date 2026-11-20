import { describe, expect, it } from 'vitest';
import { etiquetasDeTarea } from './etiquetas';

describe('etiquetasDeTarea', () => {
  it('descarta las vacías y ordena alfabéticamente', () => {
    expect(etiquetasDeTarea({ etiquetas: ['frontend', '', 'api', '  ', 'bug'] })).toEqual(['api', 'bug', 'frontend']);
  });

  it('no modifica las etiquetas de la tarea', () => {
    const tarea = { etiquetas: ['b', 'a'] };
    etiquetasDeTarea(tarea);
    expect(tarea.etiquetas).toEqual(['b', 'a']);
  });
});
