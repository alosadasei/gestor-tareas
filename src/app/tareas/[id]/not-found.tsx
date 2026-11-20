import Link from 'next/link';
import estilos from './detalle.module.css';

export default function TareaNoEncontrada() {
  return (
    <div className={`contenedor ${estilos.noEncontrada}`}>
      <h1>Esta tarea no existe</h1>
      <p>Puede que se haya borrado o que el enlace no sea correcto.</p>
      <div className={estilos.acciones}>
        <Link href="/tablero" className="boton boton-primario">
          Ir al tablero
        </Link>
        <Link href="/tareas" className="boton">
          Ver todas las tareas
        </Link>
      </div>
    </div>
  );
}
