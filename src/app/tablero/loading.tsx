import estilos from './tablero.module.css';

// Esqueleto mientras se cargan las tareas: misma estructura que el tablero real.
export default function Cargando() {
  return (
    <div className={`contenedor ${estilos.pagina}`} aria-busy="true">
      <p className="solo-lectores" role="status">
        Cargando el tablero…
      </p>
      <div className={estilos.esqueletoTitulo} />
      <div className={estilos.esqueletoColumnas} aria-hidden="true">
        {[3, 2, 2].map((tarjetas, i) => (
          <div key={i} className={estilos.esqueletoColumna}>
            {Array.from({ length: tarjetas }, (_, j) => (
              <div key={j} className={estilos.esqueletoTarjeta} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
