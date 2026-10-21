import type { Tarea } from '../utils/tareas';

// Versión con el bug intencionado (ejercicio 05)
export function TarjetaTarea({ tarea }: { tarea: Tarea }) {
  return (
    <article
      className="tarjeta"
      style={{ background: '#fff', borderRadius: 6, padding: 10, marginBottom: 8 }}
    >
      <h3 style={{ fontSize: 14, margin: 0 }}>{tarea.titulo}</h3>
      {/* Revienta si la tarea no tiene etiquetas */}
      <span className="contador">{tarea.etiquetas.length} etiquetas</span>
    </article>
  );
}
