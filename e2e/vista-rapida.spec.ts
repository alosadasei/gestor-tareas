import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Vista rápida en JS vanilla (public/vista-rapida.html): fetch contra la API y DOM a mano.
// Cada test crea su propia tarea por la API y la borra al terminar, para no depender del seed.

// Los <li> de la lista de tareas (la cabecera también tiene <li>, los de la navegación).
const tareas = (page: Page) => page.getByRole('list', { name: 'Tareas' }).getByRole('listitem');

// Un título con HTML: debe verse como texto (textContent), nunca interpretarse.
const nuevoTitulo = () => `Vanilla <b>e2e</b> ${Date.now()}`;

test.describe('vista rápida', () => {
  let id: number;
  let titulo: string;

  test.beforeEach(async ({ request }) => {
    titulo = nuevoTitulo();
    const respuesta = await request.post('/api/tareas', {
      data: { titulo, prioridad: 'alta', responsableId: 1, fechaLimite: '2099-01-15' },
    });
    expect(respuesta.status()).toBe(201);
    ({ id } = await respuesta.json());
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`/api/tareas/${id}`);
  });

  test('se llega desde la landing, busca y cambia el estado de una tarea', async ({ page }) => {
    const tarea = tareas(page).filter({ hasText: titulo });

    await test.step('abrir desde la landing', async () => {
      await page.goto('/');
      await page.getByRole('link', { name: 'vista rápida' }).click();
      await expect(page).toHaveURL(/\/vista-rapida\.html$/);
      await expect(page.getByRole('heading', { level: 1, name: 'Vista rápida' })).toBeVisible();
      await expect(page.locator('#resumen')).toHaveText(/\d+ tareas?\.$/);
    });

    await test.step('buscar por título: filtra la lista y lo guarda en la URL', async () => {
      await page.getByLabel('Buscar').fill(titulo);
      await expect(page.locator('#resumen')).toHaveText('1 tarea.');
      await expect(page).toHaveURL(/\?texto=/);

      // El HTML del título se muestra tal cual y el enlace lleva al detalle.
      await expect(tarea.getByRole('link', { name: titulo })).toHaveAttribute('href', `/tareas/${id}`);
      await expect(tarea.locator('b')).toHaveCount(0);
      await expect(tarea).toContainText('Prioridad alta');
      await expect(tarea).toContainText('Vence el 15 ene');
    });

    await test.step('cambiar el estado con el desplegable', async () => {
      const estado = tarea.getByRole('combobox', { name: `Estado de «${titulo}»` });
      await estado.selectOption('en-curso');
      await expect(page.getByRole('status').filter({ hasText: `«${titulo}» movida a En curso.` })).toBeVisible();
      await expect(estado).toBeFocused();
    });

    await test.step('tras recargar, los filtros siguen en la URL y el cambio está guardado', async () => {
      await page.reload();
      await expect(page.getByLabel('Buscar')).toHaveValue(titulo);
      await expect(tarea.getByRole('combobox')).toHaveValue('en-curso');

      await page.getByRole('search').getByLabel('Estado').selectOption('pendiente');
      await expect(page.locator('#resumen')).toHaveText('Ninguna tarea coincide con los filtros.');
      await page.getByRole('button', { name: 'Limpiar' }).click();
      await expect(page).toHaveURL(/\/vista-rapida\.html$/);
      await expect(page.getByLabel('Buscar')).toHaveValue('');
    });
  });

  test('si la API falla, lo dice y se puede reintentar', async ({ page }) => {
    let fallos = 1;
    await page.route(/\/api\/tareas\?/, (ruta) =>
      fallos-- > 0
        ? ruta.fulfill({
            status: 503,
            json: { error: { code: 'ERROR_INTERNO', message: 'El servicio no está disponible.' } },
          })
        : ruta.continue(),
    );

    await page.goto('/vista-rapida.html');
    const alerta = page.getByRole('alert');
    await expect(alerta).toContainText('El servicio no está disponible.');

    await alerta.getByRole('button', { name: 'Reintentar' }).click();
    await expect(alerta).toBeHidden();
    await expect(tareas(page).filter({ hasText: titulo })).toBeVisible();
  });

  test('si cambiar el estado falla, el desplegable vuelve a su valor', async ({ page }) => {
    await page.route(`**/api/tareas/${id}/estado`, (ruta) =>
      ruta.fulfill({ status: 500, json: { error: { code: 'ERROR_INTERNO', message: 'Fallo simulado.' } } }),
    );
    await page.goto(`/vista-rapida.html?texto=${encodeURIComponent(titulo)}`);

    const estado = page.getByRole('combobox', { name: `Estado de «${titulo}»` });
    await estado.selectOption('hecha');
    await expect(page.getByRole('status').filter({ hasText: 'No se ha podido cambiar el estado' })).toContainText(
      'Fallo simulado.',
    );
    await expect(estado).toHaveValue('pendiente');
  });

  for (const esquema of ['light', 'dark'] as const) {
    test(`sin problemas de accesibilidad detectables (tema ${esquema})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto('/vista-rapida.html');
      // Se audita con la lista ya cargada (desplegables y enlaces de cada tarea incluidos).
      await expect(tareas(page).first()).toBeVisible();

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);

      // Sin scroll horizontal también en un móvil estrecho.
      await page.setViewportSize({ width: 360, height: 740 });
      const sobrante = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(sobrante).toBeLessThanOrEqual(0);
    });
  }
});
