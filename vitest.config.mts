import { defineConfig } from 'vitest/config';

// Tests de integración: los de la API (tests/) y los que usan la BD real (*.integracion.test.ts).
// Sin TEST_DATABASE_URL se saltan solos.
const INTEGRACION = ['tests/**/*.test.ts', '**/*.integracion.test.ts'];

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['**/*.test.{ts,tsx}'],
          exclude: [...INTEGRACION, '**/node_modules/**', '.next/**', 'e2e/**'],
          setupFiles: ['tests/preparacionDom.ts'],
        },
      },
      {
        test: {
          name: 'integracion',
          include: INTEGRACION,
          // Comparten una única BD de pruebas y la vacían en cada caso: si dos ficheros
          // corren a la vez, uno borra los datos del otro. Por eso van en serie.
          fileParallelism: false,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'lib/**/*.ts'],
      exclude: [
        'src/generated/**',
        '**/*.test.{ts,tsx}',
        // Piezas de Next.js que solo tienen sentido con el servidor en marcha (páginas,
        // layouts, estados de carga y error, instrumentación de Sentry): las cubre el e2e.
        'src/app/**/{page,layout,loading,error,not-found,global-error}.tsx',
        'src/instrumentation*.ts',
        'lib/sentryConfig.ts',
      ],
      reporter: ['text-summary', 'html', 'lcov'],
      // Por debajo del 60 % el run falla (requisito del proyecto).
      thresholds: { lines: 60, functions: 60, branches: 60, statements: 60 },
    },
  },
});
