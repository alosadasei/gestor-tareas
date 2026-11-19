import type { Logger } from 'pino';
import { createClient } from 'redis';

// Caché clave → texto con caducidad. La interfaz es mínima para poder sustituir Redis por
// una versión en memoria en los tests.
export interface Cache {
  leer(clave: string): Promise<string | undefined>;
  guardar(clave: string, valor: string, ttlSegundos: number): Promise<void>;
  borrar(clave: string): Promise<void>;
}

export class CacheRedis implements Cache {
  constructor(private readonly cliente: ClienteRedis) {}

  async leer(clave: string): Promise<string | undefined> {
    return (await this.cliente.get(clave)) ?? undefined;
  }

  async guardar(clave: string, valor: string, ttlSegundos: number): Promise<void> {
    await this.cliente.set(clave, valor, { expiration: { type: 'EX', value: ttlSegundos } });
  }

  async borrar(clave: string): Promise<void> {
    await this.cliente.del(clave);
  }

  async cerrar(): Promise<void> {
    if (this.cliente.isOpen) await this.cliente.close();
  }
}

// La caché es una optimización: si Redis no está, la app debe seguir funcionando igual
// (más lenta), nunca fallar ni quedarse esperando. Por eso:
// - connectTimeout corto y pocos reintentos: sin Redis, connect() falla en décimas de segundo;
// - disableOfflineQueue: si la conexión se cae, los comandos fallan al momento en vez de
//   quedarse en cola esperando a que vuelva.
function crearClienteRedis(url: string) {
  return createClient({
    url,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 1000,
      reconnectStrategy: (intentos, causa) =>
        intentos >= 3 ? new Error(`Redis no disponible: ${causa.message}`) : 100 * (intentos + 1),
    },
  });
}

type ClienteRedis = ReturnType<typeof crearClienteRedis>;

export async function conectarCacheRedis(
  url: string,
  log: Logger,
  alCerrarse: () => void = () => {},
): Promise<CacheRedis> {
  const cliente = crearClienteRedis(url);
  // Sin un listener de 'error', un fallo de conexión tumbaría el proceso.
  cliente.on('error', (error) => log.warn({ err: error }, 'error de conexión con Redis'));
  // Agotados los reintentos el cliente se cierra: quien lo creó puede crear otro más tarde.
  cliente.on('end', alCerrarse);
  await cliente.connect();
  return new CacheRedis(cliente);
}

export type OrigenDato = 'HIT' | 'MISS' | 'BYPASS';

// Patrón cache-aside: se busca primero en la caché; si no está (MISS), se calcula con
// `cargar`, se guarda con su TTL y se devuelve. Sin caché, o si esta falla, se calcula
// directamente (BYPASS). El valor se guarda como JSON, así que T debe ser serializable.
export async function cacheAside<T>(
  cache: Cache | undefined,
  clave: string,
  ttlSegundos: number,
  cargar: () => Promise<T>,
  log: Logger,
): Promise<{ valor: T; origen: OrigenDato }> {
  if (!cache) return { valor: await cargar(), origen: 'BYPASS' };

  try {
    const guardado = await cache.leer(clave);
    if (guardado !== undefined) return { valor: JSON.parse(guardado) as T, origen: 'HIT' };
  } catch (error) {
    log.warn({ err: error, clave }, 'no se pudo leer de la caché');
    return { valor: await cargar(), origen: 'BYPASS' };
  }

  const valor = await cargar();
  try {
    await cache.guardar(clave, JSON.stringify(valor), ttlSegundos);
  } catch (error) {
    log.warn({ err: error, clave }, 'no se pudo guardar en la caché');
  }
  return { valor, origen: 'MISS' };
}

// Invalidar es "best effort": si falla, el dato caducará solo por su TTL.
export async function invalidar(cache: Cache | undefined, clave: string, log: Logger) {
  try {
    await cache?.borrar(clave);
  } catch (error) {
    log.warn({ err: error, clave }, 'no se pudo invalidar la caché');
  }
}
