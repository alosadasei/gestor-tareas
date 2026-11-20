import type { Tarea } from '../domain/tarea';
import estilos from './TarjetaTarea.module.css';

const TEXTO_PRIORIDAD = { baja: 'Baja', media: 'Media', alta: 'Alta' } as const;

export function TarjetaTarea({ tarea }: { tarea: Tarea }) {
  // Las tareas guardadas antes de existir `etiquetas` llegan sin el campo.
  const numeroEtiquetas = (tarea.etiquetas ?? []).length;
  return (
    <article className={estilos.tarjeta}>
      <h3 className={estilos.titulo}>{tarea.titulo}</h3>
      <div className={estilos.detalles}>
        <span className={estilos.prioridad} data-prioridad={tarea.prioridad}>
          <span className="solo-lectores">Prioridad </span>
          {TEXTO_PRIORIDAD[tarea.prioridad]}
        </span>
        <span className={estilos.contador}>{numeroEtiquetas} etiquetas</span>
      </div>
    </article>
  );
}
