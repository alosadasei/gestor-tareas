import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheAside, invalidar, type Cache } from './cache';
import { logger } from './logger';

class CacheEnMemoria implements Cache {
  datos = new Map<string, { valor: string; ttl: number }>();
  rota = false;

  async leer(clave: string) {
    if (this.rota) throw new Error('caché caída');
    return this.datos.get(clave)?.valor;
  }
  async guardar(clave: string, valor: string, ttl: number) {
    if (this.rota) throw new Error('caché caída');
    this.datos.set(clave, { valor, ttl });
  }
  async borrar(clave: string) {
    if (this.rota) throw new Error('caché caída');
    this.datos.delete(clave);
  }
}

describe('cacheAside', () => {
  let cache: CacheEnMemoria;
  let cargar: ReturnType<typeof vi.fn<() => Promise<{ total: number }>>>;

  beforeEach(() => {
    cache = new CacheEnMemoria();
    cargar = vi.fn(async () => ({ total: 42 }));
  });

  it('la primera vez calcula el valor (MISS) y lo guarda con su TTL', async () => {
    expect(await cacheAside(cache, 'k', 60, cargar, logger)).toEqual({ valor: { total: 42 }, origen: 'MISS' });
    expect(cargar).toHaveBeenCalledTimes(1);
    expect(cache.datos.get('k')).toEqual({ valor: '{"total":42}', ttl: 60 });
  });

  it('las siguientes lo sirven desde la caché (HIT) sin volver a calcularlo', async () => {
    await cacheAside(cache, 'k', 60, cargar, logger);
    expect(await cacheAside(cache, 'k', 60, cargar, logger)).toEqual({ valor: { total: 42 }, origen: 'HIT' });
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('tras invalidar vuelve a calcularlo', async () => {
    await cacheAside(cache, 'k', 60, cargar, logger);
    await invalidar(cache, 'k', logger);
    expect((await cacheAside(cache, 'k', 60, cargar, logger)).origen).toBe('MISS');
    expect(cargar).toHaveBeenCalledTimes(2);
  });

  it('sin caché configurada calcula siempre (BYPASS)', async () => {
    expect(await cacheAside(undefined, 'k', 60, cargar, logger)).toEqual({ valor: { total: 42 }, origen: 'BYPASS' });
  });

  it('si la caché falla, responde igual calculando el valor', async () => {
    cache.rota = true;
    expect(await cacheAside(cache, 'k', 60, cargar, logger)).toEqual({ valor: { total: 42 }, origen: 'BYPASS' });
    await expect(invalidar(cache, 'k', logger)).resolves.toBeUndefined();
  });

  it('si falla solo al guardar, devuelve el valor calculado', async () => {
    vi.spyOn(cache, 'guardar').mockRejectedValueOnce(new Error('sin memoria'));
    expect(await cacheAside(cache, 'k', 60, cargar, logger)).toEqual({ valor: { total: 42 }, origen: 'MISS' });
  });

  it('no oculta los errores de la carga: un fallo de la BD sigue siendo un error', async () => {
    cargar.mockRejectedValueOnce(new Error('BD caída'));
    await expect(cacheAside(cache, 'k', 60, cargar, logger)).rejects.toThrow('BD caída');
  });
});
