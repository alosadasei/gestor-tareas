import type { Tarea } from '../domain/tarea';
import type { PrismaClient } from '../generated/prisma/client';
import {
  atrasadasPorResponsable,
  resumenPorEstado,
  type ResumenEstado,
} from '../repositorios/consultasSql';

// Devuelve el porcentaje (0-100) de tareas en estado "hecha"
export function porcentajeCompletado(tareas: Pick<Tarea, 'estado'>[]): number {
  // Un equipo sin tareas no tiene nada que completar: el avance es 0% por regla de
  // negocio explícita. Se trata aparte para no dividir 0/0 y depender
  // luego de que `Math.round(...) || 0` lo enmascare.
  if (tareas.length === 0) return 0;
  const hechas = tareas.filter((t) => t.estado === 'hecha').length;
  return Math.round((hechas / tareas.length) * 100);
}

export const CLAVE_CACHE_ESTADISTICAS = 'gestor-tareas:estadisticas';
// Margen máximo de desfase si alguna escritura no llegara a invalidar la caché (y para que
// las "atrasadas" se recalculen al cambiar la hora aunque nadie toque las tareas).
export const TTL_ESTADISTICAS_SEGUNDOS = 60;

// Ya en forma JSON (fechas como texto): es lo que se guarda en la caché y lo que se responde.
export type Estadisticas = {
  porEstado: ResumenEstado[];
  total: number;
  porcentajeCompletado: number;
  atrasadasPorResponsable: { responsableId: number; nombre: string; atrasadas: number; fechaMasAntigua: string }[];
  generadoEn: string;
};

// Resumen del tablero: es la parte costosa de la API (recorre todas las tareas, ver
// docs/sql-explain.md), por eso se sirve con caché cache-aside.
export async function calcularEstadisticas(db: PrismaClient, ahora = new Date()): Promise<Estadisticas> {
  const [porEstado, atrasadas] = await Promise.all([
    resumenPorEstado(db, ahora),
    atrasadasPorResponsable(db, ahora),
  ]);
  const total = porEstado.reduce((suma, e) => suma + e.total, 0);
  const hechas = porEstado.find((e) => e.estado === 'hecha')?.total ?? 0;
  return {
    porEstado,
    total,
    porcentajeCompletado: total === 0 ? 0 : Math.round((hechas / total) * 100),
    atrasadasPorResponsable: atrasadas.map((a) => ({
      ...a,
      fechaMasAntigua: a.fechaMasAntigua.toISOString(),
    })),
    generadoEn: ahora.toISOString(),
  };
}
