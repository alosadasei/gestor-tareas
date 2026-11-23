import { config } from 'dotenv';
import { crearAlmacenamientoS3 } from '../lib/almacenamiento';

// Configura el CORS del bucket de adjuntos para los orígenes de la app, con las variables
// STORAGE_* del entorno (o de .env.local). Se ejecuta una vez por entorno:
//   npm run storage:cors -- https://gestor-tareas.vercel.app http://localhost:3000
config({ path: ['.env.local', '.env'], quiet: true });

async function main() {
  const origenes = process.argv.slice(2);
  await crearAlmacenamientoS3().configurarCors(origenes);
  console.log(`CORS del bucket ${process.env.STORAGE_BUCKET} configurado para: ${origenes.join(', ')}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
