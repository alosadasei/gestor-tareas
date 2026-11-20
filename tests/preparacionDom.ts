import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Preparación de los tests de componentes (los que declaran `@vitest-environment jsdom`).
// En el resto de tests no hay DOM y no se hace nada.
if (typeof window !== 'undefined') {
  // Desmonta lo renderizado en cada test para que no se acumule en el documento.
  afterEach(cleanup);

  // jsdom no implementa showModal()/close() de <dialog>: lo justo para abrirlo, cerrarlo y
  // avisar con el evento close, como hace el navegador.
  const dialogo = window.HTMLDialogElement.prototype;
  dialogo.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  dialogo.close ??= function (this: HTMLDialogElement) {
    if (!this.open) return;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}
