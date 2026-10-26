import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/** Criterios de aceptación de la Fase 3 (página de inicio institucional con 3D). */

const SECCIONES = [
  'que-es',
  'como-funciona',
  'areas',
  'para-quien',
  'privacidad',
  'preguntas-frecuentes',
  'lineas-de-ayuda',
];

test('tiene todas las secciones y los enlaces del menú llegan a ellas', async ({ page }) => {
  await page.goto('/');
  for (const id of SECCIONES) await expect(page.locator(`section#${id}`)).toHaveCount(1);
  await page.goto('/#preguntas-frecuentes');
  await expect(
    page.getByRole('heading', { level: 2, name: 'Preguntas frecuentes' }),
  ).toBeInViewport();
});

test('«Comenzar mi cuestionario» lleva al registro', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Comenzar mi cuestionario' }).first().click();
  await expect(page).toHaveURL(/\/registro$/);
});

test('las pestañas filtran las 20 áreas por dimensión', async ({ page }) => {
  await page.goto('/');
  const areas = page.locator('#areas');
  await expect(areas.getByRole('tabpanel').getByRole('listitem')).toHaveCount(20);
  await areas.getByRole('tab', { name: 'Vínculos y apoyo' }).click();
  const panel = areas.getByRole('tabpanel');
  await expect(panel.getByRole('listitem')).toHaveCount(4);
  await expect(panel).toContainText('Red de apoyo');
  // Con el teclado: flecha a la derecha pasa a la siguiente dimensión.
  await areas.getByRole('tab', { name: 'Vínculos y apoyo' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(areas.getByRole('tab', { name: 'Afrontamiento' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});

test('las preguntas frecuentes se abren y se cierran', async ({ page }) => {
  await page.goto('/');
  const pregunta = page.getByRole('button', { name: '¿Es un diagnóstico?' });
  await pregunta.click();
  await expect(pregunta).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Es una herramienta de orientación que te ayuda')).toBeVisible();
  await pregunta.click();
  await expect(pregunta).toHaveAttribute('aria-expanded', 'false');
});

test('no tiene el ejercicio de respiración guiada (se quitó del sitio)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('section#preguntas-frecuentes')).toHaveCount(1);
  await expect(page.locator('section#pausa')).toHaveCount(0);
  await expect(page.getByText('Tómate un minuto')).toHaveCount(0);
});

test('el orbe 3D se dibuja y, con «reducir movimiento», queda la imagen fija', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Accesibilidad' }).click();
  await page.getByRole('switch', { name: 'Reducir movimiento' }).click();
  await expect(page.locator('main canvas')).toHaveCount(0);
  await expect(page.locator('main img[src*="orbe"]')).toBeVisible();
});

test('sin violaciones de accesibilidad en alto contraste', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'mente-al-dia:accesibilidad',
      JSON.stringify({ highContrast: true }),
    );
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-contraste', 'alto');
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const graves = resultado.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical',
  );
  expect(graves.map((v) => v.id)).toEqual([]);
});
