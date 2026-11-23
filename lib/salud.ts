import { obtenerPrisma } from './db';
import { logger } from './logger';

const TIMEOUT_MS = 1500;

const consultaReal = () => obtenerPrisma().$queryRaw`SELECT 1`;

// Comprobación de la dependencia crítica (base de datos): ejecuta un SELECT 1, así se sabe que
// la BD acepta conexiones, que las credenciales valen y que responde a consultas. Cualquier
// fallo cuenta como "no sana": error de conexión, falta DATABASE_URL o tarda más de TIMEOUT_MS
// (un health check que se queda colgado no sirve a quien lo consulta). El motivo va al log,
// nunca a la respuesta.
export async function comprobarBaseDeDatos(
  consultar: () => Promise<unknown> = consultaReal,
  timeoutMs = TIMEOUT_MS,
): Promise<boolean> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => rechazar(new Error(`sin respuesta en ${timeoutMs} ms`)), timeoutMs);
  });
  try {
    await Promise.race([consultar(), limite]);
    return true;
  } catch (error) {
    logger.warn({ err: error }, 'health check: la base de datos no responde');
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}
