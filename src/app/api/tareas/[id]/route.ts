import { repositorioTareas } from '../../../../api/dependencias';
import { esquemaEditarTarea } from '../../../../api/esquemas';
import { conManejoErrores } from '../../../../api/manejador';
import { leerCuerpo, leerIdRuta, type ContextoConId } from '../../../../api/validacion';
import { ErrorNoEncontrado } from '../../../../domain/errores';

// GET /api/tareas/:id
export const GET = conManejoErrores<ContextoConId>(async (_req, ctx) => {
  const id = await leerIdRuta(ctx);
  const tarea = await repositorioTareas().obtener(id);
  if (!tarea) throw new ErrorNoEncontrado('Tarea', id);
  return Response.json(tarea);
});

// PATCH /api/tareas/:id → cambios parciales; el estado se cambia en /estado.
export const PATCH = conManejoErrores<ContextoConId>(async (req, ctx) => {
  const id = await leerIdRuta(ctx);
  const cambios = await leerCuerpo(req, esquemaEditarTarea);
  const tarea = await repositorioTareas().actualizar(id, cambios);
  if (!tarea) throw new ErrorNoEncontrado('Tarea', id);
  ctx.log.info({ tareaId: id, campos: Object.keys(cambios) }, 'tarea actualizada');
  return Response.json(tarea);
});

// DELETE /api/tareas/:id → 204. Es un soft-delete: la tarea deja de verse pero se conserva.
export const DELETE = conManejoErrores<ContextoConId>(async (_req, ctx) => {
  const id = await leerIdRuta(ctx);
  if (!(await repositorioTareas().borrar(id))) throw new ErrorNoEncontrado('Tarea', id);
  ctx.log.info({ tareaId: id }, 'tarea borrada');
  return new Response(null, { status: 204 });
});
