import { z } from 'zod';
import { participar } from '@/content/participar';
import { cuestionarios } from '@/content/v1/cuestionarios';
import type { AreaId, ResultadoAplicacion, ValorRespuesta } from '@/types/dominio';

/**
 * Datos del registro y del envío (Fases 5 y 6). Funciones puras, con pruebas.
 * La validación repite la de la Edge Function (supabase/functions/_compartido/esquemas.ts) para
 * avisar antes de enviar; la del servidor es la que manda.
 */

export type ModuloDisponible = 'adulto' | 'nino';

export const esModuloDisponible = (valor: unknown): valor is ModuloDisponible =>
  valor === 'adulto' || valor === 'nino';

/** Pendiente 7: rangos de edad por validar. El servidor acepta un margen más amplio. */
export const EDAD_NINO = { min: 6, max: 11 } as const;

export type GrupoCampos = 'participante' | 'acudiente';

/** Lo que se escribe en el formulario, tal cual, para poder volver a editarlo. */
export interface ValoresRegistro {
  participante: Partial<Record<string, string>>;
  acudiente: Partial<Record<string, string>>;
}

export interface Autorizaciones {
  tratamientoDatos: boolean;
  datosSensibles: boolean;
  autorizacionAcudiente: boolean;
}

export const sinAutorizaciones = (): Autorizaciones => ({
  tratamientoDatos: false,
  datosSensibles: false,
  autorizacionAcudiente: false,
});

const e = participar.errores;

const texto = (min: number, max: number, mensaje: string = e.obligatorio) =>
  z.string().trim().min(min, mensaje).max(max, e.largo(max));

const correo = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, e.obligatorio)
  .max(254, e.largo(254))
  .pipe(z.email(e.correo));

const telefono = z
  .string()
  .trim()
  .min(1, e.obligatorio)
  .regex(/^\+?[0-9()\s-]{7,20}$/, e.telefono);

const esquemaAdulto = z.object({
  nombre: texto(2, 120, e.nombre),
  correo,
  telefono,
  lugarResidencia: texto(1, 120),
});

const esquemaNino = z.object({
  nombre: texto(1, 120),
  edad: z
    .string()
    .min(1, e.edad)
    .transform(Number)
    .pipe(z.number().int(e.edad).min(EDAD_NINO.min, e.edad).max(EDAD_NINO.max, e.edad)),
  grado: texto(1, 40),
  // Opcional (pendiente 8): vacío = sin responder.
  sexo: z
    .string()
    .trim()
    .max(40, e.largo(40))
    .transform((valor) => valor || undefined),
});

const esquemaAcudiente = z.object({
  nombre: texto(2, 120, e.nombre),
  parentesco: texto(2, 60),
  correo,
  telefono,
  lugarResidencia: texto(1, 120),
});

export type ParticipanteAdulto = z.output<typeof esquemaAdulto>;
export type ParticipanteNino = z.output<typeof esquemaNino>;
export type Acudiente = z.output<typeof esquemaAcudiente>;

export const camposDe = {
  adulto: { participante: Object.keys(esquemaAdulto.shape), acudiente: [] as string[] },
  nino: {
    participante: Object.keys(esquemaNino.shape),
    acudiente: Object.keys(esquemaAcudiente.shape),
  },
} satisfies Record<ModuloDisponible, Record<GrupoCampos, string[]>>;

/** Clave de un campo en los errores y en el id del control: «participante.nombre». */
export const claveCampo = (grupo: GrupoCampos, campo: string) => `${grupo}.${campo}`;

export type ErroresRegistro = Partial<Record<string, string>>;

export type RegistroValidado =
  | { ok: true; modulo: 'adulto'; participante: ParticipanteAdulto }
  | { ok: true; modulo: 'nino'; participante: ParticipanteNino; acudiente: Acudiente }
  | { ok: false; errores: ErroresRegistro };

/** Lee los campos de un grupo como texto (un campo que nunca se tocó vale «»). */
function leer(valores: Partial<Record<string, string>>, campos: readonly string[]) {
  return Object.fromEntries(campos.map((campo) => [campo, valores[campo] ?? '']));
}

function erroresDe(grupo: GrupoCampos, error: z.ZodError, errores: ErroresRegistro) {
  for (const problema of error.issues) {
    const clave = claveCampo(grupo, String(problema.path[0]));
    errores[clave] ??= problema.message;
  }
}

export function validarRegistro(
  modulo: ModuloDisponible,
  valores: ValoresRegistro,
): RegistroValidado {
  const errores: ErroresRegistro = {};
  if (modulo === 'adulto') {
    const participante = esquemaAdulto.safeParse(
      leer(valores.participante, camposDe.adulto.participante),
    );
    if (participante.success) return { ok: true, modulo, participante: participante.data };
    erroresDe('participante', participante.error, errores);
    return { ok: false, errores };
  }

  const participante = esquemaNino.safeParse(
    leer(valores.participante, camposDe.nino.participante),
  );
  const acudiente = esquemaAcudiente.safeParse(leer(valores.acudiente, camposDe.nino.acudiente));
  if (participante.success && acudiente.success) {
    return { ok: true, modulo, participante: participante.data, acudiente: acudiente.data };
  }
  if (!participante.success) erroresDe('participante', participante.error, errores);
  if (!acudiente.success) erroresDe('acudiente', acudiente.error, errores);
  return { ok: false, errores };
}

export function autorizacionesRequeridas(modulo: ModuloDisponible): (keyof Autorizaciones)[] {
  return modulo === 'nino'
    ? ['tratamientoDatos', 'datosSensibles', 'autorizacionAcudiente']
    : ['tratamientoDatos', 'datosSensibles'];
}

export const faltanAutorizaciones = (modulo: ModuloDisponible, autorizaciones: Autorizaciones) =>
  autorizacionesRequeridas(modulo).filter((clave) => !autorizaciones[clave]);

export type RespuestasParciales = Partial<Record<AreaId, ValorRespuesta>>;

/** Preguntas del módulo en orden. */
export const preguntasDe = (modulo: ModuloDisponible) => cuestionarios[modulo].preguntas;

export const contarRespondidas = (modulo: ModuloDisponible, respuestas: RespuestasParciales) =>
  preguntasDe(modulo).filter((pregunta) => respuestas[pregunta.areaId]).length;

/** Lo que recibe la Edge Function «enviar-cuestionario» (mismo formato que esquemaEnvio). */
export type EnvioCuestionario =
  | {
      claveEnvio: string;
      modulo: 'adulto';
      participante: ParticipanteAdulto;
      autorizaciones: { tratamientoDatos: true; datosSensibles: true };
      respuestas: { areaId: AreaId; valor: ValorRespuesta }[];
    }
  | {
      claveEnvio: string;
      modulo: 'nino';
      participante: ParticipanteNino;
      acudiente: Acudiente;
      autorizaciones: { tratamientoDatos: true; datosSensibles: true; autorizacionAcudiente: true };
      respuestas: { areaId: AreaId; valor: ValorRespuesta }[];
    };

export class EnvioIncompleto extends Error {
  constructor(motivo: string) {
    super(motivo);
    this.name = 'EnvioIncompleto';
  }
}

interface DatosEnvio {
  claveEnvio: string;
  modulo: ModuloDisponible;
  valores: ValoresRegistro;
  autorizaciones: Autorizaciones;
  respuestas: RespuestasParciales;
}

/** Arma el envío. Si falta un dato, una autorización o una respuesta, lanza EnvioIncompleto. */
export function construirEnvio(datos: DatosEnvio): EnvioCuestionario {
  const registro = validarRegistro(datos.modulo, datos.valores);
  if (!registro.ok) throw new EnvioIncompleto('El registro tiene datos por corregir.');
  if (faltanAutorizaciones(datos.modulo, datos.autorizaciones).length) {
    throw new EnvioIncompleto('Faltan autorizaciones.');
  }
  const respuestas = preguntasDe(datos.modulo).map(({ areaId }) => {
    const valor = datos.respuestas[areaId];
    if (!valor) throw new EnvioIncompleto(`Falta la respuesta de «${areaId}».`);
    return { areaId, valor };
  });

  if (registro.modulo === 'adulto') {
    return {
      claveEnvio: datos.claveEnvio,
      modulo: 'adulto',
      participante: registro.participante,
      autorizaciones: { tratamientoDatos: true, datosSensibles: true },
      respuestas,
    };
  }
  return {
    claveEnvio: datos.claveEnvio,
    modulo: 'nino',
    participante: registro.participante,
    acudiente: registro.acudiente,
    autorizaciones: { tratamientoDatos: true, datosSensibles: true, autorizacionAcudiente: true },
    respuestas,
  };
}

/** Lo que se muestra a quien responde: sin índice, puntos ni motivos de prioridad (D-41). */
export function paraParticipante(resultado: ResultadoAplicacion): ResultadoParticipante {
  return {
    resultadoGeneral: resultado.resultadoGeneral,
    niveles: resultado.niveles,
    mensajes: resultado.mensajes,
    conteo: resultado.conteo,
    respondidas: resultado.respondidas,
    resultadoParcial: resultado.resultadoParcial,
    rutaAtencionEspecial: resultado.rutaAtencionEspecial,
    reglasVersion: resultado.reglasVersion,
    instrumentoVersion: resultado.instrumentoVersion,
  };
}

/** Lo que la Edge Function devuelve a quien responde: sin índice ni motivos de prioridad (D-41). */
export type ResultadoParticipante = Pick<
  ResultadoAplicacion,
  | 'resultadoGeneral'
  | 'niveles'
  | 'mensajes'
  | 'conteo'
  | 'respondidas'
  | 'resultadoParcial'
  | 'rutaAtencionEspecial'
  | 'reglasVersion'
  | 'instrumentoVersion'
>;
