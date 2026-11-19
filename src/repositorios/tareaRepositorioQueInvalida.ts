import type { Logger } from 'pino';
import { invalidar, type Cache } from '../../lib/cache';
import type { CambiosTarea, DatosNuevaTarea, EstadoTarea, Tarea } from '../domain/tarea';
import type { ConsultaTareas, Pagina, TareaRepositorio } from '../domain/tareaRepositorio';

// Decorador: envuelve cualquier TareaRepositorio y, tras cada escritura que cambia algo,
// borra de la caché las claves que dependen de las tareas (las estadísticas). Así ninguna
// ruta tiene que acordarse de invalidar, y el repositorio de Prisma no sabe nada de cachés.
export class TareaRepositorioQueInvalida implements TareaRepositorio {
  constructor(
    private readonly repo: TareaRepositorio,
    private readonly cache: () => Promise<Cache | undefined>,
    private readonly claves: string[],
    private readonly log: Logger,
  ) {}

  listar(consulta?: ConsultaTareas): Promise<Pagina<Tarea>> {
    return this.repo.listar(consulta);
  }

  obtener(id: number): Promise<Tarea | undefined> {
    return this.repo.obtener(id);
  }

  async crear(datos: DatosNuevaTarea): Promise<Tarea> {
    return this.invalidarSi(await this.repo.crear(datos));
  }

  async actualizar(id: number, cambios: CambiosTarea): Promise<Tarea | undefined> {
    return this.invalidarSi(await this.repo.actualizar(id, cambios));
  }

  async cambiarEstado(id: number, estado: EstadoTarea): Promise<Tarea | undefined> {
    return this.invalidarSi(await this.repo.cambiarEstado(id, estado));
  }

  async borrar(id: number): Promise<boolean> {
    return this.invalidarSi(await this.repo.borrar(id));
  }

  // Solo si la escritura tuvo efecto: un 404 no cambia las estadísticas.
  private async invalidarSi<T>(resultado: T): Promise<T> {
    if (resultado) {
      const cache = await this.cache();
      for (const clave of this.claves) await invalidar(cache, clave, this.log);
    }
    return resultado;
  }
}
