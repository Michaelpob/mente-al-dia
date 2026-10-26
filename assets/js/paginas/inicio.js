/** Página de inicio: así se verá el sitio público de Mente al Día. */
import { esc, inclinar, listaLineasHtml, montarChrome, movimientoReducido, pintarIconos } from '../comun.js';
import { icono } from '../iconos.js';
import { montarOrbe } from '../orbe.js';
import { areas, dimensiones } from '../proyecto/areas.js';
import { activarRespiracion, respiracionHtml } from '../respiracion.js';
import { activarRueda, ruedaHtml, tonoDimension } from '../rueda.js';

montarChrome({ pagina: 'inicio' });
pintarIconos();

/* Orbe 3D del hero, con un leve alejamiento al hacer scroll. */
const escena = document.querySelector('[data-orbe]');
montarOrbe(escena, { interactivo: true });
const contenedorEscena = document.querySelector('.hero__escena');
let pendiente = false;
window.addEventListener(
  'scroll',
  () => {
    if (pendiente || movimientoReducido()) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      const avance = Math.min(window.scrollY / 600, 1);
      contenedorEscena.style.transform = `translateY(${(avance * 40).toFixed(1)}px) scale(${(1 - avance * 0.06).toFixed(3)})`;
      contenedorEscena.style.opacity = String(1 - avance * 0.35);
    });
  },
  { passive: true },
);

/* Explorador de las 20 áreas: rueda + pestañas por dimensión. */
const explorador = document.querySelector('[data-explorador]');
const areaPorId = Object.fromEntries(areas.map((a) => [a.id, a]));
const centro = { titulo: '20 áreas', detalle: 'en 5 dimensiones' };
explorador.querySelector('[data-explorador-rueda]').innerHTML = ruedaHtml({ centro });
const rueda = activarRueda(explorador, {
  centro,
  alElegir: (id) => {
    const dimension = dimensiones.find((d) => d.areas.includes(id));
    elegir(dimension.id, id);
  },
});

const pestanas = explorador.querySelector('[data-explorador-pestanas]');
const panel = explorador.querySelector('[data-explorador-panel]');
const opciones = [{ id: 'todas', nombre: 'Todas', areas: areas.map((a) => a.id) }, ...dimensiones];
pestanas.innerHTML = opciones
  .map(
    (o, i) =>
      `<button class="pestana" type="button" role="tab" id="pestana-${o.id}" aria-controls="panel-areas" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-dimension="${o.id}">${esc(o.nombre)}</button>`,
  )
  .join('');
panel.id = 'panel-areas';

function elegir(idDimension, resaltarArea = null) {
  const opcion = opciones.find((o) => o.id === idDimension);
  pestanas.querySelectorAll('[role="tab"]').forEach((boton) => {
    const activa = boton.dataset.dimension === idDimension;
    boton.setAttribute('aria-selected', String(activa));
    boton.tabIndex = activa ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', `pestana-${idDimension}`);
  panel.innerHTML = `<ul class="lista-areas">${opcion.areas
    .map((id) => {
      const area = areaPorId[id];
      const tono = tonoDimension[area.dimension];
      return `<li class="lista-areas__item ${id === resaltarArea ? 'lista-areas__item--activa' : ''}" data-area="${id}">
        <span class="lista-areas__icono" style="background:${tono}">${icono(area.icono)}</span>
        <span><strong>${esc(area.nombre)}</strong><span class="texto-secundario texto-pequeno">${esc(area.descripcionCorta)}</span></span>
      </li>`;
    })
    .join('')}</ul>`;
  rueda.resaltar(idDimension === 'todas' ? null : opcion.areas);
  panel.querySelectorAll('[data-area]').forEach((item) => {
    item.addEventListener('pointerenter', () => rueda.mostrarArea(item.dataset.area));
    item.addEventListener('pointerleave', () => rueda.mostrarArea(null));
  });
}

pestanas.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[role="tab"]');
  if (boton) elegir(boton.dataset.dimension);
});
pestanas.addEventListener('keydown', (evento) => {
  const botones = [...pestanas.querySelectorAll('[role="tab"]')];
  const actual = botones.indexOf(document.activeElement);
  const mover = { ArrowRight: 1, ArrowLeft: -1, Home: -actual, End: botones.length - 1 - actual }[evento.key];
  if (mover === undefined || actual < 0) return;
  evento.preventDefault();
  const siguiente = botones[(actual + mover + botones.length) % botones.length];
  siguiente.focus();
  elegir(siguiente.dataset.dimension);
});
elegir('todas');

/* Tarjetas de públicos con inclinación 3D por CSS. */
document.querySelectorAll('[data-inclinar]').forEach(inclinar);

/* Respiración guiada y líneas de ayuda. */
const respiracion = document.querySelector('[data-respiracion-contenedor]');
respiracion.innerHTML = respiracionHtml();
activarRespiracion(respiracion);
document.querySelector('[data-lineas]').innerHTML = listaLineasHtml();
