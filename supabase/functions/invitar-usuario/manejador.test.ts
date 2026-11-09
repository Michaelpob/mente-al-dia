import { assertEquals } from '@std/assert';
import { crearManejador, type Dependencias, type PerfilSesion } from './manejador.ts';

const ORIGEN = 'https://mentealdia.ejemplo.gov.co';
const COLEGIO = '0e7b5c1a-4f2d-4c1e-9a3b-2d5f6a7b8c9d';
const INACTIVA = '1f8c6d2b-5a3e-4d2f-8b4c-3e6a7b8c9d0e';
const SUPER: PerfilSesion = {
  id: 'super',
  rol: 'superadministrador',
  activo: true,
  doble_factor: true,
};

function dependencias(perfil: PerfilSesion | null = SUPER, cambios: Partial<Dependencias> = {}) {
  const llamadas = {
    invitados: [] as string[],
    datosCorreo: [] as unknown[],
    perfiles: [] as unknown[],
    eliminados: [] as string[],
  };
  const deps: Dependencias = {
    origenes: [ORIGEN],
    perfilDeSesion: () => Promise.resolve(perfil),
    institucion: (id) =>
      Promise.resolve(
        id === COLEGIO
          ? { nombre: 'Colegio 1', activa: true }
          : id === INACTIVA
            ? { nombre: 'Colegio cerrado', activa: false }
            : null,
      ),
    invitar: (correo, datos) => {
      llamadas.invitados.push(correo);
      llamadas.datosCorreo.push(datos);
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
  correo: 'Nueva@Ejemplo.org',
  nombre: 'Administradora Nueva',
  rol: 'superadministrador',
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
  assertEquals(llamadas.invitados, ['nueva@ejemplo.org']);
  assertEquals(llamadas.perfiles, [
    { actor: 'super', id: 'nuevo', ...invitacion, correo: 'nueva@ejemplo.org' },
  ]);
});

Deno.test(
  'invita al administrador de una institución activa, con su nombre en el correo',
  async () => {
    const { deps, llamadas } = dependencias();
    const datos = { ...invitacion, rol: 'administrador_institucional', institucionId: COLEGIO };
    const respuesta = await crearManejador(deps)(pedir(datos));
    assertEquals(respuesta.status, 201);
    assertEquals(llamadas.datosCorreo, [
      { nombre: 'Administradora Nueva', institucion: 'Colegio 1' },
    ]);
    assertEquals(llamadas.perfiles, [
      { actor: 'super', id: 'nuevo', ...datos, correo: 'nueva@ejemplo.org' },
    ]);
  },
);

Deno.test('no invita a una institución inactiva o inexistente', async () => {
  for (const institucionId of [INACTIVA, '2a9d7e3c-6b4f-4e3a-9c5d-4f7b8c9d0e1f']) {
    const { deps, llamadas } = dependencias();
    const datos = { ...invitacion, rol: 'administrador_institucional', institucionId };
    assertEquals((await crearManejador(deps)(pedir(datos))).status, 422);
    assertEquals(llamadas.invitados.length, 0);
  }
});

Deno.test('el rol y la institución van juntos', async () => {
  const { deps, llamadas } = dependencias();
  // Institucional sin institución, o general con institución: no se invita.
  assertEquals(
    (await crearManejador(deps)(pedir({ ...invitacion, rol: 'administrador_institucional' })))
      .status,
    400,
  );
  assertEquals(
    (await crearManejador(deps)(pedir({ ...invitacion, institucionId: COLEGIO }))).status,
    400,
  );
  assertEquals(llamadas.invitados.length, 0);
});

Deno.test('sin token o con token inválido responde 401', async () => {
  assertEquals((await crearManejador(dependencias().deps)(pedir(invitacion, null))).status, 401);
  assertEquals((await crearManejador(dependencias(null).deps)(pedir())).status, 401);
});

Deno.test('solo invita el superadministrador activo y con doble factor', async () => {
  const casos: PerfilSesion[] = [
    { ...SUPER, rol: 'administrador_institucional' },
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
  // Los roles antiguos (profesional, consulta) ya no se invitan (D-86).
  for (const rol of ['profesional', 'consulta']) {
    assertEquals((await crearManejador(deps)(pedir({ ...invitacion, rol }))).status, 400);
  }
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
