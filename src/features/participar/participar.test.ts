import { describe, expect, it } from 'vitest';
import { cuestionarios } from '@/content/v1/cuestionarios';
import { calcularParaModulo } from '@/lib/motor-resultados';
import { crearEnviador, ErrorEnvio } from './envio';
import {
  estadoInicial,
  leerEstado,
  nuevaClaveEnvio,
  reducir,
  type Accion,
  type EstadoParticipacion,
} from './estado';
import {
  construirEnvio,
  EnvioIncompleto,
  paraParticipante,
  validarRegistro,
  type ResultadoParticipante,
} from './modelo';

const CLAVE = '6f1c2a4e-8b3d-4c5f-9a7e-1d2b3c4d5e6f';

const adulto = {
  nombre: '  Persona de Prueba ',
  correo: 'Persona@Correo.CO',
  telefono: '300 000 0000',
  lugarResidencia: 'Centro',
};
const nino = { nombre: 'Niña', edad: '9', grado: 'Cuarto', sexo: '' };
const acudiente = {
  nombre: 'Adulto Responsable',
  parentesco: 'Madre',
  correo: 'acudiente@correo.co',
  telefono: '3110000000',
  lugarResidencia: 'Zona rural',
};

const con = (estado: EstadoParticipacion, ...acciones: Accion[]) =>
  acciones.reduce(reducir, estado);

function registrado(modulo: 'adulto' | 'nino'): EstadoParticipacion {
  const escribir = (grupo: 'participante' | 'acudiente', datos: Record<string, string>) =>
    Object.entries(datos).map(([campo, valor]): Accion => ({
      tipo: 'escribir',
      grupo,
      campo,
      valor,
    }));
  return con(
    estadoInicial(CLAVE),
    { tipo: 'elegirModulo', modulo },
    ...(modulo === 'adulto'
      ? escribir('participante', adulto)
      : [...escribir('participante', nino), ...escribir('acudiente', acudiente)]),
    { tipo: 'autorizar', campo: 'tratamientoDatos', valor: true },
    { tipo: 'autorizar', campo: 'datosSensibles', valor: true },
    { tipo: 'autorizar', campo: 'autorizacionAcudiente', valor: modulo === 'nino' },
    { tipo: 'completarRegistro' },
  );
}

function respondido(modulo: 'adulto' | 'nino'): EstadoParticipacion {
  let estado = con(registrado(modulo), { tipo: 'irAPregunta', indice: 0 });
  for (const pregunta of cuestionarios[modulo].preguntas) {
    estado = con(
      estado,
      { tipo: 'responder', areaId: pregunta.areaId, valor: 'si' },
      { tipo: 'siguiente' },
    );
  }
  return estado;
}

describe('validarRegistro', () => {
  it('acepta un adulto, recorta los espacios y normaliza el correo', () => {
    const r = validarRegistro('adulto', { participante: adulto, acudiente: {} });
    expect(r).toMatchObject({
      ok: true,
      participante: { nombre: 'Persona de Prueba', correo: 'persona@correo.co' },
    });
  });

  it('marca cada campo con su error, con la clave «grupo.campo»', () => {
    const r = validarRegistro('adulto', {
      participante: { nombre: 'A', correo: 'no-es-correo', telefono: '12' },
      acudiente: {},
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errores).sort()).toEqual([
      'participante.correo',
      'participante.lugarResidencia',
      'participante.nombre',
      'participante.telefono',
    ]);
  });

  it('en el módulo infantil valida a la niña o el niño y al adulto responsable', () => {
    const r = validarRegistro('nino', { participante: { ...nino, edad: '14' }, acudiente: {} });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errores['participante.edad']).toBeDefined();
    expect(r.errores['acudiente.parentesco']).toBeDefined();
  });

  it('el sexo es opcional: vacío no se envía', () => {
    const r = validarRegistro('nino', { participante: nino, acudiente });
    expect(r).toMatchObject({ ok: true, participante: { edad: 9, sexo: undefined } });
  });
});

describe('reducir', () => {
  it('solo completa el registro con datos válidos y todas las autorizaciones', () => {
    expect(registrado('adulto').registroCompleto).toBe(true);
    expect(registrado('nino').registroCompleto).toBe(true);
    const sinSensibles = con(registrado('adulto'), {
      tipo: 'autorizar',
      campo: 'datosSensibles',
      valor: false,
    });
    expect(sinSensibles.registroCompleto).toBe(false);
    expect(con(sinSensibles, { tipo: 'completarRegistro' }).registroCompleto).toBe(false);
  });

  it('cambiar un dato pide pasar otra vez por la autorización', () => {
    const estado = con(registrado('adulto'), {
      tipo: 'escribir',
      grupo: 'participante',
      campo: 'telefono',
      valor: '3001112233',
    });
    expect(estado.registroCompleto).toBe(false);
  });

  it('cambiar de módulo borra los datos y las respuestas', () => {
    const estado = con(
      registrado('adulto'),
      { tipo: 'irAPregunta', indice: 0 },
      { tipo: 'responder', areaId: 'bienestar_emocional', valor: 'si' },
      { tipo: 'elegirModulo', modulo: 'nino' },
    );
    expect(estado.valores.participante).toEqual({});
    expect(estado.respuestas).toEqual({});
    expect(estado.registroCompleto).toBe(false);
  });

  it('no avanza sin responder y, al final, pasa a la revisión', () => {
    const sinResponder = con(
      registrado('adulto'),
      { tipo: 'irAPregunta', indice: 0 },
      { tipo: 'siguiente' },
    );
    expect(sinResponder.indice).toBe(0);
    const estado = respondido('adulto');
    expect(estado.fase).toBe('revision');
    expect(Object.keys(estado.respuestas)).toHaveLength(20);
  });

  it('una pregunta abierta desde la revisión vuelve a la revisión', () => {
    const estado = con(
      respondido('adulto'),
      { tipo: 'irAPregunta', indice: 3, desdeRevision: true },
      { tipo: 'responder', areaId: 'motivacion_interes', valor: 'no' },
      { tipo: 'siguiente' },
    );
    expect(estado.fase).toBe('revision');
    expect(estado.respuestas.motivacion_interes).toBe('no');
  });

  it('en el módulo infantil no acepta «Prefiero no responder»', () => {
    const estado = con(
      registrado('nino'),
      { tipo: 'irAPregunta', indice: 0 },
      { tipo: 'responder', areaId: 'bienestar_emocional', valor: 'prefiero_no_responder' },
    );
    expect(estado.respuestas).toEqual({});
  });

  it('al enviar borra datos y respuestas, guarda el código y cambia la clave', () => {
    const resultado = { resultadoGeneral: 'favorable' } as ResultadoParticipante;
    const estado = con(respondido('adulto'), {
      tipo: 'enviado',
      codigo: 'MD-0001',
      resultado,
      fecha: '2026-10-27T15:00:00.000Z',
      claveSiguiente: 'otra-clave',
    });
    expect(estado.enviado).toEqual({
      modulo: 'adulto',
      codigo: 'MD-0001',
      resultado,
      fecha: '2026-10-27T15:00:00.000Z',
    });
    expect(estado.valores).toEqual({ participante: {}, acudiente: {} });
    expect(estado.respuestas).toEqual({});
    expect(estado.claveEnvio).toBe('otra-clave');
  });
});

describe('leerEstado', () => {
  const almacen = (valor: string | null) => ({ getItem: () => valor });

  it('recupera lo guardado y descarta lo que no reconoce', () => {
    const guardado = respondido('nino');
    expect(leerEstado(almacen(JSON.stringify(guardado)), () => 'nueva')).toEqual(guardado);
    expect(leerEstado(almacen('{roto'), () => 'nueva').claveEnvio).toBe('nueva');
    expect(leerEstado(almacen('{"version":2}'), () => 'nueva').claveEnvio).toBe('nueva');
    expect(leerEstado(null, () => 'nueva').claveEnvio).toBe('nueva');
  });

  it('genera claves de envío con formato uuid', () => {
    expect(nuevaClaveEnvio()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('construirEnvio', () => {
  it('arma el envío del adulto en el orden de las preguntas', () => {
    const envio = construirEnvio({ ...respondido('adulto'), modulo: 'adulto' });
    expect(envio).toMatchObject({
      claveEnvio: CLAVE,
      modulo: 'adulto',
      autorizaciones: { tratamientoDatos: true, datosSensibles: true },
    });
    expect(envio.respuestas.map((r) => r.areaId)).toEqual(
      cuestionarios.adulto.preguntas.map((p) => p.areaId),
    );
  });

  it('el envío infantil lleva al adulto responsable y no lleva el sexo vacío', () => {
    const envio = construirEnvio({ ...respondido('nino'), modulo: 'nino' });
    expect(envio.modulo === 'nino' && envio.acudiente.parentesco).toBe('Madre');
    expect((JSON.parse(JSON.stringify(envio)) as typeof envio).participante).toEqual({
      nombre: 'Niña',
      edad: 9,
      grado: 'Cuarto',
    });
  });

  it('no arma un envío incompleto', () => {
    const estado = con(registrado('adulto'), { tipo: 'irAPregunta', indice: 0 });
    expect(() => construirEnvio({ ...estado, modulo: 'adulto' })).toThrow(EnvioIncompleto);
  });
});

describe('crearEnviador', () => {
  const envio = construirEnvio({ ...respondido('adulto'), modulo: 'adulto' });
  const resultado = {
    resultadoGeneral: 'favorable',
    respondidas: 20,
    resultadoParcial: false,
    rutaAtencionEspecial: false,
  };
  const responder = (estado: number, cuerpo: unknown) => () =>
    Promise.resolve(new Response(JSON.stringify(cuerpo), { status: estado }));

  it('llama a la función con la clave publicable y devuelve el código', async () => {
    const llamadas: { url: string; init: RequestInit }[] = [];
    const { configurado, enviar } = crearEnviador({
      url: 'https://proyecto.supabase.co/',
      clave: 'sb_publishable_x',
      fetch: (url, init) => {
        llamadas.push({ url: String(url), init: init ?? {} });
        return responder(200, { codigo: 'MD-0007', resultado })();
      },
    });
    expect(configurado).toBe(true);
    await expect(enviar(envio)).resolves.toMatchObject({ codigo: 'MD-0007' });
    expect(llamadas[0]?.url).toBe('https://proyecto.supabase.co/functions/v1/enviar-cuestionario');
    expect(new Headers(llamadas[0]?.init.headers).get('apikey')).toBe('sb_publishable_x');
    expect((JSON.parse(String(llamadas[0]?.init.body)) as typeof envio).claveEnvio).toBe(CLAVE);
  });

  it('distingue la falta de conexión, los datos rechazados y los errores del servidor', async () => {
    const config = { url: 'https://p.supabase.co', clave: 'k' };
    const codigo = (promesa: Promise<unknown>) =>
      promesa.catch((error: unknown) => (error instanceof ErrorEnvio ? error.codigo : 'otro'));
    const sinRed = crearEnviador({ ...config, fetch: () => Promise.reject(new TypeError('red')) });
    expect(await codigo(sinRed.enviar(envio))).toBe('sin_conexion');
    const rechazado = crearEnviador({ ...config, fetch: responder(422, {}) });
    expect(await codigo(rechazado.enviar(envio))).toBe('datos_invalidos');
    const caido = crearEnviador({ ...config, fetch: responder(500, {}) });
    expect(await codigo(caido.enviar(envio))).toBe('servidor');
    const raro = crearEnviador({ ...config, fetch: responder(200, { hola: 1 }) });
    expect(await codigo(raro.enviar(envio))).toBe('servidor');
  });

  it('sin configuración no intenta enviar', () => {
    expect(crearEnviador({ url: undefined, clave: undefined }).configurado).toBe(false);
  });
});

describe('resultado de ejemplo (vista previa sin base de datos)', () => {
  it('no muestra el índice, los puntos ni los motivos de prioridad', () => {
    const envio = construirEnvio({ ...respondido('adulto'), modulo: 'adulto' });
    const resultado = paraParticipante(calcularParaModulo('adulto', envio.respuestas));
    for (const campo of ['indice', 'puntos', 'prioridad', 'motivosPrioridad']) {
      expect(resultado).not.toHaveProperty(campo);
    }
    expect(Object.keys(resultado.niveles)).toHaveLength(20);
  });

  it('queda marcado como ejemplo y sin datos personales en la pestaña', () => {
    const estado = con(respondido('adulto'), {
      tipo: 'enviado',
      codigo: '',
      resultado: { resultadoGeneral: 'favorable' } as ResultadoParticipante,
      fecha: '2026-10-27T15:00:00.000Z',
      claveSiguiente: 'otra',
      ejemplo: true,
    });
    expect(estado.enviado?.ejemplo).toBe(true);
    expect(estado.valores.participante).toEqual({});
  });
});
