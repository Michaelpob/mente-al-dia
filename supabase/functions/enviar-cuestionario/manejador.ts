/**
 * Cálculo oficial del resultado (Fase 4).
 *
 * Recibe el registro, las autorizaciones y las respuestas; calcula el resultado con el mismo motor
 * de src/ y las reglas VIGENTES de la base de datos, y lo guarda todo en una transacción.
 * Lo que diga el navegador sobre el resultado se ignora: solo se reciben respuestas.
 *
 * A quien responde se le devuelve su resultado sin el índice numérico ni los motivos de
 * prioridad, que son solo para profesionales.
 */
import { esquemaEnvio, esquemaReglas, problemas, type Envio } from '../_compartido/esquemas.ts';
import {
  ErrorEntradaMotor,
  calcularResultados,
  instrumentoDe,
  nombresAreas,
} from '../_compartido/generado/motor-resultados.ts';
import type { ResultadoAplicacion } from '../_compartido/generado/dominio.ts';
import { Http, leerPeticion } from '../_compartido/http.ts';

export interface DatosRegistro {
  /** Clave del navegador: si ya se guardó, la base de datos devuelve el mismo código. */
  claveEnvio: string;
  participante: Record<string, unknown>;
  consentimientos: Record<string, string>;
  respuestas: Envio['respuestas'];
  resultado: ResultadoAplicacion;
}

export interface Dependencias {
  origenes: readonly string[];
  /** Fila «reglas» de la versión vigente (se valida antes de usarla). */
  reglasVigentes(): Promise<unknown>;
  /** Versión de los textos legales que se aceptan (configuración «version_textos_legales»). */
  versionTextosLegales(): Promise<string>;
  /** Llama a public.registrar_aplicacion (con la clave de envío: un reintento no duplica). */
  registrar(datos: DatosRegistro): Promise<{ codigo: string }>;
  registrarError(mensaje: string, error: unknown): void;
}

function participanteParaGuardar(envio: Envio): Record<string, unknown> {
  if (envio.modulo === 'adulto') return { modulo: envio.modulo, ...envio.participante };
  return { modulo: envio.modulo, ...envio.participante, acudiente: envio.acudiente };
}

function consentimientos(envio: Envio, version: string): Record<string, string> {
  return {
    tratamiento_datos: version,
    datos_sensibles: version,
    ...(envio.modulo === 'nino' ? { autorizacion_acudiente: version } : {}),
  };
}

export function crearManejador(deps: Dependencias) {
  return async function manejar(peticion: Request): Promise<Response> {
    const http = new Http(peticion, deps.origenes);
    const leida = await leerPeticion(peticion, http);
    if ('respuesta' in leida) return leida.respuesta;

    const envio = esquemaEnvio.safeParse(leida.cuerpo);
    if (!envio.success) {
      return http.error(
        400,
        'entrada_invalida',
        'Revisa los datos enviados.',
        problemas(envio.error),
      );
    }

    try {
      const reglas = esquemaReglas.parse(await deps.reglasVigentes());
      const resultado = calcularResultados({
        instrumento: instrumentoDe(envio.data.modulo),
        respuestas: envio.data.respuestas,
        reglas,
        nombresAreas,
      });
      const version = await deps.versionTextosLegales();
      const { codigo } = await deps.registrar({
        claveEnvio: envio.data.claveEnvio,
        participante: participanteParaGuardar(envio.data),
        consentimientos: consentimientos(envio.data, version),
        respuestas: envio.data.respuestas,
        resultado,
      });

      return http.json({
        codigo,
        resultado: {
          resultadoGeneral: resultado.resultadoGeneral,
          niveles: resultado.niveles,
          mensajes: resultado.mensajes,
          conteo: resultado.conteo,
          respondidas: resultado.respondidas,
          resultadoParcial: resultado.resultadoParcial,
          rutaAtencionEspecial: resultado.rutaAtencionEspecial,
          reglasVersion: resultado.reglasVersion,
          instrumentoVersion: resultado.instrumentoVersion,
        },
      });
    } catch (error) {
      if (error instanceof ErrorEntradaMotor) {
        return http.error(422, 'respuestas_invalidas', error.message);
      }
      deps.registrarError('enviar-cuestionario', error);
      return http.error(
        500,
        'error_interno',
        'No pudimos guardar tus respuestas. Intenta de nuevo.',
      );
    }
  };
}
