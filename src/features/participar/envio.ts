import { z } from 'zod';
import type { EnvioCuestionario, ResultadoParticipante } from './modelo';

/**
 * Envío del cuestionario a la Edge Function «enviar-cuestionario» (Fase 6).
 * Se usa fetch y no el cliente de Supabase: así el sitio público no carga ese código (D-45).
 * Con la misma clave de envío, reintentar es seguro: el servidor no guarda dos veces (D-50).
 */

export type CodigoErrorEnvio = 'sin_conexion' | 'datos_invalidos' | 'servidor';

export class ErrorEnvio extends Error {
  readonly codigo: CodigoErrorEnvio;
  constructor(codigo: CodigoErrorEnvio, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorEnvio';
    this.codigo = codigo;
  }
}

export interface ConfiguracionEnvio {
  /** VITE_SUPABASE_URL */
  url: string | undefined;
  /** VITE_SUPABASE_PUBLISHABLE_KEY */
  clave: string | undefined;
  fetch?: typeof fetch;
  /** Milisegundos antes de dar la conexión por perdida. */
  tiempoMaximo?: number;
}

const respuestaValida = z.object({
  codigo: z.string().min(1),
  resultado: z
    .object({
      resultadoGeneral: z.enum(['favorable', 'por_fortalecer', 'desafios', 'insuficiente']),
      respondidas: z.number(),
      resultadoParcial: z.boolean(),
      rutaAtencionEspecial: z.boolean(),
    })
    .loose(),
});

export function crearEnviador({
  url,
  clave,
  fetch: hacerFetch = (...args) => globalThis.fetch(...args),
  tiempoMaximo = 20_000,
}: ConfiguracionEnvio) {
  const configurado = Boolean(url && clave);

  async function enviar(
    envio: EnvioCuestionario,
  ): Promise<{ codigo: string; resultado: ResultadoParticipante }> {
    if (!url || !clave) throw new ErrorEnvio('servidor', 'El envío no está configurado.');
    const abortar = new AbortController();
    const temporizador = setTimeout(() => abortar.abort(), tiempoMaximo);
    let respuesta: Response;
    try {
      respuesta = await hacerFetch(`${url.replace(/\/$/, '')}/functions/v1/enviar-cuestionario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: clave,
          Authorization: `Bearer ${clave}`,
        },
        body: JSON.stringify(envio),
        signal: abortar.signal,
      });
    } catch {
      throw new ErrorEnvio('sin_conexion', 'No hubo respuesta del servidor.');
    } finally {
      clearTimeout(temporizador);
    }

    if (respuesta.status === 400 || respuesta.status === 422) {
      throw new ErrorEnvio(
        'datos_invalidos',
        `El servidor rechazó el envío (${respuesta.status}).`,
      );
    }
    if (!respuesta.ok) {
      throw new ErrorEnvio('servidor', `El servidor respondió ${respuesta.status}.`);
    }
    const cuerpo = respuestaValida.safeParse(await respuesta.json().catch(() => null));
    if (!cuerpo.success)
      throw new ErrorEnvio('servidor', 'La respuesta del servidor no es válida.');
    return cuerpo.data as { codigo: string; resultado: ResultadoParticipante };
  }

  return { configurado, enviar };
}

export const enviador = crearEnviador({
  url: import.meta.env.VITE_SUPABASE_URL,
  clave: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});
