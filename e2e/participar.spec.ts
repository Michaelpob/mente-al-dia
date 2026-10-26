import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Criterios de aceptación de las Fases 5 y 6: registro, cuestionario y envío.
 * La Edge Function se simula: la build de pruebas apunta a un Supabase ficticio (.env.pruebas).
 */

const FUNCION = '**/functions/v1/enviar-cuestionario';
const ALMACEN = 'mente-al-dia:participacion';
const CLAVE = '6f1c2a4e-8b3d-4c5f-9a7e-1d2b3c4d5e6f';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
type Cuerpo = Record<string, unknown> & { claveEnvio?: string; respuestas?: unknown[] };

/** Simula la función: cada envío recibe la siguiente respuesta de la lista (por defecto, éxito). */
async function simularFuncion(page: Page, respuestas: ('ok' | 'sin_conexion')[] = []) {
  const cuerpos: Cuerpo[] = [];
  await page.route(FUNCION, async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    cuerpos.push(peticion.postDataJSON() as Cuerpo);
    if (respuestas.shift() === 'sin_conexion') return route.abort('internetdisconnected');
    return route.fulfill({
      status: 200,
      headers: CORS,
      json: { codigo: 'MD-0042', resultado: RESULTADO },
    });
  });
  return cuerpos;
}

/** Las 20 áreas, en el orden de las preguntas (src/content/v1/cuestionarios.ts). */
const AREAS = [
  'bienestar_emocional',
  'sueno_descanso',
  'energia_vitalidad',
  'motivacion_interes',
  'manejo_estres',
  'red_apoyo',
  'relaciones_interpersonales',
  'valoracion_respeto',
  'concentracion',
  'afrontamiento_dificultades',
  'regulacion_emocional',
  'actividad_fisica_recreacion',
  'equilibrio_responsabilidades_descanso',
  'seguridad_entorno',
  'perspectiva_futuro',
  'proposito_sentido_vida',
  'afrontamiento_consumo_sustancias',
  'busqueda_ayuda',
  'funcionamiento_cotidiano',
  'bienestar_psicologico_general',
];
const todasSi = Object.fromEntries(AREAS.map((area) => [area, 'si']));

/** Niveles de ejemplo: 2 para cuidar primero, 5 por fortalecer, 12 fortalezas y 1 sin dato. */
const NIVELES = Object.fromEntries(
  AREAS.map((area, i) => [
    area,
    i < 2 ? 'requiere_atencion' : i < 7 ? 'por_fortalecer' : i < 19 ? 'adecuado' : 'sin_dato',
  ]),
);
const RESULTADO = {
  resultadoGeneral: 'por_fortalecer',
  niveles: NIVELES,
  mensajes: {},
  conteo: { adecuado: 12, porFortalecer: 5, requiereAtencion: 2, sinDato: 1 },
  respondidas: 20,
  resultadoParcial: false,
  rutaAtencionEspecial: false,
  reglasVersion: '0.1-provisional',
  instrumentoVersion: '1.0',
};

/** Último envío guardado en la pestaña (lo que lee /resultados). */
const enviado = (modulo = 'adulto', cambios: Record<string, unknown> = {}) => ({
  modulo,
  codigo: 'MD-0042',
  resultado: { ...RESULTADO, ...cambios },
  fecha: '2026-10-27T15:00:00.000Z',
});

/** Estado guardado en la pestaña, como si la persona ya se hubiera registrado. */
async function conEstado(page: Page, cambios: Record<string, unknown>) {
  const estado = {
    version: 1,
    claveEnvio: CLAVE,
    modulo: 'adulto',
    valores: {
      participante: {
        nombre: 'Persona de Prueba',
        correo: 'prueba@ejemplo.co',
        telefono: '3000000000',
        lugarResidencia: 'Centro',
      },
      acudiente: {},
    },
    autorizaciones: { tratamientoDatos: true, datosSensibles: true, autorizacionAcudiente: false },
    registroCompleto: true,
    fase: 'revision',
    respuestas: todasSi,
    indice: 19,
    desdeRevision: false,
    hitos: [],
    enviado: null,
    ...cambios,
  };
  await page.addInitScript(
    ([clave, valor]) => {
      if (!window.sessionStorage.getItem(clave)) window.sessionStorage.setItem(clave, valor);
    },
    [ALMACEN, JSON.stringify(estado)] as const,
  );
}

async function violacionesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

test('una persona adulta se registra, responde con el teclado y envía', async ({ page }) => {
  const cuerpos = await simularFuncion(page);
  await page.goto('/registro?grupo=adulto');
  await expect(page.getByRole('radio', { name: 'Una persona adulta' })).toBeChecked();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByLabel('Nombre completo').fill('Persona de Prueba');
  await page.getByLabel('Correo electrónico').fill('Prueba@Ejemplo.co');
  await page.getByLabel('Número de teléfono').fill('300 000 0000');
  await page.getByLabel('Lugar de residencia').fill('Centro');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.locator('h1')).toHaveText('Autorización');
  await page.getByRole('checkbox', { name: /tratamiento de mis datos/ }).click();
  await page.getByRole('checkbox', { name: /datos sensibles/ }).click();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();

  await expect(page).toHaveURL(/\/cuestionario$/);
  await page.getByRole('button', { name: 'Empezar el cuestionario' }).click();
  for (let n = 1; n <= 20; n += 1) {
    await expect(page.getByText(`Pregunta ${n} de 20`)).toBeVisible();
    await page.keyboard.press('1');
  }
  await expect(page.locator('h1')).toHaveText('Revisa tus respuestas');
  await page.getByRole('button', { name: 'Enviar mis respuestas' }).click();

  await expect(page).toHaveURL(/\/resultados$/);
  await expect(page.getByText('MD-0042')).toBeVisible();
  expect(cuerpos).toHaveLength(1);
  expect(cuerpos[0]).toMatchObject({
    modulo: 'adulto',
    participante: { nombre: 'Persona de Prueba', correo: 'prueba@ejemplo.co' },
  });
  expect(cuerpos[0]?.respuestas).toHaveLength(20);
  expect(cuerpos[0]).not.toHaveProperty('resultado');
  // Enviado: en la pestaña ya no quedan datos personales ni respuestas.
  const guardado = await page.evaluate((clave) => window.sessionStorage.getItem(clave), ALMACEN);
  expect(guardado).not.toContain('prueba@ejemplo.co');
  expect(guardado).not.toContain('"si"');
});

test('si falla la conexión se puede reintentar, con la misma clave de envío', async ({ page }) => {
  const cuerpos = await simularFuncion(page, ['sin_conexion', 'ok']);
  await conEstado(page, {});
  await page.goto('/cuestionario');
  await expect(page.locator('h1')).toHaveText('Revisa tus respuestas');

  await page.getByRole('button', { name: 'Enviar mis respuestas' }).click();
  await expect(page.getByText(/falló la conexión/)).toBeVisible();
  await page.getByRole('button', { name: 'Intentar de nuevo' }).click();

  await expect(page).toHaveURL(/\/resultados$/);
  expect(cuerpos.map((c) => c.claveEnvio)).toEqual([CLAVE, CLAVE]);
});

test('el módulo infantil pide al adulto responsable y no ofrece «Prefiero no responder»', async ({
  page,
}) => {
  await page.goto('/registro');
  await page.getByRole('radio', { name: 'Una niña o un niño' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByText('Elige la edad.')).toBeVisible();
  await expect(page.locator('#participante-nombre')).toBeFocused();
  await expect(page.locator('#acudiente-parentesco')).toHaveAttribute('aria-invalid', 'true');
  expect(await violacionesGraves(page)).toEqual([]);

  await page.locator('#participante-nombre').fill('Niña');
  await page.locator('#participante-edad').selectOption('9');
  await page.locator('#participante-grado').selectOption('Cuarto');
  await page.getByLabel('Nombre del adulto responsable').fill('Adulto Responsable');
  await page.getByLabel('Parentesco').fill('Madre');
  await page.getByLabel('Correo electrónico').fill('acudiente@ejemplo.co');
  await page.getByLabel('Teléfono').fill('3110000000');
  await page.getByLabel('Lugar de residencia').fill('Zona rural');
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('checkbox')).toHaveCount(3);
  for (const casilla of await page.getByRole('checkbox').all()) await casilla.click();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();

  await expect(page.getByText(/junto a un adulto de confianza/)).toBeVisible();
  await page.getByRole('button', { name: 'Empezar el cuestionario' }).click();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await expect(page.getByRole('radio', { name: 'Prefiero no responder' })).toHaveCount(0);
});

test('sin registro, el cuestionario lleva al registro', async ({ page }) => {
  await page.goto('/cuestionario');
  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.locator('h1')).toHaveText('¿Quién va a responder?');
});

test('«Pausar y salir» explica que el avance queda en esta pestaña', async ({ page }) => {
  await conEstado(page, { fase: 'pregunta', indice: 4, respuestas: {} });
  await page.goto('/cuestionario');
  await expect(page.getByText('Pregunta 5 de 20')).toBeVisible();
  await page.getByRole('button', { name: 'Pausar y salir' }).click();
  const dialogo = page.getByRole('dialog', { name: '¿Pausar y salir?' });
  await expect(dialogo).toContainText('esta pestaña');
  await dialogo.getByRole('button', { name: 'Seguir respondiendo' }).click();
  await expect(dialogo).toBeHidden();
});

test('sin violaciones de accesibilidad en la pregunta y en la revisión', async ({ page }) => {
  await conEstado(page, { fase: 'pregunta', indice: 19 });
  await page.goto('/cuestionario');
  await expect(page.getByText('Pregunta 20 de 20')).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toHaveText('Revisa tus respuestas');
  expect(await violacionesGraves(page)).toEqual([]);
});

test('los resultados muestran la rueda y las tarjetas agrupadas por nivel', async ({ page }) => {
  await conEstado(page, { registroCompleto: false, enviado: enviado() });
  await page.goto('/resultados');
  await expect(page.locator('h1')).toHaveText('Tus resultados');
  await expect(page.getByText(/27 de octubre de 2026/)).toBeVisible();
  await expect(
    page.getByText('12 fortalezas, 5 por fortalecer y 2 para cuidar primero. 1 sin dato.'),
  ).toBeVisible();
  for (const grupo of ['Para cuidar primero', 'Por fortalecer', 'Tus fortalezas', 'Sin dato']) {
    await expect(page.getByRole('heading', { level: 3, name: new RegExp(grupo) })).toBeVisible();
  }
  // Lo que más cuidado necesita está abierto; lo demás, cerrado.
  await expect(page.locator('#area-bienestar_emocional')).toHaveAttribute('open', '');
  await expect(page.locator('#area-concentracion')).not.toHaveAttribute('open', '');

  // La rueda tiene las 20 áreas con su nivel; al elegir una se abre su tarjeta con el foco.
  await expect(page.locator('svg [data-area]')).toHaveCount(20);
  await expect(page.locator('svg [data-area="manejo_estres"]')).toHaveAttribute(
    'data-nivel',
    'por_fortalecer',
  );
  await page.locator('svg [data-area="concentracion"]').dispatchEvent('click');
  await expect(page.locator('#area-concentracion')).toHaveAttribute('open', '');
  await expect(page.locator('#area-concentracion summary')).toBeFocused();
  expect(await violacionesGraves(page)).toEqual([]);
});

test('la versión imprimible abre todas las tarjetas y deja solo el contenido', async ({ page }) => {
  await conEstado(page, { registroCompleto: false, enviado: enviado() });
  await page.goto('/resultados');
  await page.evaluate(() => {
    const w = window as unknown as { vecesImpreso: number };
    w.vecesImpreso = 0;
    window.print = () => {
      w.vecesImpreso += 1;
    };
  });
  await page.getByRole('button', { name: 'Descargar o imprimir' }).click();
  expect(
    await page.evaluate(() => (window as unknown as { vecesImpreso: number }).vecesImpreso),
  ).toBe(1);

  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('main details:not([open])')).toHaveCount(0);
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Descargar o imprimir' })).toBeHidden();
  await expect(page.getByText(/no constituye un diagnóstico/)).toBeVisible();

  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('#area-concentracion')).not.toHaveAttribute('open', '');
});

test('con ruta de atención especial, el apoyo inmediato va antes que todo', async ({ page }) => {
  await conEstado(page, {
    registroCompleto: false,
    enviado: enviado('adulto', { rutaAtencionEspecial: true }),
  });
  await page.goto('/resultados');
  await expect(
    page.getByRole('heading', { name: 'Si lo necesitas, hay apoyo ahora mismo' }),
  ).toBeVisible();
  const titulos = await page.locator('main h1, main h2').allTextContents();
  expect(titulos[0]).toBe('Si lo necesitas, hay apoyo ahora mismo');
  await expect(
    page
      .locator('main')
      .getByRole('link', { name: /Llamar al 123/ })
      .first(),
  ).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);
});

test('en el módulo infantil hay un mensaje para el adulto que acompaña', async ({ page }) => {
  await conEstado(page, { registroCompleto: false, enviado: enviado('nino') });
  await page.goto('/resultados');
  await expect(page.getByText(/Cuestionario de niñas y niños/)).toBeVisible();
  await expect(page.getByText('Para el adulto que acompaña')).toBeVisible();
});
