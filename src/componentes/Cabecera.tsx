'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import estilos from './Cabecera.module.css';

// `pagina: false` para lo que no es una página de la app (la documentación de la API es un
// route handler): con <Link>, Next intentaría precargarla como página y daría 404.
const ENLACES = [
  { href: '/tablero', texto: 'Tablero', pagina: true },
  { href: '/tareas', texto: 'Tareas', pagina: true },
  { href: '/api/docs', texto: 'API', pagina: false },
];

// Cliente solo para saber la ruta actual y marcar el enlace activo (aria-current).
export function Cabecera() {
  const ruta = usePathname();

  return (
    <header className={estilos.cabecera}>
      <div className={`contenedor ${estilos.interior}`}>
        <Link href="/" className={estilos.marca}>
          <span className={estilos.logo} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className={estilos.textoMarca}>Gestor de Tareas</span>
        </Link>
        <nav aria-label="Principal">
          <ul className={estilos.enlaces}>
            {ENLACES.map(({ href, texto, pagina }) => {
              const activo = ruta === href || ruta.startsWith(`${href}/`);
              const props = { href, className: estilos.enlace, 'aria-current': activo ? ('page' as const) : undefined };
              return <li key={href}>{pagina ? <Link {...props}>{texto}</Link> : <a {...props}>{texto}</a>}</li>;
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
