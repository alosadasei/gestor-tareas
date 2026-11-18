import { obtenerPrisma } from '../../../../lib/db';
import { conManejoErrores } from '../../../api/manejador';
import { listarEtiquetas } from '../../../repositorios/catalogos';

// GET /api/etiquetas → etiquetas existentes con cuántas tareas las usan.
export const GET = conManejoErrores(async () => {
  return Response.json({ data: await listarEtiquetas(obtenerPrisma()) });
});
