import {
  crearTarea,
  editarTarea,
  type CambiosTarea,
  type DatosNuevaTarea,
  type EstadoTarea,
  type Tarea,
} from '../domain/tarea';
import {
  TAMANO_PAGINA_POR_DEFECTO,
  type ConsultaTareas,
  type Pagina,
  type TareaRepositorio,
} from '../domain/tareaRepositorio';
import type {
  AccionAuditoria,
  EstadoTarea as EstadoBd,
  Prisma,
  PrismaClient,
} from '../generated/prisma/client';

// Las etiquetas se traen en la misma consulta que la tarea (sin una query extra por tarea)
// y ordenadas por nombre, para que el resultado sea estable.
const conEtiquetas = {
  etiquetas: { include: { etiqueta: true }, orderBy: { etiqueta: { nombre: 'asc' } } },
} satisfies Prisma.TareaInclude;

type FilaTarea = Prisma.TareaGetPayload<{ include: typeof conEtiquetas }>;
type Transaccion = Prisma.TransactionClient;

// Un identificador de enum de Prisma no admite guiones: en BD el valor es "en-curso"
// (@map), pero el cliente lo expone como en_curso.
const aEstadoBd = (estado: EstadoTarea): EstadoBd => (estado === 'en-curso' ? 'en_curso' : estado);
const aEstadoDominio = (estado: EstadoBd): EstadoTarea =>
  estado === 'en_curso' ? 'en-curso' : estado;

function aDominio(fila: FilaTarea): Tarea {
  const tarea: Tarea = {
    id: fila.id,
    titulo: fila.titulo,
    descripcion: fila.descripcion,
    estado: aEstadoDominio(fila.estado),
    prioridad: fila.prioridad,
    responsableId: fila.responsableId,
    etiquetas: fila.etiquetas.map((te) => te.etiqueta.nombre),
  };
  if (fila.fechaLimite) tarea.fechaLimite = fila.fechaLimite;
  return tarea;
}

// Crea la etiqueta si aún no existe y la enlaza con la tarea.
function enlazarEtiquetas(nombres: string[]) {
  return [...new Set(nombres)].map((nombre) => ({
    etiqueta: { connectOrCreate: { where: { nombre }, create: { nombre } } },
  }));
}

// Solo los campos que cambiaron, con su valor anterior y el nuevo. Se recorren los campos
// de las dos versiones porque uno opcional (fechaLimite) puede aparecer o desaparecer.
function diferencias(antes: Tarea, despues: Tarea): Prisma.InputJsonObject {
  const cambios: Record<string, Prisma.InputJsonValue> = {};
  const campos = new Set([...Object.keys(antes), ...Object.keys(despues)]) as Set<keyof Tarea>;
  // JSON.stringify(undefined) es undefined: un campo ausente se guarda como null.
  const aJson = (valor: unknown) => JSON.parse(JSON.stringify(valor) ?? 'null');
  for (const campo of campos) {
    const a = aJson(antes[campo]);
    const d = aJson(despues[campo]);
    if (JSON.stringify(a) !== JSON.stringify(d)) cambios[campo] = { antes: a, despues: d };
  }
  return cambios;
}

function auditar(
  tx: Transaccion,
  tareaId: number,
  accion: AccionAuditoria,
  cambios: Prisma.InputJsonObject = {},
) {
  return tx.auditoria.create({ data: { tareaId, accion, cambios } });
}

// Implementación con PostgreSQL. Borrar es un soft-delete (se rellena borrada_en) y todas
// las lecturas ignoran las tareas borradas. Cada escritura deja su fila de auditoría en la
// misma transacción: o se guardan las dos cosas o ninguna.
export class TareaRepositorioPrisma implements TareaRepositorio {
  constructor(private readonly db: PrismaClient) {}

  async listar(consulta: ConsultaTareas = {}): Promise<Pagina<Tarea>> {
    const pagina = Math.max(1, consulta.pagina ?? 1);
    const tamanoPagina = Math.max(1, consulta.tamanoPagina ?? TAMANO_PAGINA_POR_DEFECTO);
    const { filtro = {}, orden = { campo: 'id', direccion: 'asc' } } = consulta;

    const where: Prisma.TareaWhereInput = {
      borradaEn: null,
      estado: filtro.estado && aEstadoBd(filtro.estado),
      prioridad: filtro.prioridad,
      responsableId: filtro.responsableId,
    };
    if (filtro.texto) {
      where.OR = [
        { titulo: { contains: filtro.texto, mode: 'insensitive' } },
        { descripcion: { contains: filtro.texto, mode: 'insensitive' } },
      ];
    }

    // Postgres ordena los NULL al final en ASC y al principio en DESC, igual que la versión
    // en memoria; el id desempata para que la paginación sea estable.
    const [filas, total] = await this.db.$transaction([
      this.db.tarea.findMany({
        where,
        include: conEtiquetas,
        orderBy: [{ [orden.campo]: orden.direccion }, { id: 'asc' }],
        skip: (pagina - 1) * tamanoPagina,
        take: tamanoPagina,
      }),
      this.db.tarea.count({ where }),
    ]);

    return { elementos: filas.map(aDominio), total, pagina, tamanoPagina };
  }

  async obtener(id: number): Promise<Tarea | undefined> {
    const fila = await this.db.tarea.findFirst({
      where: { id, borradaEn: null },
      include: conEtiquetas,
    });
    return fila ? aDominio(fila) : undefined;
  }

  async crear(datos: DatosNuevaTarea): Promise<Tarea> {
    // Se valida con las reglas del dominio; el id real lo asigna la BD.
    const tarea = crearTarea(0, datos);
    return this.db.$transaction(async (tx) => {
      const fila = await tx.tarea.create({
        data: {
          titulo: tarea.titulo,
          descripcion: tarea.descripcion,
          prioridad: tarea.prioridad,
          fechaLimite: tarea.fechaLimite ?? null,
          responsableId: tarea.responsableId,
          etiquetas: { create: enlazarEtiquetas(tarea.etiquetas) },
        },
        include: conEtiquetas,
      });
      await auditar(tx, fila.id, 'crear');
      return aDominio(fila);
    });
  }

  async actualizar(id: number, cambios: CambiosTarea): Promise<Tarea | undefined> {
    return this.db.$transaction(async (tx) => {
      const actual = await tx.tarea.findFirst({
        where: { id, borradaEn: null },
        include: conEtiquetas,
      });
      if (!actual) return undefined;

      const antes = aDominio(actual);
      const despues = editarTarea(antes, cambios);
      const fila = await tx.tarea.update({
        where: { id },
        data: {
          titulo: despues.titulo,
          descripcion: despues.descripcion,
          prioridad: despues.prioridad,
          fechaLimite: despues.fechaLimite ?? null,
          responsableId: despues.responsableId,
          // Solo se tocan las etiquetas si vienen en los cambios: se reemplazan todas.
          ...(cambios.etiquetas && {
            etiquetas: { deleteMany: {}, create: enlazarEtiquetas(cambios.etiquetas) },
          }),
        },
        include: conEtiquetas,
      });
      const tarea = aDominio(fila);
      const diff = diferencias(antes, tarea);
      if (Object.keys(diff).length > 0) await auditar(tx, id, 'actualizar', diff);
      return tarea;
    });
  }

  async cambiarEstado(id: number, estado: EstadoTarea): Promise<Tarea | undefined> {
    return this.db.$transaction(async (tx) => {
      const actual = await tx.tarea.findFirst({ where: { id, borradaEn: null } });
      if (!actual) return undefined;

      const fila = await tx.tarea.update({
        where: { id },
        data: { estado: aEstadoBd(estado) },
        include: conEtiquetas,
      });
      const anterior = aEstadoDominio(actual.estado);
      if (anterior !== estado) {
        await auditar(tx, id, 'cambiar_estado', { estado: { antes: anterior, despues: estado } });
      }
      return aDominio(fila);
    });
  }

  async borrar(id: number): Promise<boolean> {
    return this.db.$transaction(async (tx) => {
      const { count } = await tx.tarea.updateMany({
        where: { id, borradaEn: null },
        data: { borradaEn: new Date() },
      });
      if (count === 0) return false;
      await auditar(tx, id, 'borrar');
      return true;
    });
  }
}
