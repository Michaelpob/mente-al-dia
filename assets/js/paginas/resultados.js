/**
 * Resultados: mensaje general, rueda de bienestar, mensajes por área, ruta de apoyo inmediato
 * (cuando el motor la activa), recursos y versión imprimible.
 * Los textos salen del contenido del proyecto; el cálculo, del mismo motor de la plataforma.
 */
import { esc, listaLineasHtml, montarChrome, pintarIconos, sesion } from '../comun.js';
import { icono } from '../iconos.js';
import { CLAVE_RESULTADO, calcular } from '../motor-demo.js';
import { lineasAyuda } from '../proyecto/lineas-ayuda.js';
import { frasesGuia, mensajesAdulto, mensajesAtencionEspecial, mensajesGenerales, mensajesNinoPorNivel } from '../proyecto/mensajes.js';
import { activarRueda, etiquetasNivel, leyendaNivelesHtml, ordenRueda, ruedaHtml } from '../rueda.js';

montarChrome({ pagina: 'resultados' });
const contenedor = document.getElementById('vista-resultados');

/* ------------------------------------------------------------------ ejemplos para la demostración */
const todas = (valor) => Object.fromEntries(ordenRueda.map(({ area }) => [area.id, valor]));
const EJEMPLOS = {
  1: {
    titulo: 'Persona adulta con aspectos por fortalecer',
    modulo: 'adulto',
    respuestas: {
      ...todas('si'),
      ...Object.fromEntries(
        ['actividad_fisica_recreacion', 'equilibrio_responsabilidades_descanso', 'seguridad_entorno', 'perspectiva_futuro', 'proposito_sentido_vida', 'afrontamiento_consumo_sustancias', 'busqueda_ayuda', 'funcionamiento_cotidiano', 'bienestar_psicologico_general'].map((id) => [id, 'a_veces']),
      ),
    },
  },
  2: {
    titulo: 'Persona adulta con ruta de apoyo inmediato',
    modulo: 'adulto',
    respuestas: {
      ...todas('si'),
      sueno_descanso: 'a_veces',
      manejo_estres: 'a_veces',
      equilibrio_responsabilidades_descanso: 'a_veces',
      regulacion_emocional: 'no',
      perspectiva_futuro: 'prefiero_no_responder',
    },
  },
  3: {
    titulo: 'Niña o niño con resultado favorable',
    modulo: 'nino',
    respuestas: { ...todas('si'), sueno_descanso: 'a_veces', concentracion: 'a_veces', actividad_fisica_recreacion: 'a_veces' },
  },
};

const parametros = new URLSearchParams(window.location.search);
const ejemplo = EJEMPLOS[parametros.get('ejemplo')];
const datos = ejemplo ?? sesion.leer(CLAVE_RESULTADO);

const enlacesEjemplos = (actual) =>
  Object.entries(EJEMPLOS)
    .filter(([n]) => n !== actual)
    .map(([n, e]) => `<a class="boton boton--secundario boton--sm" href="resultados.html?ejemplo=${n}">Ver ejemplo: ${esc(e.titulo.toLowerCase())}</a>`)
    .join('');

if (!datos) {
  contenedor.innerHTML = `<section class="contenedor seccion resultados-vacio">
    <span class="resultados-vacio__icono">${icono('list-checks', 'icono icono--grande')}</span>
    <h1>Aún no tienes resultados en esta demostración</h1>
    <p class="texto-grande texto-secundario">Responde el cuestionario de prueba o abre un ejemplo para ver cómo se presentan los resultados.</p>
    <div class="grupo-botones">
      <a class="boton boton--primario boton--lg" href="cuestionario.html">Responder el cuestionario</a>
    </div>
    <div class="grupo-botones">${enlacesEjemplos(null)}</div>
  </section>`;
} else {
  pintarResultados(datos, parametros.get('ejemplo'));
}

/* ------------------------------------------------------------------ resultados */

function pintarResultados({ modulo, respuestas, fecha }, numeroEjemplo) {
  const r = calcular(modulo, respuestas);
  const nino = modulo === 'nino';
  const fechaTexto = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' }).format(fecha ? new Date(fecha) : new Date());
  const general = r.resultadoGeneral;
  const mensajeGeneral =
    general === 'insuficiente' ? mensajesGenerales.insuficiente : (nino ? mensajesGenerales.nino : mensajesGenerales.adulto)[general];
  const tituloGeneral = {
    favorable: 'Tu resultado es favorable',
    por_fortalecer: 'Hay aspectos por fortalecer',
    desafios: 'Algunas áreas necesitan más cuidado',
    insuficiente: 'Necesitamos más respuestas',
  }[general];
  const frase = { favorable: frasesGuia[0], por_fortalecer: frasesGuia[1], desafios: frasesGuia[3], insuficiente: frasesGuia[2] }[general];

  const resumen = [
    [r.conteo.adecuado, r.conteo.adecuado === 1 ? 'fortaleza' : 'fortalezas'],
    [r.conteo.porFortalecer, 'por fortalecer'],
    [r.conteo.requiereAtencion, 'para cuidar primero'],
  ].filter(([n]) => n > 0);
  const resumenTexto =
    resumen.map(([n, t]) => `${n} ${t}`).join(', ').replace(/, ([^,]*)$/, ' y $1') +
    (r.conteo.sinDato ? `. ${r.conteo.sinDato} sin dato` : '');

  const lineasApoyo = lineasAyuda.filter((l) => l.activa && /^\d+$/.test(l.numero)).slice(0, 3);

  const apoyo = r.rutaAtencionEspecial
    ? `<section class="apoyo-inmediato" aria-labelledby="apoyo-titulo">
        <div class="apoyo-inmediato__icono">${icono('heart-handshake', 'icono icono--grande')}</div>
        <div class="apoyo-inmediato__cuerpo">
          <h2 id="apoyo-titulo">Si lo necesitas, hay apoyo ahora mismo</h2>
          <p class="texto-grande">${esc(nino ? mensajesAtencionEspecial.nino : mensajesAtencionEspecial.adulto)}</p>
          ${nino ? `<div class="apoyo-inmediato__acompanante"><p class="aviso__titulo">Para el adulto acompañante</p><p>${esc(mensajesAtencionEspecial.adulto)}</p></div>` : ''}
          <div class="grupo-botones">${lineasApoyo
            .map(
              (l, i) =>
                `<a class="boton ${i === 0 ? 'boton--primario' : 'boton--secundario'}" href="tel:${l.numero}" aria-label="Llamar al ${l.numero}, ${esc(l.nombre)}">${icono('phone')}${i === 0 ? 'Llamar al 123' : l.nombre.includes(l.numero) ? esc(l.nombre) : `${esc(l.nombre)} (${esc(l.numero)})`}</a>`,
            )
            .join('')}</div>
          <p class="texto-pequeno">En la plataforma, este resultado queda marcado para que un profesional de la Alcaldía lo revise con prioridad.</p>
        </div>
      </section>`
    : '';

  const nota =
    general === 'insuficiente'
      ? `<div class="aviso">${icono('info')}<div class="aviso__cuerpo"><p>${esc(mensajesGenerales.insuficiente)}</p></div></div>`
      : r.resultadoParcial
        ? `<div class="aviso">${icono('info')}<div class="aviso__cuerpo"><p>${esc(mensajesGenerales.parcial.replace('{respondidas}', String(r.respondidas)))}</p></div></div>`
        : '';

  const orden = { requiere_atencion: 0, por_fortalecer: 1, adecuado: 2, sin_dato: 3 };
  const tarjetas = ordenRueda
    .map(({ area }) => ({ area, nivel: r.niveles[area.id] }))
    .sort((a, b) => orden[a.nivel] - orden[b.nivel] || a.area.numero - b.area.numero);
  const mensajeArea = (areaId, nivel) => {
    if (nivel === 'sin_dato') return mensajesGenerales.sinDatoArea;
    return nino ? mensajesNinoPorNivel[nivel] : mensajesAdulto[areaId][nivel];
  };
  const iconoNivel = { adecuado: 'circle-check', por_fortalecer: 'circle-dot', requiere_atencion: 'circle-alert', sin_dato: 'circle-minus' };

  const filtros = [
    ['todas', 'Todas', tarjetas.length],
    ['requiere_atencion', 'Para cuidar primero', r.conteo.requiereAtencion],
    ['por_fortalecer', 'Por fortalecer', r.conteo.porFortalecer],
    ['adecuado', 'Tus fortalezas', r.conteo.adecuado],
    ['sin_dato', 'Sin dato', r.conteo.sinDato],
  ].filter(([id, , n]) => id === 'todas' || n > 0);

  contenedor.innerHTML = `
    <section class="resultados-cabecera">
      <div class="contenedor">
        <div class="aviso aviso--demo no-imprimir">${icono('info')}<div class="aviso__cuerpo"><p>${
          numeroEjemplo ? `Ejemplo de demostración: ${esc(EJEMPLOS[numeroEjemplo].titulo.toLowerCase())}.` : 'Resultado de demostración.'
        } Se calculó en tu navegador con el mismo motor de la plataforma y no se guardó ni se envió.</p></div></div>
        ${apoyo}
        <div class="resultados-titulo">
          <p class="antetitulo">${nino ? 'Cuestionario de niñas y niños' : 'Cuestionario de personas adultas'}, ${esc(fechaTexto)}</p>
          <h1>Tus resultados</h1>
          <p class="insignia insignia--marca">${icono('compass')}Orientación, no diagnóstico</p>
        </div>
        <div class="mensaje-general mensaje-general--${general}">
          <h2>${tituloGeneral}</h2>
          <p class="texto-grande">${esc(mensajeGeneral)}</p>
          <p class="mensaje-general__frase">${esc(frase)}</p>
        </div>
        ${nota}
      </div>
    </section>

    <section class="seccion resultados-areas" aria-labelledby="areas-resultado-titulo">
      <div class="contenedor resultados-areas__rejilla">
        <div class="resultados-areas__rueda">
          <h2 id="areas-resultado-titulo">Tus 20 áreas</h2>
          <p class="texto-secundario">${esc(resumenTexto)}.</p>
          <div data-rueda-resultados></div>
          ${leyendaNivelesHtml()}
          <button class="boton boton--enlace no-imprimir" type="button" data-ver-lista aria-expanded="false" aria-controls="tabla-areas">Ver como lista</button>
          <div id="tabla-areas" hidden>
            <table class="tabla-simple">
              <caption class="sr-only">Nivel de cada área</caption>
              <thead><tr><th scope="col">Área</th><th scope="col">Dimensión</th><th scope="col">Nivel</th></tr></thead>
              <tbody>${ordenRueda
                .map(({ area, dimension }) => `<tr><th scope="row">${esc(area.nombre)}</th><td>${esc(dimension.nombre)}</td><td>${etiquetasNivel[r.niveles[area.id]]}</td></tr>`)
                .join('')}</tbody>
            </table>
          </div>
        </div>
        <div class="resultados-areas__detalle">
          <div class="pestanas no-imprimir" role="group" aria-label="Filtrar áreas por nivel">${filtros
            .map(([id, texto, n], i) => `<button class="pestana" type="button" aria-pressed="${i === 0}" data-filtro="${id}">${texto} <span class="sr-only">(${n})</span><span aria-hidden="true" class="pestana__cuenta">${n}</span></button>`)
            .join('')}</div>
          <ul class="tarjetas-area">${tarjetas
            .map(
              ({ area, nivel }) => `<li data-nivel="${nivel}" id="area-${area.id}">
              <details class="tarjeta-area tarjeta-area--${nivel}" ${nivel === 'requiere_atencion' ? 'open' : ''}>
                <summary>
                  <span class="tarjeta-area__icono">${icono(area.icono)}</span>
                  <span class="tarjeta-area__nombre">${esc(area.nombre)}</span>
                  <span class="insignia insignia--${nivel}">${icono(iconoNivel[nivel])}${etiquetasNivel[nivel]}</span>
                  ${icono('chevron-down', 'icono tarjeta-area__flecha')}
                </summary>
                <p class="tarjeta-area__mensaje">${esc(mensajeArea(area.id, nivel))}</p>
              </details>
            </li>`,
            )
            .join('')}</ul>
          ${nino ? `<div class="aviso">${icono('users')}<div class="aviso__cuerpo"><p class="aviso__titulo">Para el adulto acompañante</p><p>${esc(mensajesGenerales.adultoAcompanante)}</p></div></div>` : ''}
        </div>
      </div>
    </section>

    <section class="seccion seccion--alterna no-imprimir" aria-label="Recursos">
      <div class="contenedor recursos">
        <div>
          <h2>Líneas de ayuda</h2>
          <p class="texto-secundario" style="margin:0.5rem 0 1.5rem">Si necesitas hablar con alguien, puedes comunicarte con estas líneas.</p>
          ${listaLineasHtml()}
        </div>
      </div>
    </section>

    <section class="seccion acciones-resultado no-imprimir" aria-label="Qué puedes hacer ahora">
      <div class="contenedor">
        <div class="grupo-botones">
          <button class="boton boton--primario" type="button" data-imprimir>${icono('printer')}Descargar o imprimir</button>
          <a class="boton boton--secundario" href="cuestionario.html" data-repetir>Responder de nuevo</a>
          <a class="boton boton--fantasma" href="panel.html">Ver cómo lo revisa un profesional</a>
        </div>
        <div class="grupo-botones" style="margin-top:1rem">${enlacesEjemplos(numeroEjemplo)}</div>
      </div>
    </section>

    <section class="cierre-resultado">
      <div class="contenedor"><p>${esc(frasesGuia[3])}</p></div>
    </section>

    <p class="contenedor solo-imprimir texto-pequeno">Este resultado es orientativo y no constituye un diagnóstico psicológico ni médico. Si estás en peligro inmediato, llama al 123.</p>`;

  /* Rueda: al elegir un área, se abre su tarjeta. */
  const zonaRueda = contenedor.querySelector('[data-rueda-resultados]');
  const centro = { titulo: 'Tus áreas', detalle: 'Elige una para ver su mensaje' };
  zonaRueda.innerHTML = ruedaHtml({ niveles: r.niveles, animada: true, centro });
  activarRueda(zonaRueda, {
    niveles: r.niveles,
    centro,
    alElegir: (id) => {
      aplicarFiltro('todas');
      const item = document.getElementById(`area-${id}`);
      const detalles = item.querySelector('details');
      detalles.open = true;
      item.scrollIntoView({ block: 'center' });
      detalles.querySelector('summary').focus({ preventScroll: true });
    },
  });

  /* Filtros por nivel */
  const aplicarFiltro = (filtro) => {
    contenedor.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === filtro)));
    contenedor.querySelectorAll('.tarjetas-area > li').forEach((li) => {
      li.hidden = filtro !== 'todas' && li.dataset.nivel !== filtro;
    });
  };
  contenedor.addEventListener('click', (evento) => {
    const filtro = evento.target.closest('[data-filtro]');
    if (filtro) aplicarFiltro(filtro.dataset.filtro);
    const lista = evento.target.closest('[data-ver-lista]');
    if (lista) {
      const tabla = document.getElementById('tabla-areas');
      tabla.hidden = !tabla.hidden;
      lista.setAttribute('aria-expanded', String(!tabla.hidden));
      lista.textContent = tabla.hidden ? 'Ver como lista' : 'Ocultar la lista';
    }
    if (evento.target.closest('[data-imprimir]')) {
      contenedor.querySelectorAll('details').forEach((d) => (d.open = true));
      window.print();
    }
    if (evento.target.closest('[data-repetir]')) sesion.borrar(CLAVE_RESULTADO);
  });

  pintarIconos(contenedor);
}
