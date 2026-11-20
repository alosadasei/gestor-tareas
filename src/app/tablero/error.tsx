'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import estilos from './tablero.module.css';

// Si no se pueden cargar las tareas (BD caída...), un mensaje claro y la opción de reintentar
// en vez de una página en blanco. El error se registra en Sentry.
export default function ErrorTablero({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <div className={estilos.estadoVacio} role="alert">
        <h1>No se ha podido cargar el tablero</h1>
        <p>Puede ser un problema momentáneo. Si persiste, avisa al equipo.</p>
        <button type="button" className="boton boton-primario" onClick={reset}>
          Reintentar
        </button>
      </div>
    </div>
  );
}
