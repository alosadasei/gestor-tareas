import type { Tarea } from './tarea';

/**
 * Devuelve las etiquetas no vacías de una tarea, ordenadas alfabéticamente.
 *
 * @param tarea Tarea de la que se extraen las etiquetas.
 * @returns Las etiquetas de `tarea` sin las vacías, en orden alfabético.
 */
// Se descartan las etiquetas vacías y se ordenan alfabéticamente porque en el tablero
// aparecían en blanco y en orden aleatorio, confundiendo a los equipos (ticket #305).
export function etiquetasDeTarea(tarea: Pick<Tarea, 'etiquetas'>): string[] {
  return tarea.etiquetas
    .filter((e) => e.trim() !== '')
    .sort((a, b) => a.localeCompare(b));
}
