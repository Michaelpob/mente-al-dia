import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import * as ExcelJSModulo from 'exceljs';

/** ExcelJS es CommonJS: según cómo lo cargue Node, llega como «default» o con sus nombres. */
const ExcelJS =
  (ExcelJSModulo as typeof ExcelJSModulo & { default?: typeof ExcelJSModulo }).default ??
  ExcelJSModulo;

/**
 * Criterios de aceptación de la Fase 8: tablero, registros, ficha, prioritarios y cierre por
 * inactividad. La build de pruebas apunta a un Supabase ficticio (.env.pruebas): aquí se simula una
 * sesión de superadministración con doble factor y las respuestas de las consultas del panel.
 * Desde D-86 también el administrador de una institución, que solo ve la suya.
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

const COLEGIO = {
  id: '00000000-0000-0000-0000-0000000001e1',
  nombre: 'Colegio 1',
  slug: 'colegio1',
  activa: true,
};
const ALCALDIA = {
  id: '00000000-0000-0000-0000-0000000002e1',
  nombre: 'Alcaldía 2',
  slug: 'alcaldia2',
  activa: false,
};
const INSTITUCIONES = [
  {
    ...COLEGIO,
    creadoEn: '2026-11-08T12:00:00Z',
    cuestionarios: 4,
    personas: 3,
    prioritariosPendientes: 1,
    ultimoCuestionario: '2026-11-05T15:00:00Z',
    visitas: 9,
    administradores: 1,
  },
  {
    ...ALCALDIA,
    creadoEn: '2026-11-08T12:00:00Z',
    cuestionarios: 0,
    personas: 0,
    prioritariosPendientes: 0,
    ultimoCuestionario: null,
    visitas: 0,
    administradores: 0,
  },
];

/** Filas de public.mi_perfil: el administrador general no tiene institución. */
const PERFIL_GENERAL = {
  id: ADMIN,
  nombre: 'Administración Prueba',
  rol: 'superadministrador',
  activo: true,
  institucion_id: null,
  institucion_nombre: null,
  institucion_slug: null,
  institucion_activa: null,
};
const PERFIL_INSTITUCIONAL = {
  id: ADMIN,
  nombre: 'Rectoría Prueba',
  rol: 'administrador_institucional',
  activo: true,
  institucion_id: COLEGIO.id,
  institucion_nombre: COLEGIO.nombre,
  institucion_slug: COLEGIO.slug,
  institucion_activa: true,
};
const RECTORIA = '00000000-0000-0000-0000-0000000000b1';

const ADMINISTRADORES = [
  {
    id: ADMIN,
    nombre: 'Administración Prueba',
    correo: 'admin@ejemplo.gov.co',
    rol: 'superadministrador',
    activo: true,
    institucion: null,
    creadoEn: '2026-10-26T20:00:00Z',
    ultimoIngreso: '2026-11-08T12:00:00Z',
    dobleFactor: true,
  },
  {
    id: RECTORIA,
    nombre: 'Rectoría Prueba',
    correo: 'rectoria@colegio.edu.co',
    rol: 'administrador_institucional',
    activo: true,
    institucion: { id: COLEGIO.id, nombre: COLEGIO.nombre, activa: true },
    creadoEn: '2026-11-08T12:00:00Z',
    ultimoIngreso: null,
    dobleFactor: false,
  },
];

const AUDITORIA = {
  total: 2,
  pagina: 1,
  tamano: 50,
  acciones: ['actualizar', 'exportar_censo'],
  filas: [
    {
      id: 2,
      ocurridoEn: '2026-11-08T14:00:00Z',
      actor: 'Rectoría Prueba',
      actorRol: 'administrador_institucional',
      accion: 'exportar_censo',
      entidad: 'censo',
      entidadId: null,
      institucion: 'Colegio 1',
      detalle: { motivo: 'Informe mensual', personas: 3 },
    },
    {
      id: 1,
      ocurridoEn: '2026-11-08T13:00:00Z',
      actor: 'Administración Prueba',
      actorRol: 'superadministrador',
      accion: 'actualizar',
      entidad: 'instituciones',
      entidadId: 'colegio1',
      institucion: 'Colegio 1',
      detalle: { nombre: { antes: 'Colegio', despues: 'Colegio 1' } },
    },
  ],
};

const VISITAS = {
  total: 13,
  anterior: 9,
  porDispositivo: { movil: 6, tableta: 4, escritorio: 3 },
};

const FILA = {
  id: 'a0000000-0000-0000-0000-000000000001',
  codigo: 'MD-0001',
  creadoEn: '2026-10-26T20:00:00Z',
  nombre: 'Ana Prueba',
  modulo: 'adulto',
  edad: 30,
  lugar: 'Centro',
  institucion: 'Colegio 1',
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

const RESUMEN_CUENTAS = {
  total: 3,
  nuevas30: 2,
  activas7: 1,
  activas30: 2,
  enCurso: 1,
  completados: 4,
  conProgreso: 2,
  porSemana: [
    { semana: '2026-10-19', cuentas: 1 },
    { semana: '2026-10-26', cuentas: 2 },
  ],
};

const CUENTA = {
  id: '00000000-0000-0000-0000-0000000000c1',
  nombre: 'Ana Cuenta',
  usuario: 'ana.cuenta',
  correo: 'an***@correo.co',
  creadoEn: '2026-10-30T15:00:00Z',
  ultimoIngreso: '2026-11-01T15:00:00Z',
  ultimaActividad: '2026-11-01T15:30:00Z',
  actividades: [
    {
      actividad: 'cuestionario',
      avance: 40,
      completado: false,
      actualizadoEn: '2026-11-01T15:30:00Z',
    },
    {
      actividad: 'resultado:MD-0007',
      avance: 100,
      completado: true,
      actualizadoEn: '2026-10-30T16:00:00Z',
    },
  ],
};

/** Censo (D-83): cada persona una vez, con su cuestionario más reciente. */
const CENSO = {
  personas: 3,
  cuestionarios: 4,
  conPrioridad: 1,
  conFalencias: 2,
  porModulo: { adulto: 2, adolescente: 1 },
  porInstitucion: [{ institucion: 'Colegio 1', n: 3 }],
  resultados: { desafios: 1, por_fortalecer: 1, favorable: 1 },
  porEdad: [{ edad: 15, n: 1 }],
  porSexo: [{ sexo: 'Mujer', n: 1 }],
  porGrado: [{ grado: 'Décimo', n: 1 }],
  lugares: [
    { lugar: 'Centro', n: 2 },
    { lugar: 'Norte', n: 1 },
  ],
  areas: [
    { area: 'bienestar_emocional', nivel: 'requiere_atencion', n: 2 },
    { area: 'bienestar_emocional', nivel: 'adecuado', n: 1 },
    { area: 'sueno_descanso', nivel: 'por_fortalecer', n: 2 },
    { area: 'sueno_descanso', nivel: 'adecuado', n: 1 },
  ],
};

const PERSONA_CENSO = {
  id: FILA.id,
  codigo: FILA.codigo,
  creadoEn: FILA.creadoEn,
  nombre: FILA.nombre,
  modulo: 'adulto',
  edad: null,
  sexo: null,
  grado: null,
  lugar: 'Centro',
  resultadoGeneral: 'desafios',
  prioridad: true,
  niveles: { bienestar_emocional: 'requiere_atencion', sueno_descanso: 'por_fortalecer' },
  cuestionarios: 2,
  fortalezas: 0,
  porFortalecer: 1,
  falencias: 1,
  sinDato: 18,
};

interface Llamadas {
  tablero: Record<string, unknown>[];
  prioritarios: Record<string, unknown>[];
  instituciones: number;
  institucionActualizada: Record<string, unknown>[];
  administradores: number;
  administradorActualizado: Record<string, unknown>[];
  invitaciones: Record<string, unknown>[];
  auditoria: Record<string, unknown>[];
  registros: Record<string, unknown>[];
  censo: Record<string, unknown>[];
  exportacion: Record<string, unknown>[];
  contacto: number;
  impresion: number;
  salida: number;
}

const base64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

interface OpcionesSesion {
  /** La fila de mi_perfil: por defecto, el administrador general. */
  perfil?: Record<string, unknown>;
  /** Cómo responde la Edge Function invitar-usuario. */
  invitacion?: 'ok' | 'conflicto';
}

/**
 * Sesión de superadministración y las consultas simuladas. Por defecto, con el doble factor ya
 * verificado (aal2); con aal1 la sesión espera el código de la app de autenticación.
 */
async function iniciarSesion(
  page: Page,
  nivel: 'aal1' | 'aal2' = 'aal2',
  { perfil = PERFIL_GENERAL, invitacion = 'ok' }: OpcionesSesion = {},
): Promise<Llamadas> {
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
      aal: nivel,
      amr: [
        { method: 'password', timestamp: ahora },
        ...(nivel === 'aal2' ? [{ method: 'totp', timestamp: ahora }] : []),
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

  const llamadas: Llamadas = {
    tablero: [],
    prioritarios: [],
    instituciones: 0,
    institucionActualizada: [],
    administradores: 0,
    administradorActualizado: [],
    invitaciones: [],
    auditoria: [],
    registros: [],
    censo: [],
    exportacion: [],
    contacto: 0,
    impresion: 0,
    salida: 0,
  };
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
        return json(perfil);
      case '/rest/v1/rpc/panel_tablero':
        llamadas.tablero.push(peticion.postDataJSON() as Record<string, unknown>);
        return json(TABLERO);
      case '/rest/v1/rpc/panel_instituciones':
        llamadas.instituciones += 1;
        return json(INSTITUCIONES);
      case '/rest/v1/rpc/panel_institucion_actualizar': {
        const cuerpo = peticion.postDataJSON() as Record<string, unknown>;
        llamadas.institucionActualizada.push(cuerpo);
        return json({
          id: cuerpo.p_id,
          nombre: cuerpo.p_nombre,
          slug: cuerpo.p_slug,
          activa: cuerpo.p_activa,
        });
      }
      case '/rest/v1/rpc/panel_administradores':
        llamadas.administradores += 1;
        return json(ADMINISTRADORES);
      case '/rest/v1/rpc/panel_administrador_actualizar':
        llamadas.administradorActualizado.push(peticion.postDataJSON() as Record<string, unknown>);
        return route.fulfill({ status: 204, headers: CORS });
      case '/rest/v1/rpc/panel_auditoria':
        llamadas.auditoria.push(peticion.postDataJSON() as Record<string, unknown>);
        return json(AUDITORIA);
      case '/functions/v1/invitar-usuario':
        llamadas.invitaciones.push(peticion.postDataJSON() as Record<string, unknown>);
        return invitacion === 'ok'
          ? route.fulfill({
              status: 201,
              headers: { ...CORS, 'content-type': 'application/json' },
              body: JSON.stringify({ id: '00000000-0000-0000-0000-0000000000b2' }),
            })
          : route.fulfill({
              status: 409,
              headers: { ...CORS, 'content-type': 'application/json' },
              body: JSON.stringify({
                error: { codigo: 'conflicto', mensaje: 'Ese correo ya tiene una cuenta.' },
              }),
            });
      case '/rest/v1/rpc/panel_visitas':
        return json(VISITAS);
      case '/rest/v1/rpc/panel_registros':
        llamadas.registros.push(peticion.postDataJSON() as Record<string, unknown>);
        return json({ total: 1, pagina: 1, tamano: 25, filas: [FILA] });
      case '/rest/v1/rpc/panel_detalle':
        return json(FICHA);
      case '/rest/v1/rpc/panel_prioritarios':
        llamadas.prioritarios.push(peticion.postDataJSON() as Record<string, unknown>);
        return json(PRIORITARIOS);
      case '/rest/v1/rpc/ver_datos_contacto':
        llamadas.contacto += 1;
        return json(CONTACTO);
      case '/rest/v1/rpc/panel_registrar_impresion':
        llamadas.impresion += 1;
        return route.fulfill({ status: 204, headers: CORS });
      case '/rest/v1/rpc/panel_cuentas_resumen':
        return json(RESUMEN_CUENTAS);
      case '/rest/v1/rpc/panel_censo':
        return json(CENSO);
      case '/rest/v1/rpc/panel_censo_personas':
        llamadas.censo.push(peticion.postDataJSON() as Record<string, unknown>);
        return json({ total: 1, pagina: 1, tamano: 25, filas: [PERSONA_CENSO] });
      case '/rest/v1/rpc/panel_censo_exportar':
        llamadas.exportacion.push(peticion.postDataJSON() as Record<string, unknown>);
        return json({
          generadoEn: '2026-11-05T15:00:00Z',
          generadoPor: 'Administración Prueba',
          resumen: CENSO,
          personas: [PERSONA_CENSO],
        });
      case '/rest/v1/rpc/panel_cuentas':
        return json({ total: 1, pagina: 1, tamano: 25, filas: [CUENTA] });
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

test('el tablero muestra las visitas al sitio por móvil, tableta y computador', async ({
  page,
}) => {
  await iniciarSesion(page);
  await page.goto('/panel');
  const visitas = page.getByRole('region', { name: 'Visitas por tipo de dispositivo' });
  await expect(
    visitas.getByRole('img', {
      name: /13 visitas en total: Móvil, 6 visitas \(46\s?%\); Tableta, 4 visitas \(31\s?%\); Computador, 3 visitas \(23\s?%\)/,
    }),
  ).toBeVisible();
  await expect(visitas.getByRole('listitem')).toHaveText([
    /Móvil\s*6\s*46\s?%/,
    /Tableta\s*4\s*31\s?%/,
    /Computador\s*3\s*23\s?%/,
  ]);

  await visitas.getByRole('button', { name: 'Ver como tabla' }).click();
  await expect(visitas.getByRole('row')).toHaveCount(5);
  await expect(visitas.getByRole('row', { name: /Total/ })).toContainText('13');

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

test('el censo cuenta a cada persona una vez y muestra sus fortalezas y falencias', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel/censo');
  await expect(page.getByRole('heading', { level: 1, name: 'Censo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Personas en el censo' })).toBeVisible();
  await expect(page.getByText('4 cuestionarios respondidos')).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Quiénes son?' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Fortalezas y falencias por área' }),
  ).toBeVisible();
  const lista = page.getByRole('table', { name: 'Personas del censo' });
  await expect(lista.getByRole('link', { name: 'Ana Prueba' })).toBeVisible();
  await expect(lista.getByText('Respondió 2 veces')).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);

  await page
    .getByRole('button', { name: 'Ver quiénes tienen «Bienestar emocional» como falencia' })
    .click();
  await expect(page).toHaveURL(/area=bienestar_emocional&nivel=requiere_atencion/);
  await expect(page.getByText('Personas con «Bienestar emocional» como falencia.')).toBeVisible();
  expect(llamadas.censo.at(-1)).toMatchObject({
    p_area: 'bienestar_emocional',
    p_nivel: 'requiere_atencion',
  });

  await lista.getByRole('link', { name: 'Ana Prueba' }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/registros/${FILA.id}/fortalezas$`));
  await expect(page.getByRole('heading', { name: 'Falencias (1)' })).toBeVisible();
  await page.getByRole('link', { name: 'Volver al censo' }).click();
  await expect(page).toHaveURL(/\/panel\/censo\?area=bienestar_emocional/);
});

test('el censo se descarga en Excel solo con un motivo, que queda en la auditoría', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel/censo');
  await page.getByRole('button', { name: 'Descargar en Excel' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Descargar el censo en Excel' });
  await expect(dialogo).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);

  // Sin motivo no se pide nada a la base.
  await dialogo.getByRole('button', { name: 'Descargar', exact: true }).click();
  await expect(dialogo.getByText('Escribe el motivo, con al menos 10 caracteres.')).toBeVisible();
  expect(llamadas.exportacion).toHaveLength(0);

  await dialogo.getByLabel('Motivo de la descarga').fill('Informe mensual del equipo');
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    dialogo.getByRole('button', { name: 'Descargar', exact: true }).click(),
  ]);
  expect(descarga.suggestedFilename()).toBe('censo-mente-al-dia-2026-11-05.xlsx');
  expect(llamadas.exportacion[0]).toMatchObject({ p_motivo: 'Informe mensual del equipo' });
  await expect(page.getByText('Listo: descargaste el censo de 1 persona.')).toBeVisible();
  await expect(dialogo).toBeHidden();

  // El archivo se abre con sus tres hojas y la persona del censo.
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(await descarga.path());
  expect(libro.worksheets.map((h) => h.name)).toEqual(['Resumen', 'Áreas', 'Personas']);
  expect(libro.getWorksheet('Personas')?.getRow(2).getCell(1).value).toBe('Ana Prueba');
});

test('fortalezas y falencias agrupa las preguntas de una persona y deja la impresión en la auditoría', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto(`/panel/registros/${FILA.id}`);
  await page.getByRole('link', { name: 'Ver fortalezas y falencias' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Ana Prueba' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Falencias (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Por fortalecer (1)' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Fortalezas (0)' })).toBeVisible();
  await expect(page.getByText('Ninguna área quedó en «adecuado».')).toBeVisible();

  const falencia = page.getByRole('article', { name: 'Bienestar emocional' });
  await expect(falencia.getByText('una sensación general de tranquilidad')).toBeVisible();
  await expect(falencia.getByText('No o presenta dificultades')).toBeVisible();
  await falencia.getByText('Orientación que recibió').click();
  await expect(falencia.locator('details p')).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);

  await page.getByRole('button', { name: 'Imprimir', exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { impresiones?: number }).impresiones))
    .toBe(1);
  expect(llamadas.impresion).toBe(1);

  await page.getByRole('link', { name: 'Volver a la ficha' }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/registros/${FILA.id}$`));
});

test('prioritarios muestra los casos pendientes con los días sin gestión', async ({ page }) => {
  await iniciarSesion(page);
  await page.goto('/panel/prioritarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Prioritarios' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Ana Prueba/ })).toContainText('9 días');
  expect(await violacionesGraves(page)).toEqual([]);
});

test('cuentas muestra quién se registró, su actividad y su avance, sin sus respuestas', async ({
  page,
}) => {
  await iniciarSesion(page);
  await page.goto('/panel/cuentas');
  await expect(page.getByRole('heading', { level: 1, name: 'Cuentas' })).toBeVisible();
  await expect(page.getByText('2 nuevas en los últimos 30 días')).toBeVisible();
  const fila = page.getByRole('row', { name: /Ana Cuenta/ });
  await expect(fila).toContainText('@ana.cuenta');
  await expect(fila).toContainText('an***@correo.co');
  await expect(fila).toContainText('Cuestionario en curso: 40 %');
  await expect(fila).toContainText('1 cuestionario terminado');
  expect(await violacionesGraves(page)).toEqual([]);
});

test('las secciones de la Fase 9 explican que están en construcción', async ({ page }) => {
  await iniciarSesion(page);
  await page.goto('/panel/configuracion');
  await expect(page.getByRole('heading', { level: 1, name: 'Configuración' })).toBeVisible();
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

test('«Cerrar sesión» vuelve a la página principal y «atrás» no reabre el panel', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel');
  await page.getByRole('searchbox', { name: 'Buscar una persona' }).fill('Ana');
  await page.getByRole('searchbox', { name: 'Buscar una persona' }).press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Registros' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Cuidar tu mente también es cuidarte');
  expect(new URL(page.url()).pathname).toBe('/');
  expect(llamadas.salida).toBe(1);

  // Sin sesión, «atrás» muestra el ingreso, nunca los datos del panel.
  await page.goBack();
  await expect(page).toHaveURL(/\/panel\/ingresar$/);
  await expect(page.locator('h1')).toHaveText('Ingreso de administración');
});

test('«Cerrar sesión» en la verificación en dos pasos también vuelve a la página principal', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page, 'aal1');
  await page.goto('/panel/ingresar');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Verificación en dos pasos' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Cuidar tu mente también es cuidarte');
  expect(llamadas.salida).toBe(1);
});

// ---------------------------------------------------------------------------------- D-86

/** El menú del panel (en el teléfono, dentro del panel deslizable). */
async function menuDelPanel(page: Page) {
  if (test.info().project.name.includes('movil')) {
    await page.getByRole('button', { name: 'Menú' }).click();
    return page.getByRole('dialog').getByRole('navigation', { name: 'Secciones del panel' });
  }
  return page.getByRole('navigation', { name: 'Secciones del panel' });
}

test('el administrador de una institución solo ve la suya y no las secciones del general', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page, 'aal2', { perfil: PERFIL_INSTITUCIONAL });
  await page.goto('/panel');
  await expect(page.getByRole('heading', { level: 1, name: 'Tablero' })).toBeVisible();
  // Su institución y el enlace para compartir, sin selector de instituciones.
  await expect(
    page.getByRole('heading', { name: 'Enlace para responder · Colegio 1' }),
  ).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Enlace de Colegio 1' })).toHaveValue(
    /\/\?sede=colegio1$/,
  );
  await expect(page.getByRole('combobox', { name: 'Institución' })).toHaveCount(0);
  // El panel no pide otra institución: la base lo deja siempre en la suya.
  await expect.poll(() => llamadas.tablero.at(-1)).toMatchObject({ p_institucion: null });
  expect(llamadas.instituciones).toBe(0);
  expect(await violacionesGraves(page)).toEqual([]);

  const menu = await menuDelPanel(page);
  await expect(menu.getByRole('link', { name: 'Censo' })).toBeVisible();
  for (const seccion of ['Cuentas', 'Instituciones', 'Usuarios', 'Auditoría']) {
    await expect(menu.getByRole('link', { name: seccion })).toHaveCount(0);
  }

  // Escribiendo la dirección tampoco: el panel lo explica y no consulta nada.
  await page.goto('/panel/usuarios');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Esta sección es del administrador general' }),
  ).toBeVisible();
  expect(llamadas.administradores).toBe(0);
});

test('con su institución desactivada, el administrador institucional no entra', async ({
  page,
}) => {
  await iniciarSesion(page, 'aal2', {
    perfil: { ...PERFIL_INSTITUCIONAL, institucion_activa: false },
  });
  await page.goto('/panel');
  await expect(page).toHaveURL(/\/panel\/ingresar$/);
  await expect(page.getByText(/Tu institución está desactivada/)).toBeVisible();
});

test('el general elige una institución y el panel consulta solo esa', async ({ page }) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel');
  const selector = page.getByRole('combobox', { name: 'Institución' });
  await expect(selector.getByRole('option')).toHaveText([
    'Todas las instituciones',
    'Colegio 1',
    'Alcaldía 2 (inactiva)',
  ]);
  await expect.poll(() => llamadas.tablero.at(-1)).toMatchObject({ p_institucion: null });

  await selector.selectOption({ label: 'Colegio 1' });
  await expect.poll(() => llamadas.tablero.at(-1)).toMatchObject({ p_institucion: COLEGIO.id });
  await expect(
    page.getByRole('heading', { name: 'Enlace para responder · Colegio 1' }),
  ).toBeVisible();

  // La elección sigue al pasar a otra sección.
  await page.goto('/panel/registros');
  await expect.poll(() => llamadas.registros.at(-1)).toMatchObject({ p_institucion: COLEGIO.id });
  await expect(page.getByRole('columnheader', { name: 'Institución' })).toHaveCount(0);

  // Con todas, cada registro dice de qué institución es.
  await page
    .getByRole('combobox', { name: 'Institución' })
    .selectOption({ label: 'Todas las instituciones' });
  await expect.poll(() => llamadas.registros.at(-1)).toMatchObject({ p_institucion: null });
  await expect(page.getByRole('columnheader', { name: 'Institución' })).toBeVisible();
  await expect(page.getByRole('row', { name: /Ana Prueba/ })).toContainText('Colegio 1');
});

test('Instituciones muestra cada una con su enlace y su actividad, y se puede editar', async ({
  page,
}) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel/instituciones');
  await expect(page.getByRole('heading', { level: 1, name: 'Instituciones' })).toBeVisible();
  await expect(page.getByText('4 cuestionarios de 3 personas en total')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Colegio 1' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Alcaldía 2' })).toBeVisible();
  await expect(page.getByText('Inactiva', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Enlace de Alcaldía 2' })).toHaveValue(
    /\/\?sede=alcaldia2$/,
  );
  expect(await violacionesGraves(page)).toEqual([]);

  await page.getByRole('button', { name: 'Editar Colegio 1' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Editar Colegio 1' });
  await dialogo.getByLabel('Nombre').fill('Colegio Uno');
  await dialogo.getByLabel(/^Enlace/).fill('colegio uno');
  await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(dialogo.getByText(/Usa solo minúsculas/)).toBeVisible();
  expect(llamadas.institucionActualizada).toHaveLength(0);

  await dialogo.getByLabel(/^Enlace/).fill('colegio1');
  await dialogo.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Cambios guardados en Colegio Uno.')).toBeVisible();
  expect(llamadas.institucionActualizada[0]).toEqual({
    p_id: COLEGIO.id,
    p_nombre: 'Colegio Uno',
    p_slug: 'colegio1',
    p_activa: true,
  });
});

test('Usuarios invita por correo al administrador de una institución', async ({ page }) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel/usuarios');
  await expect(page.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeVisible();
  const rectoria = page.getByRole('row', { name: /Rectoría Prueba/ });
  await expect(rectoria).toContainText('Administrador institucional');
  await expect(rectoria).toContainText('Colegio 1');
  await expect(page.getByRole('row', { name: /Administración Prueba/ })).toContainText('Tú');
  expect(await violacionesGraves(page)).toEqual([]);

  await page.getByRole('button', { name: 'Invitar', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: 'Invitar a un administrador' });
  await dialogo.getByLabel('Nombre').fill('Nueva Rectora');
  await dialogo.getByLabel('Correo').fill('Rectora@Colegio.edu.co');
  // Sin institución no se envía; las inactivas no se ofrecen.
  await dialogo.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(dialogo.getByText('Elige la institución que va a administrar.')).toBeVisible();
  const institucion = dialogo.getByRole('combobox', { name: 'Institución' });
  await expect(institucion.getByRole('option')).toHaveText(['Elige una institución', 'Colegio 1']);
  await institucion.selectOption({ label: 'Colegio 1' });
  await dialogo.getByRole('button', { name: 'Enviar invitación' }).click();

  await expect(page.getByText('Invitación enviada a rectora@colegio.edu.co.')).toBeVisible();
  expect(llamadas.invitaciones).toEqual([
    {
      nombre: 'Nueva Rectora',
      correo: 'rectora@colegio.edu.co',
      rol: 'administrador_institucional',
      institucionId: COLEGIO.id,
    },
  ]);

  await rectoria.getByRole('button', { name: 'Desactivar a Rectoría Prueba' }).click();
  await expect
    .poll(() => llamadas.administradorActualizado)
    .toEqual([{ p_id: RECTORIA, p_activo: false, p_institucion: null }]);
});

test('una invitación a un correo que ya tiene cuenta lo explica', async ({ page }) => {
  await iniciarSesion(page, 'aal2', { invitacion: 'conflicto' });
  await page.goto('/panel/usuarios');
  await page.getByRole('button', { name: 'Invitar', exact: true }).click();
  const dialogo = page.getByRole('dialog', { name: 'Invitar a un administrador' });
  await dialogo.getByLabel('Nombre').fill('Otra Persona');
  await dialogo.getByLabel('Correo').fill('rectoria@colegio.edu.co');
  await dialogo
    .getByRole('combobox', { name: 'Rol' })
    .selectOption({ label: 'Administrador general' });
  await dialogo.getByRole('button', { name: 'Enviar invitación' }).click();
  await expect(dialogo.getByText('Ese correo ya tiene una cuenta.')).toBeVisible();
});

test('Auditoría muestra quién hizo qué y filtra por acción', async ({ page }) => {
  const llamadas = await iniciarSesion(page);
  await page.goto('/panel/auditoria');
  await expect(page.getByRole('heading', { level: 1, name: 'Auditoría' })).toBeVisible();
  const descarga = page.getByRole('row', { name: /Rectoría Prueba/ });
  await expect(descarga).toContainText('Descargó el censo');
  await expect(descarga).toContainText('Colegio 1');
  await descarga.getByText('Ver detalle').click();
  await expect(descarga.getByText('Informe mensual')).toBeVisible();
  expect(await violacionesGraves(page)).toEqual([]);

  await page.getByRole('combobox', { name: 'Acción' }).selectOption({ label: 'Descargó el censo' });
  await expect(page).toHaveURL(/accion=exportar_censo/);
  await expect
    .poll(() => llamadas.auditoria.at(-1))
    .toMatchObject({
      p_accion: 'exportar_censo',
      p_institucion: null,
    });
});
