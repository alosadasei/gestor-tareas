import type { Metadata } from 'next';
import { appEnv } from '../../../lib/env';
import { TarjetaTarea } from '../../componentes/TarjetaTarea';
import { crearTarea, type Tarea } from '../../domain/tarea';
import { porcentajeCompletado } from '../../services/estadisticas';
import { contarPorEstado } from '../../utils/tareas';
import estilos from './tablero.module.css';

export const metadata: Metadata = { title: 'Tablero' };

// Se renderiza en cada petición (no en el build), como una app con datos reales.
export const dynamic = 'force-dynamic';

const ESTADOS = [
  { clave: 'pendiente', titulo: 'Pendiente' },
  { clave: 'en-curso', titulo: 'En curso' },
  { clave: 'hecha', titulo: 'Hecha' },
] as const;

// Datos de ejemplo: el tablero aún no está conectado a la API.
const tareas: Tarea[] = [
  crearTarea(1, { titulo: 'Diseñar el pipeline CI/CD', prioridad: 'alta', responsableId: 1 }),
  crearTarea(2, { titulo: 'Escribir el workflow de GitHub Actions', responsableId: 1 }),
  crearTarea(3, { titulo: 'Conectar el repositorio con Vercel', responsableId: 2 }),
  crearTarea(4, { titulo: 'Proteger la rama main', prioridad: 'baja', responsableId: 2 }),
].map((t, i) => ({
  ...t,
  estado: (['hecha', 'hecha', 'en-curso', 'pendiente'] as const)[i],
}));

// Tarea "antigua" guardada antes de que existiera el campo `etiquetas` (llega como undefined).
const tareaAntigua = {
  id: 5,
  titulo: 'Tarea antigua sin etiquetas',
  descripcion: '',
  estado: 'pendiente',
  prioridad: 'media',
  responsableId: 1,
} as unknown as Tarea;
tareas.push(tareaAntigua);

export default function Tablero() {
  const conteo = contarPorEstado(tareas);
  const avance = porcentajeCompletado(tareas);

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <header className={estilos.encabezado}>
        <div>
          <h1>Tablero</h1>
          <p className={estilos.resumen}>
            Avance del equipo: <strong>{avance}%</strong> completado
          </p>
        </div>
        {appEnv !== 'production' && <span className={estilos.entorno}>Entorno: {appEnv}</span>}
      </header>

      <div className={estilos.columnas}>
        {ESTADOS.map(({ clave, titulo }) => (
          <section key={clave} className={estilos.columna} aria-labelledby={`columna-${clave}`}>
            <h2 id={`columna-${clave}`} className={estilos.tituloColumna} data-estado={clave}>
              {titulo}
              <span className={estilos.contador}>{conteo[clave]}</span>
            </h2>
            <ul className={estilos.lista}>
              {tareas
                .filter((t) => t.estado === clave)
                .map((t) => (
                  <li key={t.id}>
                    <TarjetaTarea tarea={t} />
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
