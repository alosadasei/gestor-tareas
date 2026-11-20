import { defineConfig, devices } from '@playwright/test';

// Tests end-to-end: la app de producción (next build + next start) contra la BD de
// DATABASE_URL con los datos del seed. Cada test crea y borra lo suyo.
const PUERTO = 3100;
const URL_BASE = `http://localhost:${PUERTO}`;

export default defineConfig({
  testDir: 'e2e',
  // Los tests escriben en la misma BD: en serie para que no se pisen.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: URL_BASE,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'] } },
    { name: 'movil', use: { ...devices['Pixel 7'] }, testMatch: /accesibilidad/ },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PUERTO}`,
    url: `${URL_BASE}/api/health`,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    // Vacía: el navegador llama a la API del mismo origen (/api) y no a la URL de .env.local.
    env: { NEXT_PUBLIC_API_URL: '' },
  },
});
