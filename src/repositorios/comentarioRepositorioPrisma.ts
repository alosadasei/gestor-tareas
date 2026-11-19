import { crearComentario } from '../domain/comentario';
import type { PrismaClient } from '../generated/prisma/client';

// Lo que muestra la API: el comentario con el nombre de su autor ("quién comentó y cuándo").
export type ComentarioConAutor = {
  id: number;
  tareaId: number;
  texto: string;
  creadoEn: Date;
  autor: { id: number; nombre: string };
};

const seleccion = {
  id: true,
  tareaId: true,
  texto: true,
  creadoEn: true,
  autor: { select: { id: true, nombre: true } },
} as const;

// Comprobar que la tarea existe (y no está borrada) es cosa de quien llama: aquí solo se
// leen y escriben comentarios.
export class ComentarioRepositorioPrisma {
  constructor(private readonly db: PrismaClient) {}

  // Del más antiguo al más reciente, como una conversación. El autor llega en la misma
  // consulta, no con una por comentario.
  listar(tareaId: number): Promise<ComentarioConAutor[]> {
    return this.db.comentario.findMany({
      where: { tareaId },
      select: seleccion,
      orderBy: [{ creadoEn: 'asc' }, { id: 'asc' }],
    });
  }

  crear(tareaId: number, autorId: number, texto: string): Promise<ComentarioConAutor> {
    // Las reglas (texto no vacío tras recortar, longitud máxima) son las del dominio.
    const comentario = crearComentario(0, tareaId, autorId, texto);
    return this.db.comentario.create({
      data: { tareaId, autorId, texto: comentario.texto },
      select: seleccion,
    });
  }
}
