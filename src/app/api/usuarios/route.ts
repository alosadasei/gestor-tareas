import { obtenerPrisma } from '../../../../lib/db';
import { conManejoErrores } from '../../../api/manejador';
import { listarUsuarios } from '../../../repositorios/catalogos';

// GET /api/usuarios → posibles responsables y autores de comentarios.
export const GET = conManejoErrores(async () => {
  return Response.json({ data: await listarUsuarios(obtenerPrisma()) });
});
