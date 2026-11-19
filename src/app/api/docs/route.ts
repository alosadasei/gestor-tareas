// GET /api/docs → documentación interactiva de la API (Scalar) a partir de /api/openapi.json.
// Scalar se carga desde un CDN con la versión fijada, para no meterlo en el bundle de la app.
const HTML = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gestor de Tareas · API</title>
  </head>
  <body>
    <script id="api-reference" data-url="/api/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.76.4"></script>
  </body>
</html>`;

export function GET() {
  return new Response(HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
