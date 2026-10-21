import { appEnv } from '../../lib/env';
import { crearTarea } from '../domain/tarea';
import { contarPorEstado } from '../utils/tareas';
import { porcentajeCompletado } from '../services/estadisticas';
import type { Tarea } from '../utils/tareas';
import { TarjetaTarea } from './TarjetaTarea';

// Se renderiza en cada petición (no en el build), como una app con datos reales.
export const dynamic = 'force-dynamic';

const ESTADOS = [
  { clave: 'pendiente', titulo: 'Pendiente' },
  { clave: 'en-curso', titulo: 'En curso' },
  { clave: 'hecha', titulo: 'Hecha' },
] as const;

// Datos de ejemplo: el Gestor aún no tiene persistencia.
const tareas = [
  crearTarea(1, 'Diseñar el pipeline CI/CD', 1),
  crearTarea(2, 'Escribir el workflow de GitHub Actions', 2),
  crearTarea(3, 'Conectar el repositorio con Vercel', 2),
  crearTarea(4, 'Proteger la rama main', 3),
].map((t, i) => ({
  ...t,
  estado: (['hecha', 'hecha', 'en-curso', 'pendiente'] as const)[i],
  etiquetas: [],
  subtareas: [],
}));

// Tarea "antigua" guardada antes de que existiera el campo `etiquetas` (llega como undefined).
const tareaAntigua = {
  id: 5,
  titulo: 'Tarea antigua sin etiquetas',
  estado: 'pendiente',
  prioridad: 1,
  subtareas: [],
} as unknown as Tarea;
tareas.push(tareaAntigua as (typeof tareas)[number]);

export default function Home() {
  const conteo = contarPorEstado(tareas);
  const avance = porcentajeCompletado(tareas);

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <h1>Gestor de Tareas en Vercel</h1>
      <p>Entorno: {appEnv}</p>
      <p>Avance del equipo: {avance}% completado</p>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {ESTADOS.map(({ clave, titulo }) => (
          <section
            key={clave}
            style={{ flex: '1 1 240px', background: '#ebecf0', borderRadius: 8, padding: 12 }}
          >
            <h2 style={{ fontSize: 16 }}>
              {titulo} ({conteo[clave]})
            </h2>
            {tareas
              .filter((t) => t.estado === clave)
              .map((t) => (
                <TarjetaTarea key={t.id} tarea={t} />
              ))}
          </section>
        ))}
      </div>
    </main>
  );
}
