import { participar } from '@/content/participar';
import { areas, dimensiones } from '@/content/v1/areas';
import type { Area, AreaId, Dimension, Nivel } from '@/types/dominio';
import type { Censo } from '../datos/tipos';

/**
 * Cuentas del censo (D-83) y de la vista de fortalezas y falencias de una persona. Funciones puras,
 * con pruebas. «Fortaleza» es un área en «adecuado» y «falencia» un área en «requiere atención».
 */

/** Los niveles en el orden de las barras: de fortaleza a falencia, y al final lo que no se sabe. */
export const NIVELES_CENSO: readonly Nivel[] = [
  'adecuado',
  'por_fortalecer',
  'requiere_atencion',
  'sin_dato',
];

const areasEnOrden = [...areas].sort((a, b) => a.numero - b.numero);

export type ConteoNivel = Record<Nivel, number>;

const conteoVacio = (): ConteoNivel => ({
  adecuado: 0,
  por_fortalecer: 0,
  requiere_atencion: 0,
  sin_dato: 0,
});

export interface ResumenArea {
  area: Area;
  conteo: ConteoNivel;
  /** Personas con un nivel en esta área (todas, si el cuestionario estaba completo). */
  total: number;
}

/** Las 20 áreas, en el orden del cuestionario, con cuántas personas quedaron en cada nivel. */
export function resumenAreas(datos: Censo['areas']): ResumenArea[] {
  const porClave = new Map(datos.map((d) => [`${d.area}|${d.nivel}`, d.n]));
  return areasEnOrden.map((area) => {
    const conteo = conteoVacio();
    for (const nivel of NIVELES_CENSO) conteo[nivel] = porClave.get(`${area.id}|${nivel}`) ?? 0;
    return { area, conteo, total: NIVELES_CENSO.reduce((suma, n) => suma + conteo[n], 0) };
  });
}

/** Parte de las personas del área en un nivel (0 si nadie respondió el área). */
export const fraccion = (r: ResumenArea, nivel: Nivel) => (r.total ? r.conteo[nivel] / r.total : 0);

export type OrdenAreas = 'falencias' | 'fortalezas' | 'cuestionario';

/** Ordena las áreas por la parte de falencias o de fortalezas; los empates, por número de área. */
export function ordenarAreas(lista: readonly ResumenArea[], orden: OrdenAreas): ResumenArea[] {
  if (orden === 'cuestionario') return [...lista].sort((a, b) => a.area.numero - b.area.numero);
  const nivel: Nivel = orden === 'falencias' ? 'requiere_atencion' : 'adecuado';
  return [...lista].sort(
    (a, b) =>
      fraccion(b, nivel) - fraccion(a, nivel) ||
      b.conteo[nivel] - a.conteo[nivel] ||
      a.area.numero - b.area.numero,
  );
}

/** Las áreas donde más personas están en un nivel, sin las que no tienen a nadie en él. */
export function masComunes(
  lista: readonly ResumenArea[],
  nivel: 'adecuado' | 'requiere_atencion',
  cuantas = 5,
): ResumenArea[] {
  return ordenarAreas(
    lista.filter((r) => r.conteo[nivel] > 0),
    nivel === 'adecuado' ? 'fortalezas' : 'falencias',
  ).slice(0, cuantas);
}

/** Los grados en el orden escolar (los de la lista del registro); los demás, al final. */
const ORDEN_GRADOS = [...participar.datos.grados, ...participar.datos.gradosAdolescente].map((g) =>
  g.toLowerCase(),
);

export function ordenarGrados(lista: Censo['porGrado']): Censo['porGrado'] {
  const posicion = (grado: string) => {
    const i = ORDEN_GRADOS.indexOf(grado.toLowerCase());
    return i === -1 ? ORDEN_GRADOS.length : i;
  };
  return [...lista].sort(
    (a, b) => posicion(a.grado) - posicion(b.grado) || a.grado.localeCompare(b.grado, 'es'),
  );
}

// ---------------------------------------------------------------------------------- una persona

export interface GrupoPersona {
  nivel: Nivel;
  areas: Area[];
}

/**
 * Las áreas de una persona por nivel: falencias, por fortalecer y fortalezas siempre (aunque
 * estén vacías, para decir que no hay); «sin dato» solo si prefirió no responder alguna.
 */
export function gruposDePersona(niveles: Partial<Record<AreaId, Nivel>>): GrupoPersona[] {
  const orden: readonly Nivel[] = ['requiere_atencion', 'por_fortalecer', 'adecuado', 'sin_dato'];
  return orden
    .map((nivel) => ({
      nivel,
      areas: areasEnOrden.filter((a) => (niveles[a.id] ?? 'sin_dato') === nivel),
    }))
    .filter((g) => g.nivel !== 'sin_dato' || g.areas.length > 0);
}

export function conteoDePersona(niveles: Partial<Record<AreaId, Nivel>>): ConteoNivel {
  const conteo = conteoVacio();
  for (const area of areasEnOrden) conteo[niveles[area.id] ?? 'sin_dato'] += 1;
  return conteo;
}

/** Cuántas áreas de cada dimensión quedaron en cada nivel. */
export function porDimension(
  niveles: Partial<Record<AreaId, Nivel>>,
): { dimension: Dimension; conteo: ConteoNivel }[] {
  return dimensiones.map((dimension) => {
    const conteo = conteoVacio();
    for (const id of dimension.areas) conteo[niveles[id] ?? 'sin_dato'] += 1;
    return { dimension, conteo };
  });
}

const PUNTAJE: Partial<Record<Nivel, number>> = {
  requiere_atencion: 0,
  por_fortalecer: 1,
  adecuado: 2,
};

export interface CambioArea {
  area: Area;
  antes: Nivel;
  ahora: Nivel;
}

/**
 * Áreas que cambiaron de nivel frente al cuestionario anterior de la misma persona. Un área sin
 * dato en cualquiera de los dos no cuenta como cambio: no se sabe si mejoró o empeoró.
 */
export function cambiosFrenteAnterior(
  ahora: Partial<Record<AreaId, Nivel>>,
  antes: Partial<Record<AreaId, Nivel>>,
): { mejoras: CambioArea[]; retrocesos: CambioArea[] } {
  const mejoras: CambioArea[] = [];
  const retrocesos: CambioArea[] = [];
  for (const area of areasEnOrden) {
    const nivelAntes = antes[area.id];
    const nivelAhora = ahora[area.id];
    if (!nivelAntes || !nivelAhora) continue;
    const a = PUNTAJE[nivelAntes];
    const b = PUNTAJE[nivelAhora];
    if (a === undefined || b === undefined || a === b) continue;
    (b > a ? mejoras : retrocesos).push({ area, antes: nivelAntes, ahora: nivelAhora });
  }
  return { mejoras, retrocesos };
}
