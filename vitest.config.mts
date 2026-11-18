import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los tests de integración comparten una única BD de pruebas y la vacían en cada caso:
    // si dos ficheros corren a la vez, uno borra los datos del otro. Con la suite actual
    // (unos segundos) ejecutar los ficheros en serie no se nota.
    fileParallelism: false,
  },
});
