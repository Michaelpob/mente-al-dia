import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/**
 * Criterios de aceptación de la Fase 8: tablero, registros, ficha, prioritarios y cierre por
 * inactividad. La build de pruebas apunta a un Supabase ficticio (.env.pruebas): aquí se simula una
 * sesión de superadministración con doble factor y las respuestas de las consultas del panel.
 */

const SUPABASE = 'http://127.0.0.1:54321';
const CLAVE_SESION = 'sb-127-auth-token';
const ADMIN = '00000000-0000-0000-0000-0000000000a1';
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, *',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const TABLERO = {
  aplicaciones: 12,
  aplicacionesAnterior: 8,
  personas: 11,
  prioritariosPendientes: 3,
  resultados: { favorable: 5, por_fortalecer: 4, desafios: 3 },
  porSemana: [
    { semana: '2026-10-05', aplicaciones: 2 },
    { semana: '2026-10-12', aplicaciones: 4 },
    { semana: '2026-10-19', aplicaciones: 6 },
  ],
  porModulo: [
    { modulo: 'nino', resultado: 'por_fortalecer', n: 4 },
    { modulo: 'adulto', resultado: 'favorable', n: 5 },
    { modulo: 'adulto', resultado: 'desafios', n: 3 },
  ],
  mapaCalor: [
    { area: 'bienestar_emocional', nivel: 'adecuado', n: 6 },
    { area: 'bienestar_emocional', nivel: 'requiere_atencion', n: 4 },
    { area: 'sueno_descanso', nivel: 'por_fortalecer', n: 5 },
  ],
  lugares: [
    { lugar: 'Centro', n: 7 },
    { lugar: 'Norte', n: 5 },
  ],
  opcionesLugar: ['Centro', 'Norte'],
};

const FILA = {
  id: 'a0000000-0000-0000-0000-000000000001',
  codigo: 'MD-0001',
  creadoEn: '2026-10-26T20:00:00Z',
  nombre: 'Ana Prueba',
  modulo: 'adulto',
  edad: 30,
  lugar: 'Centro',
  resultadoGeneral: 'desafios',
  atencion: 9,
  prioridad: true,
  estado: 'pendiente',
  asignado: null,
  correo: 'an***@correo.co',
  telefono: '*** *** **89',
};

const FICHA = {
  ...FILA,
  actualizadoEn: '2026-10-26T20:00:00Z',
  grado: null,
  indice: 34,
  rutaAtencionEspecial: true,
  resultadoParcial: false,
  resultado: {
    niveles: { bienestar_emocional: 'requiere_atencion', sueno_descanso: 'por_fortalecer' },
    conteo: { adecuado: 0, porFortalecer: 1, requiereAtencion: 1, sinDato: 18 },
    motivosPrioridad: ['Bienestar emocional requiere atención'],
    respondidas: 2,
  },
  respuestas: [
    { areaId: 'bienestar_emocional', valor: 'no' },
    { areaId: 'sueno_descanso', valor: 'a_veces' },
  ],
  reglasVersion: '0.1-provisional',
  instrumentoVersion: '1.0',
  autorizaciones: [
    { tipo: 'tratamiento_datos', version: '0.1-borrador', aceptadoEn: '2026-10-26T20:00:00Z' },
    { tipo: 'datos_sensibles', version: '0.1-borrador', aceptadoEn: '2026-10-26T20:00:00Z' },
  ],
  historial: [
    {
      id: FILA.id,
      codigo: FILA.codigo,
      creadoEn: FILA.creadoEn,
      resultadoGeneral: 'desafios',
      indice: 34,
      niveles: { bienestar_emocional: 'requiere_atencion' },
    },
  ],
};

const PRIORITARIOS = [
  {
    id: FILA.id,
    codigo: FILA.codigo,
    creadoEn: FILA.creadoEn,
    nombre: FILA.nombre,
    modulo: 'adulto',
    lugar: 'Centro',
    resultadoGeneral: 'desafios',
    motivos: ['Bienestar emocional requiere atención'],
    asignado: null,
    diasSinGestion: 9,
  },
];

const CONTACTO = {
  nombre: 'Ana Prueba',
  correo: 'ana@correo.co',
  telefono: '300 123 4589',
  lugarResidencia: 'Centro',
  grado: null,
  sexo: null,
  acudiente: null,
};

interface Llamadas {
  registros: Record<string, unknown>[];
  contacto: number;
  impresion: number;
  salida: number;
}

const base64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** Sesión de superadministración con doble factor ya verificado, y las consultas simuladas. */
async function iniciarSesion(page: Page): Promise<Llamadas> {
  const ahora = Math.floor(Date.now() / 1000);
  const usuario = {
    id: ADMIN,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'admin@ejemplo.gov.co',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-26T20:00:00Z',
    factors: [
      {
        id: 'factor-1',
        factor_type: 'totp',
        status: 'verified',
        friendly_name: 'Mente al Día',
        created_at: '2026-10-26T20:00:00Z',
        updated_at: '2026-10-26T20:00:00Z',
      },
    ],
  };
  const token = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({
      sub: ADMIN,
      role: 'authenticated',
      aal: 'aal2',
      amr: [
        { method: 'password', timestamp: ahora },
        { method: 'totp', timestamp: ahora },
      ],
      session_id: 'sesion-prueba',
      iat: ahora,
      exp: ahora + 86_400,
    }),
    // auth-js exige que cada parte sea base64url válido (la firma no se verifica en el navegador).
    Buffer.from('firma de prueba').toString('base64url'),
  ].join('.');
  const sesion = {
    access_token: token,
    token_type: 'bearer',
    expires_in: 86_400,
    expires_at: ahora + 86_400,
    refresh_token: 'renovacion',
    user: usuario,
  };
  await page.addInitScript(
    ([clave, valor]) => {
      window.localStorage.setItem(clave!, valor!);
      // La impresión real no se abre en las pruebas: se cuenta.
      window.print = () => {
        (window as unknown as { impresiones: number }).impresiones =
          ((window as unknown as { impresiones?: number }).impresiones ?? 0) + 1;
      };
    },
    [CLAVE_SESION, JSON.stringify(sesion)],
  );

  const llamadas: Llamadas = { registros: [], contacto: 0, impresion: 0, salida: 0 };
  await page.route(`${SUPABASE}/**`, async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const json = (cuerpo: unknown) =>
      route.fulfill({
        status: 200,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
    switch (new URL(peticion.url()).pathname) {
      case '/auth/v1/user':
        return json(usuario);
      case '/auth/v1/logout':
        llamadas.salida += 1;
        return route.fulfill({ status: 204, headers: CORS });
      case '/rest/v1/rpc/mi_perfil':
        return json({
          id: ADMIN,
          nombre: 'Administración Prueba',
          rol: 'superadministrador',
          activo: true,
        });
      case '/rest/v1/rpc/panel_tablero':
        return json(TABLERO);
      case '/rest/v1/rpc/panel_registros':
        llamadas.registros.push(peticion.postDataJSON() as Record<string, unknown>);
        return json({ total: 1, pagina: 1, tamano: 25, filas: [FILA] });
      case '/rest/v1/rpc/panel_detalle':
        return json(FICHA);
      case '/rest/v1/rpc/panel_prioritarios':
        return json(PRIORITARIOS);
      case '/rest/v1/rpc/ver_datos_contacto':
        llamadas.contacto += 1;
        return json(CONTACTO);
      case '/rest/v1/rpc/panel_registrar_impresion':
        llamadas.impresion += 1;
        return route.fulfill({ status: 204, headers: CORS });
      default:
        return route.fulfill({ status: 404, headers: CORS, body: '{}' });
    }
  });
  return llamadas;
}

async function violacionesGraves(page: Page) {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return resultado.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => v.id);
}

test('el tablero muestra indicadores, gráficas con su tabla y el aviso de que no es un diagnóstico', async ({
  page,
}) => {
  await iniciarSesion(page);
  await page.goto('/panel');
  await expect(page.getByRole('heading', { level: 1, name: 'Tablero' })).toBeVisible();
  await expect(
    page.getByText('Resultados orientativos. No constituyen diagnóstico.'),
  ).toBeVisible();
  await expect(page.getByText('+50 % frente al periodo anterior')).toBeVisible();
  await expect(page.getByText('Administración Prueba')).toBeVisible({
    visible: !test.info().project.name.includes('movil'),
  });

  const semanas = page.getByRole('region', { name: 'Aplicaciones por semana' });
  await semanas.getByRole('button', { name: 'Ver como tabla' }).click();
  await expect(semanas.getByRole('row')).toHaveCount(4);
  await expect(semanas.getByRole('button', { name: 'Ver gráfica' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  expect(await violacionesGraves(page)).toEqual([]);
});

test('una celda del mapa de calor lleva a los registros de esa área y ese nivel', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel');
  await page.getByRole('link', { name: /Bienestar emocional, Requiere atención: 33/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Registros' })).toBeVisible();
  await expect(page).toHaveURL(/area=bienestar_emocional&nivel=requiere_atencion/);
  await expect
    .poll(() => llamadas.registros.at(-1))
    .toMatchObject({ p_area: 'bienestar_emocional', p_nivel: 'requiere_atencion' });
});

test('los registros buscan, ordenan y muestran el contacto enmascarado', async ({ page }) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel/registros');
  await expect(page.getByRole('link', { name: 'Ana Prueba' })).toBeVisible();
  await expect(page.getByText('an***@correo.co')).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);

  await page.getByRole('searchbox', { name: 'Buscar una persona' }).last().fill('ana');
  await page.getByRole('searchbox', { name: 'Buscar una persona' }).last().press('Enter');
  await expect(page).toHaveURL(/q=ana/);
  await expect.poll(() => llamadas.registros.at(-1)?.p_busqueda).toBe('ana');

  await page.getByRole('button', { name: 'Nombre' }).click();
  await expect(page).toHaveURL(/orden=nombre&dir=asc/);
  await expect(page.getByRole('columnheader', { name: 'Nombre' })).toHaveAttribute(
    'aria-sort',
    'ascending',
  );
  await expect
    .poll(() => llamadas.registros.at(-1))
    .toMatchObject({ p_orden: 'nombre', p_descendente: false });
});

test('la búsqueda de la barra superior lleva a los registros', async ({ page }) => {
  await iniciarSesion(page);
  await page.goto('/panel');
  await page.getByRole('searchbox', { name: 'Buscar una persona' }).fill('Ana');
  await page.getByRole('searchbox', { name: 'Buscar una persona' }).press('Enter');
  await expect(page).toHaveURL(/\/panel\/registros\?q=Ana$/);
});

test('la ficha muestra los resultados y deja en la auditoría el contacto y la impresión', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto(`/panel/registros/${FILA.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Ana Prueba' })).toBeVisible();
  await expect(page.getByText('34 de 100')).toBeVisible();
  await expect(page.getByText('Bienestar emocional requiere atención')).toBeVisible();
  await expect(
    page.getByRole('table', { name: 'Respuestas por área' }).getByRole('row'),
  ).toHaveCount(21);
  expect(await violacionesGraves(page)).toEqual([]);

  await page.getByRole('button', { name: 'Mostrar datos de contacto' }).click();
  await expect(page.getByText('ana@correo.co')).toBeVisible();
  await expect(page.getByText('Esta consulta quedó registrada en la auditoría.')).toBeVisible();
  expect(llamadas.contacto).toBe(1);

  await page.getByRole('button', { name: 'Imprimir ficha' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { impresiones?: number }).impresiones))
    .toBe(1);
  expect(llamadas.impresion).toBe(1);

  await page.getByRole('tab', { name: 'Autorizaciones' }).click();
  await expect(page.getByText('Tratamiento de datos personales')).toBeVisible();
  await page.getByRole('tab', { name: 'Historial' }).click();
  await expect(page.getByText('Es la única aplicación de esta persona.')).toBeVisible();
});

test('prioritarios muestra los casos pendientes con los días sin gestión', async ({ page }) => {
  await iniciarSesion(page);
  await page.goto('/panel/prioritarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Prioritarios' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Ana Prueba/ })).toContainText('9 días');
  expect(await violacionesGraves(page)).toEqual([]);
});

test('las secciones de la Fase 9 explican que están en construcción', async ({ page }) => {
  await iniciarSesion(page);
  await page.goto('/panel/auditoria');
  await expect(page.getByRole('heading', { level: 1, name: 'Auditoría' })).toBeVisible();
  await expect(
    page.getByText('Esta sección se construye en la Fase 9 del proyecto.'),
  ).toBeVisible();
});

test('el menú se contrae en el computador y se abre como panel en el teléfono', async ({
  page,
}) => {
  await iniciarSesion(page);
  await page.goto('/panel');
  if (test.info().project.name.includes('movil')) {
    await page.getByRole('button', { name: 'Menú' }).click();
    const menu = page.getByRole('dialog');
    await menu.getByRole('link', { name: 'Prioritarios' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Prioritarios' })).toBeVisible();
    await expect(menu).toBeHidden();
  } else {
    await page.getByRole('button', { name: 'Contraer el menú' }).click();
    await expect(page.getByRole('button', { name: 'Expandir el menú' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await page
      .getByRole('navigation', { name: 'Secciones del panel' })
      .getByRole('link', { name: 'Registros', exact: true })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Registros' })).toBeVisible();
  }
});

test('la sesión se cierra tras 15 minutos sin actividad, con aviso en el último minuto', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.clock.install();
  await page.goto('/panel');
  await expect(page.getByRole('heading', { level: 1, name: 'Tablero' })).toBeVisible();

  await page.clock.fastForward(14 * 60_000 + 1_000);
  const aviso = page.getByRole('alertdialog', { name: '¿Sigues ahí?' });
  await expect(aviso).toBeVisible();
  await aviso.getByRole('button', { name: 'Seguir en el panel' }).click();
  await expect(aviso).toBeHidden();

  await page.clock.fastForward(14 * 60_000 + 1_000);
  await expect(aviso).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(page).toHaveURL(/\/panel\/ingresar$/);
  await expect(
    page.getByText('Cerramos tu sesión por inactividad. Ingresa de nuevo para continuar.'),
  ).toBeVisible();
  expect(llamadas.salida).toBe(1);
});
