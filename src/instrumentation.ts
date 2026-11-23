import * as Sentry from '@sentry/nextjs';
import { configBaseDeDatos, configOpcional } from '../lib/env';
import { opcionesSentry } from '../lib/sentryConfig';

// Errores de servidor (Node y Edge): el DSN privado vive solo en SENTRY_DSN.
// Al arrancar el servidor se validan las variables sin las que la app no puede funcionar, para
// fallar en el despliegue con un mensaje claro y no en la primera petición. El almacenamiento
// no entra: sin él la app funciona, solo que sin adjuntos.
export function register() {
  Sentry.init(opcionesSentry(process.env.SENTRY_DSN));
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    configBaseDeDatos();
    configOpcional();
  }
}

// Captura los errores no controlados de renderizado, rutas y server actions.
export const onRequestError = Sentry.captureRequestError;
