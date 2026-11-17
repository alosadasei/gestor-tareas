export type Usuario = {
  id: number;
  nombre: string;
  email: string;
};

// Comprobación básica de forma (algo@algo.algo); la verificación real sería enviar un correo.
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function crearUsuario(id: number, nombre: string, email: string): Usuario {
  const nombreLimpio = nombre.trim();
  if (nombreLimpio === '') {
    throw new Error('El nombre del usuario no puede estar vacío');
  }
  // El email se guarda en minúsculas para que "Ana@x.com" y "ana@x.com" sean el mismo usuario.
  const emailLimpio = email.trim().toLowerCase();
  if (!FORMATO_EMAIL.test(emailLimpio)) {
    throw new Error('El email del usuario no es válido');
  }
  return { id, nombre: nombreLimpio, email: emailLimpio };
}
