import { assert, assertEquals, assertFalse } from '@std/assert';
import { areas } from '../_compartido/generado/areas.ts';
import { calcularParaModulo } from '../_compartido/generado/motor-resultados.ts';
import { reglasProvisionales } from '../_compartido/generado/reglas.ts';
import type { ValorRespuesta } from '../_compartido/generado/dominio.ts';
import { crearManejador, type DatosRegistro, type Dependencias } from './manejador.ts';

const ORIGEN = 'https://mentealdia.ejemplo.gov.co';

function dependencias(cambios: Partial<Dependencias> = {}) {
  const registros: DatosRegistro[] = [];
  const errores: unknown[] = [];
  const deps: Dependencias = {
    origenes: [ORIGEN],
    reglasVigentes: () => Promise.resolve(structuredClone(reglasProvisionales)),
    versionTextosLegales: () => Promise.resolve('0.1-borrador'),
    registrar: (datos) => {
      registros.push(datos);
      return Promise.resolve({ codigo: 'MD-0001' });
    },
    registrarError: (_contexto, error) => errores.push(error),
    ...cambios,
  };
  return { deps, registros, errores };
}

const respuestas = (valor: (i: number) => ValorRespuesta) =>
  areas.map((a, i) => ({ areaId: a.id, valor: valor(i) }));

const envioAdulto = (cambios: Record<string, unknown> = {}) => ({
  modulo: 'adulto',
  participante: {
    nombre: 'Persona de Prueba',
    correo: 'Persona@Correo.co',
    telefono: '300 000 0000',
    lugarResidencia: 'Centro',
  },
  autorizaciones: { tratamientoDatos: true, datosSensibles: true },
  respuestas: respuestas((i) => (i < 5 ? 'no' : 'si')),
  ...cambios,
});

const envioNino = (cambios: Record<string, unknown> = {}) => ({
  modulo: 'nino',
  participante: { nombre: 'Niña', edad: 9, grado: 'Cuarto' },
  acudiente: {
    nombre: 'Adulto Responsable',
    parentesco: 'Madre',
    correo: 'acudiente@correo.co',
    telefono: '3110000000',
    lugarResidencia: 'Zona rural',
  },
  autorizaciones: { tratamientoDatos: true, datosSensibles: true, autorizacionAcudiente: true },
  respuestas: respuestas(() => 'si'),
  ...cambios,
});

const enviar = (cuerpo: unknown, init: RequestInit = {}) =>
  new Request('http://localhost/enviar-cuestionario', {
    method: 'POST',
    headers: { Origin: ORIGEN, 'Content-Type': 'application/json' },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    ...init,
  });

Deno.test('calcula el resultado oficial con el motor y lo guarda', async () => {
  const { deps, registros } = dependencias();
  const respuesta = await crearManejador(deps)(enviar(envioAdulto()));
  assertEquals(respuesta.status, 200);
  const cuerpo = await respuesta.json();
  assertEquals(cuerpo.codigo, 'MD-0001');

  const esperado = calcularParaModulo('adulto', envioAdulto().respuestas as never);
  assertEquals(registros.length, 1);
  assertEquals(registros[0]!.resultado, esperado);
  assertEquals(cuerpo.resultado.resultadoGeneral, esperado.resultadoGeneral);
  assertEquals(cuerpo.resultado.rutaAtencionEspecial, esperado.rutaAtencionEspecial);
});

Deno.test('a quien responde no le devuelve el índice ni los motivos de prioridad', async () => {
  const { deps } = dependencias();
  const cuerpo = await (await crearManejador(deps)(enviar(envioAdulto()))).json();
  for (const campo of ['indice', 'puntos', 'prioridad', 'motivosPrioridad']) {
    assertFalse(campo in cuerpo.resultado, `no debe incluir «${campo}»`);
  }
});

Deno.test(
  'guarda el participante, las autorizaciones con su versión y normaliza el correo',
  async () => {
    const { deps, registros } = dependencias();
    await crearManejador(deps)(enviar(envioNino()));
    const { participante, consentimientos } = registros[0]!;
    assertEquals(participante.modulo, 'nino');
    assertEquals((participante.acudiente as { correo: string }).correo, 'acudiente@correo.co');
    assertEquals(consentimientos, {
      tratamiento_datos: '0.1-borrador',
      datos_sensibles: '0.1-borrador',
      autorizacion_acudiente: '0.1-borrador',
    });

    await crearManejador(deps)(enviar(envioAdulto()));
    assertEquals(registros[1]!.participante.correo, 'persona@correo.co');
  },
);

Deno.test('usa las reglas vigentes de la base de datos, no las del código', async () => {
  const reglas = {
    ...structuredClone(reglasProvisionales),
    version: '0.2-prueba',
    umbralFavorable: 101,
  };
  const { deps, registros } = dependencias({ reglasVigentes: () => Promise.resolve(reglas) });
  const respuesta = await crearManejador(deps)(
    enviar(envioAdulto({ respuestas: respuestas(() => 'si') })),
  );
  const cuerpo = await respuesta.json();
  assertEquals(cuerpo.resultado.reglasVersion, '0.2-prueba');
  assertEquals(cuerpo.resultado.resultadoGeneral, 'por_fortalecer');
  assertEquals(registros[0]!.resultado.reglasVersion, '0.2-prueba');
});

Deno.test('rechaza un resultado enviado por el navegador', async () => {
  const { deps, registros } = dependencias();
  const respuesta = await crearManejador(deps)(
    enviar(envioAdulto({ resultado: { resultadoGeneral: 'favorable' } })),
  );
  assertEquals(respuesta.status, 400);
  assertEquals(registros.length, 0);
});

Deno.test('exige las autorizaciones', async () => {
  const { deps, registros } = dependencias();
  const sinAcudiente = envioNino({
    autorizaciones: { tratamientoDatos: true, datosSensibles: true },
  });
  assertEquals((await crearManejador(deps)(enviar(sinAcudiente))).status, 400);
  const sinSensibles = envioAdulto({
    autorizaciones: { tratamientoDatos: true, datosSensibles: false },
  });
  assertEquals((await crearManejador(deps)(enviar(sinSensibles))).status, 400);
  assertEquals(registros.length, 0);
});

Deno.test('valida los datos del registro sin repetir lo recibido', async () => {
  const { deps } = dependencias();
  const envio = envioAdulto();
  envio.participante.correo = 'no-es-correo';
  const respuesta = await crearManejador(deps)(enviar(envio));
  assertEquals(respuesta.status, 400);
  const cuerpo = await respuesta.json();
  assertEquals(cuerpo.error.codigo, 'entrada_invalida');
  assert(cuerpo.error.detalles.some((d: { campo: string }) => d.campo === 'participante.correo'));
  assertFalse(JSON.stringify(cuerpo).includes('no-es-correo'));
});

Deno.test('las respuestas incompletas o no permitidas se rechazan con 422', async () => {
  const { deps, registros } = dependencias();
  const incompleto = envioAdulto({ respuestas: respuestas(() => 'si').slice(0, 19) });
  const r1 = await crearManejador(deps)(enviar(incompleto));
  assertEquals(r1.status, 422);
  assertEquals((await r1.json()).error.codigo, 'respuestas_invalidas');

  const ninoNoResponde = envioNino({ respuestas: respuestas(() => 'prefiero_no_responder') });
  assertEquals((await crearManejador(deps)(enviar(ninoNoResponde))).status, 422);
  assertEquals(registros.length, 0);
});

Deno.test('si las reglas guardadas no son válidas no calcula ni guarda', async () => {
  const { deps, registros, errores } = dependencias({
    reglasVigentes: () => Promise.resolve({ version: 'rota' }),
  });
  const respuesta = await crearManejador(deps)(enviar(envioAdulto()));
  assertEquals(respuesta.status, 500);
  assertEquals(registros.length, 0);
  assertEquals(errores.length, 1);
});

Deno.test('un error al guardar responde 500 sin detalles internos', async () => {
  const { deps } = dependencias({
    registrar: () => Promise.reject(new Error('violates foreign key constraint')),
  });
  const respuesta = await crearManejador(deps)(enviar(envioAdulto()));
  assertEquals(respuesta.status, 500);
  assertFalse((await respuesta.text()).includes('foreign key'));
});

Deno.test('CORS: solo los orígenes permitidos', async () => {
  const { deps, registros } = dependencias();
  const manejar = crearManejador(deps);

  const permitido = await manejar(enviar(envioAdulto()));
  assertEquals(permitido.headers.get('Access-Control-Allow-Origin'), ORIGEN);

  const ajeno = await manejar(enviar(envioAdulto(), { headers: { Origin: 'https://otro.sitio' } }));
  assertEquals(ajeno.status, 403);
  assertEquals(ajeno.headers.get('Access-Control-Allow-Origin'), null);
  assertEquals(registros.length, 1);

  const preflight = await manejar(
    new Request('http://localhost/', { method: 'OPTIONS', headers: { Origin: ORIGEN } }),
  );
  assertEquals(preflight.status, 204);
});

Deno.test('solo acepta POST con JSON', async () => {
  const { deps } = dependencias();
  const manejar = crearManejador(deps);
  assertEquals(
    (await manejar(new Request('http://localhost/', { headers: { Origin: ORIGEN } }))).status,
    405,
  );
  assertEquals((await manejar(enviar('{no es json'))).status, 400);
});
