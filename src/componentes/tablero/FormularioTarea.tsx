'use client';

import { useId, useRef, useState, type FormEvent } from 'react';
import { api, ErrorApi, type Tarea, type Usuario } from '../../cliente/api';
import {
  cambiosTarea,
  datosNuevaTarea,
  hoyIso,
  NOMBRE_PRIORIDAD,
  validarFormulario,
  valoresIniciales,
  type ErroresFormulario,
  type ValoresFormulario,
} from '../../cliente/tablero';
import estilos from './FormularioTarea.module.css';

const CAMPOS: (keyof ValoresFormulario)[] = [
  'titulo',
  'descripcion',
  'prioridad',
  'fechaLimite',
  'responsableId',
  'etiquetas',
];

// Crear (sin `tarea`) o editar una tarea. Valida en el navegador antes de enviar y, si la
// API rechaza algo, muestra su mensaje junto al campo correspondiente.
export function FormularioTarea({
  tarea,
  usuarios,
  alGuardar,
  alCancelar,
}: {
  tarea?: Tarea;
  usuarios: Usuario[];
  alGuardar: (tarea: Tarea) => void;
  alCancelar: () => void;
}) {
  const id = useId();
  const formulario = useRef<HTMLFormElement>(null);
  const [valores, setValores] = useState(() => valoresIniciales(tarea, usuarios[0]?.id));
  const [errores, setErrores] = useState<ErroresFormulario>({});
  const [enviando, setEnviando] = useState(false);

  const cambiar = (campo: keyof ValoresFormulario) => (evento: { target: { value: string } }) =>
    setValores((v) => ({ ...v, [campo]: evento.target.value }));

  // Lleva el foco al primer campo con error, para que se oiga y se vea qué corregir.
  function mostrarErrores(nuevos: ErroresFormulario) {
    setErrores(nuevos);
    const primero = CAMPOS.find((campo) => nuevos[campo]);
    if (primero) requestAnimationFrame(() => formulario.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus());
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const encontrados = validarFormulario(valores, tarea);
    if (Object.keys(encontrados).length > 0) return mostrarErrores(encontrados);

    setEnviando(true);
    try {
      if (tarea) {
        const cambios = cambiosTarea(tarea, valores);
        alGuardar(Object.keys(cambios).length === 0 ? tarea : await api.editarTarea(tarea.id, cambios));
      } else {
        alGuardar(await api.crearTarea(datosNuevaTarea(valores)));
      }
    } catch (error) {
      if (!(error instanceof ErrorApi)) throw error;
      const deCampos: ErroresFormulario = {};
      for (const { campo, mensaje } of error.detalles) {
        if (CAMPOS.includes(campo as keyof ValoresFormulario)) deCampos[campo as keyof ValoresFormulario] = mensaje;
      }
      mostrarErrores(Object.keys(deCampos).length > 0 ? deCampos : { general: error.message });
    } finally {
      setEnviando(false);
    }
  }

  // Props comunes de accesibilidad de un campo: su error se enlaza con aria-describedby.
  const campo = (nombre: keyof ValoresFormulario) => ({
    id: `${id}-${nombre}`,
    name: nombre,
    value: valores[nombre],
    onChange: cambiar(nombre),
    'aria-invalid': errores[nombre] ? true : undefined,
    'aria-describedby': errores[nombre] ? `${id}-${nombre}-error` : undefined,
  });

  const error = (nombre: keyof ValoresFormulario) =>
    errores[nombre] && (
      <p id={`${id}-${nombre}-error`} className={estilos.error}>
        {errores[nombre]}
      </p>
    );

  return (
    <form ref={formulario} className={estilos.formulario} onSubmit={enviar} noValidate>
      {errores.general && (
        <p className={estilos.errorGeneral} role="alert">
          {errores.general}
        </p>
      )}

      <div className={estilos.campo}>
        <label htmlFor={`${id}-titulo`}>Título</label>
        <input type="text" required maxLength={200} data-autofocus {...campo('titulo')} />
        {error('titulo')}
      </div>

      <div className={estilos.campo}>
        <label htmlFor={`${id}-descripcion`}>
          Descripción <span className={estilos.opcional}>(opcional)</span>
        </label>
        <textarea rows={3} maxLength={5000} {...campo('descripcion')} />
        {error('descripcion')}
      </div>

      <div className={estilos.fila}>
        <div className={estilos.campo}>
          <label htmlFor={`${id}-prioridad`}>Prioridad</label>
          <select {...campo('prioridad')}>
            {Object.entries(NOMBRE_PRIORIDAD).map(([clave, nombre]) => (
              <option key={clave} value={clave}>
                {nombre}
              </option>
            ))}
          </select>
          {error('prioridad')}
        </div>

        <div className={estilos.campo}>
          <label htmlFor={`${id}-fechaLimite`}>
            Fecha límite <span className={estilos.opcional}>(opcional)</span>
          </label>
          <input type="date" min={hoyIso()} {...campo('fechaLimite')} />
          {error('fechaLimite')}
        </div>
      </div>

      <div className={estilos.campo}>
        <label htmlFor={`${id}-responsableId`}>Responsable</label>
        <select required {...campo('responsableId')}>
          {usuarios.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nombre}
            </option>
          ))}
        </select>
        {error('responsableId')}
      </div>

      <div className={estilos.campo}>
        <label htmlFor={`${id}-etiquetas`}>
          Etiquetas <span className={estilos.opcional}>(separadas por comas)</span>
        </label>
        <input type="text" placeholder="frontend, bug" {...campo('etiquetas')} />
        {error('etiquetas')}
      </div>

      <div className={estilos.botones}>
        <button type="button" className="boton" onClick={alCancelar}>
          Cancelar
        </button>
        <button type="submit" className="boton boton-primario" disabled={enviando}>
          {enviando ? 'Guardando…' : tarea ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </div>
    </form>
  );
}
