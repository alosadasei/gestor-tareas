import {
  almacenamiento,
  exigirTarea,
  repositorioAdjuntos,
} from '../../../../../api/dependencias';
import { esquemaRegistrarAdjunto } from '../../../../../api/esquemas';
import { conManejoErrores } from '../../../../../api/manejador';
import { leerCuerpo, leerIdRuta, type ContextoConId } from '../../../../../api/validacion';
import { claveEsDeTarea, type Adjunto } from '../../../../../domain/adjunto';
import { ErrorValidacion } from '../../../../../domain/errores';

// Lo que ve el cliente: metadatos y una URL de descarga firmada. La clave interna no sale.
async function aRespuesta({ clave, ...adjunto }: Adjunto) {
  return { ...adjunto, urlDescarga: await almacenamiento().urlDescarga(clave, adjunto.nombreArchivo) };
}

// GET /api/tareas/:id/adjuntos → adjuntos de la tarea con su URL de descarga (caduca).
export const GET = conManejoErrores<ContextoConId>(async (_req, ctx) => {
  const tareaId = await leerIdRuta(ctx);
  await exigirTarea(tareaId);
  const adjuntos = await repositorioAdjuntos().listar(tareaId);
  return Response.json({ data: await Promise.all(adjuntos.map(aRespuesta)) });
});

// POST /api/tareas/:id/adjuntos → paso 2 de 2: registra el fichero ya subido con la URL
// firmada. Se comprueba en el almacenamiento que existe y que su tamaño es el declarado,
// para no guardar referencias a ficheros que nunca llegaron.
export const POST = conManejoErrores<ContextoConId>(async (req, ctx) => {
  const tareaId = await leerIdRuta(ctx);
  const datos = await leerCuerpo(req, esquemaRegistrarAdjunto);
  await exigirTarea(tareaId);

  if (!claveEsDeTarea(datos.clave, tareaId)) {
    throw new ErrorValidacion('La clave del archivo no corresponde a esta tarea', [
      { campo: 'clave', mensaje: 'Usa la clave devuelta por /adjuntos/subida para esta tarea' },
    ]);
  }
  const tamanoReal = await almacenamiento().tamano(datos.clave);
  if (tamanoReal === undefined) {
    throw new ErrorValidacion('El archivo no se ha subido al almacenamiento');
  }
  if (tamanoReal !== datos.tamanoBytes) {
    throw new ErrorValidacion('El tamaño del archivo subido no coincide con el declarado');
  }

  const adjunto = await repositorioAdjuntos().crear({ tareaId, ...datos });
  ctx.log.info({ tareaId, adjuntoId: adjunto.id }, 'adjunto registrado');
  return Response.json(await aRespuesta(adjunto), { status: 201 });
});
