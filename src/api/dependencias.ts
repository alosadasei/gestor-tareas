import { crearAlmacenamientoS3, type Almacenamiento } from '../../lib/almacenamiento';
import { conectarCacheRedis, type Cache, type CacheRedis } from '../../lib/cache';
import { obtenerPrisma } from '../../lib/db';
import { logger } from '../../lib/logger';
import { ErrorNoEncontrado } from '../domain/errores';
import type { TareaRepositorio } from '../domain/tareaRepositorio';
import { AdjuntoRepositorioPrisma } from '../repositorios/adjuntoRepositorioPrisma';
import { ComentarioRepositorioPrisma } from '../repositorios/comentarioRepositorioPrisma';
import { TareaRepositorioPrisma } from '../repositorios/tareaRepositorioPrisma';
import { TareaRepositorioQueInvalida } from '../repositorios/tareaRepositorioQueInvalida';
import { CLAVE_CACHE_ESTADISTICAS } from '../services/estadisticas';

// Punto único donde las rutas obtienen sus dependencias: cambiar de implementación
// (p. ej. la versión en memoria) solo exige tocar este fichero.
// Las escrituras de tareas invalidan las estadísticas cacheadas.
export function repositorioTareas(): TareaRepositorio {
  return new TareaRepositorioQueInvalida(
    new TareaRepositorioPrisma(obtenerPrisma()),
    cache,
    [CLAVE_CACHE_ESTADISTICAS],
    logger,
  );
}

export function repositorioComentarios(): ComentarioRepositorioPrisma {
  return new ComentarioRepositorioPrisma(obtenerPrisma());
}

export function repositorioAdjuntos(): AdjuntoRepositorioPrisma {
  return new AdjuntoRepositorioPrisma(obtenerPrisma());
}

// Un único cliente S3 por proceso, creado al primer uso (como el de Prisma).
let almacenamientoCompartido: Almacenamiento | undefined;

export function almacenamiento(): Almacenamiento {
  almacenamientoCompartido ??= crearAlmacenamientoS3();
  return almacenamientoCompartido;
}

// Caché Redis compartida, opcional: sin REDIS_URL (p. ej. en producción, donde no hay Redis)
// la app funciona igual sin caché. Si Redis no responde, se deja de intentar durante un rato
// para no sumar el tiempo de conexión fallida a cada petición.
const ESPERA_TRAS_FALLO_MS = 30_000;
let cacheCompartida: Promise<CacheRedis | undefined> | undefined;
let reintentarDesde = 0;

export function cache(): Promise<Cache | undefined> {
  const url = process.env.REDIS_URL;
  if (!url || Date.now() < reintentarDesde) return Promise.resolve(undefined);

  cacheCompartida ??= conectarCacheRedis(url, logger, () => {
    cacheCompartida = undefined;
  }).catch((error) => {
    logger.warn({ err: error }, 'caché desactivada: no se pudo conectar con Redis');
    cacheCompartida = undefined;
    reintentarDesde = Date.now() + ESPERA_TRAS_FALLO_MS;
    return undefined;
  });
  return cacheCompartida;
}

// Cierra la conexión con Redis y olvida el estado (tests, apagado ordenado).
export async function cerrarCache(): Promise<void> {
  const actual = await cacheCompartida;
  cacheCompartida = undefined;
  reintentarDesde = 0;
  await actual?.cerrar();
}

// Para los recursos que cuelgan de una tarea (/api/tareas/:id/...): 404 si la tarea no
// existe o está borrada, igual que en GET /api/tareas/:id.
export async function exigirTarea(id: number): Promise<void> {
  if (!(await repositorioTareas().obtener(id))) throw new ErrorNoEncontrado('Tarea', id);
}
