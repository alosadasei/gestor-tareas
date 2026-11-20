import { cache } from 'react';
import { obtenerPrisma } from '../../lib/db';
import { logger } from '../../lib/logger';
import {
  almacenamiento,
  repositorioAdjuntos,
  repositorioComentarios,
  repositorioTareas,
} from '../api/dependencias';
import type { Adjunto, Comentario, Tarea, Usuario } from '../cliente/api';
import { listarUsuarios } from '../repositorios/catalogos';

export type DatosDetalle = {
  tarea: Tarea;
  usuarios: Usuario[];
  comentarios: Comentario[];
  // null si el almacenamiento no está disponible: la tarea se ve igual, sin sus adjuntos.
  adjuntos: Adjunto[] | null;
};

// Misma forma que las respuestas de la API (fechas como texto), para que los componentes
// cliente trabajen igual con los datos iniciales que con lo que devuelven sus peticiones.
const comoJson = <T>(valor: unknown): T => JSON.parse(JSON.stringify(valor)) as T;

async function cargarAdjuntos(tareaId: number): Promise<Adjunto[] | null> {
  try {
    const lista = await repositorioAdjuntos().listar(tareaId);
    const almacen = almacenamiento();
    return comoJson(
      await Promise.all(
        lista.map(async ({ clave, ...adjunto }) => ({
          ...adjunto,
          urlDescarga: await almacen.urlDescarga(clave, adjunto.nombreArchivo),
        })),
      ),
    );
  } catch (error) {
    logger.warn({ err: error, tareaId }, 'adjuntos no disponibles en el detalle de la tarea');
    return null;
  }
}

// cache(): generateMetadata y la página piden los mismos datos en la misma petición; así
// solo se consultan una vez.
export const cargarDetalle = cache(async (id: number): Promise<DatosDetalle | undefined> => {
  const tarea = await repositorioTareas().obtener(id);
  if (!tarea) return undefined;
  const [usuarios, comentarios, adjuntos] = await Promise.all([
    listarUsuarios(obtenerPrisma()),
    repositorioComentarios().listar(id),
    cargarAdjuntos(id),
  ]);
  return { tarea: comoJson(tarea), usuarios, comentarios: comoJson(comentarios), adjuntos };
});
