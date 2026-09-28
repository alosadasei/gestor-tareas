// Tarea local a este fichero (solo necesita `etiquetas`); ver src/domain/tarea.ts para
// el tipo Tarea completo del dominio, que no incluye este campo todavía.
type Tarea = {
  etiquetas: string[];
};

/**
 * Devuelve las etiquetas no vacías de una tarea, ordenadas alfabéticamente.
 *
 * @param tarea Tarea de la que se extraen las etiquetas.
 * @returns Las etiquetas de `tarea` sin las vacías, en orden alfabético.
 */
// Se descartan las etiquetas vacías y se ordenan alfabéticamente porque en el tablero
// aparecían en blanco y en orden aleatorio, confundiendo a los equipos (ticket #305).
export function etiquetasDeTarea(tarea: Tarea): string[] {
  return tarea.etiquetas
    .filter((e) => e.trim() !== '')
    .sort((a, b) => a.localeCompare(b));
}
