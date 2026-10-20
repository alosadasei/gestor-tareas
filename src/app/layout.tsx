import type { ReactNode } from 'react';

export const metadata = {
  title: 'Gestor de Tareas',
  description: 'Mini-Trello del curso: usuarios, equipos y tareas.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          margin: 0,
          background: '#f4f5f7',
          color: '#172b4d',
        }}
      >
        {children}
      </body>
    </html>
  );
}
