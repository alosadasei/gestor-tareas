# MONITORING — Runbook del Gestor de Tareas

## Dónde mirar

| Señal | Dónde |
|---|---|
| URL pública | https://gestor-tareas-blush.vercel.app/ |
| Health check | https://gestor-tareas-blush.vercel.app/api/health (200 `ok` / 503 `degraded`) |
| Logs de ejecución | Vercel → proyecto `gestor-tareas` → Logs (y Deployments → despliegue → Runtime Logs) |
| Errores (issues) | TODO: enlace al proyecto en Sentry |
| Uptime y alertas | TODO: enlace al monitor (UptimeRobot / Better Stack) |

## Orden de diagnóstico

1. **¿Responde la URL?** Abre la URL pública y `/api/health`. 503 = la dependencia (BD) falla; no responde o 500 = la app falla.
2. **¿Empezó tras un deploy?** Compara la hora del primer fallo con el último despliegue en Vercel → Deployments.
3. **¿Qué dice el issue?** Abre el issue más reciente en Sentry: mensaje, stack trace, entorno (`production`/`preview`) y tag `operacion`.
4. **¿Qué cuentan los logs?** Runtime Logs de Vercel a la hora del fallo, para confirmar la causa.

## Decisión de corrección

- **El fallo llegó con el último deploy → rollback** (Vercel → Deployments → despliegue anterior bueno → Instant Rollback). Restaura en segundos; después se repara el código.
- **El fallo NO viene del último deploy (datos, dependencia, caso límite) → hotfix:** rama corta `hotfix/...` desde `main`, corrección mínima, test que reproduzca el fallo, PR con pipeline en verde. Ver `INCIDENTE.md` (submódulo 12.5).
- **Verificación posterior:** repetir las mismas señales: la URL responde, `/api/health` da 200, el issue deja de recibir eventos nuevos y el monitor de uptime vuelve a verde.

## Secretos

`SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` y `DATABASE_URL` viven solo en variables de entorno (Vercel y `.env.local`, que no se versiona). El repo solo contiene `.env.example` con los valores vacíos.
