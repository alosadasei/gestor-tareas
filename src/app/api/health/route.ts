import { comprobarBaseDeDatos } from '../../../../lib/salud';

// Siempre se evalúa en cada petición: un health check cacheado no sirve para nada.
export const dynamic = 'force-dynamic';

// Responde solo "ok" o "degraded": sin versiones, hosts ni cadenas de conexión.
export async function GET() {
  const sana = await comprobarBaseDeDatos();
  return Response.json(
    { status: sana ? 'ok' : 'degraded' },
    { status: sana ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
