import * as Sentry from '@sentry/nextjs';
import { opcionesSentry } from '../lib/sentryConfig';

// Errores de cliente (navegador). Aquí el DSN debe ser NEXT_PUBLIC_SENTRY_DSN: un DSN no es una
// clave de acceso, solo permite enviar eventos, y Next solo inyecta en el bundle las NEXT_PUBLIC_*.
Sentry.init(opcionesSentry(process.env.NEXT_PUBLIC_SENTRY_DSN));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
