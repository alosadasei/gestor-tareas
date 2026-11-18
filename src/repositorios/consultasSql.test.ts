import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { vaciarTablas } from '../../prisma/vaciarTablas';
import { prepararBdDePrueba, urlBdDePrueba } from '../../tests/bdDePrueba';
import type { PrismaClient } from '../generated/prisma/client';
import { actividadDeResponsable, atrasadasPorResponsable, resumenPorEstado } from './consultasSql';

const AHORA = new Date('2026-11-18T12:00:00Z');
const fecha = (iso: string) => new Date(iso);

describe.skipIf(!urlBdDePrueba)('consultas SQL', () => {
  let db: PrismaClient;
  let ana: number;
  let bruno: number;
  let carla: number;

  beforeAll(() => {
    db = prepararBdDePrueba();
  }, 60_000);

  afterAll(async () => {
    await db?.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas(db);
    ana = (await db.usuario.create({ data: { nombre: 'Ana', email: 'ana@test.dev' } })).id;
    bruno = (await db.usuario.create({ data: { nombre: 'Bruno', email: 'bruno@test.dev' } })).id;
    carla = (await db.usuario.create({ data: { nombre: 'Carla', email: 'carla@test.dev' } })).id;
  });

  function tarea(datos: {
    responsableId: number;
    estado?: 'pendiente' | 'en_curso' | 'hecha';
    prioridad?: 'baja' | 'media' | 'alta';
    fechaLimite?: Date;
    borradaEn?: Date;
  }) {
    return db.tarea.create({ data: { titulo: 'T', ...datos } });
  }

  describe('atrasadasPorResponsable', () => {
    it('cuenta solo tareas abiertas, vencidas y no borradas, de más a menos atrasadas', async () => {
      await tarea({ responsableId: ana, fechaLimite: fecha('2026-11-01') });
      await tarea({ responsableId: ana, estado: 'en_curso', fechaLimite: fecha('2026-10-15') });
      await tarea({ responsableId: bruno, fechaLimite: fecha('2026-11-10') });
      await tarea({ responsableId: bruno, estado: 'hecha', fechaLimite: fecha('2026-09-01') }); // hecha
      await tarea({ responsableId: bruno, fechaLimite: fecha('2026-12-01') }); // aún no vence
      await tarea({ responsableId: bruno }); // sin fecha
      await tarea({ responsableId: carla, fechaLimite: fecha('2026-01-01'), borradaEn: AHORA }); // borrada

      expect(await atrasadasPorResponsable(db, AHORA)).toEqual([
        { responsableId: ana, nombre: 'Ana', atrasadas: 2, fechaMasAntigua: fecha('2026-10-15') },
        { responsableId: bruno, nombre: 'Bruno', atrasadas: 1, fechaMasAntigua: fecha('2026-11-10') },
      ]);
    });

    it('devuelve una lista vacía si no hay nada atrasado', async () => {
      expect(await atrasadasPorResponsable(db, AHORA)).toEqual([]);
    });
  });

  describe('actividadDeResponsable', () => {
    it('cuenta comentarios y adjuntos sin multiplicarlos y ordena por actividad reciente', async () => {
      const t1 = await tarea({ responsableId: ana });
      const t2 = await tarea({ responsableId: ana, estado: 'en_curso' });
      const t3 = await tarea({ responsableId: ana }); // sin actividad
      await tarea({ responsableId: bruno }); // de otro responsable
      await tarea({ responsableId: ana, borradaEn: AHORA }); // borrada

      for (const [tareaId, creadoEn] of [
        [t1.id, '2026-11-01T10:00:00Z'],
        [t1.id, '2026-11-02T10:00:00Z'],
        [t1.id, '2026-11-03T10:00:00Z'],
        [t2.id, '2026-11-15T10:00:00Z'],
      ] as const) {
        await db.comentario.create({
          data: { tareaId, autorId: bruno, texto: 'c', creadoEn: fecha(creadoEn) },
        });
      }
      for (const [i, tareaId] of [t1.id, t1.id].entries()) {
        await db.adjunto.create({
          data: { tareaId, nombreArchivo: 'a.pdf', tipoMime: 'application/pdf', tamanoBytes: 1, clave: `k${i}` },
        });
      }

      expect(await actividadDeResponsable(db, ana)).toEqual([
        { id: t2.id, titulo: 'T', estado: 'en-curso', comentarios: 1, adjuntos: 0, ultimoComentario: fecha('2026-11-15T10:00:00Z') },
        { id: t1.id, titulo: 'T', estado: 'pendiente', comentarios: 3, adjuntos: 2, ultimoComentario: fecha('2026-11-03T10:00:00Z') },
        { id: t3.id, titulo: 'T', estado: 'pendiente', comentarios: 0, adjuntos: 0, ultimoComentario: null },
      ]);
    });

    it('respeta el límite', async () => {
      for (let i = 0; i < 5; i++) await tarea({ responsableId: ana });
      expect(await actividadDeResponsable(db, ana, 2)).toHaveLength(2);
    });
  });

  describe('resumenPorEstado', () => {
    it('agrupa por estado y prioridad, cuenta las atrasadas e incluye estados vacíos', async () => {
      await tarea({ responsableId: ana, prioridad: 'alta', fechaLimite: fecha('2026-11-01') });
      await tarea({ responsableId: ana, prioridad: 'alta' });
      await tarea({ responsableId: ana, prioridad: 'baja', fechaLimite: fecha('2026-12-01') });
      await tarea({ responsableId: bruno, estado: 'hecha', fechaLimite: fecha('2026-01-01') });
      await tarea({ responsableId: bruno, prioridad: 'alta', borradaEn: AHORA });

      expect(await resumenPorEstado(db, AHORA)).toEqual([
        { estado: 'pendiente', total: 3, porPrioridad: { baja: 1, media: 0, alta: 2 }, atrasadas: 1 },
        { estado: 'en-curso', total: 0, porPrioridad: { baja: 0, media: 0, alta: 0 }, atrasadas: 0 },
        { estado: 'hecha', total: 1, porPrioridad: { baja: 0, media: 1, alta: 0 }, atrasadas: 0 },
      ]);
    });
  });
});
