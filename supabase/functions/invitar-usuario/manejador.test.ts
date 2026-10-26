import { assertEquals } from '@std/assert';
import { crearManejador, type Dependencias, type PerfilSesion } from './manejador.ts';

const ORIGEN = 'https://mentealdia.ejemplo.gov.co';
const SUPER: PerfilSesion = {
  id: 'super',
  rol: 'superadministrador',
  activo: true,
  doble_factor: true,
};

function dependencias(perfil: PerfilSesion | null = SUPER, cambios: Partial<Dependencias> = {}) {
  const llamadas = {
    invitados: [] as string[],
    perfiles: [] as unknown[],
    eliminados: [] as string[],
  };
  const deps: Dependencias = {
    origenes: [ORIGEN],
    perfilDeSesion: () => Promise.resolve(perfil),
    invitar: (correo) => {
      llamadas.invitados.push(correo);
      return Promise.resolve({ id: 'nuevo' });
    },
    crearPerfil: (actor, id, datos) => {
      llamadas.perfiles.push({ actor, id, ...datos });
      return Promise.resolve();
    },
    eliminarUsuario: (id) => {
      llamadas.eliminados.push(id);
      return Promise.resolve();
    },
    registrarError: () => undefined,
    ...cambios,
  };
  return { deps, llamadas };
}

const invitacion = {
  correo: 'Nueva@Alcaldia.gov.co',
  nombre: 'Profesional Nueva',
  rol: 'profesional',
};
const pedir = (cuerpo: unknown = invitacion, token: string | null = 'token') =>
  new Request('http://localhost/invitar-usuario', {
    method: 'POST',
    headers: {
      Origin: ORIGEN,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(cuerpo),
  });

Deno.test('el superadministrador con doble factor invita y queda como actor', async () => {
  const { deps, llamadas } = dependencias();
  const respuesta = await crearManejador(deps)(pedir());
  assertEquals(respuesta.status, 201);
  assertEquals(llamadas.invitados, ['nueva@alcaldia.gov.co']);
  assertEquals(llamadas.perfiles, [
    { actor: 'super', id: 'nuevo', ...invitacion, correo: 'nueva@alcaldia.gov.co' },
  ]);
});

Deno.test('sin token o con token inválido responde 401', async () => {
  assertEquals((await crearManejador(dependencias().deps)(pedir(invitacion, null))).status, 401);
  assertEquals((await crearManejador(dependencias(null).deps)(pedir())).status, 401);
});

Deno.test('solo invita el superadministrador activo y con doble factor', async () => {
  const casos: PerfilSesion[] = [
    { ...SUPER, rol: 'profesional' },
    { ...SUPER, rol: 'consulta' },
    { ...SUPER, activo: false },
    { ...SUPER, doble_factor: false },
  ];
  for (const perfil of casos) {
    const { deps, llamadas } = dependencias(perfil);
    assertEquals((await crearManejador(deps)(pedir())).status, 403);
    assertEquals(llamadas.invitados.length, 0);
  }
});

Deno.test('valida el rol y el correo', async () => {
  const { deps, llamadas } = dependencias();
  assertEquals((await crearManejador(deps)(pedir({ ...invitacion, rol: 'dueño' }))).status, 400);
  assertEquals((await crearManejador(deps)(pedir({ ...invitacion, correo: 'x' }))).status, 400);
  assertEquals(llamadas.invitados.length, 0);
});

Deno.test('un correo que ya tiene cuenta responde 409', async () => {
  const { deps } = dependencias(SUPER, { invitar: () => Promise.resolve(null) });
  assertEquals((await crearManejador(deps)(pedir())).status, 409);
});

Deno.test('si no se puede crear el perfil se deshace la invitación', async () => {
  const { deps, llamadas } = dependencias(SUPER, {
    crearPerfil: () => Promise.reject(new Error('falló')),
  });
  assertEquals((await crearManejador(deps)(pedir())).status, 500);
  assertEquals(llamadas.eliminados, ['nuevo']);
});
