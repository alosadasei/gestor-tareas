import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Auditoría automática con axe-core (WCAG 2.2 A y AA) de cada página, en escritorio y en
// móvil, para que la revisión de accesibilidad no se pierda con cambios futuros. No sustituye
// a probar con teclado y lector de pantalla, pero detecta contraste, etiquetas, ARIA...

const PAGINAS = [
  ['inicio', '/'],
  ['tablero', '/tablero'],
  ['listado', '/tareas'],
  ['detalle', '/tareas/1'],
  ['404', '/tareas/999999'],
];

for (const esquema of ['light', 'dark'] as const) {
  test.describe(`tema ${esquema}`, () => {
    test.use({ colorScheme: esquema });

    for (const [nombre, ruta] of PAGINAS) {
      test(`${nombre} no tiene problemas de accesibilidad detectables`, async ({ page }) => {
        await page.goto(ruta);
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        const { violations } = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .analyze();

        expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  });
}

test('sin scroll horizontal en ninguna página', async ({ page }) => {
  for (const [, ruta] of PAGINAS) {
    await page.goto(ruta);
    const sobrante = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(sobrante, ruta).toBeLessThanOrEqual(0);
  }
});
