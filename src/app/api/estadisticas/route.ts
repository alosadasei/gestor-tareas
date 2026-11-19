import { obtenerPrisma } from '../../../../lib/db';
import { cacheAside } from '../../../../lib/cache';
import { cache } from '../../../api/dependencias';
import { conManejoErrores } from '../../../api/manejador';
import {
  calcularEstadisticas,
  CLAVE_CACHE_ESTADISTICAS,
  TTL_ESTADISTICAS_SEGUNDOS,
} from '../../../services/estadisticas';

// GET /api/estadisticas → resumen del tablero con caché cache-aside en Redis.
// La cabecera X-Cache dice de dónde salió la respuesta: HIT (caché), MISS (calculada y
// guardada) o BYPASS (sin caché disponible).
export const GET = conManejoErrores(async (_req, { log }) => {
  const { valor, origen } = await cacheAside(
    await cache(),
    CLAVE_CACHE_ESTADISTICAS,
    TTL_ESTADISTICAS_SEGUNDOS,
    () => calcularEstadisticas(obtenerPrisma()),
    log,
  );
  log.debug({ origen }, 'estadísticas servidas');
  return Response.json(valor, { headers: { 'X-Cache': origen } });
});
