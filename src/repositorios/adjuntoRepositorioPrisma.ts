import { crearAdjunto, type Adjunto, type DatosNuevoAdjunto } from '../domain/adjunto';
import type { PrismaClient } from '../generated/prisma/client';

// Solo metadatos y la clave del fichero: el contenido vive en el almacenamiento externo.
export class AdjuntoRepositorioPrisma {
  constructor(private readonly db: PrismaClient) {}

  listar(tareaId: number): Promise<Adjunto[]> {
    return this.db.adjunto.findMany({
      where: { tareaId },
      orderBy: [{ subidoEn: 'asc' }, { id: 'asc' }],
    });
  }

  crear(datos: DatosNuevoAdjunto): Promise<Adjunto> {
    // Las reglas (tipo permitido, tamaño máximo, clave obligatoria) son las del dominio.
    const adjunto = crearAdjunto(0, datos);
    return this.db.adjunto.create({
      data: {
        tareaId: adjunto.tareaId,
        nombreArchivo: adjunto.nombreArchivo,
        tipoMime: adjunto.tipoMime,
        tamanoBytes: adjunto.tamanoBytes,
        clave: adjunto.clave,
      },
    });
  }

  // Borra el registro y lo devuelve (para borrar después el fichero), o undefined si no
  // existe o pertenece a una tarea borrada: esos adjuntos ya no son visibles en la API.
  async borrar(id: number): Promise<Adjunto | undefined> {
    return this.db.$transaction(async (tx) => {
      const adjunto = await tx.adjunto.findFirst({ where: { id, tarea: { borradaEn: null } } });
      if (!adjunto) return undefined;
      await tx.adjunto.delete({ where: { id } });
      return adjunto;
    });
  }
}
