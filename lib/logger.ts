import pino, { type DestinationStream, type Logger } from 'pino';
import { configOpcional } from './env';

// Logs estructurados: una línea JSON por evento en stdout, que Vercel recoge tal cual y
// permite filtrar por campo (requestId, estado...). En los tests se silencian salvo que se
// pida un nivel con LOG_LEVEL.
export function crearLogger(destino?: DestinationStream): Logger {
  return pino(
    {
      level: configOpcional().LOG_LEVEL ?? (process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
      base: { app: 'gestor-tareas', entorno: process.env.NEXT_PUBLIC_APP_ENV ?? 'development' },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    destino,
  );
}

export const logger = crearLogger();
