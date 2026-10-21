// Configuración común de Sentry. El DSN llega siempre por variable de entorno (nunca en el código).
// Sin DSN el SDK queda desactivado, así que en local y en CI no se envía nada.
// `environment` separa los errores de production y preview en el panel.
export function opcionesSentry(dsn: string | undefined) {
  return {
    dsn,
    environment:
      process.env.NEXT_PUBLIC_APP_ENV ??
      process.env.VERCEL_ENV ??
      process.env.NODE_ENV ??
      'development',
    tracesSampleRate: 0,
  };
}
