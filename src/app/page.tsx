import Link from 'next/link';
import estilos from './pagina.module.css';

// Landing del proyecto: estática (se genera en el build), sin datos de la API.

const FUNCIONES = [
  {
    titulo: 'Tablero por estados',
    texto: 'Pendiente, en curso y hecha. Mover una tarjeta de columna cambia su estado.',
  },
  {
    titulo: 'Todo lo de la tarea, junto',
    texto: 'Prioridad, responsable, fecha límite y etiquetas en cada tarjeta, con filtros y orden.',
  },
  {
    titulo: 'Comentarios en contexto',
    texto: 'Las dudas se resuelven en la propia tarea: se ve quién comentó y cuándo.',
  },
  {
    titulo: 'Adjuntos seguros',
    texto: 'Los archivos se suben directamente al almacenamiento con URLs firmadas que caducan.',
  },
];

const TECNOLOGIAS = [
  'Next.js + React',
  'TypeScript',
  'PostgreSQL + Prisma',
  'Zod',
  'Redis (cache-aside)',
  'Vitest',
  'GitHub Actions',
  'Vercel',
];

// Tablero en miniatura, puramente decorativo (aria-hidden): anticipa cómo es la app.
const VISTA_PREVIA = [
  { estado: 'pendiente', titulo: 'Pendiente', tarjetas: [['Revisar el diseño', 'alta'], ['Preparar la demo', 'media']] },
  { estado: 'en-curso', titulo: 'En curso', tarjetas: [['API de comentarios', 'alta']] },
  { estado: 'hecha', titulo: 'Hecha', tarjetas: [['Schema de la BD', 'media'], ['Pipeline de CI', 'baja']] },
];

export default function Inicio() {
  return (
    <>
      <section className={estilos.heroe}>
        <div className={`contenedor ${estilos.heroeInterior}`}>
          <div className={estilos.heroeTexto}>
            <p className={estilos.antetitulo}>Herramienta interna para equipos</p>
            <h1 className={estilos.titular}>Organiza el trabajo del equipo sin montar un Jira entero</h1>
            <p className={estilos.entradilla}>
              Un tablero kanban ligero: cada tarea con su estado, prioridad, responsable y fecha
              límite. Los comentarios y archivos viven junto a la tarea, no perdidos en cadenas de
              correo.
            </p>
            <div className={estilos.acciones}>
              <Link href="/tablero" className="boton boton-primario">
                Abrir el tablero
              </Link>
              <a href="/api/docs" className="boton">
                Ver la API
              </a>
            </div>
          </div>

          <div className={estilos.vistaPrevia} aria-hidden="true">
            {VISTA_PREVIA.map((columna) => (
              <div key={columna.estado} className={estilos.columnaPrevia}>
                <span className={estilos.tituloPrevio} data-estado={columna.estado}>
                  {columna.titulo}
                </span>
                {columna.tarjetas.map(([titulo, prioridad]) => (
                  <span key={titulo} className={estilos.tarjetaPrevia}>
                    {titulo}
                    <span className={estilos.prioridadPrevia} data-prioridad={prioridad} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={estilos.seccion} aria-labelledby="titulo-funciones">
        <div className="contenedor">
          <h2 id="titulo-funciones" className={estilos.tituloSeccion}>
            Lo justo para no perder el hilo
          </h2>
          <ul className={estilos.funciones}>
            {FUNCIONES.map(({ titulo, texto }) => (
              <li key={titulo} className={estilos.funcion}>
                <h3>{titulo}</h3>
                <p>{texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${estilos.seccion} ${estilos.seccionAlterna}`} aria-labelledby="titulo-tecnica">
        <div className="contenedor">
          <h2 id="titulo-tecnica" className={estilos.tituloSeccion}>
            Cómo está construido
          </h2>
          <p className={estilos.textoSeccion}>
            Una aplicación fullstack con una API REST documentada con OpenAPI, base de datos
            relacional con migraciones, tests automáticos y despliegue continuo.
          </p>
          <ul className={estilos.tecnologias}>
            {TECNOLOGIAS.map((tecnologia) => (
              <li key={tecnologia}>{tecnologia}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
