'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import estilos from './Dialogo.module.css';
import { IconoCerrar } from './Iconos';

// Diálogo modal sobre el <dialog> nativo: con showModal() el navegador ya atrapa el foco
// dentro, deja el resto de la página inerte, cierra con Escape y devuelve el foco al
// elemento que lo abrió. El contenido solo se monta mientras está abierto, así un
// formulario empieza limpio cada vez. Para elegir dónde empieza el foco se marca el
// elemento con data-autofocus (el autoFocus de React no sirve: se aplica antes de
// showModal(), que lo mueve al primer elemento enfocable, el botón de cerrar).
export function Dialogo({
  abierto,
  titulo,
  alCerrar,
  children,
}: {
  abierto: boolean;
  titulo: string;
  alCerrar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) {
      dialogo.showModal();
      dialogo.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog ref={ref} className={estilos.dialogo} aria-labelledby={idTitulo} onClose={alCerrar}>
      {abierto && (
        <>
          <header className={estilos.cabecera}>
            <h2 id={idTitulo}>{titulo}</h2>
            <button type="button" className={estilos.cerrar} onClick={alCerrar} aria-label="Cerrar">
              <IconoCerrar tamano={20} />
            </button>
          </header>
          {children}
        </>
      )}
    </dialog>
  );
}
