'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { adjuntarArchivo, api, type Adjunto } from '../../cliente/api';
import { formatearFechaHora, formatearTamano } from '../../cliente/tablero';
import { TIPOS_ADJUNTO_PERMITIDOS, validarAdjunto } from '../../domain/adjunto';
import { ErrorValidacion } from '../../domain/errores';
import { mensajeDeError, type useAvisos } from '../Avisos';
import { Dialogo } from '../Dialogo';
import { IconoBorrar } from '../Iconos';
import estilos from './DetalleTarea.module.css';

const TIPO_LEGIBLE: Record<string, string> = {
  'application/pdf': 'PDF',
  'text/plain': 'Texto',
  'text/csv': 'CSV',
};

const tipoLegible = (mime: string) => TIPO_LEGIBLE[mime] ?? mime.replace('image/', '').toUpperCase();

// Adjuntos de una tarea. El archivo se sube directamente al almacenamiento con una URL
// firmada (adjuntarArchivo) y los enlaces de descarga también están firmados y caducan.
export function Adjuntos({
  tareaId,
  iniciales,
  avisos,
}: {
  tareaId: number;
  iniciales: Adjunto[] | null;
  avisos: ReturnType<typeof useAvisos>;
}) {
  const id = useId();
  const selector = useRef<HTMLInputElement>(null);
  const [adjuntos, setAdjuntos] = useState(iniciales ?? []);
  const [error, setError] = useState<string>();
  const [subiendo, setSubiendo] = useState(false);
  const [aBorrar, setABorrar] = useState<Adjunto | null>(null);
  const [borrando, setBorrando] = useState(false);
  const titulo = useRef<HTMLHeadingElement>(null);

  async function subir(evento: FormEvent) {
    evento.preventDefault();
    const archivo = selector.current?.files?.[0];
    if (!archivo) {
      setError('Elige un archivo');
      selector.current?.focus();
      return;
    }
    // Mismas reglas que el servidor (tipo y tamaño), para avisar antes de subir nada.
    try {
      validarAdjunto(archivo.name, archivo.type, archivo.size);
    } catch (e) {
      if (!(e instanceof ErrorValidacion)) throw e;
      setError(e.message);
      selector.current?.focus();
      return;
    }

    setSubiendo(true);
    setError(undefined);
    try {
      const nuevo = await adjuntarArchivo(tareaId, archivo);
      setAdjuntos((actuales) => [...actuales, nuevo]);
      if (selector.current) selector.current.value = '';
      avisos.exito(`«${nuevo.nombreArchivo}» adjuntado.`);
    } catch (e) {
      avisos.error(`No se ha podido subir el archivo. ${mensajeDeError(e)}`);
    } finally {
      setSubiendo(false);
    }
  }

  // El diálogo se cierra al terminar: si se ha borrado, su botón ya no existe y el foco va al
  // título de la sección (focoDeRespaldo) en vez de perderse.
  async function borrar() {
    if (!aBorrar) return;
    setBorrando(true);
    try {
      await api.borrarAdjunto(aBorrar.id);
      setAdjuntos((actuales) => actuales.filter((a) => a.id !== aBorrar.id));
      avisos.exito(`«${aBorrar.nombreArchivo}» borrado.`);
    } catch (e) {
      avisos.error(`No se ha podido borrar el archivo. ${mensajeDeError(e)}`);
    } finally {
      setBorrando(false);
      setABorrar(null);
    }
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className={estilos.bloque}>
      <h2 id={`${id}-titulo`} ref={titulo} tabIndex={-1}>
        Adjuntos <span className={estilos.cantidad}>{adjuntos.length}</span>
      </h2>

      {iniciales === null ? (
        <p className={estilos.suave}>Los adjuntos no están disponibles en este momento.</p>
      ) : (
        <>
          {adjuntos.length === 0 ? (
            <p className={estilos.suave}>Sin archivos adjuntos.</p>
          ) : (
            <ul className={estilos.adjuntos}>
              {adjuntos.map((a) => (
                <li key={a.id} className={estilos.adjunto}>
                  <div>
                    <a href={a.urlDescarga} download={a.nombreArchivo} className={estilos.nombreAdjunto}>
                      {a.nombreArchivo}
                    </a>
                    <p className={estilos.metaAdjunto}>
                      {tipoLegible(a.tipoMime)} · {formatearTamano(a.tamanoBytes)} ·{' '}
                      <time dateTime={a.subidoEn}>{formatearFechaHora(a.subidoEn)}</time>
                    </p>
                  </div>
                  <button
                    type="button"
                    className={estilos.botonIcono}
                    onClick={() => setABorrar(a)}
                    aria-label={`Borrar «${a.nombreArchivo}»`}
                  >
                    <IconoBorrar />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className={estilos.formularioAdjunto} onSubmit={subir} noValidate>
            <div className={estilos.campo}>
              <label htmlFor={`${id}-archivo`}>Adjuntar archivo</label>
              <input
                ref={selector}
                id={`${id}-archivo`}
                type="file"
                accept={TIPOS_ADJUNTO_PERMITIDOS.join(',')}
                onChange={() => setError(undefined)}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-ayuda${error ? ` ${id}-error` : ''}`}
              />
              <p id={`${id}-ayuda`} className={estilos.ayuda}>
                Imágenes, PDF, texto o CSV de hasta 10 MB.
              </p>
              {error && (
                <p id={`${id}-error`} className={estilos.error}>
                  {error}
                </p>
              )}
            </div>
            <button type="submit" className="boton" disabled={subiendo}>
              {subiendo ? 'Subiendo…' : 'Subir'}
            </button>
          </form>
        </>
      )}

      <Dialogo
        abierto={aBorrar !== null}
        titulo="Borrar archivo"
        alCerrar={() => setABorrar(null)}
        focoDeRespaldo={titulo}
      >
        <div className={estilos.confirmacion}>
          <p>¿Seguro que quieres borrar «{aBorrar?.nombreArchivo}»? No se puede deshacer.</p>
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
    </section>
  );
}
