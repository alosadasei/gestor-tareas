import { conManejoErrores } from '../../../api/manejador';
import { generarDocumentoOpenApi } from '../../../api/openapi';

// GET /api/openapi.json → documento OpenAPI 3.1 de la API (lo consume /api/docs).
export const GET = conManejoErrores(async () => Response.json(generarDocumentoOpenApi()));
