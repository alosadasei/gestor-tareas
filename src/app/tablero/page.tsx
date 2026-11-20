import type { Metadata } from 'next';
import { Tablero } from '../../componentes/tablero/Tablero';
import { cargarTablero } from '../../services/tablero';

export const metadata: Metadata = { title: 'Tablero' };

// Datos de la BD en cada petición; mientras llegan se ve loading.tsx y, si fallan, error.tsx.
export const dynamic = 'force-dynamic';

export default async function PaginaTablero() {
  const { tareas, usuarios } = await cargarTablero();
  return <Tablero tareasIniciales={tareas} usuarios={usuarios} />;
}
