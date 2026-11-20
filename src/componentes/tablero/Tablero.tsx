'use client';

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { api, type EstadoTarea, type Tarea, type Usuario } from '../../cliente/api';
import {
  cambiarEstadoEnLista,
  ESTADOS,
  NOMBRE_ESTADO,
  porcentajeHechas,
  reemplazarEnLista,
} from '../../cliente/tablero';
import { Avisos, mensajeDeError, useAvisos } from '../Avisos';
import { Dialogo } from '../Dialogo';
import { IconoAsa, IconoBorrar, IconoEditar, IconoMas } from '../Iconos';
import { TarjetaTarea } from '../TarjetaTarea';
import { FormularioTarea } from './FormularioTarea';
import estilos from './Tablero.module.css';

type Edicion = { modo: 'crear' } | { modo: 'editar'; tarea: Tarea };

// Con el teclado, cada flecha lleva la tarjeta a la columna siguiente en esa dirección
// (izquierda/derecha en escritorio; arriba/abajo en móvil, donde las columnas se apilan).
// El comportamiento por defecto de dnd-kit la desplaza 25 px por pulsación: hacían falta
// unas 18 para cambiar de columna.
const saltarDeColumna: KeyboardCoordinateGetter = (evento, { context }) => {
  const { collisionRect, droppableContainers, droppableRects } = context;
  if (!collisionRect) return undefined;
  const x = collisionRect.left + collisionRect.width / 2;
  const y = collisionRect.top + collisionRect.height / 2;

  const rects = droppableContainers
    .getEnabled()
    .map((c) => droppableRects.get(c.id))
    .filter((r) => r !== undefined);
  const candidatas = {
    ArrowRight: rects.filter((r) => r.left > x).sort((a, b) => a.left - b.left),
    ArrowLeft: rects.filter((r) => r.right < x).sort((a, b) => b.right - a.right),
    ArrowDown: rects.filter((r) => r.top > y).sort((a, b) => a.top - b.top),
    ArrowUp: rects.filter((r) => r.bottom < y).sort((a, b) => b.bottom - a.bottom),
  }[evento.code];
  const destino = candidatas?.[0];
  if (!destino) return undefined;

  evento.preventDefault();
  // Coordenadas de la esquina de la tarjeta: dentro de la columna, bajo su título.
  return { x: destino.left + 12, y: destino.top + 48 };
};

export function Tablero({ tareasIniciales, usuarios }: { tareasIniciales: Tarea[]; usuarios: Usuario[] }) {
  const [tareas, setTareas] = useState(tareasIniciales);
  const avisos = useAvisos();
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const [aBorrar, setABorrar] = useState<Tarea | null>(null);
  const [borrando, setBorrando] = useState(false);
  const encabezadoDelBorrado = useRef<HTMLElement | null>(null);

  const nombres = useMemo(() => new Map(usuarios.map((u) => [u.id, u.nombre])), [usuarios]);
  const titulo = (id: string | number) => tareas.find((t) => t.id === Number(id))?.titulo ?? 'la tarea';

  // Arrastrar con ratón (tras moverlo 5 px, para no robar los clics), con el dedo (tras
  // mantener pulsado, para no impedir el scroll) o con el teclado desde el asa.
  const sensores = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: saltarDeColumna }),
  );

  const anuncios: Announcements = {
    onDragStart: ({ active }) => `Has cogido «${titulo(active.id)}».`,
    onDragOver: ({ active, over }) =>
      over
        ? `«${titulo(active.id)}» está sobre la columna ${NOMBRE_ESTADO[over.id as EstadoTarea]}.`
        : `«${titulo(active.id)}» no está sobre ninguna columna.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `«${titulo(active.id)}» se ha soltado en ${NOMBRE_ESTADO[over.id as EstadoTarea]}.`
        : `«${titulo(active.id)}» se ha soltado fuera de las columnas.`,
    onDragCancel: ({ active }) => `Movimiento cancelado. «${titulo(active.id)}» sigue donde estaba.`,
  };

  // Actualización optimista: la tarjeta cambia de columna al instante y, si la API falla,
  // vuelve a su estado anterior y se avisa.
  async function mover(tarea: Tarea, estado: EstadoTarea) {
    if (tarea.estado === estado) return;
    setTareas((actuales) => cambiarEstadoEnLista(actuales, tarea.id, estado));
    try {
      const actualizada = await api.cambiarEstado(tarea.id, estado);
      setTareas((actuales) => reemplazarEnLista(actuales, actualizada));
      avisos.exito(`«${tarea.titulo}» movida a ${NOMBRE_ESTADO[estado]}.`);
    } catch (error) {
      setTareas((actuales) => cambiarEstadoEnLista(actuales, tarea.id, tarea.estado));
      avisos.error(`No se ha podido mover «${tarea.titulo}». ${mensajeDeError(error)}`);
    }
  }

  function alSoltar({ active, over }: DragEndEvent) {
    const tarea = tareas.find((t) => t.id === Number(active.id));
    if (tarea && over) mover(tarea, over.id as EstadoTarea);
  }

  function alGuardar(guardada: Tarea) {
    const esNueva = edicion?.modo === 'crear';
    setTareas((actuales) => (esNueva ? [...actuales, guardada] : reemplazarEnLista(actuales, guardada)));
    setEdicion(null);
    avisos.exito(esNueva ? `Tarea «${guardada.titulo}» creada.` : 'Cambios guardados.');
  }

  async function borrar() {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await api.borrarTarea(aBorrar.id);
      // La tarjeta (y su botón de borrar, que abrió el diálogo) desaparece: el foco pasa al
      // encabezado de su columna en vez de perderse.
      encabezadoDelBorrado.current = document.getElementById(`columna-${aBorrar.estado}`);
      setTareas((actuales) => actuales.filter((t) => t.id !== aBorrar.id));
      avisos.exito(`Tarea «${aBorrar.titulo}» borrada.`);
    } catch (error) {
      avisos.error(`No se ha podido borrar la tarea. ${mensajeDeError(error)}`);
    } finally {
      setBorrando(false);
      setABorrar(null);
    }
  }

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <header className={estilos.encabezado}>
        <div>
          <h1>Tablero</h1>
          <p className={estilos.resumen}>
            {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'} ·{' '}
            <strong>{porcentajeHechas(tareas)}%</strong> completado
          </p>
        </div>
        <button
          type="button"
          className="boton boton-primario"
          onClick={() => setEdicion({ modo: 'crear' })}
          disabled={usuarios.length === 0}
        >
          <IconoMas /> Nueva tarea
        </button>
      </header>

      {tareas.length === 0 && (
        <p className={estilos.vacio}>Aún no hay tareas. Crea la primera con «Nueva tarea».</p>
      )}

      <DndContext
        id="tablero"
        sensors={sensores}
        onDragEnd={alSoltar}
        accessibility={{
          announcements: anuncios,
          screenReaderInstructions: {
            draggable:
              'Para mover la tarea con el teclado, pulsa Espacio o Intro, usa las flechas para pasar de una columna a otra y pulsa Espacio o Intro para soltarla. Escape cancela. También puedes cambiar el estado con el selector de la tarjeta.',
          },
        }}
      >
        <div className={estilos.columnas}>
          {ESTADOS.map(({ clave, nombre }) => {
            const deLaColumna = tareas.filter((t) => t.estado === clave);
            return (
              <Columna key={clave} estado={clave} nombre={nombre} cantidad={deLaColumna.length}>
                {deLaColumna.map((tarea) => (
                  <TarjetaArrastrable
                    key={tarea.id}
                    tarea={tarea}
                    responsable={nombres.get(tarea.responsableId)}
                    alMover={(estado) => mover(tarea, estado)}
                    alEditar={() => setEdicion({ modo: 'editar', tarea })}
                    alBorrar={() => setABorrar(tarea)}
                  />
                ))}
              </Columna>
            );
          })}
        </div>
      </DndContext>

      <Dialogo
        abierto={edicion !== null}
        titulo={edicion?.modo === 'editar' ? 'Editar tarea' : 'Nueva tarea'}
        alCerrar={() => setEdicion(null)}
      >
        <FormularioTarea
          tarea={edicion?.modo === 'editar' ? edicion.tarea : undefined}
          usuarios={usuarios}
          alGuardar={alGuardar}
          alCancelar={() => setEdicion(null)}
        />
      </Dialogo>

      <Dialogo
        abierto={aBorrar !== null}
        titulo="Borrar tarea"
        alCerrar={() => setABorrar(null)}
        focoDeRespaldo={encabezadoDelBorrado}
      >
        <div className={estilos.confirmacion}>
          <p>
            ¿Seguro que quieres borrar «{aBorrar?.titulo}»? Dejará de verse en el tablero junto con
            sus comentarios y adjuntos.
          </p>
          <div className={estilos.botones}>
            <button type="button" className="boton" onClick={() => setABorrar(null)} data-autofocus>
              Cancelar
            </button>
            <button type="button" className={`boton ${estilos.botonPeligro}`} onClick={borrar} disabled={borrando}>
              {borrando ? 'Borrando…' : 'Borrar'}
            </button>
          </div>
        </div>
      </Dialogo>

      <Avisos aviso={avisos.aviso} alCerrar={avisos.cerrar} />
    </div>
  );
}

function Columna({
  estado,
  nombre,
  cantidad,
  children,
}: {
  estado: EstadoTarea;
  nombre: string;
  cantidad: number;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: estado });
  return (
    <section
      ref={setNodeRef}
      className={estilos.columna}
      data-sobre={isOver || undefined}
      aria-labelledby={`columna-${estado}`}
    >
      <h2 id={`columna-${estado}`} className={estilos.tituloColumna} data-estado={estado} tabIndex={-1}>
        {nombre}
        <span className={estilos.contador}>
          {cantidad}
          <span className="solo-lectores"> {cantidad === 1 ? 'tarea' : 'tareas'}</span>
        </span>
      </h2>
      {cantidad === 0 ? <p className={estilos.columnaVacia}>Sin tareas</p> : <ul className={estilos.lista}>{children}</ul>}
    </section>
  );
}

function TarjetaArrastrable({
  tarea,
  responsable,
  alMover,
  alEditar,
  alBorrar,
}: {
  tarea: Tarea;
  responsable?: string;
  alMover: (estado: EstadoTarea) => void;
  alEditar: () => void;
  alBorrar: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: tarea.id });

  return (
    <li
      ref={setNodeRef}
      className={estilos.elemento}
      data-arrastrando={isDragging || undefined}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <TarjetaTarea
        tarea={tarea}
        href={`/tareas/${tarea.id}`}
        responsable={responsable}
        asa={
          <button
            type="button"
            className={`${estilos.botonIcono} ${estilos.asa}`}
            aria-label={`Mover «${tarea.titulo}»`}
            {...attributes}
            {...listeners}
          >
            <IconoAsa />
          </button>
        }
        acciones={
          <>
            <label className="solo-lectores" htmlFor={`estado-${tarea.id}`}>
              Estado de «{tarea.titulo}»
            </label>
            <select
              id={`estado-${tarea.id}`}
              className={estilos.selectorEstado}
              value={tarea.estado}
              onChange={(e) => alMover(e.target.value as EstadoTarea)}
            >
              {ESTADOS.map(({ clave, nombre }) => (
                <option key={clave} value={clave}>
                  {nombre}
                </option>
              ))}
            </select>
            <button type="button" className={estilos.botonIcono} onClick={alEditar} aria-label={`Editar «${tarea.titulo}»`}>
              <IconoEditar />
            </button>
            <button type="button" className={estilos.botonIcono} onClick={alBorrar} aria-label={`Borrar «${tarea.titulo}»`}>
              <IconoBorrar />
            </button>
          </>
        }
      />
    </li>
  );
}
