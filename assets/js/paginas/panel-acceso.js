/**
 * Ingreso de administración al panel de la demostración (D-64).
 * El panel solo se carga después de ingresar con el correo y la contraseña del administrador.
 * La contraseña no está en el sitio: se compara su huella PBKDF2-SHA-256 (ver config.js).
 * La sesión vive solo en esta pestaña y se cierra tras 30 minutos sin actividad, como en la plataforma.
 */
import { esc, logoMenteAlDia, montarChrome, pintarIconos, sesion } from '../comun.js';
import { adminPanel } from '../config.js';
import { icono } from '../iconos.js';

const CLAVE_SESION = 'mente-al-dia:demo:panel-sesion';
const CLAVE_INTENTOS = 'mente-al-dia:demo:panel-intentos';
const CLAVE_AVISO = 'mente-al-dia:demo:panel-aviso';
const INACTIVIDAD = 30 * 60 * 1000;
const MAX_INTENTOS = 5;
const ESPERA = 30 * 1000;

const AVISOS = {
  salida: 'Saliste del panel.',
  vencida: 'Tu sesión se cerró después de 30 minutos sin actividad. Ingresa de nuevo para continuar.',
};

montarChrome({ pagina: 'panel', encabezado: 'ninguno', pie: false });

const raizIngreso = document.querySelector('[data-ingreso-panel]');
const panel = document.querySelector('[data-panel]');

/* ------------------------------------------------------------------ huella de la contraseña */
function deHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function huella(contrasena) {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(adminPanel.sal), iterations: adminPanel.iteraciones },
    clave,
    256,
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Compara sin cortar en la primera diferencia. */
function iguales(a, b) {
  let diferencia = a.length ^ b.length;
  for (let i = 0; i < a.length; i += 1) diferencia |= a.charCodeAt(i) ^ (b.charCodeAt(i) || 0);
  return diferencia === 0;
}

/* ------------------------------------------------------------------ sesión */
function sesionVigente() {
  const actual = sesion.leer(CLAVE_SESION);
  if (!actual || actual.correo !== adminPanel.correo) return null;
  if (Date.now() - actual.ultimaActividad > INACTIVIDAD) {
    sesion.borrar(CLAVE_SESION);
    sesion.guardar(CLAVE_AVISO, 'vencida');
    return null;
  }
  return actual;
}

function cerrarSesion(motivo) {
  sesion.borrar(CLAVE_SESION);
  sesion.guardar(CLAVE_AVISO, motivo);
  // Vuelve a la pantalla de ingreso sin dejar el panel en memoria.
  window.location.replace('panel.html');
}

function vigilarActividad() {
  let ultimaEscritura = 0;
  const registrar = () => {
    const ahora = Date.now();
    if (ahora - ultimaEscritura < 15_000) return;
    ultimaEscritura = ahora;
    const actual = sesion.leer(CLAVE_SESION);
    if (actual) sesion.guardar(CLAVE_SESION, { ...actual, ultimaActividad: ahora });
  };
  for (const evento of ['pointerdown', 'keydown', 'scroll']) {
    window.addEventListener(evento, registrar, { passive: true });
  }
  window.setInterval(() => {
    if (!sesionVigente()) cerrarSesion('vencida');
  }, 30_000);
}

/* ------------------------------------------------------------------ panel */
async function abrirPanel(actual) {
  raizIngreso.replaceChildren();
  panel.hidden = false;
  panel.querySelector('main').id = 'contenido';
  panel.querySelector('[data-panel-correo]').textContent = actual.correo;
  document.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-salir-panel]')) cerrarSesion('salida');
  });
  vigilarActividad();
  await import('./panel.js');
}

/* ------------------------------------------------------------------ pantalla de ingreso */
function mostrarIngreso() {
  const motivo = sesion.leer(CLAVE_AVISO);
  sesion.borrar(CLAVE_AVISO);
  const aviso = AVISOS[motivo]
    ? `<div class="aviso ingreso-panel__aviso" role="status">${icono('info')}<p>${esc(AVISOS[motivo])}</p></div>`
    : '';

  raizIngreso.innerHTML = `<main id="contenido" class="ingreso-panel" tabindex="-1">
    <div class="tarjeta tarjeta--elevada ingreso-panel__tarjeta">
      <div class="ingreso-panel__marca">${logoMenteAlDia(false)}<p class="panel__titulo">Panel profesional</p></div>
      <span class="ingreso-panel__icono" aria-hidden="true">${icono('lock', 'icono icono--grande')}</span>
      <div>
        <h1 class="ingreso-panel__titulo">Ingreso de administración</h1>
        <p class="texto-secundario">Solo el administrador puede ver el panel. Ingresa con tu correo y tu contraseña.</p>
      </div>
      ${aviso}
      <form class="ingreso-panel__formulario" novalidate data-formulario-ingreso>
        <div class="campo">
          <label for="correo-admin">Correo electrónico</label>
          <input id="correo-admin" name="correo" type="email" inputmode="email" autocomplete="username" spellcheck="false" required aria-describedby="error-correo" />
          <p id="error-correo" class="campo__error" hidden></p>
        </div>
        <div class="campo">
          <label for="contrasena-admin">Contraseña</label>
          <div class="campo__con-boton">
            <input id="contrasena-admin" name="contrasena" type="password" autocomplete="current-password" required aria-describedby="error-contrasena" />
            <button class="boton boton--fantasma boton--icono" type="button" aria-label="Mostrar contraseña" aria-pressed="false" data-mostrar-contrasena>${icono('eye')}</button>
          </div>
          <p id="error-contrasena" class="campo__error" hidden></p>
        </div>
        <div class="ingreso-panel__error" role="alert" data-error-ingreso></div>
        <button class="boton boton--primario ingreso-panel__boton" type="submit" data-boton-ingresar>
          <span>Ingresar</span>${icono('arrow-right')}
        </button>
      </form>
      <p class="texto-pequeno texto-secundario">Vista previa con datos ficticios. En la plataforma real, el ingreso además pide un código de doble factor.</p>
      <a class="boton boton--enlace ingreso-panel__volver" href="./">${icono('arrow-left')}<span>Volver al sitio</span></a>
    </div>
  </main>`;
  activarFormulario();
}

function mostrarErrorCampo(campo, mensaje) {
  const error = document.getElementById(campo.getAttribute('aria-describedby'));
  campo.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
  error.textContent = mensaje;
  error.hidden = !mensaje;
}

function activarFormulario() {
  const formulario = raizIngreso.querySelector('[data-formulario-ingreso]');
  const correo = formulario.querySelector('#correo-admin');
  const contrasena = formulario.querySelector('#contrasena-admin');
  const mostrar = formulario.querySelector('[data-mostrar-contrasena]');
  const errorGeneral = formulario.querySelector('[data-error-ingreso]');
  const boton = formulario.querySelector('[data-boton-ingresar]');

  mostrar.addEventListener('click', () => {
    const visible = contrasena.type === 'text';
    contrasena.type = visible ? 'password' : 'text';
    mostrar.setAttribute('aria-pressed', String(!visible));
    mostrar.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
    mostrar.innerHTML = icono(visible ? 'eye' : 'eye-off');
  });

  for (const campo of [correo, contrasena]) {
    campo.addEventListener('input', () => {
      if (campo.getAttribute('aria-invalid') === 'true') mostrarErrorCampo(campo, '');
      errorGeneral.innerHTML = '';
    });
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    errorGeneral.innerHTML = '';
    const valorCorreo = correo.value.trim().toLowerCase();
    mostrarErrorCampo(correo, valorCorreo ? '' : 'Escribe tu correo electrónico.');
    mostrarErrorCampo(contrasena, contrasena.value ? '' : 'Escribe tu contraseña.');
    if (!valorCorreo || !contrasena.value) {
      (valorCorreo ? contrasena : correo).focus();
      return;
    }

    const intentos = sesion.leer(CLAVE_INTENTOS) ?? { fallidos: 0, hasta: 0 };
    if (Date.now() < intentos.hasta) {
      const segundos = Math.ceil((intentos.hasta - Date.now()) / 1000);
      errorGeneral.innerHTML = `${icono('circle-alert')}<p>Hubo varios intentos seguidos. Espera ${segundos} segundos e inténtalo de nuevo.</p>`;
      return;
    }
    if (!window.crypto?.subtle) {
      errorGeneral.innerHTML = `${icono('circle-alert')}<p>Este navegador no permite verificar la contraseña en esta página. Ábrela desde la dirección https del sitio.</p>`;
      return;
    }

    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    boton.querySelector('span').textContent = 'Verificando…';
    // La huella se calcula siempre, también con un correo equivocado: tarda lo mismo en ambos casos.
    const calculada = await huella(contrasena.value);
    const correcto = iguales(valorCorreo, adminPanel.correo) && iguales(calculada, adminPanel.huella);
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    boton.querySelector('span').textContent = 'Ingresar';

    if (correcto) {
      sesion.borrar(CLAVE_INTENTOS);
      const actual = { correo: adminPanel.correo, desde: Date.now(), ultimaActividad: Date.now() };
      sesion.guardar(CLAVE_SESION, actual);
      await abrirPanel(actual);
      document.getElementById('contenido')?.focus();
      return;
    }

    const fallidos = intentos.fallidos + 1;
    const bloquear = fallidos >= MAX_INTENTOS;
    sesion.guardar(CLAVE_INTENTOS, bloquear ? { fallidos: 0, hasta: Date.now() + ESPERA } : { fallidos, hasta: 0 });
    // Mismo mensaje para correo o contraseña equivocados: no revela cuál falló.
    errorGeneral.innerHTML = `${icono('circle-alert')}<p>${
      bloquear
        ? 'El correo o la contraseña no coinciden. Por seguridad, espera 30 segundos antes de intentarlo de nuevo.'
        : 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.'
    }</p>`;
    contrasena.value = '';
    contrasena.focus();
  });
}

/* ------------------------------------------------------------------ inicio */
const actual = sesionVigente();
if (actual) {
  await abrirPanel(actual);
} else {
  mostrarIngreso();
}
pintarIconos();
