import { almacenamiento, exigirTarea } from '../../../../../../api/dependencias';
import { esquemaSolicitudSubida } from '../../../../../../api/esquemas';
import { conManejoErrores } from '../../../../../../api/manejador';
import { leerCuerpo, leerIdRuta, type ContextoConId } from '../../../../../../api/validacion';
import { generarClaveAdjunto } from '../../../../../../domain/adjunto';

// POST /api/tareas/:id/adjuntos/subida → paso 1 de 2 para adjuntar un fichero.
// El cliente declara nombre, tipo y tamaño; si son válidos recibe una URL firmada a la que
// subir el fichero directamente (PUT) y la clave con la que después lo registrará en
// POST /api/tareas/:id/adjuntos. Aún no se crea nada en la BD.
export const POST = conManejoErrores<ContextoConId>(async (req, ctx) => {
  const tareaId = await leerIdRuta(ctx);
  const { nombreArchivo, tipoMime, tamanoBytes } = await leerCuerpo(req, esquemaSolicitudSubida);
  await exigirTarea(tareaId);

  const clave = generarClaveAdjunto(tareaId, nombreArchivo);
  const subida = await almacenamiento().urlSubida(clave, tipoMime, tamanoBytes);
  ctx.log.info({ tareaId, clave }, 'URL de subida firmada');
  return Response.json({ clave, subida });
});
