import { exigirTarea, repositorioComentarios } from '../../../../../api/dependencias';
import { esquemaCrearComentario } from '../../../../../api/esquemas';
import { conManejoErrores } from '../../../../../api/manejador';
import { leerCuerpo, leerIdRuta, type ContextoConId } from '../../../../../api/validacion';

// GET /api/tareas/:id/comentarios → comentarios de la tarea con su autor, en orden.
export const GET = conManejoErrores<ContextoConId>(async (_req, ctx) => {
  const tareaId = await leerIdRuta(ctx);
  await exigirTarea(tareaId);
  return Response.json({ data: await repositorioComentarios().listar(tareaId) });
});

// POST /api/tareas/:id/comentarios → 201 con el comentario creado.
// Sin autenticación, el autor llega en el cuerpo (autorId); con login saldría de la sesión.
export const POST = conManejoErrores<ContextoConId>(async (req, ctx) => {
  const tareaId = await leerIdRuta(ctx);
  const { autorId, texto } = await leerCuerpo(req, esquemaCrearComentario);
  await exigirTarea(tareaId);
  const comentario = await repositorioComentarios().crear(tareaId, autorId, texto);
  ctx.log.info({ tareaId, comentarioId: comentario.id }, 'comentario creado');
  return Response.json(comentario, { status: 201 });
});
