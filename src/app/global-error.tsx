'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Última red de seguridad: errores de renderizado en el cliente.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1>Algo ha salido mal</h1>
        <p>Hemos registrado el error. Inténtalo de nuevo en unos minutos.</p>
      </body>
    </html>
  );
}
