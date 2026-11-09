import { assertEquals } from '@std/assert';
import {
  crearManejador,
  enmascararCorreo,
  LimiteAuth,
  type Dependencias,
  type PerfilCodigo,
  type SesionCodigo,
} from './manejador.ts';

const ORIGEN = 'https://mentealdia.ejemplo.gov.co';
const SESION: SesionCodigo = {
  usuario: 'usuario-1',
  correo: 'rectoria@colegio.edu.co',
  sesion: 'sesion-1',
  metodos: ['password'],
};
const GENERAL: PerfilCodigo = { activo: true, rol: 'superadministrador', institucionActiva: null };
const INSTITUCIONAL: PerfilCodigo = {
  activo: true,
  rol: 'administrador_institucional',
  institucionActiva: true,
};

function dependencias(
  {
    sesion = SESION as SesionCodigo | null,
    perfil = GENERAL as PerfilCodigo | null,
    codigoCorrecto = '123456',
    restantes = 5,
  } = {},
  cambios: Partial<Dependencias> = {},
) {
  const llamadas = {
    enviados: [] as string[],
    comprobados: [] as string[],
    fallos: 0,
    verificadas: [] as string[],
    errores: [] as string[],
  };
  const deps: Dependencias = {
    origenes: [ORIGEN],
    sesionDeToken: () => Promise.resolve(sesion),
    perfil: () => Promise.resolve(perfil),
    enviarCodigo: (correo) => {
      llamadas.enviados.push(correo);
      return Promise.resolve();
    },
    comprobarCodigo: (_correo, codigo) => {
      llamadas.comprobados.push(codigo);
      return Promise.resolve(codigo === codigoCorrecto);
    },
    intentosRestantes: () => Promise.resolve(restantes),
    registrarFallo: () => {
      llamadas.fallos += 1;
      return Promise.resolve(restantes - 1);
    },
    marcarVerificada: (usuario, sesionId) => {
      llamadas.verificadas.push(`${usuario}:${sesionId}`);
      return Promise.resolve();
    },
    registrarError: (contexto) => void llamadas.errores.push(contexto),
    ...cambios,
  };
  return { deps, llamadas };
}

const pedir = (cuerpo: unknown, token: string | null = 'token') =>
  new Request('http://localhost/codigo-panel', {
    method: 'POST',
    headers: {
      Origin: ORIGEN,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });

const cuerpo = async (r: Response) => (await r.json()) as Record<string, unknown>;
const codigoError = async (r: Response) =>
  ((await cuerpo(r)).error as { codigo?: string } | undefined)?.codigo;

Deno.test('después de la contraseña, envía el código al correo de la cuenta', async () => {
  const { deps, llamadas } = dependencias();
  const respuesta = await crearManejador(deps)(pedir({ accion: 'enviar' }));
  assertEquals(respuesta.status, 200);
  assertEquals(await cuerpo(respuesta), { enviado: true, correo: 're***@colegio.edu.co' });
  assertEquals(llamadas.enviados, ['rectoria@colegio.edu.co']);
});

Deno.test('el administrador de una institución activa también recibe el código', async () => {
  const { deps, llamadas } = dependencias({ perfil: INSTITUCIONAL });
  const respuesta = await crearManejador(deps)(pedir({ accion: 'enviar' }));
  assertEquals(respuesta.status, 200);
  assertEquals(llamadas.enviados.length, 1);
});

Deno.test('sin token no hay código', async () => {
  const { deps, llamadas } = dependencias();
  const respuesta = await crearManejador(deps)(pedir({ accion: 'enviar' }, null));
  assertEquals(respuesta.status, 401);
  assertEquals(llamadas.enviados, []);
});

Deno.test('una sesión abierta sin contraseña (solo con el correo) no recibe código', async () => {
  for (const metodos of [['otp'], ['recovery'], ['invite'], []]) {
    const { deps, llamadas } = dependencias({ sesion: { ...SESION, metodos } });
    const respuesta = await crearManejador(deps)(pedir({ accion: 'enviar' }));
    assertEquals(respuesta.status, 403);
    assertEquals(await codigoError(respuesta), 'requiere_contrasena');
    assertEquals(llamadas.enviados, []);
  }
});

Deno.test('una cuenta sin acceso al panel no recibe código', async () => {
  const sinAcceso: (PerfilCodigo | null)[] = [
    null,
    { ...GENERAL, activo: false },
    { ...INSTITUCIONAL, institucionActiva: false },
    { activo: true, rol: 'profesional', institucionActiva: null },
  ];
  for (const perfil of sinAcceso) {
    const { deps, llamadas } = dependencias({ perfil });
    const respuesta = await crearManejador(deps)(pedir({ accion: 'enviar' }));
    assertEquals(respuesta.status, 403);
    assertEquals(await codigoError(respuesta), 'sin_permiso');
    assertEquals(llamadas.enviados, []);
  }
});

Deno.test('si Auth no deja enviar más correos, pide esperar', async () => {
  const { deps } = dependencias({}, { enviarCodigo: () => Promise.reject(new LimiteAuth()) });
  const respuesta = await crearManejador(deps)(pedir({ accion: 'enviar' }));
  assertEquals(respuesta.status, 429);
  assertEquals(await codigoError(respuesta), 'espera');
});

Deno.test('con el código correcto, la sesión queda verificada', async () => {
  const { deps, llamadas } = dependencias();
  const respuesta = await crearManejador(deps)(pedir({ accion: 'verificar', codigo: '123456' }));
  assertEquals(respuesta.status, 200);
  assertEquals(await cuerpo(respuesta), { verificado: true });
  assertEquals(llamadas.verificadas, ['usuario-1:sesion-1']);
});

Deno.test('un código equivocado gasta un intento y no verifica', async () => {
  const { deps, llamadas } = dependencias();
  const respuesta = await crearManejador(deps)(pedir({ accion: 'verificar', codigo: '000000' }));
  assertEquals(respuesta.status, 422);
  const error = (await cuerpo(respuesta)).error as { codigo: string; detalles: unknown };
  assertEquals(error.codigo, 'codigo_invalido');
  assertEquals(error.detalles, { restantes: 4 });
  assertEquals(llamadas.fallos, 1);
  assertEquals(llamadas.verificadas, []);
});

Deno.test('sin intentos, no se comprueba ni el código correcto', async () => {
  const { deps, llamadas } = dependencias({ restantes: 0 });
  const respuesta = await crearManejador(deps)(pedir({ accion: 'verificar', codigo: '123456' }));
  assertEquals(respuesta.status, 429);
  assertEquals(await codigoError(respuesta), 'demasiados_intentos');
  assertEquals(llamadas.comprobados, []);
  assertEquals(llamadas.verificadas, []);
});

Deno.test('una sesión sin contraseña no puede verificar un código', async () => {
  const { deps, llamadas } = dependencias({ sesion: { ...SESION, metodos: ['otp'] } });
  const respuesta = await crearManejador(deps)(pedir({ accion: 'verificar', codigo: '123456' }));
  assertEquals(respuesta.status, 403);
  assertEquals(llamadas.comprobados, []);
  assertEquals(llamadas.verificadas, []);
});

Deno.test('rechaza un código mal escrito o campos de más sin llamar a Auth', async () => {
  for (const pedido of [
    { accion: 'verificar', codigo: '12345' },
    { accion: 'verificar', codigo: 'abcdef' },
    { accion: 'verificar' },
    { accion: 'enviar', correo: 'otra@persona.co' },
    { accion: 'borrar' },
  ]) {
    const { deps, llamadas } = dependencias();
    const respuesta = await crearManejador(deps)(pedir(pedido));
    assertEquals(respuesta.status, 400);
    assertEquals(llamadas.enviados, []);
    assertEquals(llamadas.comprobados, []);
  }
});

Deno.test('un error interno responde 500 sin detalles', async () => {
  const { deps, llamadas } = dependencias(
    {},
    { marcarVerificada: () => Promise.reject(new Error('detalle interno')) },
  );
  const respuesta = await crearManejador(deps)(pedir({ accion: 'verificar', codigo: '123456' }));
  assertEquals(respuesta.status, 500);
  assertEquals(JSON.stringify(await cuerpo(respuesta)).includes('detalle interno'), false);
  assertEquals(llamadas.errores, ['codigo-panel']);
});

Deno.test('el correo se muestra enmascarado', () => {
  assertEquals(enmascararCorreo('persona.ejemplo@colegio.edu.co'), 'pe***@colegio.edu.co');
});
