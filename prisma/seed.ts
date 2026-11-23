import { crearClientePrisma } from '../lib/db';
import { configBaseDeDatos } from '../lib/env';
import type { EstadoTarea, Prioridad } from '../src/generated/prisma/client';
import { vaciarTablas } from './vaciarTablas';

// Seed reproducible: siempre los mismos datos, con los mismos ids y fechas fijas (nada de
// aleatorios ni de "hoy"), para que cualquier ejecución deje la BD exactamente igual.

const USUARIOS = [
  { nombre: 'Ana García', email: 'ana@gestor.dev' },
  { nombre: 'Bruno López', email: 'bruno@gestor.dev' },
  { nombre: 'Carla Martín', email: 'carla@gestor.dev' },
];

const ETIQUETAS = ['frontend', 'backend', 'bd', 'devops', 'bug'];

type TareaSeed = {
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  prioridad: Prioridad;
  fechaLimite: string | null;
  responsable: number; // índice en USUARIOS
  etiquetas: string[];
};

const TAREAS: TareaSeed[] = [
  {
    titulo: 'Diseñar el schema de la base de datos',
    descripcion: 'Tablas, relaciones e integridad referencial.',
    estado: 'hecha',
    prioridad: 'alta',
    fechaLimite: '2026-11-10',
    responsable: 0,
    etiquetas: ['bd', 'backend'],
  },
  {
    titulo: 'Configurar el pipeline de CI',
    descripcion: 'Lint, tests y build en cada Pull Request.',
    estado: 'hecha',
    prioridad: 'media',
    fechaLimite: '2026-11-12',
    responsable: 1,
    etiquetas: ['devops'],
  },
  {
    titulo: 'Endpoints REST de tareas',
    descripcion: 'CRUD con validación Zod y paginación.',
    estado: 'en_curso',
    prioridad: 'alta',
    fechaLimite: '2026-11-28',
    responsable: 0,
    etiquetas: ['backend'],
  },
  {
    titulo: 'Tablero kanban en React',
    descripcion: 'Columnas por estado y mover tarjetas entre ellas.',
    estado: 'en_curso',
    prioridad: 'media',
    fechaLimite: '2026-12-05',
    responsable: 2,
    etiquetas: ['frontend'],
  },
  {
    titulo: 'Subida de adjuntos con URL firmada',
    descripcion: '',
    estado: 'pendiente',
    prioridad: 'media',
    fechaLimite: '2026-12-12',
    responsable: 1,
    etiquetas: ['backend', 'frontend'],
  },
  {
    titulo: 'Corregir el contador de etiquetas en tarjetas antiguas',
    descripcion: 'Las tareas sin etiquetas mostraban "undefined etiquetas".',
    estado: 'pendiente',
    prioridad: 'alta',
    fechaLimite: '2026-11-01',
    responsable: 2,
    etiquetas: ['bug', 'frontend'],
  },
  {
    titulo: 'Desplegar en Vercel con Neon',
    descripcion: 'Variables por entorno y migraciones en el pipeline.',
    estado: 'pendiente',
    prioridad: 'baja',
    fechaLimite: null,
    responsable: 1,
    etiquetas: ['devops'],
  },
  {
    titulo: 'Escribir la documentación OpenAPI',
    descripcion: '',
    estado: 'pendiente',
    prioridad: 'baja',
    fechaLimite: '2026-12-19',
    responsable: 0,
    etiquetas: [],
  },
];

const COMENTARIOS = [
  { tarea: 0, autor: 1, texto: 'Revisado: las claves foráneas tienen sentido.', fecha: '2026-11-09T10:15:00Z' },
  { tarea: 2, autor: 2, texto: '¿Paginamos por offset o por cursor?', fecha: '2026-11-14T09:00:00Z' },
  { tarea: 2, autor: 0, texto: 'Offset de momento: el volumen es pequeño.', fecha: '2026-11-14T09:30:00Z' },
  { tarea: 5, autor: 0, texto: 'Se reproduce con las tareas creadas antes de las etiquetas.', fecha: '2026-11-02T16:45:00Z' },
];

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('El seed vacía la base de datos: no se ejecuta en producción');
  }
  const db = crearClientePrisma(configBaseDeDatos().DATABASE_URL);
  try {
    await db.$transaction(async (tx) => {
      await vaciarTablas(tx);

      // Inserciones una a una y en orden: así los ids son siempre 1, 2, 3...
      const usuarios = [];
      for (const usuario of USUARIOS) usuarios.push(await tx.usuario.create({ data: usuario }));

      const etiquetas = new Map<string, number>();
      for (const nombre of ETIQUETAS) {
        etiquetas.set(nombre, (await tx.etiqueta.create({ data: { nombre } })).id);
      }

      const tareas = [];
      for (const t of TAREAS) {
        tareas.push(
          await tx.tarea.create({
            data: {
              titulo: t.titulo,
              descripcion: t.descripcion,
              estado: t.estado,
              prioridad: t.prioridad,
              fechaLimite: t.fechaLimite ? new Date(t.fechaLimite) : null,
              responsableId: usuarios[t.responsable].id,
              etiquetas: {
                create: t.etiquetas.map((nombre) => ({ etiquetaId: etiquetas.get(nombre)! })),
              },
            },
          }),
        );
      }

      for (const c of COMENTARIOS) {
        await tx.comentario.create({
          data: {
            tareaId: tareas[c.tarea].id,
            autorId: usuarios[c.autor].id,
            texto: c.texto,
            creadoEn: new Date(c.fecha),
          },
        });
      }
    });
    console.log(
      `Seed completado: ${USUARIOS.length} usuarios, ${ETIQUETAS.length} etiquetas, ` +
        `${TAREAS.length} tareas, ${COMENTARIOS.length} comentarios`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
