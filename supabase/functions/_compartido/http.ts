/**
 * Respuestas JSON y CORS comunes a las Edge Functions.
 * Solo se aceptan peticiones del navegador desde los orígenes de ORIGENES_PERMITIDOS.
 */

export type CodigoError =
  | 'metodo_no_permitido'
  | 'origen_no_permitido'
  | 'entrada_invalida'
  | 'respuestas_invalidas'
  | 'sin_sesion'
  | 'sin_permiso'
  | 'conflicto'
  | 'error_interno';

/** Lee ORIGENES_PERMITIDOS («https://a.gov.co,https://b.gov.co»). */
export function leerOrigenes(valor: string | undefined): string[] {
  return (valor ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export class Http {
  readonly #cors: Record<string, string>;
  readonly origenPermitido: boolean;

  constructor(peticion: Request, origenes: readonly string[]) {
    const origen = peticion.headers.get('Origin');
    // Sin encabezado Origin no es un navegador (pruebas, servidores): CORS no aplica.
    this.origenPermitido = origen === null || origenes.includes(origen);
    this.#cors = {
      Vary: 'Origin',
      ...(origen && this.origenPermitido
        ? {
            'Access-Control-Allow-Origin': origen,
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
            'Access-Control-Max-Age': '86400',
          }
        : {}),
    };
  }

  json(cuerpo: unknown, estado = 200): Response {
    return new Response(JSON.stringify(cuerpo), {
      status: estado,
      headers: {
        ...this.#cors,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  error(estado: number, codigo: CodigoError, mensaje: string, detalles?: unknown): Response {
    return this.json(
      { error: { codigo, mensaje, ...(detalles === undefined ? {} : { detalles }) } },
      estado,
    );
  }

  preflight(): Response {
    return new Response(null, { status: this.origenPermitido ? 204 : 403, headers: this.#cors });
  }
}

/**
 * Validaciones comunes de la petición: preflight, origen, método y cuerpo JSON.
 * Devuelve la respuesta de error, o el cuerpo ya leído.
 */
export async function leerPeticion(
  peticion: Request,
  http: Http,
): Promise<{ respuesta: Response } | { cuerpo: unknown }> {
  if (peticion.method === 'OPTIONS') return { respuesta: http.preflight() };
  if (!http.origenPermitido) {
    return {
      respuesta: http.error(403, 'origen_no_permitido', 'Este sitio no puede usar el servicio.'),
    };
  }
  if (peticion.method !== 'POST') {
    return { respuesta: http.error(405, 'metodo_no_permitido', 'Usa POST.') };
  }
  try {
    return { cuerpo: await peticion.json() };
  } catch {
    return { respuesta: http.error(400, 'entrada_invalida', 'El cuerpo debe ser JSON.') };
  }
}
