import { repositorioTareas } from '../../../../../api/dependencias';
import { esquemaCambiarEstado } from '../../../../../api/esquemas';
import { conManejoErrores } from '../../../../../api/manejador';
import { leerCuerpo, leerIdRuta, type ContextoConId } from '../../../../../api/validacion';
import { ErrorNoEncontrado } from '../../../../../domain/errores';

// PATCH /api/tareas/:id/estado → mover la tarjeta de columna en el tablero. Va en su propio
// recurso porque es la operación más frecuente y la que se audita como cambio de estado.
export const PATCH = conManejoErrores<ContextoConId>(async (req, ctx) => {
  const id = await leerIdRuta(ctx);
  const { estado } = await leerCuerpo(req, esquemaCambiarEstado);
  const tarea = await repositorioTareas().cambiarEstado(id, estado);
  if (!tarea) throw new ErrorNoEncontrado('Tarea', id);
  ctx.log.info({ tareaId: id, estado }, 'estado de tarea cambiado');
  return Response.json(tarea);
});
