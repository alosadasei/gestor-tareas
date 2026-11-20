'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { api, ErrorApi, type Comentario, type Usuario } from '../../cliente/api';
import { formatearFechaHora, iniciales } from '../../cliente/tablero';
import { LONGITUD_MAXIMA_COMENTARIO } from '../../domain/comentario';
import { mensajeDeError, type useAvisos } from '../Avisos';
import estilos from './DetalleTarea.module.css';

// Hilo de comentarios de una tarea: quién comentó y cuándo, del más antiguo al más reciente.
// Sin autenticación, el autor se elige en el formulario (con login saldría de la sesión).
export function Comentarios({
  tareaId,
  usuarios,
  iniciales: comentariosIniciales,
  avisos,
}: {
  tareaId: number;
  usuarios: Usuario[];
  iniciales: Comentario[];
  avisos: ReturnType<typeof useAvisos>;
}) {
  const id = useId();
  const texto = useRef<HTMLTextAreaElement>(null);
  const [comentarios, setComentarios] = useState(comentariosIniciales);
  const [autorId, setAutorId] = useState(String(usuarios[0]?.id ?? ''));
  const [contenido, setContenido] = useState('');
  const [error, setError] = useState<string>();
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (!contenido.trim()) {
      setError('Escribe el comentario antes de publicarlo');
      texto.current?.focus();
      return;
    }
    setEnviando(true);
    try {
      const nuevo = await api.comentar(tareaId, { autorId: Number(autorId), texto: contenido });
      setComentarios((actuales) => [...actuales, nuevo]);
      setContenido('');
      setError(undefined);
      avisos.exito('Comentario publicado.');
    } catch (e) {
      if (e instanceof ErrorApi && e.errorDeCampo('texto')) setError(e.errorDeCampo('texto'));
      else avisos.error(`No se ha podido publicar el comentario. ${mensajeDeError(e)}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className={estilos.bloque}>
      <h2 id={`${id}-titulo`}>
        Comentarios <span className={estilos.cantidad}>{comentarios.length}</span>
      </h2>

      {comentarios.length === 0 ? (
        <p className={estilos.suave}>Aún no hay comentarios.</p>
      ) : (
        <ol className={estilos.comentarios}>
          {comentarios.map((c) => (
            <li key={c.id}>
              <article className={estilos.comentario}>
                <span className={estilos.avatar} aria-hidden="true">
                  {iniciales(c.autor.nombre)}
                </span>
                <div>
                  <p className={estilos.metaComentario}>
                    <strong>{c.autor.nombre}</strong>{' '}
                    <time dateTime={c.creadoEn}>{formatearFechaHora(c.creadoEn)}</time>
                  </p>
                  <p className={estilos.textoComentario}>{c.texto}</p>
                </div>
              </article>
            </li>
          ))}
        </ol>
      )}

      <form className={estilos.formularioComentario} onSubmit={enviar} noValidate>
        <div className={estilos.campo}>
          <label htmlFor={`${id}-texto`}>Nuevo comentario</label>
          <textarea
            ref={texto}
            id={`${id}-texto`}
            rows={3}
            maxLength={LONGITUD_MAXIMA_COMENTARIO}
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
          />
          {error && (
            <p id={`${id}-error`} className={estilos.error}>
              {error}
            </p>
          )}
        </div>
        <div className={estilos.filaEnvio}>
          <div className={estilos.campoEnLinea}>
            <label htmlFor={`${id}-autor`}>Comentar como</label>
            <select id={`${id}-autor`} value={autorId} onChange={(e) => setAutorId(e.target.value)}>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="boton boton-primario" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Comentar'}
          </button>
        </div>
      </form>
    </section>
  );
}
