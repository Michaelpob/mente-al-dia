/**
 * Piezas comunes de la demostración: barra de recorrido, encabezado, pie de página,
 * líneas de ayuda, barra de accesibilidad y utilidades.
 */
import { sitio, esMarcador } from './config.js';
import { icono } from './iconos.js';
import { lineasAyuda } from './proyecto/lineas-ayuda.js';

/* ------------------------------------------------------------------ utilidades */

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapa texto para insertarlo en HTML. */
export const esc = (texto) => String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);

export const alcaldia = `Alcaldía de ${sitio.municipio}`;

/** Texto con el estilo de marcador pendiente si todavía es «[ALGO]». */
export const conMarcador = (valor) =>
  esMarcador(valor) ? `<span class="marcador">${esc(valor)}</span>` : esc(valor);

export function movimientoReducido() {
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    document.documentElement.dataset.movimiento === 'reducido'
  );
}

export const punteroFino = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** Lee y escribe en sessionStorage sin romper el sitio si el navegador lo bloquea. */
export const sesion = {
  leer(clave) {
    try {
      const valor = window.sessionStorage.getItem(clave);
      return valor ? JSON.parse(valor) : null;
    } catch {
      return null;
    }
  },
  guardar(clave, valor) {
    try {
      window.sessionStorage.setItem(clave, JSON.stringify(valor));
    } catch {
      /* almacenamiento bloqueado: la demo sigue funcionando en memoria */
    }
  },
  borrar(clave) {
    try {
      window.sessionStorage.removeItem(clave);
    } catch {
      /* sin efecto */
    }
  },
};

/** Notificación breve, no bloqueante, anunciada por el lector de pantalla. */
export function notificar(texto, duracion = 3200) {
  let region = document.getElementById('region-notificaciones');
  if (!region) {
    region = document.createElement('div');
    region.id = 'region-notificaciones';
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', 'polite');
    document.body.append(region);
  }
  region.innerHTML = `<p class="notificacion">${esc(texto)}</p>`;
  window.clearTimeout(notificar.temporizador);
  notificar.temporizador = window.setTimeout(() => {
    region.innerHTML = '';
  }, duracion);
}

/**
 * Pinta los íconos declarados en el HTML: `data-icono="nombre"` (tamaño normal) o
 * `data-icono-grande="nombre"`. Si el elemento está vacío, el ícono es su contenido;
 * si tiene texto, el ícono va antes del texto.
 */
export function pintarIconos(raiz = document) {
  raiz.querySelectorAll('[data-icono], [data-icono-grande]').forEach((elemento) => {
    const grande = elemento.hasAttribute('data-icono-grande');
    const nombre = grande ? elemento.dataset.iconoGrande : elemento.dataset.icono;
    const svg = icono(nombre, grande ? 'icono icono--grande' : 'icono');
    if (elemento.childElementCount === 0 && !elemento.textContent.trim()) elemento.innerHTML = svg;
    else elemento.insertAdjacentHTML('afterbegin', svg);
    elemento.removeAttribute(grande ? 'data-icono-grande' : 'data-icono');
  });
}

/** Inclinación 3D por CSS (máx. 6°) que sigue al puntero. Solo con puntero fino y sin «reducir movimiento». */
export function inclinar(elemento) {
  const maximo = 6;
  elemento.classList.add('inclinable');
  elemento.addEventListener('pointermove', (evento) => {
    if (!punteroFino() || movimientoReducido()) return;
    const caja = elemento.getBoundingClientRect();
    const x = (evento.clientX - caja.left) / caja.width - 0.5;
    const y = (evento.clientY - caja.top) / caja.height - 0.5;
    elemento.style.setProperty('--inclinacion-x', `${(-y * 2 * maximo).toFixed(2)}deg`);
    elemento.style.setProperty('--inclinacion-y', `${(x * 2 * maximo).toFixed(2)}deg`);
  });
  elemento.addEventListener('pointerleave', () => {
    elemento.style.setProperty('--inclinacion-x', '0deg');
    elemento.style.setProperty('--inclinacion-y', '0deg');
  });
}

/* ------------------------------------------------------------------ preferencias de accesibilidad
 * Mismo formato y clave que la plataforma (src/lib/a11y/preferences.ts).
 */
const CLAVE_PREFERENCIAS = 'mente-al-dia:accesibilidad';
const PASOS_TEXTO = [0.9, 1, 1.1, 1.25, 1.4];
const PREFERENCIAS_BASE = {
  textScaleStep: 1,
  highContrast: false,
  reducedMotion: false,
  easyReading: false,
  autoAdvance: true,
};

export function leerPreferencias() {
  try {
    const datos = JSON.parse(window.localStorage.getItem(CLAVE_PREFERENCIAS) ?? 'null');
    if (!datos || typeof datos !== 'object') return { ...PREFERENCIAS_BASE };
    return { ...PREFERENCIAS_BASE, ...datos };
  } catch {
    return { ...PREFERENCIAS_BASE };
  }
}

function guardarPreferencias(preferencias) {
  try {
    window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(preferencias));
  } catch {
    /* almacenamiento bloqueado */
  }
}

export function aplicarPreferencias(preferencias) {
  const raiz = document.documentElement;
  const paso = Math.min(Math.max(Math.round(preferencias.textScaleStep), 0), PASOS_TEXTO.length - 1);
  raiz.style.setProperty('--escala-texto', String(PASOS_TEXTO[paso]));
  const marcar = (nombre, activo, valor) =>
    activo ? raiz.setAttribute(nombre, valor) : raiz.removeAttribute(nombre);
  marcar('data-texto', PASOS_TEXTO[paso] > 1, 'grande');
  marcar('data-contraste', preferencias.highContrast, 'alto');
  marcar('data-movimiento', preferencias.reducedMotion, 'reducido');
  marcar('data-lectura', preferencias.easyReading, 'facil');
}

/* ------------------------------------------------------------------ piezas de marca */

export const isotipo = (clase = 'logo-mad__isotipo') => `
  <svg class="${clase}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <circle cx="24" cy="24" r="21" fill="var(--blanco)" stroke="var(--pizarra-700)" stroke-width="3"/>
    <path d="M15.5 30.5a8.5 8.5 0 0 1 17 0Z" fill="var(--arena-400)"/>
    <path d="M9 31.5Q24 26 39 31.5" fill="none" stroke="var(--salvia-600)" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

export const logoMenteAlDia = (enlace = true) => {
  const contenido = `${isotipo()}<span class="logo-mad__texto">Mente <span>al</span> Día</span>`;
  return enlace
    ? `<a class="logo-mad" href="./" aria-label="Mente al Día, ir al inicio">${contenido}</a>`
    : `<span class="logo-mad">${contenido}</span>`;
};

export const logoAlcaldia = () =>
  sitio.logoAlcaldia
    ? `<img class="logo-alcaldia-img" src="${esc(sitio.logoAlcaldia)}" alt="Logo de la ${esc(alcaldia)}" height="40">`
    : `<span class="logo-alcaldia" role="img" aria-label="Logo de la ${esc(alcaldia)}">[LOGO ALCALDÍA]</span>`;

/* ------------------------------------------------------------------ líneas de ayuda */

const esMarcable = (numero) => /^\d{3,10}$/.test(numero);

export function listaLineasHtml({ incluirInactivas = false } = {}) {
  const lineas = lineasAyuda.filter((linea) => linea.activa || incluirInactivas);
  return `<ul class="lista-lineas">${lineas
    .map((linea) => {
      const marcable = esMarcable(linea.numero);
      return `<li class="linea">
        <p class="linea__numero ${marcable ? '' : 'linea__numero--marcador'}">${esc(linea.numero)}</p>
        <p class="linea__nombre">${esc(linea.nombre)}</p>
        <dl>
          <div><dt>Atiende: </dt><dd>${esc(linea.atiende)}</dd></div>
          <div><dt>Horario: </dt><dd>${esc(linea.horario)}</dd></div>
          <div><dt>Cobertura: </dt><dd>${esc(linea.cobertura)}</dd></div>
        </dl>
        ${
          marcable
            ? `<a class="boton boton--primario boton--sm" href="tel:${linea.numero}" aria-label="Llamar al ${esc(linea.numero)}, ${esc(linea.nombre)}">${icono('phone')}Llamar</a>`
            : ''
        }
      </li>`;
    })
    .join('')}</ul>`;
}

/* ------------------------------------------------------------------ cajones y diálogos */

function crearCajon(id, titulo, contenido, { lado = 'derecha', descripcion = '' } = {}) {
  const dialogo = document.createElement('dialog');
  dialogo.id = id;
  dialogo.className = `cajon ${lado === 'izquierda' ? 'cajon--izquierda' : ''}`;
  dialogo.setAttribute('aria-labelledby', `${id}-titulo`);
  dialogo.innerHTML = `<div class="cajon__interior">
      <div class="cajon__cabecera">
        <div>
          <h2 id="${id}-titulo">${esc(titulo)}</h2>
          ${descripcion ? `<p class="texto-secundario texto-pequeno">${esc(descripcion)}</p>` : ''}
        </div>
        <button class="boton boton--fantasma boton--icono" type="button" data-cerrar aria-label="Cerrar">${icono('x', 'icono icono--grande')}</button>
      </div>
      ${contenido}
    </div>`;
  activarDialogo(dialogo);
  document.body.append(dialogo);
  return dialogo;
}

/** Cierra con el botón «Cerrar», con Escape (nativo) o al hacer clic en el velo. */
export function activarDialogo(dialogo) {
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo || evento.target.closest('[data-cerrar]')) dialogo.close();
  });
}

function crearCajonAccesibilidad() {
  const ajustes = [
    ['highContrast', 'Alto contraste', 'Aumenta la diferencia entre el texto y el fondo.'],
    ['reducedMotion', 'Reducir movimiento', 'Quita animaciones y desplazamientos.'],
    ['easyReading', 'Fuente de lectura fácil', 'Usa una letra diseñada para personas con baja visión.'],
    ['autoAdvance', 'Avance automático de preguntas', 'Pasa a la siguiente pregunta al elegir una respuesta.'],
  ];
  const contenido = `
    <div>
      <p class="aviso__titulo">Tamaño del texto</p>
      <div class="tamano-texto" role="group" aria-label="Tamaño del texto">
        <button class="boton boton--secundario boton--sm" type="button" data-texto="-1" aria-label="Reducir tamaño del texto">A−</button>
        <button class="boton boton--secundario boton--sm" type="button" data-texto="0" aria-label="Tamaño normal del texto">A</button>
        <button class="boton boton--secundario boton--sm" type="button" data-texto="1" aria-label="Aumentar tamaño del texto">A+</button>
      </div>
      <p class="texto-pequeno texto-secundario" data-tamano-actual aria-live="polite"></p>
    </div>
    <div>${ajustes
      .map(
        ([clave, titulo, detalle]) => `<div class="ajuste">
          <div class="ajuste__texto"><p id="ajuste-${clave}">${titulo}</p><p class="texto-pequeno texto-secundario">${detalle}</p></div>
          <button class="interruptor" type="button" role="switch" aria-labelledby="ajuste-${clave}" data-ajuste="${clave}"></button>
        </div>`,
      )
      .join('')}</div>
    <button class="boton boton--enlace" type="button" data-restablecer style="margin-top:1rem;align-self:flex-start">Restablecer preferencias</button>`;
  const cajon = crearCajon('cajon-accesibilidad', 'Accesibilidad', contenido, {
    descripcion: 'Ajusta el sitio a tu manera. Recordaremos tu elección en este navegador.',
  });

  const pintar = () => {
    const preferencias = leerPreferencias();
    cajon.querySelectorAll('[data-ajuste]').forEach((boton) => {
      boton.setAttribute('aria-checked', String(Boolean(preferencias[boton.dataset.ajuste])));
    });
    const porcentaje = Math.round(PASOS_TEXTO[preferencias.textScaleStep] * 100);
    cajon.querySelector('[data-tamano-actual]').textContent = `Tamaño actual: ${porcentaje} %`;
  };

  cajon.addEventListener('click', (evento) => {
    const preferencias = leerPreferencias();
    const ajuste = evento.target.closest('[data-ajuste]');
    const texto = evento.target.closest('[data-texto]');
    if (ajuste) preferencias[ajuste.dataset.ajuste] = !preferencias[ajuste.dataset.ajuste];
    else if (texto) {
      const cambio = Number(texto.dataset.texto);
      preferencias.textScaleStep =
        cambio === 0 ? 1 : Math.min(Math.max(preferencias.textScaleStep + cambio, 0), PASOS_TEXTO.length - 1);
    } else if (evento.target.closest('[data-restablecer]')) Object.assign(preferencias, PREFERENCIAS_BASE);
    else return;
    guardarPreferencias(preferencias);
    aplicarPreferencias(preferencias);
    pintar();
    document.dispatchEvent(new CustomEvent('preferencias-cambiadas', { detail: preferencias }));
  });
  pintar();
  return cajon;
}

function crearCajonAyuda() {
  return crearCajon(
    'cajon-ayuda',
    'Líneas de ayuda',
    `<div class="aviso aviso--apoyo" style="margin-bottom:1rem">${icono('heart-handshake')}<div class="aviso__cuerpo"><p>Si estás en peligro inmediato, llama al <strong>123</strong>.</p></div></div>
     ${listaLineasHtml()}
     <p class="texto-pequeno texto-secundario" style="margin-top:1rem">Las líneas 123, 141 y 155 son nacionales. Las líneas locales se completan con la Secretaría de Salud del municipio.</p>`,
    { descripcion: 'Si necesitas apoyo, puedes comunicarte con estas líneas.' },
  );
}

function crearCajonMenu() {
  return crearCajon(
    'cajon-menu',
    'Menú',
    `${logoAlcaldia()}
     <nav aria-label="Menú principal" style="margin-top:1.5rem">
       <ul style="list-style:none;display:grid;gap:0.25rem">${enlacesMenu
         .map(
           ([href, texto]) =>
             `<li><a class="boton boton--fantasma" style="width:100%;justify-content:flex-start" href="${href}" data-cerrar>${texto}</a></li>`,
         )
         .join('')}</ul>
     </nav>
     <button class="boton boton--secundario" type="button" data-abrir="dialogo-ingresar" style="margin-top:1.5rem">Ingresar</button>`,
    { lado: 'izquierda' },
  );
}

function crearDialogoIngresar() {
  const dialogo = document.createElement('dialog');
  dialogo.id = 'dialogo-ingresar';
  dialogo.className = 'dialogo';
  dialogo.setAttribute('aria-labelledby', 'dialogo-ingresar-titulo');
  dialogo.innerHTML = `<div class="dialogo__interior">
      <h2 id="dialogo-ingresar-titulo">Ingresar</h2>
      <p>En la plataforma, aquí ingresan las personas con su correo para continuar un cuestionario pausado o ver sus resultados anteriores.</p>
      <p class="texto-secundario">En esta demostración no se crean cuentas ni se guardan datos.</p>
      <div class="grupo-botones">
        <a class="boton boton--primario" href="cuestionario.html">Probar el cuestionario</a>
        <a class="boton boton--secundario" href="panel.html">Ver el panel profesional</a>
      </div>
      <button class="boton boton--enlace" type="button" data-cerrar>Cerrar</button>
    </div>`;
  activarDialogo(dialogo);
  document.body.append(dialogo);
  return dialogo;
}

/* ------------------------------------------------------------------ barra, encabezado y pie */

const recorrido = [
  ['inicio', './', 'Sitio público', 'Inicio'],
  ['cuestionario', 'cuestionario.html', 'Cuestionario', 'Cuestionario'],
  ['resultados', 'resultados.html', 'Resultados', 'Resultados'],
  ['panel', 'panel.html', 'Panel profesional', 'Panel'],
  ['proyecto', 'proyecto.html', 'El proyecto', 'Proyecto'],
];

const enlacesMenu = [
  ['./', 'Inicio'],
  ['./#como-funciona', 'Cómo funciona'],
  ['./#areas', 'Áreas'],
  ['./#preguntas-frecuentes', 'Preguntas frecuentes'],
];

const barraDemo = (pagina) => `
  <nav class="barra-demo" aria-label="Recorrido de la demostración">
    <div class="contenedor barra-demo__fila">
      <p class="barra-demo__titulo">Demostración de Mente al Día</p>
      <ul class="barra-demo__enlaces">${recorrido
        .map(
          ([id, href, texto, corto]) =>
            `<li><a href="${href}" ${id === pagina ? 'aria-current="page"' : ''}><span class="largo">${texto}</span><span class="corto" aria-hidden="true">${corto}</span></a></li>`,
        )
        .join('')}</ul>
    </div>
  </nav>`;

const botonAyuda = () => `
  <button class="boton boton--apoyo boton--sm" type="button" data-abrir="cajon-ayuda" aria-label="Líneas de ayuda">
    ${icono('life-buoy')}<span class="encabezado__ayuda-corta">Ayuda</span><span class="encabezado__ayuda-larga">Líneas de ayuda</span>
  </button>`;

const botonAccesibilidad = () => `
  <button class="boton boton--fantasma boton--sm" type="button" data-abrir="cajon-accesibilidad" aria-label="Accesibilidad">
    ${icono('accessibility')}<span class="encabezado__accesibilidad-texto">Accesibilidad</span>
  </button>`;

const encabezadoPublico = () => `
  <header class="encabezado" data-encabezado>
    <div class="contenedor encabezado__fila">
      <div class="encabezado__marca">
        ${logoAlcaldia()}
        <span class="encabezado__separador" aria-hidden="true"></span>
        ${logoMenteAlDia()}
      </div>
      <nav class="menu-principal" aria-label="Menú principal">
        <ul>${enlacesMenu.map(([href, texto]) => `<li><a href="${href}">${texto}</a></li>`).join('')}</ul>
      </nav>
      <div class="encabezado__acciones">
        ${botonAyuda()}
        ${botonAccesibilidad()}
        <button class="boton boton--secundario boton--sm encabezado__ingresar" type="button" data-abrir="dialogo-ingresar">Ingresar</button>
        <button class="boton boton--fantasma boton--icono encabezado__menu-movil" type="button" data-abrir="cajon-menu" aria-label="Abrir menú">${icono('menu', 'icono icono--grande')}</button>
      </div>
    </div>
  </header>`;

/** Encabezado compacto del cuestionario: sin menú, para no distraer. */
const encabezadoCuestionario = () => `
  <header class="encabezado" data-encabezado>
    <div class="contenedor encabezado__fila">
      <div class="encabezado__marca">${logoMenteAlDia()}</div>
      <div class="encabezado__acciones">
        ${botonAyuda()}
        ${botonAccesibilidad()}
        <a class="boton boton--fantasma boton--sm" href="./" data-salir-cuestionario>Pausar y salir</a>
      </div>
    </div>
  </header>`;

const piePagina = () => {
  const anio = new Date().getFullYear();
  return `<footer class="pie">
    <div class="contenedor pie__principal">
      <div>
        <div class="pie__logos">${logoAlcaldia()}${logoMenteAlDia(false)}</div>
        <p style="font-weight:600">${conMarcador(sitio.secretaria)}</p>
        <p class="texto-secundario">Alcaldía de ${conMarcador(sitio.municipio)}</p>
      </div>
      <section aria-labelledby="pie-contacto">
        <h2 id="pie-contacto">Contacto</h2>
        <ul>
          <li><strong>Correo:</strong> ${conMarcador(sitio.correoContacto)}</li>
          <li><strong>Teléfono:</strong> ${conMarcador(sitio.telefonoContacto)}</li>
        </ul>
      </section>
      <nav aria-labelledby="pie-informacion">
        <h2 id="pie-informacion">Información</h2>
        <ul>
          <li><a class="pie__enlace" href="proyecto.html#paginas-legales">Política de tratamiento de datos</a></li>
          <li><a class="pie__enlace" href="proyecto.html#paginas-legales">Términos y condiciones</a></li>
          <li><a class="pie__enlace" href="proyecto.html#paginas-legales">Declaración de accesibilidad</a></li>
          <li><a class="pie__enlace" href="proyecto.html">Sobre esta demostración</a></li>
        </ul>
      </nav>
    </div>
    <div class="pie__inferior">
      <div class="contenedor">
        <p class="lectura">Mente al Día es una herramienta de orientación. No reemplaza la atención profesional ni los servicios de emergencia.</p>
        <p style="flex-shrink:0">© ${anio} Alcaldía de ${conMarcador(sitio.municipio)}. Demostración de ${esc(sitio.version)}.</p>
      </div>
    </div>
  </footer>`;
};

/**
 * Pinta la barra de recorrido, el encabezado y el pie, y prepara los paneles laterales.
 * @param {{pagina: string, encabezado?: 'publico'|'cuestionario'|'ninguno', pie?: boolean}} opciones
 */
export function montarChrome({ pagina, encabezado = 'publico', pie = true }) {
  const superior = document.getElementById('chrome-superior');
  const inferior = document.getElementById('chrome-inferior');
  const cabecera =
    encabezado === 'publico' ? encabezadoPublico() : encabezado === 'cuestionario' ? encabezadoCuestionario() : '';
  if (superior) superior.outerHTML = barraDemo(pagina) + cabecera;
  if (inferior) inferior.outerHTML = pie ? piePagina() : '';

  const dialogos = {
    'cajon-ayuda': crearCajonAyuda(),
    'cajon-accesibilidad': crearCajonAccesibilidad(),
    'cajon-menu': encabezado === 'publico' ? crearCajonMenu() : null,
    'dialogo-ingresar': crearDialogoIngresar(),
  };

  document.addEventListener('click', (evento) => {
    const disparador = evento.target.closest('[data-abrir]');
    if (!disparador) return;
    const destino = dialogos[disparador.dataset.abrir];
    if (!destino) return;
    disparador.closest('dialog')?.close();
    destino.showModal();
  });

  // Los enlaces del menú lateral cierran el panel.
  dialogos['cajon-menu']?.addEventListener('click', (evento) => {
    if (evento.target.closest('a')) dialogos['cajon-menu'].close();
  });

  const cabeceraDom = document.querySelector('[data-encabezado]');
  if (cabeceraDom) {
    const actualizar = () => cabeceraDom.classList.toggle('encabezado--desplazado', window.scrollY > 8);
    window.addEventListener('scroll', actualizar, { passive: true });
    actualizar();
  }
}

// Aplica de nuevo las preferencias (por si cambiaron en otra pestaña).
aplicarPreferencias(leerPreferencias());
