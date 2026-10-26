import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Criterios de aceptación de la Fase 1 (fundaciones y sistema de diseño). */

const RUTAS_PUBLICAS = [
  '/',
  '/registro',
  '/ingresar',
  '/cuestionario',
  '/resultados',
  '/lineas-de-ayuda',
  '/privacidad',
  '/terminos',
  '/accesibilidad',
  '/mapa-del-sitio',
  '/guia-de-estilo',
  '/esta-ruta-no-existe',
];

const SIN_INDEXAR = ['/registro', '/ingresar', '/cuestionario', '/resultados', '/guia-de-estilo'];

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function violacionesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
  return resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => ({ id: v.id, nodos: v.nodes.map((n) => n.target.join(' ')).slice(0, 5) }));
}

function vigilarConsola(page: Page): string[] {
  const mensajes: string[] = [];
  page.on('console', (m) => {
    // Avisos de rendimiento del controlador de GPU por software del navegador de pruebas
    // (aparecen cuando axe lee la página con el orbe 3D); no vienen del sitio.
    if (m.text().includes('GL Driver Message')) return;
    if (m.type() === 'error' || m.type() === 'warning') mensajes.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (error) => mensajes.push(`pageerror: ${error.message}`));
  return mensajes;
}

test.describe('Rutas públicas', () => {
  for (const ruta of RUTAS_PUBLICAS) {
    test(`${ruta} carga sin errores, con «Líneas de ayuda» y sin violaciones de accesibilidad`, async ({
      page,
    }) => {
      const consola = vigilarConsola(page);
      await page.goto(ruta);
      await expect(page.locator('h1')).toHaveCount(1);
      // El botón del encabezado (banner); la guía de estilo tiene otro de ejemplo con el mismo nombre.
      await expect(
        page.getByRole('banner').getByRole('button', { name: 'Líneas de ayuda' }),
      ).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('lang', 'es-CO');
      expect(await violacionesGraves(page)).toEqual([]);
      expect(consola).toEqual([]);
    });
  }

  test('cada página tiene un título único', async ({ page }) => {
    const titulos = new Map<string, string>();
    for (const ruta of RUTAS_PUBLICAS) {
      await page.goto(ruta);
      await expect(page.locator('h1')).toHaveCount(1);
      // /cuestionario sin registro lleva al registro: su título es el del registro.
      if (new URL(page.url()).pathname !== ruta) continue;
      titulos.set(ruta, await page.title());
    }
    const valores = [...titulos.values()];
    expect(new Set(valores).size, JSON.stringify(Object.fromEntries(titulos), null, 2)).toBe(
      valores.length,
    );
  });

  test('registro, cuestionario, resultados y la guía llevan noindex; el inicio no', async ({
    page,
  }) => {
    for (const ruta of SIN_INDEXAR) {
      await page.goto(ruta);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    }
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });

  test('la página 404 ofrece volver al inicio y ver las líneas de ayuda', async ({ page }) => {
    await page.goto('/no-existe');
    const main = page.locator('main');
    await expect(main.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    await main.getByRole('link', { name: 'Ver líneas de ayuda' }).click();
    await expect(page).toHaveURL(/\/lineas-de-ayuda$/);
    await expect(page.locator('main').getByRole('link', { name: /Llamar al 123/ })).toBeVisible();
  });

  // La build de pruebas apunta a un Supabase ficticio (.env.pruebas): el panel se comporta
  // como conectado y, sin sesión guardada, no hace ninguna llamada.
  test('/panel sin sesión lleva al ingreso', async ({ page }) => {
    await page.goto('/panel');
    await expect(page).toHaveURL(/\/panel\/ingresar$/);
    await expect(page.locator('h1')).toHaveText('Ingreso de administración');
    expect(await violacionesGraves(page)).toEqual([]);
  });

  test('/panel/ingresar pide correo institucional y contraseña', async ({ page }) => {
    await page.goto('/panel/ingresar');
    await expect(page.getByLabel('Correo institucional')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Contraseña' })).toBeVisible();
    expect(await violacionesGraves(page)).toEqual([]);
  });
});

test.describe('Teclado', () => {
  test('el primer Tab enfoca «Saltar al contenido» y Enter lleva al contenido', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
    await page.keyboard.press('Tab');
    const salto = page.getByRole('link', { name: 'Saltar al contenido' });
    await expect(salto).toBeFocused();
    await expect(salto).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#contenido')).toBeFocused();
  });

  test('todos los elementos que reciben foco con Tab tienen foco visible', async ({ page }) => {
    await page.goto('/guia-de-estilo');
    await expect(page.locator('h1')).toHaveCount(1);
    const vistos = new Set<string>();
    for (let i = 0; i < 70; i += 1) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const estilo = getComputedStyle(el);
        return {
          elemento: `${el.tagName.toLowerCase()} «${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40)}»`,
          focoVisible: el.matches(':focus-visible'),
          contorno: estilo.outlineStyle,
          grosor: parseFloat(estilo.outlineWidth),
        };
      });
      if (!info) continue;
      vistos.add(info.elemento);
      expect(
        info.focoVisible && info.contorno !== 'none' && info.grosor >= 2,
        `Sin foco visible: ${JSON.stringify(info)}`,
      ).toBe(true);
    }
    expect(vistos.size).toBeGreaterThan(30);
  });

  test('el panel de líneas de ayuda se abre con teclado, muestra el 123 y se cierra con Escape', async ({
    page,
  }) => {
    await page.goto('/registro');
    const boton = page.getByRole('button', { name: 'Líneas de ayuda' });
    await boton.focus();
    await page.keyboard.press('Enter');
    const panel = page.getByRole('dialog', { name: 'Líneas de ayuda' });
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: /Llamar al 123/ })).toHaveAttribute(
      'href',
      'tel:123',
    );
    expect(await violacionesGraves(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(boton).toBeFocused();
  });

  test('el menú se abre con teclado y navega', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'En escritorio (1440 px) el menú está siempre visible.');
    await page.goto('/registro');
    await page.getByRole('button', { name: 'Abrir menú' }).click();
    const menu = page.getByRole('dialog', { name: 'Menú' });
    await expect(menu).toBeVisible();
    expect(await violacionesGraves(page)).toEqual([]);
    await menu.getByRole('link', { name: 'Ingresar' }).click();
    await expect(page).toHaveURL(/\/ingresar$/);
    await expect(menu).toBeHidden();
  });
});

test.describe('Barra de accesibilidad', () => {
  test('cambia el tamaño del texto, el contraste, el movimiento y la fuente, y lo recuerda', async ({
    page,
  }) => {
    await page.goto('/guia-de-estilo');
    const html = page.locator('html');
    const tamanoRaiz = () =>
      page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    const antes = await tamanoRaiz();

    await page.getByRole('button', { name: 'Accesibilidad' }).click();
    const panel = page.getByRole('dialog', { name: 'Accesibilidad' });
    await expect(panel).toBeVisible();

    await panel.getByRole('button', { name: 'Aumentar tamaño del texto' }).click();
    await expect(panel.getByText('Tamaño actual: 110 %')).toBeVisible();
    expect(await tamanoRaiz()).toBeGreaterThan(antes);

    await panel.getByRole('switch', { name: 'Alto contraste' }).click();
    await expect(html).toHaveAttribute('data-contraste', 'alto');
    await panel.getByRole('switch', { name: 'Reducir movimiento' }).click();
    await expect(html).toHaveAttribute('data-movimiento', 'reducido');
    await panel.getByRole('switch', { name: 'Fuente de lectura fácil' }).click();
    await expect(html).toHaveAttribute('data-lectura', 'facil');
    await expect(
      panel.getByRole('switch', { name: 'Avance automático de preguntas' }),
    ).toHaveAttribute('aria-checked', 'true');

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Accesibilidad' })).toBeFocused();

    await page.reload();
    await expect(html).toHaveAttribute('data-contraste', 'alto');
    await expect(html).toHaveAttribute('data-movimiento', 'reducido');
    await expect(html).toHaveAttribute('data-lectura', 'facil');
    expect(await tamanoRaiz()).toBeGreaterThan(antes);

    // En alto contraste tampoco puede haber violaciones.
    expect(await violacionesGraves(page)).toEqual([]);

    await page.getByRole('button', { name: 'Accesibilidad' }).click();
    await page
      .getByRole('dialog', { name: 'Accesibilidad' })
      .getByRole('button', { name: 'Restablecer preferencias' })
      .click();
    await expect(html).not.toHaveAttribute('data-contraste', 'alto');
    expect(await tamanoRaiz()).toBe(antes);
  });

  test('con «reducir movimiento» del sistema, la tarjeta 3D no se inclina', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'La inclinación solo existe con puntero fino.');
    const context = await browser.newContext({
      reducedMotion: 'reduce',
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    await page.goto('/guia-de-estilo');
    const tarjeta = page.getByText('Tarjeta con inclinación 3D').locator('..');
    await tarjeta.scrollIntoViewIfNeeded();
    const caja = await tarjeta.boundingBox();
    if (!caja) throw new Error('No se encontró la tarjeta');
    await page.mouse.move(caja.x + caja.width - 4, caja.y + 4);
    const transform = await tarjeta.evaluate((el) => getComputedStyle(el).transform);
    expect(transform).toBe('none');
    await context.close();
  });
});

async function revisarSinDesborde(page: Page, rutas: readonly string[]) {
  for (const ruta of rutas) {
    await page.goto(ruta);
    await expect(page.locator('h1')).toHaveCount(1);
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(desborde, `${ruta} desborda ${desborde}px`).toBeLessThanOrEqual(0);
  }
}

/**
 * Ningún elemento del encabezado se sale de la pantalla ni se monta sobre otro.
 * Con texto normal, además, todo cabe en una sola fila.
 */
async function revisarEncabezado(page: Page, ancho: number, { unaFila }: { unaFila: boolean }) {
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(
    page.getByRole('banner').getByRole('button', { name: 'Líneas de ayuda' }),
  ).toBeVisible();
  const cajas = await page
    .getByRole('banner')
    .locator('a:visible, button:visible, [role="img"]:visible')
    .evaluateAll((elementos) =>
      elementos.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          nombre: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
          x: r.x,
          y: r.y,
          derecha: r.right,
          abajo: r.bottom,
        };
      }),
    );
  for (const caja of cajas) {
    expect(caja.x, `${caja.nombre} se sale por la izquierda`).toBeGreaterThanOrEqual(0);
    expect(caja.derecha, `${caja.nombre} se sale por la derecha`).toBeLessThanOrEqual(ancho);
  }
  for (let i = 0; i < cajas.length; i += 1) {
    for (let j = i + 1; j < cajas.length; j += 1) {
      const a = cajas[i];
      const b = cajas[j];
      if (!a || !b) continue;
      const seCruzan =
        a.x < b.derecha - 1 && b.x < a.derecha - 1 && a.y < b.abajo - 1 && b.y < a.abajo - 1;
      expect(seCruzan, `«${a.nombre}» se superpone con «${b.nombre}»`).toBe(false);
    }
  }
  if (unaFila) {
    const centros = cajas.map((caja) => (caja.y + caja.abajo) / 2);
    const diferencia = Math.max(...centros) - Math.min(...centros);
    expect(diferencia, `El encabezado ocupa más de una fila a ${ancho} px`).toBeLessThanOrEqual(4);
  }
}

test.describe('Diseño responsivo', () => {
  for (const ancho of [320, 375, 768, 1024, 1280, 1440]) {
    test(`sin scroll horizontal y con el encabezado ordenado a ${ancho} px`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'Los anchos se prueban en el proyecto de escritorio.');
      await page.setViewportSize({ width: ancho, height: 900 });
      await revisarSinDesborde(page, ['/', '/lineas-de-ayuda', '/guia-de-estilo']);
      await page.goto('/');
      await revisarEncabezado(page, ancho, { unaFila: true });
      const carpeta = process.env.CAPTURAS ?? 'test-results/capturas';
      await page.screenshot({ path: `${carpeta}/inicio-${ancho}.png`, fullPage: true });
    });
  }

  for (const ancho of [320, 400, 640, 768, 1280]) {
    test(`con el texto al 140 % el encabezado sigue ordenado a ${ancho} px`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'Los anchos se prueban en el proyecto de escritorio.');
      await page.addInitScript(() => {
        window.localStorage.setItem(
          'mente-al-dia:accesibilidad',
          JSON.stringify({ textScaleStep: 4 }),
        );
      });
      await page.setViewportSize({ width: ancho, height: 900 });
      await revisarSinDesborde(page, ['/', '/lineas-de-ayuda']);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-texto', 'grande');
      await revisarEncabezado(page, ancho, { unaFila: false });
      const carpeta = process.env.CAPTURAS ?? 'test-results/capturas';
      await page.screenshot({ path: `${carpeta}/inicio-texto-140-${ancho}.png` });
    });
  }

  test('captura de la guía de estilo', async ({ page, isMobile }) => {
    const carpeta = process.env.CAPTURAS ?? 'test-results/capturas';
    await page.goto('/guia-de-estilo');
    await expect(page.locator('h1')).toHaveCount(1);
    // Dispara las entradas animadas antes de capturar la página completa.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `${carpeta}/guia-de-estilo-${isMobile ? 'movil' : 'escritorio'}.png`,
      fullPage: true,
    });
  });
});
