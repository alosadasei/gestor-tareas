import { almacenamiento, repositorioAdjuntos } from '../../../../api/dependencias';
import { conManejoErrores } from '../../../../api/manejador';
import { leerIdRuta, type ContextoConId } from '../../../../api/validacion';
import { ErrorNoEncontrado } from '../../../../domain/errores';

// DELETE /api/adjuntos/:id → 204. Primero se borra el registro (lo que ve la app) y después
// el fichero. Si el almacenamiento falla, el adjunto ya ha desaparecido para el usuario: se
// registra el fallo para limpiar el fichero huérfano, pero no se responde con error.
export const DELETE = conManejoErrores<ContextoConId>(async (_req, ctx) => {
  const id = await leerIdRuta(ctx);
  const adjunto = await repositorioAdjuntos().borrar(id);
  if (!adjunto) throw new ErrorNoEncontrado('Adjunto', id);

  try {
    await almacenamiento().borrar(adjunto.clave);
  } catch (error) {
    ctx.log.warn({ err: error, clave: adjunto.clave }, 'no se pudo borrar el fichero del adjunto');
  }
  ctx.log.info({ adjuntoId: id, tareaId: adjunto.tareaId }, 'adjunto borrado');
  return new Response(null, { status: 204 });
});
