import * as Sentry from '@sentry/nextjs';
import { opcionesSentry } from '../lib/sentryConfig';

// Errores de servidor (Node y Edge): el DSN privado vive solo en SENTRY_DSN.
export function register() {
  Sentry.init(opcionesSentry(process.env.SENTRY_DSN));
}

// Captura los errores no controlados de renderizado, rutas y server actions.
export const onRequestError = Sentry.captureRequestError;
