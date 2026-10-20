// Lee una variable de entorno obligatoria y falla pronto si no existe.
export function leerVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno obligatoria: ${nombre}`);
  }
  return valor;
}

// Variables privadas: solo se leen en el servidor, vía leerVariable.
export function leerConfigServidor() {
  return {
    databaseUrl: leerVariable('DATABASE_URL'),
    authSecret: leerVariable('AUTH_SECRET'),
  };
}

// Variables públicas: se leen con el nombre literal completo (process.env.NEXT_PUBLIC_...).
// Next.js sustituye en tiempo de build ese texto exacto por su valor en el bundle del
// navegador; con process.env[nombre] (acceso dinámico) no puede hacerlo y llegaría undefined.
export const apiUrl = process.env.NEXT_PUBLIC_API_URL;
export const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? 'development';
