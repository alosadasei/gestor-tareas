# Retrospectiva personal

Proyecto final del curso Desarrollo Web Full Stack con IA: el Gestor de Tareas, construido
entre septiembre y noviembre de 2026 en 27 Pull Requests.

## Qué salió bien

- **Llegué al MVP completo** y desplegado: tablero kanban, listado con filtros, detalle con
  comentarios y adjuntos, API REST documentada con OpenAPI, base de datos con migraciones,
  auditoría, borrado lógico y caché con Redis.
- **La calidad sostuvo el ritmo.** Con unos 320 tests y la CI bloqueando el merge, pude
  cambiar cosas grandes (como la validación de variables de entorno) sin miedo a romper lo
  anterior. Varias veces la CI paró un error antes de que llegara a `main`.
- **Las decisiones están escritas.** El README explica por qué elegí cada pieza, y eso me
  ha obligado a entenderlas lo bastante como para defenderlas.
- **Trabajar con ramas y PRs** desde el principio dejó un historial que se puede leer.

## Qué me costó

- **El despliegue.** El primer intento en Vercel daba error 500: faltaba la base de datos
  de producción y un ajuste del panel se saltaba las migraciones. Entender la diferencia
  entre la conexión con *pooler* de Neon (para la app) y la directa (para migrar) me llevó
  más de lo esperado.
- **Los tests e2e.** Escribir selectores que encuentren exactamente el elemento que quieres
  probar, y no otro parecido, es más difícil de lo que parece. Un test que pasa por el
  motivo equivocado es peor que uno que falla.
- **La accesibilidad** de detalle: el foco tras borrar una tarea, el contraste en modo
  oscuro, el modo de alto contraste. axe detecta mucho, pero no todo.
- **Revisar lo que genera la IA** con la misma atención al final que al principio, cuando
  ya confías en ella.

## Qué haría distinto

- **Desplegar mucho antes.** Una versión mínima en producción desde las primeras semanas
  habría sacado los problemas de configuración cuando eran pequeños.
- **PRs más pequeñas**, de una sola idea cada una, para revisarlas mejor.
- **Llevar el tablero de GitHub Projects desde el primer día**, en vez de reconstruirlo al
  final.
- **Escribir a mano una pieza de cada capa** antes de apoyarme en la IA para el resto.

El detalle de cómo usé la IA, y lo que aprendí de sus límites, está en
[ai-usage.md](ai-usage.md).
