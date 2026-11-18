import { obtenerPrisma } from '../../lib/db';
import type { TareaRepositorio } from '../domain/tareaRepositorio';
import { TareaRepositorioPrisma } from '../repositorios/tareaRepositorioPrisma';

// Punto único donde las rutas obtienen sus dependencias: cambiar de implementación
// (p. ej. la versión en memoria) solo exige tocar este fichero.
export function repositorioTareas(): TareaRepositorio {
  return new TareaRepositorioPrisma(obtenerPrisma());
}
