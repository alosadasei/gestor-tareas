'use client';

import { useEffect, useState } from 'react';
import { ErrorApi } from '../cliente/api';
import estilos from './Avisos.module.css';

export type Aviso = { tipo: 'exito' | 'error'; texto: string };

export const mensajeDeError = (error: unknown) =>
  error instanceof ErrorApi ? error.message : 'Ha ocurrido un error inesperado.';

// Estado de los avisos de una página. Los de éxito desaparecen solos; los de error se quedan
// hasta que se cierran o llega otro aviso.
export function useAvisos() {
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    if (aviso?.tipo !== 'exito') return;
    const temporizador = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(temporizador);
  }, [aviso]);

  return {
    aviso,
    exito: (texto: string) => setAviso({ tipo: 'exito', texto }),
    error: (texto: string) => setAviso({ tipo: 'error', texto }),
    cerrar: () => setAviso(null),
  };
}

// Avisos flotantes. Las dos regiones existen siempre (vacías) para que el lector de pantalla
// las tenga registradas: role=status se lee sin interrumpir; role=alert, en cuanto aparece.
export function Avisos({ aviso, alCerrar }: { aviso: Aviso | null; alCerrar: () => void }) {
  return (
    <div className={estilos.avisos}>
      <div role="status">{aviso?.tipo === 'exito' && <p className={estilos.aviso}>{aviso.texto}</p>}</div>
      <div role="alert">
        {aviso?.tipo === 'error' && (
          <p className={`${estilos.aviso} ${estilos.avisoError}`}>
            {aviso.texto}
            <button type="button" className={estilos.cerrar} onClick={alCerrar}>
              Cerrar
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
