import { createClient } from 'redis';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { obtenerPrisma } from '../../lib/db';
import { cache, cerrarCache } from '../../src/api/dependencias';
import { GET } from '../../src/app/api/estadisticas/route';
import { PATCH as CAMBIAR_ESTADO } from '../../src/app/api/tareas/[id]/estado/route';
import { POST as CREAR_TAREA } from '../../src/app/api/tareas/route';
import { CLAVE_CACHE_ESTADISTICAS, TTL_ESTADISTICAS_SEGUNDOS } from '../../src/services/estadisticas';
import { urlBdDePrueba, urlRedisDePrueba } from '../bdDePrueba';
import { conId, peticion, usarBdDePrueba } from './apiDePrueba';

const obtenerEstadisticas = async () => {
  const respuesta = await GET(peticion('GET', '/api/estadisticas'), {});
  return { origen: respuesta.headers.get('X-Cache'), cuerpo: await respuesta.json() };
};

describe.skipIf(!urlBdDePrueba)('/api/estadisticas', () => {
  const usuarios = usarBdDePrueba();

  const crearTarea = async (datos: object = {}) =>
    (await CREAR_TAREA(peticion('POST', '/api/tareas', { titulo: 'T', responsableId: usuarios.ana, ...datos }), {})).json();

  afterEach(async () => {
    await cerrarCache();
    delete process.env.REDIS_URL;
  });

  it('calcula el resumen del tablero (sin Redis: BYPASS)', async () => {
    const t = await crearTarea({ prioridad: 'alta' });
    await crearTarea();
    await CAMBIAR_ESTADO(peticion('PATCH', `/api/tareas/${t.id}/estado`, { estado: 'hecha' }), conId(t.id));

    const { origen, cuerpo } = await obtenerEstadisticas();
    expect(origen).toBe('BYPASS');
    expect(cuerpo).toMatchObject({
      total: 2,
      porcentajeCompletado: 50,
      porEstado: [
        { estado: 'pendiente', total: 1 },
        { estado: 'en-curso', total: 0 },
        { estado: 'hecha', total: 1, porPrioridad: { baja: 0, media: 0, alta: 1 } },
      ],
      atrasadasPorResponsable: [],
      generadoEn: expect.any(String),
    });
  });

  it('si Redis no responde, sirve el dato igualmente sin caché', async () => {
    process.env.REDIS_URL = 'redis://localhost:6399';
    const { origen, cuerpo } = await obtenerEstadisticas();
    expect(origen).toBe('BYPASS');
    expect(cuerpo.total).toBe(0);
  });

  // Demostración del cache-aside con Redis real: necesita TEST_REDIS_URL.
  describe.skipIf(!urlRedisDePrueba)('con Redis', () => {
    beforeEach(async () => {
      process.env.REDIS_URL = urlRedisDePrueba;
      await (await cache())!.borrar(CLAVE_CACHE_ESTADISTICAS);
    });

    afterAll(async () => {
      await cerrarCache();
    });

    it('la primera petición calcula (MISS) y las siguientes salen de Redis (HIT)', async () => {
      await crearTarea();
      const primera = await obtenerEstadisticas();
      const segunda = await obtenerEstadisticas();

      expect(primera.origen).toBe('MISS');
      expect(segunda.origen).toBe('HIT');
      // Mismo instante de cálculo: la segunda no ha consultado la BD.
      expect(segunda.cuerpo).toEqual(primera.cuerpo);
    });

    it('un cambio en la BD que no pasa por la API no se ve hasta invalidar: el dato sale de la caché', async () => {
      await crearTarea();
      expect((await obtenerEstadisticas()).cuerpo.total).toBe(1);

      // Inserción directa, sin pasar por el repositorio: nadie invalida la caché.
      await obtenerPrisma().tarea.create({ data: { titulo: 'Directa', responsableId: usuarios.ana } });
      const cacheada = await obtenerEstadisticas();
      expect(cacheada).toMatchObject({ origen: 'HIT', cuerpo: { total: 1 } });

      // Una escritura por la API invalida: la siguiente lectura recalcula con las 3 tareas.
      await crearTarea();
      expect(await obtenerEstadisticas()).toMatchObject({ origen: 'MISS', cuerpo: { total: 3 } });
    });

    it('cambiar el estado de una tarea invalida las estadísticas', async () => {
      const t = await crearTarea();
      await obtenerEstadisticas();
      await CAMBIAR_ESTADO(peticion('PATCH', `/api/tareas/${t.id}/estado`, { estado: 'hecha' }), conId(t.id));

      expect(await obtenerEstadisticas()).toMatchObject({ origen: 'MISS', cuerpo: { porcentajeCompletado: 100 } });
    });

    it('guarda el dato en Redis con caducidad', async () => {
      await obtenerEstadisticas();
      const redis = await createClient({ url: urlRedisDePrueba }).connect();
      try {
        expect(JSON.parse((await redis.get(CLAVE_CACHE_ESTADISTICAS))!)).toMatchObject({ total: 0 });
        const ttl = await redis.ttl(CLAVE_CACHE_ESTADISTICAS);
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(TTL_ESTADISTICAS_SEGUNDOS);
      } finally {
        await redis.close();
      }
    });
  });
});
