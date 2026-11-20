import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Cabecera } from '../componentes/Cabecera';
import './globals.css';
import estilos from './layout.module.css';

export const metadata: Metadata = {
  title: { default: 'Gestor de Tareas', template: '%s · Gestor de Tareas' },
  description:
    'Tablero kanban ligero para organizar el trabajo de un equipo: tareas con estado, prioridad, responsable, comentarios y adjuntos.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#171c25' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        {/* Primer elemento enfocable: quien navega con teclado se salta la cabecera. */}
        <a href="#contenido" className={estilos.saltar}>
          Saltar al contenido
        </a>
        <Cabecera />
        <main id="contenido" tabIndex={-1}>
          {children}
        </main>
        <footer className={estilos.pie}>
          <div className="contenedor">
            Gestor de Tareas · Proyecto final del curso Desarrollo Web Full Stack con IA
          </div>
        </footer>
      </body>
    </html>
  );
}
