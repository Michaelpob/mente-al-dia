/**
 * Rueda de bienestar: las 20 áreas alrededor de un círculo, agrupadas en sus 5 dimensiones.
 * - Sin niveles (página de inicio): cada dimensión tiene un tono neutro.
 * - Con niveles (resultados): color + patrón por nivel, para no depender solo del color.
 */
import { areas, dimensiones } from './proyecto/areas.js';
import { esc } from './comun.js';
import { icono } from './iconos.js';

const C = 200; // centro del viewBox 400 × 400
const R_EXT = 190;
const R_INT = 106;
const R_ICONO = 148;
const HUECO_DIMENSION = 5;
const HUECO_AREA = 1.5;

export const etiquetasNivel = {
  adecuado: 'Adecuado',
  por_fortalecer: 'Por fortalecer',
  requiere_atencion: 'Requiere atención',
  sin_dato: 'Sin dato',
};

const colorNivel = {
  adecuado: '#86A992',
  por_fortalecer: '#D8B76E',
  requiere_atencion: '#CC8C78',
  sin_dato: '#C9CED2',
};

const patronNivel = {
  adecuado: null,
  por_fortalecer: 'rayas',
  requiere_atencion: 'puntos',
  sin_dato: 'cuadros',
};

export const tonoDimension = {
  emociones_mente: '#BCCBD4',
  cuerpo_energia: '#DCD2C2',
  vinculos_apoyo: '#C6D7CC',
  afrontamiento: '#D4CCBF',
  proyecto_vida_entorno: '#D6DDE2',
};

const areaPorId = Object.fromEntries(areas.map((a) => [a.id, a]));

/** Áreas en el orden en que aparecen alrededor de la rueda. */
export const ordenRueda = dimensiones.flatMap((d) => d.areas.map((id) => ({ area: areaPorId[id], dimension: d })));

const punto = (radio, grados) => {
  const rad = (grados * Math.PI) / 180;
  return [C + radio * Math.cos(rad), C + radio * Math.sin(rad)];
};

function sector(a0, a1) {
  const [x0, y0] = punto(R_EXT, a0);
  const [x1, y1] = punto(R_EXT, a1);
  const [x2, y2] = punto(R_INT, a1);
  const [x3, y3] = punto(R_INT, a0);
  const f = (n) => n.toFixed(2);
  return `M${f(x0)} ${f(y0)}A${R_EXT} ${R_EXT} 0 0 1 ${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}A${R_INT} ${R_INT} 0 0 0 ${f(x3)} ${f(y3)}Z`;
}

const defsPatrones = `
  <defs>
    <pattern id="rueda-rayas" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="7" fill="rgba(255,255,255,0.45)"/>
    </pattern>
    <pattern id="rueda-puntos" width="7" height="7" patternUnits="userSpaceOnUse">
      <circle cx="3.5" cy="3.5" r="1.6" fill="rgba(255,255,255,0.55)"/>
    </pattern>
    <pattern id="rueda-cuadros" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 4H8M4 0V8" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>
    </pattern>
  </defs>`;

/**
 * @param {{niveles?: Record<string,string>|null, animada?: boolean, centro?: {titulo: string, detalle: string}}} opciones
 * @returns {string} HTML de la rueda
 */
export function ruedaHtml({ niveles = null, animada = false, centro = { titulo: '20 áreas', detalle: 'de bienestar' } } = {}) {
  const totalHuecos = dimensiones.length * HUECO_DIMENSION + (areas.length - dimensiones.length) * HUECO_AREA;
  const paso = (360 - totalHuecos) / areas.length;
  let angulo = -90 + HUECO_DIMENSION / 2;
  let indice = 0;
  const segmentos = [];

  dimensiones.forEach((dimension, d) => {
    if (d > 0) angulo += HUECO_DIMENSION - HUECO_AREA;
    dimension.areas.forEach((id, k) => {
      if (k > 0) angulo += HUECO_AREA;
      const area = areaPorId[id];
      const a0 = angulo;
      const a1 = angulo + paso;
      angulo = a1;
      const nivel = niveles ? niveles[id] : null;
      const relleno = nivel ? colorNivel[nivel] : tonoDimension[dimension.id];
      const patron = nivel ? patronNivel[nivel] : null;
      const [ix, iy] = punto(R_ICONO, (a0 + a1) / 2);
      const etiqueta = nivel ? `${area.nombre}: ${etiquetasNivel[nivel]}` : `${area.nombre} (${dimension.nombre})`;
      segmentos.push(`
        <g class="rueda__segmento" data-area="${area.id}" data-dimension="${dimension.id}" style="--i:${indice}"
           tabindex="0" role="button" aria-label="${esc(etiqueta)}">
          <path class="rueda__forma" d="${sector(a0, a1)}" fill="${relleno}" stroke="var(--piedra-50)" stroke-width="1.5" stroke-linejoin="round"/>
          ${patron ? `<path d="${sector(a0, a1)}" fill="url(#rueda-${patron})" pointer-events="none"/>` : ''}
          <g transform="translate(${(ix - 9).toFixed(2)} ${(iy - 9).toFixed(2)}) scale(0.75)" color="var(--grafito-900)" opacity="0.78" pointer-events="none">
            ${icono(area.icono, 'rueda__icono').replace('<svg ', '<svg width="24" height="24" ')}
          </g>
        </g>`);
      indice += 1;
    });
  });

  return `<div class="rueda ${animada ? 'rueda--animada' : ''}" data-rueda>
      <svg viewBox="0 0 400 400" role="group" aria-label="Rueda de bienestar con las 20 áreas">
        ${defsPatrones}
        <circle cx="${C}" cy="${C}" r="${R_INT - 10}" fill="var(--blanco)"/>
        ${segmentos.join('')}
      </svg>
      <div class="rueda__centro" aria-live="polite">
        <p class="rueda__centro-titulo" data-centro-titulo>${esc(centro.titulo)}</p>
        <p class="rueda__centro-detalle" data-centro-detalle>${esc(centro.detalle)}</p>
      </div>
    </div>`;
}

/**
 * Activa la interacción: al pasar el puntero o enfocar un segmento, el centro muestra el área.
 * @param {HTMLElement} raiz elemento que contiene la rueda
 * @param {{niveles?: Record<string,string>|null, centro: {titulo: string, detalle: string}, alElegir?: (id: string) => void}} opciones
 */
export function activarRueda(raiz, { niveles = null, centro, alElegir } = {}) {
  const rueda = raiz.querySelector('[data-rueda]');
  const titulo = rueda.querySelector('[data-centro-titulo]');
  const detalle = rueda.querySelector('[data-centro-detalle]');
  const segmentos = [...rueda.querySelectorAll('.rueda__segmento')];
  const dimensionPorId = Object.fromEntries(dimensiones.map((d) => [d.id, d.nombre]));

  const mostrar = (segmento) => {
    segmentos.forEach((s) => s.classList.toggle('activo', s === segmento));
    if (!segmento) {
      titulo.textContent = centro.titulo;
      detalle.textContent = centro.detalle;
      return;
    }
    const area = areaPorId[segmento.dataset.area];
    titulo.textContent = area.nombre;
    detalle.textContent = niveles ? etiquetasNivel[niveles[area.id]] : dimensionPorId[segmento.dataset.dimension];
  };

  segmentos.forEach((segmento) => {
    segmento.addEventListener('pointerenter', () => mostrar(segmento));
    segmento.addEventListener('focus', () => mostrar(segmento));
    segmento.addEventListener('click', () => alElegir?.(segmento.dataset.area));
    segmento.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' || evento.key === ' ') {
        evento.preventDefault();
        alElegir?.(segmento.dataset.area);
      }
    });
  });
  rueda.addEventListener('pointerleave', () => mostrar(null));
  rueda.addEventListener('focusout', (evento) => {
    if (!rueda.contains(evento.relatedTarget)) mostrar(null);
  });

  return {
    /** Atenúa todo menos las áreas indicadas (null = ninguna atenuada). */
    resaltar(ids) {
      rueda.classList.toggle('rueda--atenuada', Boolean(ids));
      segmentos.forEach((s) => s.classList.toggle('resaltado', Boolean(ids?.includes(s.dataset.area))));
    },
    mostrarArea(id) {
      mostrar(segmentos.find((s) => s.dataset.area === id) ?? null);
    },
  };
}

/** Leyenda de niveles (color + patrón). */
export function leyendaNivelesHtml() {
  return `<ul class="leyenda" aria-label="Leyenda de niveles">${Object.keys(etiquetasNivel)
    .map((nivel) => {
      const patron = patronNivel[nivel];
      return `<li><svg class="leyenda__muestra" viewBox="0 0 16 16" aria-hidden="true"><rect width="16" height="16" rx="4" fill="${colorNivel[nivel]}"/>${
        patron ? `<rect width="16" height="16" rx="4" fill="url(#rueda-${patron})"/>` : ''
      }</svg>${etiquetasNivel[nivel]}</li>`;
    })
    .join('')}</ul>`;
}
