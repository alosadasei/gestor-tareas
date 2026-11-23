// Variables públicas: se leen con el nombre literal completo (process.env.NEXT_PUBLIC_...).
// Next.js sustituye en tiempo de build ese texto exacto por su valor en el bundle del
// navegador; con process.env[nombre] (acceso dinámico) no puede hacerlo y llegaría undefined.
export const apiUrl = process.env.NEXT_PUBLIC_API_URL;
export const appEnv = process.env.NEXT_PUBLIC_APP_ENV ?? 'development';
