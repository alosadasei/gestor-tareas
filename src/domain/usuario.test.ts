import { describe, expect, it } from 'vitest';
import { crearUsuario } from './usuario';

describe('crearUsuario', () => {
  it('recorta el nombre y normaliza el email a minúsculas', () => {
    expect(crearUsuario(1, ' Ana ', ' Ana@Ejemplo.COM ')).toEqual({
      id: 1,
      nombre: 'Ana',
      email: 'ana@ejemplo.com',
    });
  });

  it('rechaza un nombre vacío', () => {
    expect(() => crearUsuario(1, '  ', 'ana@ejemplo.com')).toThrow('nombre');
  });

  it.each(['', 'ana', 'ana@', 'ana@ejemplo', 'a na@ejemplo.com'])(
    'rechaza el email mal formado "%s"',
    (email) => {
      expect(() => crearUsuario(1, 'Ana', email)).toThrow('email');
    },
  );
});
