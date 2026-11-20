import { expect, test, type Page } from '@playwright/test';

// Flujo principal de punta a punta: crear una tarea, moverla de columna (con el teclado y
// arrastrando con el ratón), comentarla y borrarla. Comprueba tras recargar que cada cambio
// se ha guardado de verdad.

const columna = (page: Page, nombre: string) => page.getByRole('region', { name: new RegExp(`^${nombre}`) });

// En el tablero hay dos regiones role=status (los avisos y la de dnd-kit): se busca por el texto.
const aviso = (page: Page, texto: string) => page.getByRole('status').filter({ hasText: texto });

test('crear, mover, comentar y borrar una tarea', async ({ page }) => {
  const titulo = `Tarea e2e ${Date.now()}`;
  const tarjeta = (nombreColumna: string) => columna(page, nombreColumna).getByRole('listitem').filter({ hasText: titulo });

  await test.step('crear la tarea desde el tablero', async () => {
    await page.goto('/tablero');
    await page.getByRole('button', { name: 'Nueva tarea' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Nueva tarea' });
    await expect(dialogo.getByLabel('Título')).toBeFocused();
    await dialogo.getByLabel('Título').fill(titulo);
    await dialogo.getByLabel('Prioridad').selectOption('alta');
    await dialogo.getByLabel(/Etiquetas/).fill('e2e');
    await dialogo.getByRole('button', { name: 'Crear tarea' }).click();

    await expect(dialogo).toBeHidden();
    await expect(aviso(page, `Tarea «${titulo}» creada.`)).toBeVisible();
    await expect(tarjeta('Pendiente')).toBeVisible();
  });

  await test.step('moverla a En curso con el teclado', async () => {
    // Cada paso espera al anuncio para lectores de pantalla de dnd-kit, como haría quien lo usa.
    const anuncio = page.locator('[id^="DndLiveRegion"]');
    await page.getByRole('button', { name: `Mover «${titulo}»` }).focus();
    await page.keyboard.press('Space');
    await expect(anuncio).toHaveText(`«${titulo}» está sobre la columna Pendiente.`);
    // dnd-kit empieza a escuchar las flechas un instante después de coger la tarjeta: si la
    // primera pulsación llega antes, se repite.
    await expect(async () => {
      await page.keyboard.press('ArrowRight');
      await expect(anuncio).toHaveText(`«${titulo}» está sobre la columna En curso.`, { timeout: 500 });
    }).toPass();
    await page.keyboard.press('Space');

    await expect(tarjeta('En curso')).toBeVisible();
    await expect(aviso(page, `«${titulo}» movida a En curso.`)).toBeVisible();
  });

  await test.step('arrastrarla a Hecha con el ratón', async () => {
    // Arriba del todo para que se vean a la vez el asa y la columna de destino.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: `Mover «${titulo}»` }).hover();
    await page.mouse.down();
    const caja = (await columna(page, 'Hecha').boundingBox())!;
    await page.mouse.move(caja.x + caja.width / 2, Math.max(caja.y, 0) + 40, { steps: 10 });
    await page.mouse.up();

    await expect(tarjeta('Hecha')).toBeVisible();
    // El cambio se ve al instante (optimista): se espera a que la API lo confirme antes de recargar.
    await expect(aviso(page, `«${titulo}» movida a Hecha.`)).toBeVisible();
    await page.reload();
    await expect(tarjeta('Hecha')).toBeVisible();
  });

  await test.step('abrir el detalle y comentar', async () => {
    await tarjeta('Hecha').getByRole('link', { name: titulo }).click();
    await expect(page).toHaveURL(/\/tareas\/\d+$/);
    await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
    await expect(page.getByLabel('Estado', { exact: true })).toHaveValue('hecha');

    await page.getByLabel('Nuevo comentario').fill('Revisado en el e2e');
    await page.getByRole('button', { name: 'Comentar' }).click();
    await expect(aviso(page, 'Comentario publicado.')).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: /Comentarios/ })).toContainText('1');
    await expect(page.getByText('Revisado en el e2e')).toBeVisible();
  });

  await test.step('borrarla y volver al tablero', async () => {
    await page.getByRole('button', { name: 'Borrar' }).click();
    await page.getByRole('dialog', { name: 'Borrar tarea' }).getByRole('button', { name: 'Borrar' }).click();

    await expect(page).toHaveURL(/\/tablero$/);
    await expect(page.getByText(titulo)).toHaveCount(0);
  });
});

test('una tarea que no existe muestra la página 404', async ({ page }) => {
  const respuesta = await page.goto('/tareas/999999');
  expect(respuesta?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Esta tarea no existe');
});

test('el listado filtra y ordena desde la URL', async ({ page }) => {
  await page.goto('/tareas');
  await page.getByLabel('Estado').selectOption('hecha');
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/estado=hecha/);
  for (const estado of await page.locator('tbody td[data-etiqueta="Estado"]').allTextContents()) {
    expect(estado).toBe('Hecha');
  }

  await page.getByRole('link', { name: /^Prioridad/ }).click();
  await expect(page.locator('th[aria-sort]')).toHaveAttribute('aria-sort', 'ascending');
  await expect(page).toHaveURL(/estado=hecha.*ordenarPor=prioridad/);
});
