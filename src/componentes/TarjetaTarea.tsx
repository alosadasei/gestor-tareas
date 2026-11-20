import type { ReactNode } from 'react';
import type { Tarea } from '../cliente/api';
import { estaVencida, formatearFecha, iniciales, NOMBRE_PRIORIDAD } from '../cliente/tablero';
import { IconoCalendario } from './Iconos';
import estilos from './TarjetaTarea.module.css';

// Tarjeta de una tarea, solo presentación (sin estado ni hooks). El tablero le pasa el asa
// para arrastrar y los botones de acción.
export function TarjetaTarea({
  tarea,
  responsable,
  asa,
  acciones,
}: {
  tarea: Tarea;
  responsable?: string;
  asa?: ReactNode;
  acciones?: ReactNode;
}) {
  // Las tareas guardadas antes de existir `etiquetas` pueden llegar sin el campo.
  const etiquetas = tarea.etiquetas ?? [];
  const vencida = estaVencida(tarea);

  return (
    <article className={estilos.tarjeta}>
      <div className={estilos.cabecera}>
        <h3 className={estilos.titulo}>{tarea.titulo}</h3>
        {asa}
      </div>

      <div className={estilos.detalles}>
        <span className={estilos.prioridad} data-prioridad={tarea.prioridad}>
          <span className="solo-lectores">Prioridad </span>
          {NOMBRE_PRIORIDAD[tarea.prioridad]}
        </span>
        {tarea.fechaLimite && (
          <span className={estilos.fecha} data-vencida={vencida || undefined}>
            <IconoCalendario tamano={14} />
            <span className="solo-lectores">Fecha límite </span>
            {formatearFecha(tarea.fechaLimite)}
            {vencida && <span className={estilos.textoVencida}> · vencida</span>}
          </span>
        )}
      </div>

      {etiquetas.length > 0 && (
        <ul className={estilos.etiquetas} aria-label="Etiquetas">
          {etiquetas.map((etiqueta) => (
            <li key={etiqueta}>{etiqueta}</li>
          ))}
        </ul>
      )}

      {(responsable || acciones) && (
        <div className={estilos.pie}>
          {responsable && (
            <span className={estilos.responsable}>
              <span className={estilos.avatar} aria-hidden="true">
                {iniciales(responsable)}
              </span>
              <span className="solo-lectores">Responsable: </span>
              {responsable}
            </span>
          )}
          {acciones && <div className={estilos.acciones}>{acciones}</div>}
        </div>
      )}
    </article>
  );
}
