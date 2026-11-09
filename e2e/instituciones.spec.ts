import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * D-86: cada institución tiene su enlace (?sede=…). El sitio confirma la institución con la base,
 * la muestra, y el envío del cuestionario lleva su enlace; sin un enlace válido, el sitio informa
 * pero no deja responder. La base y la Edge Function se simulan (build de pruebas).
 */

const SEDES = [
  { slug: 'colegio1', nombre: 'Colegio 1' },
  { slug: 'colegio2', nombre: 'Colegio 2' },
  { slug: 'alcaldia1', nombre: 'Alcaldía 1' },
  { slug: 'alcaldia2', nombre: 'Alcaldía 2' },
  { slug: 'institucion5', nombre: 'Institución 5' },
  { slug: 'institucion6', nombre: 'Institución 6' },
];
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
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
const RESULTADO = {
  resultadoGeneral: 'favorable',
  niveles: Object.fromEntries(AREAS.map((a) => [a, 'adecuado'])),
  mensajes: {},
  conteo: { adecuado: 20, porFortalecer: 0, requiereAtencion: 0, sinDato: 0 },
  respondidas: 20,
  resultadoParcial: false,
  rutaAtencionEspecial: false,
  reglasVersion: '0.1-provisional',
  instrumentoVersion: '1.0',
};
type Cuerpo = Record<string, unknown>;

/**
 * La base responde el nombre solo para las seis instituciones activas; la función guarda el envío
 * o, con `rechazar`, responde que la institución ya no está activa.
 */
async function simularServidor(page: Page, { rechazar = false } = {}) {
  const consultas: string[] = [];
  const envios: Cuerpo[] = [];
  await page.route('**/rest/v1/rpc/institucion_publica', async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const { p_slug } = peticion.postDataJSON() as { p_slug: string };
    consultas.push(p_slug);
    return route.fulfill({
      status: 200,
      headers: CORS,
      json: SEDES.filter((s) => s.slug === p_slug),
    });
  });
  await page.route('**/functions/v1/enviar-cuestionario', async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    envios.push(peticion.postDataJSON() as Cuerpo);
    if (rechazar) {
      return route.fulfill({
        status: 422,
        headers: CORS,
        json: { error: { codigo: 'institucion_invalida', mensaje: 'No está activa.' } },
      });
    }
    return route.fulfill({
      status: 200,
      headers: CORS,
      json: { codigo: 'MD-0100', resultado: RESULTADO },
    });
  });
  return { consultas, envios };
}

async function violacionesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

/** Registro de una persona adulta y las 20 respuestas con el teclado, hasta la revisión. */
async function responderComoAdulto(page: Page) {
  await page.getByRole('radio', { name: 'Una persona adulta' }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Nombre completo').fill('Persona de Prueba');
  await page.getByLabel('Correo electrónico').fill('prueba@ejemplo.co');
  await page.getByLabel('Número de teléfono').fill('300 000 0000');
  await page.getByLabel('Lugar de residencia').fill('Centro');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('checkbox', { name: /tratamiento de mis datos/ }).click();
  await page.getByRole('checkbox', { name: /datos sensibles/ }).click();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.getByRole('button', { name: 'Empezar el cuestionario' }).click();
  for (let n = 1; n <= 20; n += 1) {
    await expect(page.getByText(`Pregunta ${n} de 20`)).toBeVisible();
    await page.keyboard.press('1');
  }
  await expect(page.locator('h1')).toHaveText('Revisa tus respuestas');
}

for (const sede of SEDES) {
  test(`el enlace de ${sede.nombre} muestra su nombre y su envío lleva su institución`, async ({
    page,
  }) => {
    const { consultas, envios } = await simularServidor(page);
    await page.goto(`/?sede=${sede.slug}`);
    await expect(page.getByText(`Participas con ${sede.nombre}`)).toBeVisible();
    expect(consultas).toEqual([sede.slug]);

    // Ya dentro del sitio, sin ?sede en la dirección, la institución se mantiene.
    await page.getByRole('link', { name: 'Comenzar mi cuestionario' }).first().click();
    await expect(page).toHaveURL(/\/registro$/);
    await expect(page.getByText(`Participas con ${sede.nombre}`)).toBeVisible();
    await responderComoAdulto(page);
    await page.getByRole('button', { name: 'Enviar mis respuestas' }).click();

    await expect(page).toHaveURL(/\/resultados$/);
    expect(envios).toHaveLength(1);
    expect(envios[0]).toMatchObject({ sede: sede.slug, modulo: 'adulto' });
  });
}

test('sin el enlace de una institución, el sitio informa pero el cuestionario lo pide', async ({
  page,
}) => {
  const { envios } = await simularServidor(page);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Cuidar tu mente también es cuidarte');
  await expect(page.getByText(/Participas con/)).toHaveCount(0);

  await page.getByRole('link', { name: 'Comenzar mi cuestionario' }).first().click();
  await expect(page.locator('h1')).toHaveText(
    'Para responder, entra con el enlace de tu institución',
  );
  // Las líneas de ayuda siguen a la mano.
  await expect(page.getByRole('link', { name: /Llamar al 123/ }).first()).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Una persona adulta' })).toHaveCount(0);
  expect(await violacionesGraves(page)).toEqual([]);
  expect(envios).toHaveLength(0);
});

test('un enlace que no es de una institución activa avisa y no deja responder', async ({
  page,
}) => {
  const { consultas } = await simularServidor(page);
  await page.goto('/registro?sede=colegio-falso');
  await expect(
    page.getByText('Este enlace no corresponde a una institución activa.', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('h1')).toHaveText(
    'Para responder, entra con el enlace de tu institución',
  );
  expect(consultas).toEqual(['colegio-falso']);

  // Un enlace mal escrito ni siquiera se consulta.
  await page.goto('/?sede=Colegio_1');
  await expect(
    page.getByText('Este enlace no corresponde a una institución activa.', { exact: false }),
  ).toBeVisible();
  expect(consultas).toEqual(['colegio-falso']);
});

test('si la institución se desactiva antes de enviar, se explica y no se pierde nada', async ({
  page,
}) => {
  const { envios } = await simularServidor(page, { rechazar: true });
  await page.goto('/registro?sede=colegio2');
  await expect(page.getByText('Participas con Colegio 2')).toBeVisible();
  await responderComoAdulto(page);
  await page.getByRole('button', { name: 'Enviar mis respuestas' }).click();
  await expect(page.getByText(/El enlace de tu institución ya no está activo/)).toBeVisible();
  await expect(page).toHaveURL(/\/cuestionario$/);
  expect(envios[0]).toMatchObject({ sede: 'colegio2' });
});
