/**
 * Validación de lo que llega a las funciones y de las reglas guardadas en la base de datos.
 * Nada se calcula ni se guarda sin pasar por aquí.
 */
import { z } from 'zod';
import { areas } from './generado/areas.ts';
import type { AreaId, ReglasResultados, ValorRespuesta } from './generado/dominio.ts';

const idsAreas = areas.map((a) => a.id) as [AreaId, ...AreaId[]];
const valores: [ValorRespuesta, ...ValorRespuesta[]] = [
  'si',
  'a_veces',
  'no',
  'prefiero_no_responder',
];

const texto = (min: number, max: number) => z.string().trim().min(min).max(max);
const correo = z.string().trim().toLowerCase().max(254).pipe(z.email());
const telefono = z
  .string()
  .trim()
  .regex(/^\+?[0-9()\s-]{7,20}$/, 'Teléfono no válido');

/** La genera el navegador al empezar; con ella un reintento no duplica el envío (D-50). */
const claveEnvio = z.uuid();

const respuestas = z
  .array(z.object({ areaId: z.enum(idsAreas), valor: z.enum(valores) }).strict())
  .min(1)
  .max(idsAreas.length);

/** Envío del cuestionario de adultos (campos del documento base). */
const envioAdulto = z
  .object({
    claveEnvio,
    modulo: z.literal('adulto'),
    participante: z
      .object({
        nombre: texto(2, 120),
        correo,
        telefono,
        lugarResidencia: texto(1, 120),
      })
      .strict(),
    autorizaciones: z
      .object({ tratamientoDatos: z.literal(true), datosSensibles: z.literal(true) })
      .strict(),
    respuestas,
  })
  .strict();

/** Envío del módulo infantil: datos de la niña o el niño y del adulto responsable. */
const envioNino = z
  .object({
    claveEnvio,
    modulo: z.literal('nino'),
    participante: z
      .object({
        nombre: texto(1, 120),
        // Rangos de edad pendientes de validar (pendiente 7): se acepta un margen amplio.
        edad: z.int().min(5).max(17),
        grado: texto(1, 40),
        sexo: texto(1, 40).optional(),
      })
      .strict(),
    acudiente: z
      .object({
        nombre: texto(2, 120),
        parentesco: texto(2, 60),
        correo,
        telefono,
        lugarResidencia: texto(1, 120),
      })
      .strict(),
    autorizaciones: z
      .object({
        tratamientoDatos: z.literal(true),
        datosSensibles: z.literal(true),
        autorizacionAcudiente: z.literal(true),
      })
      .strict(),
    respuestas,
  })
  .strict();

export const esquemaEnvio = z.discriminatedUnion('modulo', [envioAdulto, envioNino]);
export type Envio = z.infer<typeof esquemaEnvio>;

/** Reglas de resultados tal como se guardan en public.reglas_resultados. */
export const esquemaReglas: z.ZodType<ReglasResultados> = z.object({
  version: z.string().min(1),
  puntos: z.object({ si: z.number(), a_veces: z.number(), no: z.number() }),
  umbralFavorable: z.number(),
  umbralDesafios: z.number(),
  minRespondidas: z.int().min(1),
  minRespondidasCompleto: z.int().min(1),
  ajusteAtencionNoFavorable: z.int().min(1),
  ajusteAtencionDesafios: z.int().min(1),
  areasSensibles: z.array(z.enum(idsAreas)),
  prioridadPorDesafios: z.boolean(),
});

export const esquemaInvitacion = z
  .object({
    correo,
    nombre: texto(2, 120),
    // El panel es solo del administrador (D-65): únicamente se invitan cuentas de superadministrador.
    rol: z.literal('superadministrador').default('superadministrador'),
  })
  .strict();
export type Invitacion = z.infer<typeof esquemaInvitacion>;

/** Lista legible de problemas de validación, sin repetir los valores recibidos. */
export function problemas(error: z.ZodError): { campo: string; mensaje: string }[] {
  return error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message }));
}
