'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import estilos from './Cabecera.module.css';

const ENLACES = [
  { href: '/tablero', texto: 'Tablero' },
  { href: '/api/docs', texto: 'API' },
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
          Gestor de Tareas
        </Link>
        <nav aria-label="Principal">
          <ul className={estilos.enlaces}>
            {ENLACES.map(({ href, texto }) => {
              const activo = ruta === href || ruta.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={estilos.enlace}
                    aria-current={activo ? 'page' : undefined}
                  >
                    {texto}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
