import { obtenerPrisma } from '../../lib/db';
import { repositorioTareas } from '../api/dependencias';
import type { Tarea as TareaJson, Usuario } from '../cliente/api';
import type { Tarea } from '../domain/tarea';
import { listarUsuarios } from '../repositorios/catalogos';

// El tablero muestra todas las tareas a la vez (no paginado). Se piden por páginas del
// tamaño máximo que admite la API, con un tope por si algún día hubiera miles.
const TAMANO_PAGINA = 100;
const MAXIMO_TAREAS = 1000;

// Misma forma que devuelve la API (fechas como texto), para que el componente cliente
// trabaje igual con los datos iniciales que con las respuestas de sus peticiones.
function aJson(tarea: Tarea): TareaJson {
  const { fechaLimite, ...resto } = tarea;
  return fechaLimite ? { ...resto, fechaLimite: fechaLimite.toISOString() } : resto;
}

export async function cargarTablero(): Promise<{ tareas: TareaJson[]; usuarios: Usuario[] }> {
  const repo = repositorioTareas();
  const tareas: Tarea[] = [];
  for (let pagina = 1; tareas.length < MAXIMO_TAREAS; pagina++) {
    const { elementos, total } = await repo.listar({ pagina, tamanoPagina: TAMANO_PAGINA });
    tareas.push(...elementos);
    if (tareas.length >= total || elementos.length === 0) break;
  }
  const usuarios = await listarUsuarios(obtenerPrisma());
  return { tareas: tareas.map(aJson), usuarios };
}
