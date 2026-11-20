// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Avisos, useAvisos } from './Avisos';
import { Dialogo } from './Dialogo';

describe('Dialogo', () => {
  function Prueba({ alCerrar = () => {} }: { alCerrar?: () => void }) {
    const [abierto, setAbierto] = useState(false);
    const [conBoton, setConBoton] = useState(true);
    const respaldo = useRef<HTMLHeadingElement>(null);
    return (
      <>
        <h2 ref={respaldo} tabIndex={-1}>
          Lista
        </h2>
        {conBoton && <button onClick={() => setAbierto(true)}>Abrir</button>}
        <Dialogo
          abierto={abierto}
          titulo="Confirmar"
          alCerrar={() => {
            alCerrar();
            setAbierto(false);
          }}
          focoDeRespaldo={respaldo}
        >
          <button>Otro</button>
          <button data-autofocus>Preferido</button>
          <button
            onClick={() => {
              setConBoton(false);
              setAbierto(false);
            }}
          >
            Quitar el que abrió
          </button>
        </Dialogo>
      </>
    );
  }

  it('solo monta el contenido mientras está abierto y empieza en data-autofocus', async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);
    expect(screen.queryByText('Preferido')).toBeNull();

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));

    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Preferido' }));
  });

  it('el botón Cerrar avisa con alCerrar', async () => {
    const alCerrar = vi.fn();
    const usuario = userEvent.setup();
    render(<Prueba alCerrar={alCerrar} />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));
    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(alCerrar).toHaveBeenCalled();
    expect(screen.queryByText('Preferido')).toBeNull();
  });

  it('si el elemento que lo abrió ha desaparecido, el foco va a focoDeRespaldo', async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole('button', { name: 'Abrir' }));
    await usuario.click(screen.getByRole('button', { name: 'Quitar el que abrió' }));

    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Lista' }));
  });
});

describe('Avisos', () => {
  function Prueba() {
    const avisos = useAvisos();
    return (
      <>
        <button onClick={() => avisos.exito('Guardado')}>Éxito</button>
        <button onClick={() => avisos.error('Ha fallado')}>Error</button>
        <Avisos aviso={avisos.aviso} alCerrar={avisos.cerrar} />
      </>
    );
  }

  it('los de éxito se anuncian en role=status y desaparecen solos', () => {
    vi.useFakeTimers();
    try {
      render(<Prueba />);
      act(() => screen.getByRole('button', { name: 'Éxito' }).click());
      expect(screen.getByRole('status').textContent).toBe('Guardado');

      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByRole('status').textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('los de error se anuncian en role=alert y se quedan hasta cerrarlos', async () => {
    const usuario = userEvent.setup();
    render(<Prueba />);

    await usuario.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByRole('alert').textContent).toContain('Ha fallado');

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByRole('alert').textContent).toBe('');
  });
});
