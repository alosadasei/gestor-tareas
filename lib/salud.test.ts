import net from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comprobarBaseDeDatos } from './salud';

describe('comprobarBaseDeDatos', () => {
  const servidor = net.createServer((s) => s.end());
  let puerto = 0;

  beforeAll(async () => {
    await new Promise<void>((r) => servidor.listen(0, '127.0.0.1', r));
    puerto = (servidor.address() as net.AddressInfo).port;
  });
  afterAll(() => {
    servidor.close();
  });

  it('es sana si la base de datos acepta conexiones', async () => {
    expect(await comprobarBaseDeDatos(`postgres://u:p@127.0.0.1:${puerto}/db`)).toBe(true);
  });

  it('está degradada si nadie escucha en el puerto', async () => {
    expect(await comprobarBaseDeDatos('postgres://u:p@127.0.0.1:1/db')).toBe(false);
  });

  it('está degradada si la URL no es válida', async () => {
    expect(await comprobarBaseDeDatos('esto no es una url')).toBe(false);
  });

  it('es sana si no hay base de datos configurada', async () => {
    expect(await comprobarBaseDeDatos(undefined)).toBe(true);
  });
});
