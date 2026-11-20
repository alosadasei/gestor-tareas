'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, type EstadoTarea } from '../../cliente/api';
import {
  ESTADOS,
  estaVencida,
  formatearFecha,
  NOMBRE_ESTADO,
  NOMBRE_PRIORIDAD,
} from '../../cliente/tablero';
import type { DatosDetalle } from '../../services/detalleTarea';
import { Avisos, mensajeDeError, useAvisos } from '../Avisos';
import { Dialogo } from '../Dialogo';
import { IconoBorrar, IconoEditar } from '../Iconos';
import { FormularioTarea } from '../tablero/FormularioTarea';
import { Adjuntos } from './Adjuntos';
import { Comentarios } from './Comentarios';
import estilos from './DetalleTarea.module.css';

export function DetalleTarea({ tarea: inicial, usuarios, comentarios, adjuntos }: DatosDetalle) {
  const router = useRouter();
  const avisos = useAvisos();
  const [tarea, setTarea] = useState(inicial);
  const [editando, setEditando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const [borrando, setBorrando] = useState(false);

  const responsable = usuarios.find((u) => u.id === tarea.responsableId)?.nombre ?? '—';
  const vencida = estaVencida(tarea);

  async function cambiarEstado(estado: EstadoTarea) {
    const anterior = tarea;
    setTarea({ ...tarea, estado });
    try {
      setTarea(await api.cambiarEstado(tarea.id, estado));
      avisos.exito(`Tarea movida a ${NOMBRE_ESTADO[estado]}.`);
    } catch (error) {
      setTarea(anterior);
      avisos.error(`No se ha podido cambiar el estado. ${mensajeDeError(error)}`);
    }
  }

  async function borrar() {
    setBorrando(true);
    try {
      await api.borrarTarea(tarea.id);
      router.push('/tablero');
    } catch (error) {
      setBorrando(false);
      setConfirmarBorrado(false);
      avisos.error(`No se ha podido borrar la tarea. ${mensajeDeError(error)}`);
    }
  }

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <nav aria-label="Ruta de navegación" className={estilos.migas}>
        <ol>
          <li>
            <Link href="/tablero">Tablero</Link>
          </li>
          <li>
            <Link href="/tareas">Tareas</Link>
          </li>
          <li aria-current="page">{tarea.titulo}</li>
        </ol>
      </nav>

      <header className={estilos.encabezado}>
        <h1>{tarea.titulo}</h1>
        <div className={estilos.acciones}>
          <label className="solo-lectores" htmlFor="estado-tarea">
            Estado
          </label>
          <select
            id="estado-tarea"
            className={estilos.selector}
            value={tarea.estado}
            onChange={(e) => cambiarEstado(e.target.value as EstadoTarea)}
          >
            {ESTADOS.map(({ clave, nombre }) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
          <button type="button" className="boton" onClick={() => setEditando(true)}>
            <IconoEditar /> Editar
          </button>
          <button type="button" className="boton" onClick={() => setConfirmarBorrado(true)}>
            <IconoBorrar /> Borrar
          </button>
        </div>
      </header>

      <div className={estilos.distribucion}>
        <div className={estilos.principal}>
          <section aria-labelledby="titulo-descripcion" className={estilos.bloque}>
            <h2 id="titulo-descripcion">Descripción</h2>
            {tarea.descripcion ? (
              <p className={estilos.descripcion}>{tarea.descripcion}</p>
            ) : (
              <p className={estilos.suave}>Sin descripción.</p>
            )}
          </section>
          <Comentarios tareaId={tarea.id} usuarios={usuarios} iniciales={comentarios} avisos={avisos} />
          <Adjuntos tareaId={tarea.id} iniciales={adjuntos} avisos={avisos} />
        </div>

        <aside className={estilos.lateral} aria-label="Detalles de la tarea">
          <dl className={estilos.datos}>
            <div>
              <dt>Estado</dt>
              <dd>
                <span className={estilos.estado} data-estado={tarea.estado}>
                  {NOMBRE_ESTADO[tarea.estado]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Prioridad</dt>
              <dd>
                <span className={estilos.prioridad} data-prioridad={tarea.prioridad}>
                  {NOMBRE_PRIORIDAD[tarea.prioridad]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Responsable</dt>
              <dd>{responsable}</dd>
            </div>
            <div>
              <dt>Fecha límite</dt>
              <dd data-vencida={vencida || undefined}>
                {tarea.fechaLimite ? formatearFecha(tarea.fechaLimite) : 'Sin fecha'}
                {vencida && ' · vencida'}
              </dd>
            </div>
            <div>
              <dt>Etiquetas</dt>
              <dd>
                {tarea.etiquetas.length > 0 ? (
                  <ul className={estilos.etiquetas}>
                    {tarea.etiquetas.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  'Sin etiquetas'
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      <Dialogo abierto={editando} titulo="Editar tarea" alCerrar={() => setEditando(false)}>
        <FormularioTarea
          tarea={tarea}
          usuarios={usuarios}
          alGuardar={(guardada) => {
            setTarea(guardada);
            setEditando(false);
            avisos.exito('Cambios guardados.');
          }}
          alCancelar={() => setEditando(false)}
        />
      </Dialogo>

      <Dialogo abierto={confirmarBorrado} titulo="Borrar tarea" alCerrar={() => setConfirmarBorrado(false)}>
        <div className={estilos.confirmacion}>
          <p>¿Seguro que quieres borrar «{tarea.titulo}»? Dejará de verse junto con sus comentarios y adjuntos.</p>
          <div className={estilos.botones}>
            <button type="button" className="boton" onClick={() => setConfirmarBorrado(false)} data-autofocus>
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
