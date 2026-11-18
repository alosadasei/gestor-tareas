import { repositorioTareas } from '../../../api/dependencias';
import { esquemaCrearTarea, esquemaListadoTareas } from '../../../api/esquemas';
import { conManejoErrores } from '../../../api/manejador';
import { leerCuerpo, leerQuery } from '../../../api/validacion';

// GET /api/tareas?pagina=&tamanoPagina=&estado=&prioridad=&responsableId=&texto=&ordenarPor=&direccion=
export const GET = conManejoErrores(async (req) => {
  const consulta = leerQuery(req, esquemaListadoTareas);
  const { elementos, total, pagina, tamanoPagina } = await repositorioTareas().listar(consulta);
  return Response.json({
    data: elementos,
    meta: { pagina, tamanoPagina, total, totalPaginas: Math.ceil(total / tamanoPagina) },
  });
});

// POST /api/tareas → 201 con la tarea creada y su URL en Location.
export const POST = conManejoErrores(async (req, { log }) => {
  const datos = await leerCuerpo(req, esquemaCrearTarea);
  const tarea = await repositorioTareas().crear(datos);
  log.info({ tareaId: tarea.id }, 'tarea creada');
  return Response.json(tarea, { status: 201, headers: { Location: `/api/tareas/${tarea.id}` } });
});
