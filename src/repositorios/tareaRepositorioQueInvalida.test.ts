import { describe, expect, it, vi } from 'vitest';
import type { Cache } from '../../lib/cache';
import { logger } from '../../lib/logger';
import { TareaRepositorioEnMemoria } from './tareaRepositorioEnMemoria';
import { TareaRepositorioQueInvalida } from './tareaRepositorioQueInvalida';

function preparar() {
  const cache: Cache = { leer: vi.fn(), guardar: vi.fn(), borrar: vi.fn(async () => {}) };
  const repo = new TareaRepositorioQueInvalida(
    new TareaRepositorioEnMemoria(),
    async () => cache,
    ['estadisticas'],
    logger,
  );
  return { repo, borrar: vi.mocked(cache.borrar) };
}

describe('TareaRepositorioQueInvalida', () => {
  it('invalida la caché tras cada escritura con efecto', async () => {
    const { repo, borrar } = preparar();
    const tarea = await repo.crear({ titulo: 'T', responsableId: 1 });
    await repo.actualizar(tarea.id, { titulo: 'Otra' });
    await repo.cambiarEstado(tarea.id, 'hecha');
    await repo.borrar(tarea.id);

    expect(borrar).toHaveBeenCalledTimes(4);
    expect(borrar).toHaveBeenCalledWith('estadisticas');
  });

  it('no invalida en lecturas ni en escrituras sobre tareas inexistentes', async () => {
    const { repo, borrar } = preparar();
    await repo.listar();
    await repo.obtener(1);
    await repo.actualizar(99, { titulo: 'X' });
    await repo.cambiarEstado(99, 'hecha');
    await repo.borrar(99);

    expect(borrar).not.toHaveBeenCalled();
  });

  it('no invalida si la escritura falla por validación', async () => {
    const { repo, borrar } = preparar();
    await expect(repo.crear({ titulo: '', responsableId: 1 })).rejects.toThrow();
    expect(borrar).not.toHaveBeenCalled();
  });
});
