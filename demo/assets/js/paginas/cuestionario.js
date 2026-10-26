/**
 * Cuestionario de prueba: elegir quién responde, antes de empezar, 20 preguntas, revisión y envío.
 * En la demostración no se piden datos y las respuestas solo viven en esta pestaña (sessionStorage).
 */
import { activarDialogo, esc, leerPreferencias, montarChrome, notificar, pintarIconos, sesion } from '../comun.js';
import { icono } from '../iconos.js';
import { CLAVE_CUESTIONARIO, CLAVE_RESULTADO, areaPorId, calcular } from '../motor-demo.js';
import { montarOrbe } from '../orbe.js';
import { cuestionarios } from '../proyecto/cuestionarios.js';
import { camposAcudiente, camposRegistroAdulto, camposRegistroNino } from '../proyecto/registro.js';
import { frasesGuia } from '../proyecto/mensajes.js';

montarChrome({ pagina: 'cuestionario', encabezado: 'cuestionario', pie: false });

const vista = document.getElementById('vista');
const parametros = new URLSearchParams(window.location.search);
const PASOS = ['Quién responde', 'Antes de empezar', 'Preguntas', 'Revisión'];

const estadoInicial = () => ({
  paso: 'elegir',
  modulo: ['adulto', 'nino'].includes(parametros.get('modulo')) ? parametros.get('modulo') : null,
  respuestas: {},
  indice: 0,
  desdeRevision: false,
  hitos: [],
});

let estado = sesion.leer(CLAVE_CUESTIONARIO) ?? estadoInicial();
if (parametros.get('modulo') && estado.paso === 'elegir') estado.modulo = estadoInicial().modulo;
let temporizadorAvance = 0;
let primeraVista = true;

const guardar = () => sesion.guardar(CLAVE_CUESTIONARIO, estado);
const cuestionario = () => cuestionarios[estado.modulo];
const preguntas = () => cuestionario().preguntas;
const respondidas = () => preguntas().filter((p) => estado.respuestas[p.areaId]).length;

function ir(paso, cambios = {}) {
  window.clearTimeout(temporizadorAvance);
  window.speechSynthesis?.cancel();
  estado = { ...estado, ...cambios, paso };
  guardar();
  pintar();
}

/* ------------------------------------------------------------------ piezas */

function pasosHtml(actual) {
  return `<nav class="pasos-cuestionario" aria-label="Avance del registro y el cuestionario">
    <ol>${PASOS.map((nombre, i) => {
      const estadoPaso = i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
      const lector = { hecho: '(completado)', actual: '(paso actual)', pendiente: '(pendiente)' }[estadoPaso];
      return `<li class="pasos-cuestionario__paso pasos-cuestionario__paso--${estadoPaso}" ${i === actual ? 'aria-current="step"' : ''}>
        <span class="pasos-cuestionario__marca" aria-hidden="true">${i < actual ? icono('check') : i + 1}</span>
        <span class="pasos-cuestionario__nombre">${nombre}<span class="sr-only"> ${lector}</span></span>
      </li>`;
    }).join('')}</ol>
  </nav>`;
}

function opcionRadioHtml({ nombre, valor, titulo, detalle = '', iconoNombre = '', tecla = '', marcada = false, deshabilitada = false, insignia = '', clase = '' }) {
  return `<label class="opcion ${clase}">
    <input class="sr-only" type="radio" name="${nombre}" value="${valor}" ${marcada ? 'checked' : ''} ${deshabilitada ? 'disabled' : ''} ${detalle ? `aria-describedby="${nombre}-${valor}-detalle"` : ''}>
    ${iconoNombre ? `<span class="opcion__icono">${icono(iconoNombre, 'icono icono--grande')}</span>` : ''}
    <span class="opcion__texto">
      <span class="opcion__titulo">${esc(titulo)}${insignia ? ` <span class="insignia insignia--neutra">${esc(insignia)}</span>` : ''}</span>
      ${detalle ? `<span class="opcion__detalle" id="${nombre}-${valor}-detalle">${esc(detalle)}</span>` : ''}
    </span>
    ${tecla ? `<span class="opcion__tecla" aria-hidden="true">${tecla}</span>` : ''}
    <span class="opcion__marca" aria-hidden="true">${icono('check')}</span>
  </label>`;
}

const avisoDemo = () => `<div class="aviso aviso--demo">${icono('info', 'icono')}<div class="aviso__cuerpo">
  <p class="aviso__titulo">Esto es una demostración</p>
  <p>No pedimos datos personales y tus respuestas no se guardan ni se envían a nadie, así que nadie te contactará. Si necesitas apoyo, usa las líneas de ayuda.</p>
</div></div>`;

/* ------------------------------------------------------------------ pasos */

function vistaElegir() {
  return `${pasosHtml(0)}
  <div class="cuestionario__cuerpo">
    <h1 tabindex="-1" data-enfocar>¿Quién va a responder?</h1>
    <p class="texto-grande texto-secundario">Cada cuestionario tiene preguntas pensadas para su edad.</p>
    <fieldset class="grupo-opciones">
      <legend class="sr-only">Quién va a responder</legend>
      <div class="opciones">
        ${opcionRadioHtml({ nombre: 'modulo', valor: 'nino', titulo: 'Una niña o un niño', detalle: 'De 6 a 11 años, con un adulto de confianza.', iconoNombre: 'backpack', marcada: estado.modulo === 'nino' })}
        ${opcionRadioHtml({ nombre: 'modulo', valor: 'adolescente', titulo: 'Un adolescente', detalle: 'De 12 a 17 años. Este módulo estará disponible pronto.', iconoNombre: 'school', deshabilitada: true, insignia: 'Próximamente' })}
        ${opcionRadioHtml({ nombre: 'modulo', valor: 'adulto', titulo: 'Una persona adulta', detalle: 'De 18 años en adelante.', iconoNombre: 'user-round', marcada: estado.modulo === 'adulto' })}
      </div>
    </fieldset>
    <p class="texto-pequeno texto-secundario">¿Eres adolescente y necesitas apoyo ahora? <button class="boton boton--enlace" type="button" data-abrir="cajon-ayuda">Ver líneas de ayuda</button></p>
    <div class="cuestionario__acciones">
      <button class="boton boton--primario boton--lg" type="button" data-continuar ${estado.modulo ? '' : 'disabled'}>Continuar</button>
    </div>
  </div>`;
}

function campoVistaPrevia(etiqueta, indice, grupo) {
  const id = `previo-${grupo}-${indice}`;
  if (/sexo/i.test(etiqueta)) {
    return `<div class="campo"><label for="${id}">¿Con qué sexo se identifica?</label><select id="${id}" disabled><option>Hombre</option><option>Mujer</option></select></div>`;
  }
  if (/residencia/i.test(etiqueta)) {
    return `<div class="campo"><label for="${id}">${esc(etiqueta)}</label><select id="${id}" disabled><option>Comuna, barrio o vereda del municipio</option></select></div>`;
  }
  return `<div class="campo"><label for="${id}">${esc(etiqueta)}</label><input id="${id}" type="text" disabled placeholder="En la demostración no se pide"></div>`;
}

function vistaAntes() {
  const nino = estado.modulo === 'nino';
  const campos = nino ? camposRegistroNino : camposRegistroAdulto;
  const queEsperar = [
    ['list-checks', '20 preguntas, una por pantalla.'],
    ['clock', 'Unos 10 minutos.'],
    ['pause', 'Puedes pausar y continuar después.'],
    ['circle-check', 'No hay respuestas correctas o incorrectas.'],
    ['compass', 'Es una orientación, no un diagnóstico.'],
    ['lock', 'Tus respuestas son confidenciales.'],
  ];
  return `${pasosHtml(1)}
  <div class="cuestionario__cuerpo">
    <h1 tabindex="-1" data-enfocar>Antes de empezar</h1>
    ${nino ? `<div class="aviso">${icono('users')}<div class="aviso__cuerpo"><p class="aviso__titulo">Este cuestionario se responde junto a un adulto de confianza</p><p>Puede ser mamá, papá, un cuidador o una cuidadora.</p></div></div>` : ''}
    <ul class="que-esperar">${queEsperar.map(([i, t]) => `<li>${icono(i)}<span>${t}</span></li>`).join('')}</ul>
    <div class="instrucciones">
      <h2>Cómo responder</h2>
      <p>${esc(cuestionario().instrucciones.texto)}</p>
      <p class="texto-pequeno texto-secundario">${
        leerPreferencias().autoAdvance
          ? 'Al elegir una respuesta pasarás automáticamente a la siguiente pregunta. Puedes desactivarlo en Accesibilidad.'
          : 'Elige una respuesta y usa «Siguiente» para avanzar.'
      }</p>
    </div>
    ${avisoDemo()}
    <details class="vista-registro">
      <summary>Así será el registro en la plataforma${icono('chevron-down')}</summary>
      <div class="vista-registro__contenido">
        <p class="texto-secundario">En la versión final, antes de las preguntas se piden estos datos y la autorización para tratarlos. Aquí solo se muestran como referencia.</p>
        <div class="vista-registro__campos">${campos.map((c, i) => campoVistaPrevia(c, i, 'p')).join('')}</div>
        ${nino ? `<p class="aviso__titulo">Datos del adulto responsable</p><div class="vista-registro__campos">${camposAcudiente.map((c, i) => campoVistaPrevia(c, i, 'a')).join('')}</div>` : ''}
        <div class="vista-registro__casillas">
          <label class="casilla"><input type="checkbox" disabled><span>Autorizo el tratamiento de mis datos personales conforme a la política de la Alcaldía.</span></label>
          <label class="casilla"><input type="checkbox" disabled><span>Entiendo que mis respuestas sobre bienestar emocional son datos sensibles, que no estoy obligado(a) a responderlas y que puedo elegir «Prefiero no responder».</span></label>
          ${nino ? '<label class="casilla"><input type="checkbox" disabled><span>Como adulto responsable, autorizo que la niña o el niño responda, y le pregunté si quiere hacerlo.</span></label>' : ''}
        </div>
      </div>
    </details>
    <div class="cuestionario__acciones">
      <button class="boton boton--primario boton--lg" type="button" data-empezar>Empezar el cuestionario</button>
      <button class="boton boton--fantasma" type="button" data-volver>Volver</button>
    </div>
  </div>`;
}

const iconosNino = { si: 'sun', a_veces: 'cloud-sun', no: 'cloud' };

function vistaPregunta() {
  const lista = preguntas();
  const pregunta = lista[estado.indice];
  const area = areaPorId[pregunta.areaId];
  const opciones = cuestionario().opciones;
  const elegida = estado.respuestas[pregunta.areaId];
  const nino = estado.modulo === 'nino';
  const faltan = lista.length - respondidas();
  const minutos = Math.max(1, Math.round((faltan * 30) / 60));
  const ultima = estado.indice === lista.length - 1;
  const progreso = lista
    .map((p, i) => `<span class="${estado.respuestas[p.areaId] ? 'hecho' : ''} ${i === estado.indice ? 'actual' : ''}"></span>`)
    .join('');
  return `<div class="cuestionario__barra">
      <div class="progreso" role="progressbar" aria-label="Avance del cuestionario" aria-valuemin="0" aria-valuemax="${lista.length}" aria-valuenow="${respondidas()}" aria-valuetext="${respondidas()} de ${lista.length} preguntas respondidas">${progreso}</div>
      <p class="cuestionario__estado"><span>Pregunta ${estado.indice + 1} de ${lista.length}</span><span class="texto-secundario">${faltan === 0 ? 'Ya respondiste todas' : `Te ${minutos === 1 ? 'queda' : 'quedan'} unos ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`}</span></p>
    </div>
    <div class="cuestionario__cuerpo ${nino ? 'cuestionario__cuerpo--nino' : ''}">
      <form class="pregunta" data-pregunta>
        <fieldset>
          <legend>
            <span class="area-chip">${icono(area.icono)}${esc(area.nombre)}</span>
            <span class="pregunta__texto" tabindex="-1" data-enfocar>${esc(pregunta.texto)}</span>
          </legend>
          <div class="opciones opciones--respuestas">
            ${opciones
              .map((o, i) =>
                opcionRadioHtml({
                  nombre: 'respuesta',
                  valor: o.valor,
                  titulo: o.etiqueta,
                  iconoNombre: nino ? iconosNino[o.valor] : '',
                  tecla: String(i + 1),
                  marcada: elegida === o.valor,
                  clase: o.valor === 'prefiero_no_responder' ? 'opcion--discreta' : '',
                }),
              )
              .join('')}
          </div>
        </fieldset>
      </form>
      <div class="pregunta__herramientas">
        ${'speechSynthesis' in window ? `<button class="boton boton--fantasma boton--sm" type="button" data-escuchar>${icono('volume-2')}Escuchar pregunta</button>` : ''}
        <p class="texto-pequeno texto-secundario" data-guardado aria-live="polite">${elegida ? 'Respuesta guardada en esta sesión' : ''}</p>
      </div>
      <div class="cuestionario__acciones cuestionario__acciones--navegacion">
        <button class="boton boton--secundario" type="button" data-anterior ${estado.indice === 0 && !estado.desdeRevision ? 'disabled' : ''}>${icono('arrow-left')}Anterior</button>
        <button class="boton boton--primario" type="button" data-siguiente ${elegida ? '' : 'disabled'}>${estado.desdeRevision ? 'Volver a la revisión' : ultima ? 'Revisar mis respuestas' : 'Siguiente'}</button>
      </div>
      <p class="atajos texto-pequeno texto-secundario">Atajos: teclas 1 a ${opciones.length} para elegir, Enter para continuar.</p>
    </div>`;
}

function vistaRevision() {
  const opciones = Object.fromEntries(cuestionario().opciones.map((o) => [o.valor, o.etiqueta]));
  return `${pasosHtml(3)}
  <div class="cuestionario__cuerpo">
    <h1 tabindex="-1" data-enfocar>Revisa tus respuestas</h1>
    <p class="texto-grande texto-secundario">Puedes cambiar cualquier respuesta antes de enviar.</p>
    <ol class="revision">${preguntas()
      .map((p, i) => {
        const valor = estado.respuestas[p.areaId];
        return `<li class="revision__item">
          <span class="revision__numero" aria-hidden="true">${i + 1}</span>
          <div class="revision__texto">
            <p class="texto-pequeno texto-secundario">${esc(areaPorId[p.areaId].nombre)}</p>
            <p>${esc(p.texto)}</p>
            <p class="revision__respuesta"><span class="sr-only">Tu respuesta: </span>${esc(opciones[valor] ?? 'Sin responder')}</p>
          </div>
          <button class="boton boton--enlace" type="button" data-cambiar="${i}" aria-label="Cambiar la respuesta de la pregunta ${i + 1}">Cambiar</button>
        </li>`;
      })
      .join('')}</ol>
    <div class="aviso">${icono('info')}<div class="aviso__cuerpo"><p>Al enviar no podrás modificar tus respuestas.</p></div></div>
    <div class="cuestionario__acciones">
      <button class="boton boton--primario boton--lg" type="button" data-enviar>Enviar mis respuestas</button>
      <button class="boton boton--fantasma" type="button" data-cambiar="${preguntas().length - 1}">Volver a las preguntas</button>
    </div>
  </div>`;
}

function vistaProcesando() {
  return `<div class="procesando">
    <div class="procesando__orbe"><div class="orbe" data-orbe><img class="orbe__poster" src="assets/img/orbe.webp" alt="" width="880" height="880"></div></div>
    <h1 tabindex="-1" data-enfocar>Estamos preparando tu orientación…</h1>
    <p class="texto-grande texto-secundario">${esc(frasesGuia[1])}</p>
  </div>`;
}

/* ------------------------------------------------------------------ pintar y eventos */

function pintar() {
  const vistas = { elegir: vistaElegir, antes: vistaAntes, pregunta: vistaPregunta, revision: vistaRevision, procesando: vistaProcesando };
  if (estado.paso !== 'elegir' && !estado.modulo) estado = estadoInicial();
  vista.innerHTML = (vistas[estado.paso] ?? vistaElegir)();
  vista.classList.remove('cuestionario--entrando');
  void vista.offsetWidth;
  vista.classList.add('cuestionario--entrando');
  if (!primeraVista) vista.querySelector('[data-enfocar]')?.focus({ preventScroll: false });
  else if (estado.paso !== 'elegir') vista.querySelector('[data-enfocar]')?.focus({ preventScroll: true });
  primeraVista = false;
  window.scrollTo({ top: 0 });
  if (estado.paso === 'procesando') procesar();
}

function elegirRespuesta(valor) {
  const pregunta = preguntas()[estado.indice];
  estado.respuestas = { ...estado.respuestas, [pregunta.areaId]: valor };
  guardar();
  vista.querySelector('[data-guardado]').textContent = 'Respuesta guardada en esta sesión';
  vista.querySelector('[data-siguiente]').disabled = false;
  const marcado = vista.querySelector(`input[value="${valor}"]`);
  if (marcado) marcado.checked = true;
  vista.querySelectorAll('.progreso span')[estado.indice]?.classList.add('hecho');
  window.clearTimeout(temporizadorAvance);
  if (leerPreferencias().autoAdvance) temporizadorAvance = window.setTimeout(siguiente, 500);
}

function siguiente() {
  const lista = preguntas();
  if (!estado.respuestas[lista[estado.indice].areaId]) return;
  if (estado.desdeRevision || estado.indice === lista.length - 1) return ir('revision', { desdeRevision: false });
  const indice = estado.indice + 1;
  const hito = { 5: 0, 10: 1, 15: 2 }[indice];
  if (hito !== undefined && !estado.hitos.includes(indice)) {
    estado.hitos = [...estado.hitos, indice];
    const mensajes = ['Vas por buen camino. Sigue avanzando.', 'Vas por la mitad. Cada pequeño paso cuenta.', 'Ya casi terminas. Cuidarte también es importante.'];
    notificar(mensajes[hito]);
  }
  ir('pregunta', { indice });
}

function anterior() {
  if (estado.desdeRevision) return ir('revision', { desdeRevision: false });
  if (estado.indice > 0) ir('pregunta', { indice: estado.indice - 1 });
}

function procesar() {
  montarOrbe(vista.querySelector('[data-orbe]'), { interactivo: false, calma: true });
  const inicio = performance.now();
  let resultado;
  try {
    resultado = calcular(estado.modulo, estado.respuestas);
  } catch (error) {
    vista.querySelector('h1').textContent = 'No pudimos preparar tu orientación';
    vista.querySelector('p').textContent = `${error.message}. Revisa tus respuestas e inténtalo de nuevo.`;
    return;
  }
  sesion.guardar(CLAVE_RESULTADO, { modulo: estado.modulo, respuestas: estado.respuestas, fecha: new Date().toISOString(), resultadoGeneral: resultado.resultadoGeneral });
  const espera = Math.max(0, 1800 - (performance.now() - inicio));
  window.setTimeout(() => {
    sesion.borrar(CLAVE_CUESTIONARIO);
    window.location.href = 'resultados.html';
  }, espera);
}

function leerTexto() {
  const pregunta = preguntas()[estado.indice];
  const opciones = cuestionario().opciones.map((o) => o.etiqueta).join(', ');
  const voz = new SpeechSynthesisUtterance(`${pregunta.texto}. Opciones: ${opciones}.`);
  voz.lang = 'es-CO';
  const disponible = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
  if (disponible) voz.voice = disponible;
  voz.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(voz);
}

vista.addEventListener('change', (evento) => {
  const entrada = evento.target;
  if (entrada.name === 'modulo') {
    estado.modulo = entrada.value;
    guardar();
    vista.querySelector('[data-continuar]').disabled = false;
  } else if (entrada.name === 'respuesta') {
    elegirRespuesta(entrada.value);
  }
});

vista.addEventListener('click', (evento) => {
  const objetivo = evento.target.closest('button');
  if (!objetivo) return;
  if (objetivo.matches('[data-continuar]') && estado.modulo) ir('antes');
  else if (objetivo.matches('[data-volver]')) ir('elegir');
  else if (objetivo.matches('[data-empezar]')) ir('pregunta', { indice: 0 });
  else if (objetivo.matches('[data-siguiente]')) siguiente();
  else if (objetivo.matches('[data-anterior]')) anterior();
  else if (objetivo.matches('[data-escuchar]')) leerTexto();
  else if (objetivo.matches('[data-cambiar]')) ir('pregunta', { indice: Number(objetivo.dataset.cambiar), desdeRevision: objetivo.textContent.trim() === 'Cambiar' });
  else if (objetivo.matches('[data-enviar]')) ir('procesando');
});

// Atajos de teclado en las preguntas: 1 a 4 eligen; Enter continúa.
document.addEventListener('keydown', (evento) => {
  if (estado.paso !== 'pregunta' || evento.altKey || evento.ctrlKey || evento.metaKey) return;
  if (evento.target.closest('dialog, summary, a, button:not([data-siguiente])')) return;
  const opciones = cuestionario().opciones;
  const numero = Number(evento.key);
  if (numero >= 1 && numero <= opciones.length) {
    evento.preventDefault();
    elegirRespuesta(opciones[numero - 1].valor);
  } else if (evento.key === 'Enter' && estado.respuestas[preguntas()[estado.indice].areaId]) {
    evento.preventDefault();
    siguiente();
  }
});

// «Pausar y salir»: confirma y deja el avance guardado en esta pestaña.
const dialogoSalir = document.createElement('dialog');
dialogoSalir.className = 'dialogo';
dialogoSalir.setAttribute('aria-labelledby', 'salir-titulo');
dialogoSalir.innerHTML = `<div class="dialogo__interior">
  <h2 id="salir-titulo">¿Pausar y salir?</h2>
  <p>Tu avance queda guardado. En la plataforma podrás continuar cuando quieras ingresando con tu correo; en esta demostración se conserva mientras no cierres esta pestaña.</p>
  <div class="grupo-botones">
    <a class="boton boton--primario" href="./">Salir</a>
    <button class="boton boton--secundario" type="button" data-cerrar>Seguir respondiendo</button>
  </div>
</div>`;
activarDialogo(dialogoSalir);
document.body.append(dialogoSalir);
document.addEventListener('click', (evento) => {
  const salir = evento.target.closest('[data-salir-cuestionario]');
  if (!salir || estado.paso === 'elegir') return;
  evento.preventDefault();
  dialogoSalir.showModal();
});

pintarIconos();
pintar();
