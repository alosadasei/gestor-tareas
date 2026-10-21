import net from 'node:net';

const TIMEOUT_MS = 1500;

// Comprobación ligera de la dependencia crítica (base de datos): abre una conexión TCP al host
// de DATABASE_URL y la cierra, sin ejecutar ninguna consulta. Si DATABASE_URL no está definida,
// la app no depende aún de una BD y no hay nada que comprobar.
export function comprobarBaseDeDatos(
  url: string | undefined = process.env.DATABASE_URL,
): Promise<boolean> {
  if (!url) return Promise.resolve(true);

  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    return Promise.resolve(false);
  }
  const puerto = Number(destino.port) || 5432;

  return new Promise((resolver) => {
    const socket = net.connect({ host: destino.hostname, port: puerto });
    const terminar = (sana: boolean) => {
      socket.destroy();
      resolver(sana);
    };
    socket.setTimeout(TIMEOUT_MS, () => terminar(false));
    socket.once('connect', () => terminar(true));
    socket.once('error', () => terminar(false));
  });
}
