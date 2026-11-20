import type { Metadata } from 'next';
import Link from 'next/link';
import { obtenerPrisma } from '../../../lib/db';
import { repositorioTareas } from '../../api/dependencias';
import { esquemaListadoTareas } from '../../api/esquemas';
import {
  limpiarParametros,
  rangoMostrado,
  urlListado,
  urlOrdenarPor,
  type Orden,
  type ParametrosUrl,
} from '../../cliente/listado';
import { ESTADOS, estaVencida, formatearFecha, NOMBRE_ESTADO, NOMBRE_PRIORIDAD } from '../../cliente/tablero';
import { listarUsuarios } from '../../repositorios/catalogos';
import estilos from './tareas.module.css';

export const metadata: Metadata = { title: 'Tareas' };
export const dynamic = 'force-dynamic';

// Listado con paginación, filtros y orden. Todo el estado está en la URL y la página se
// genera en el servidor: los filtros son un formulario GET y el orden y la paginación,
// enlaces, así que funciona incluso sin JavaScript.
export default async function PaginaTareas({ searchParams }: { searchParams: Promise<ParametrosUrl> }) {
  const parametros = limpiarParametros(await searchParams);
  const resultado = esquemaListadoTareas.safeParse(parametros);
  // Con parámetros no válidos (una URL editada a mano) se muestra el listado sin filtros.
  const consulta = resultado.success ? resultado.data : esquemaListadoTareas.parse({});

  const [{ elementos, total, pagina, tamanoPagina }, usuarios] = await Promise.all([
    repositorioTareas().listar(consulta),
    listarUsuarios(obtenerPrisma()),
  ]);
  const nombres = new Map(usuarios.map((u) => [u.id, u.nombre]));
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina));
  const { filtro, orden } = consulta;
  const hayFiltros = Boolean(filtro.texto || filtro.estado || filtro.prioridad || filtro.responsableId);

  const cabeceraOrdenable = (campo: Orden['campo'], texto: string) => {
    const activa = orden.campo === campo;
    return (
      <th scope="col" aria-sort={activa ? (orden.direccion === 'asc' ? 'ascending' : 'descending') : undefined}>
        <Link href={urlOrdenarPor(parametros, orden, campo)} className={estilos.ordenar}>
          {texto}
          <span aria-hidden="true">{activa ? (orden.direccion === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
        </Link>
      </th>
    );
  };

  return (
    <div className={`contenedor ${estilos.pagina}`}>
      <h1>Tareas</h1>

      {!resultado.success && (
        <p className={estilos.aviso} role="alert">
          Algunos parámetros de la dirección no eran válidos y se han ignorado.
        </p>
      )}

      <form method="get" action="/tareas" className={estilos.filtros} role="search" aria-label="Filtrar tareas">
        <div className={`${estilos.campo} ${estilos.campoTexto}`}>
          <label htmlFor="filtro-texto">Buscar</label>
          <input id="filtro-texto" name="texto" type="search" defaultValue={filtro.texto} placeholder="Título o descripción" />
        </div>
        <div className={estilos.campo}>
          <label htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" name="estado" defaultValue={filtro.estado ?? ''}>
            <option value="">Todos</option>
            {ESTADOS.map(({ clave, nombre }) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={estilos.campo}>
          <label htmlFor="filtro-prioridad">Prioridad</label>
          <select id="filtro-prioridad" name="prioridad" defaultValue={filtro.prioridad ?? ''}>
            <option value="">Todas</option>
            {Object.entries(NOMBRE_PRIORIDAD).map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={estilos.campo}>
          <label htmlFor="filtro-responsable">Responsable</label>
          <select id="filtro-responsable" name="responsableId" defaultValue={filtro.responsableId ?? ''}>
            <option value="">Todos</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
        </div>
        {/* El orden se conserva al filtrar; la página no (vuelve a la primera). */}
        {parametros.ordenarPor && <input type="hidden" name="ordenarPor" value={parametros.ordenarPor} />}
        {parametros.direccion && <input type="hidden" name="direccion" value={parametros.direccion} />}
        <div className={estilos.botones}>
          <button type="submit" className="boton boton-primario">
            Filtrar
          </button>
          {hayFiltros && (
            <Link href="/tareas" className="boton">
              Limpiar
            </Link>
          )}
        </div>
      </form>

      <p className={estilos.resumen}>
        Mostrando {rangoMostrado(pagina, tamanoPagina, elementos.length, total)} {total === 1 ? 'tarea' : 'tareas'}
      </p>

      {elementos.length === 0 ? (
        <p className={estilos.vacio}>
          {hayFiltros ? 'No hay tareas que coincidan con los filtros.' : 'Todavía no hay tareas.'}
        </p>
      ) : (
        <table className={estilos.tabla}>
          <caption className="solo-lectores">
            Tareas, página {pagina} de {totalPaginas}. Las columnas con flechas se pueden ordenar.
          </caption>
          <thead>
            <tr>
              {cabeceraOrdenable('id', 'Tarea')}
              <th scope="col">Estado</th>
              {cabeceraOrdenable('prioridad', 'Prioridad')}
              <th scope="col">Responsable</th>
              {cabeceraOrdenable('fechaLimite', 'Fecha límite')}
              <th scope="col">Etiquetas</th>
            </tr>
          </thead>
          <tbody>
            {elementos.map((tarea) => {
              const fecha = tarea.fechaLimite?.toISOString();
              const vencida = fecha !== undefined && estaVencida({ estado: tarea.estado, fechaLimite: fecha });
              return (
                <tr key={tarea.id}>
                  <td data-etiqueta="Tarea" className={estilos.celdaTitulo}>
                    <Link href={`/tareas/${tarea.id}`}>{tarea.titulo}</Link>
                  </td>
                  <td data-etiqueta="Estado">
                    <span className={estilos.estado} data-estado={tarea.estado}>
                      {NOMBRE_ESTADO[tarea.estado]}
                    </span>
                  </td>
                  <td data-etiqueta="Prioridad">
                    <span className={estilos.prioridad} data-prioridad={tarea.prioridad}>
                      {NOMBRE_PRIORIDAD[tarea.prioridad]}
                    </span>
                  </td>
                  <td data-etiqueta="Responsable">{nombres.get(tarea.responsableId) ?? '—'}</td>
                  <td data-etiqueta="Fecha límite" data-vencida={vencida || undefined}>
                    {fecha ? formatearFecha(fecha) : '—'}
                    {vencida && <span className={estilos.vencida}> · vencida</span>}
                  </td>
                  <td data-etiqueta="Etiquetas">{tarea.etiquetas.length > 0 ? tarea.etiquetas.join(', ') : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {totalPaginas > 1 && (
        <nav className={estilos.paginacion} aria-label="Paginación">
          {pagina > 1 ? (
            <Link href={urlListado(parametros, { pagina: String(pagina - 1) })} className="boton" rel="prev">
              ← Anterior
            </Link>
          ) : (
            <span className={`boton ${estilos.deshabilitado}`} aria-disabled="true">
              ← Anterior
            </span>
          )}
          <span aria-current="page">
            Página {pagina} de {totalPaginas}
          </span>
          {pagina < totalPaginas ? (
            <Link href={urlListado(parametros, { pagina: String(pagina + 1) })} className="boton" rel="next">
              Siguiente →
            </Link>
          ) : (
            <span className={`boton ${estilos.deshabilitado}`} aria-disabled="true">
              Siguiente →
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
