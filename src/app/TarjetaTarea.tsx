import type { Tarea } from '../utils/tareas';

export function TarjetaTarea({ tarea }: { tarea: Tarea }) {
  // Corrección mínima: contar de forma segura
  const numeroEtiquetas = (tarea.etiquetas ?? []).length;
  return (
    <article
      className="tarjeta"
      style={{ background: '#fff', borderRadius: 6, padding: 10, marginBottom: 8 }}
    >
      <h3 style={{ fontSize: 14, margin: 0 }}>{tarea.titulo}</h3>
      <span className="contador">{numeroEtiquetas} etiquetas</span>
    </article>
  );
}
