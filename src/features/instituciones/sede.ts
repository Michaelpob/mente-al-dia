/**
 * Institución del enlace (D-86): «?sede=colegio1» dice por cuál institución entra la persona.
 * Identifica, no autentica: al guardar el cuestionario, la base de datos vuelve a resolver la sede y
 * exige que la institución exista y esté activa. Aquí solo se confirma para mostrar su nombre, y se
 * guarda en la pestaña para que no se pierda al navegar por el sitio.
 * Se usa fetch y no el cliente de Supabase: así el sitio público no carga ese código (D-45).
 */

export interface Sede {
  slug: string;
  nombre: string;
}

export const CLAVE_SEDE = 'mente-al-dia:sede';
const PATRON_SLUG = /^[a-z0-9-]{3,40}$/;

/** ¿El enlace trae ?sede=…, aunque esté mal escrito? */
export const enlaceConSede = (busqueda: string) => new URLSearchParams(busqueda).has('sede');

/** El slug del enlace, en minúsculas y sin espacios; null si no hay o no tiene un formato válido. */
export function slugDelEnlace(busqueda: string): string | null {
  const valor = new URLSearchParams(busqueda).get('sede')?.trim().toLowerCase() ?? '';
  return PATRON_SLUG.test(valor) ? valor : null;
}

export function esSede(valor: unknown): valor is Sede {
  if (typeof valor !== 'object' || valor === null) return false;
  const { slug, nombre } = valor as Partial<Sede>;
  return (
    typeof slug === 'string' &&
    PATRON_SLUG.test(slug) &&
    typeof nombre === 'string' &&
    nombre.trim() !== ''
  );
}

export function leerSedeGuardada(almacen: Pick<Storage, 'getItem'> | null): Sede | null {
  try {
    const valor = JSON.parse(almacen?.getItem(CLAVE_SEDE) ?? 'null') as unknown;
    return esSede(valor) ? { slug: valor.slug, nombre: valor.nombre } : null;
  } catch {
    return null;
  }
}

export function guardarSede(
  almacen: Pick<Storage, 'setItem' | 'removeItem'> | null,
  sede: Sede | null,
): void {
  try {
    if (sede) almacen?.setItem(CLAVE_SEDE, JSON.stringify(sede));
    else almacen?.removeItem(CLAVE_SEDE);
  } catch {
    // Sin almacenamiento, la sede dura solo mientras la página siga abierta.
  }
}

export interface ConfiguracionSede {
  /** VITE_SUPABASE_URL */
  url: string | undefined;
  /** VITE_SUPABASE_PUBLISHABLE_KEY */
  clave: string | undefined;
  fetch?: typeof fetch;
}

/** Pregunta a la base si el slug es de una institución activa. Devuelve su nombre, o null. */
export async function consultarSede(
  slug: string,
  { url, clave, fetch: hacerFetch = (...args) => globalThis.fetch(...args) }: ConfiguracionSede,
): Promise<Sede | null> {
  if (!url || !clave) throw new Error('La plataforma no está conectada a la base de datos.');
  const respuesta = await hacerFetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/institucion_publica`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: clave },
    body: JSON.stringify({ p_slug: slug }),
  });
  if (!respuesta.ok) throw new Error(`La base de datos respondió ${respuesta.status}.`);
  const filas = (await respuesta.json()) as unknown;
  const fila: unknown = Array.isArray(filas) ? filas[0] : null;
  return esSede(fila) ? { slug: fila.slug, nombre: fila.nombre } : null;
}

/** Las instituciones activas, para elegir con cuál responder (D-88). Solo nombre y enlace. */
export async function listarSedes({
  url,
  clave,
  fetch: hacerFetch = (...args) => globalThis.fetch(...args),
}: ConfiguracionSede): Promise<Sede[]> {
  if (!url || !clave) throw new Error('La plataforma no está conectada a la base de datos.');
  const respuesta = await hacerFetch(
    `${url.replace(/\/$/, '')}/rest/v1/rpc/instituciones_publicas`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: clave },
      body: '{}',
    },
  );
  if (!respuesta.ok) throw new Error(`La base de datos respondió ${respuesta.status}.`);
  const filas = (await respuesta.json()) as unknown;
  return Array.isArray(filas)
    ? filas.filter(esSede).map((fila) => ({ slug: fila.slug, nombre: fila.nombre }))
    : [];
}

export type EstadoSede =
  | { tipo: 'sin_sede' }
  | { tipo: 'cargando'; slug: string }
  | { tipo: 'valida'; sede: Sede }
  | { tipo: 'invalida' }
  | { tipo: 'error'; slug: string };

/**
 * Estado al abrir el sitio: un enlace con ?sede manda sobre lo que hubiera en la pestaña; sin
 * ?sede, sigue la institución con la que se entró antes en esta pestaña.
 */
export function estadoInicialSede(busqueda: string, guardada: Sede | null): EstadoSede {
  if (enlaceConSede(busqueda)) {
    const slug = slugDelEnlace(busqueda);
    if (!slug) return { tipo: 'invalida' };
    return guardada?.slug === slug
      ? { tipo: 'valida', sede: guardada }
      : { tipo: 'cargando', slug };
  }
  return guardada ? { tipo: 'valida', sede: guardada } : { tipo: 'sin_sede' };
}
