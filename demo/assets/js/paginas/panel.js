/**
 * Vista previa del panel profesional (Fases 8 y 9) con datos ficticios.
 * Sobria y sin 3D: tablero, registros, prioritarios, seguimiento y herramientas de gestión.
 */
import { activarDialogo, esc, logoMenteAlDia, montarChrome, notificar, pintarIconos } from '../comun.js';
import { icono } from '../iconos.js';
import { ESTADOS, HOY, LUGARES, PROFESIONALES, registros } from '../datos-ficticios.js';
import { areaPorId, instrumentoDe } from '../motor-demo.js';
import { areas } from '../proyecto/areas.js';
import { cuestionarios } from '../proyecto/cuestionarios.js';
import { etiquetasNivel } from '../rueda.js';

montarChrome({ pagina: 'panel', encabezado: 'ninguno', pie: false });
pintarIconos();
document.querySelector('[data-panel-marca]').innerHTML = `<div>${logoMenteAlDia(false)}<p class="panel__titulo">Panel profesional</p></div>
  <button class="boton boton--fantasma boton--icono panel__accesibilidad-movil" type="button" data-abrir="cajon-accesibilidad" aria-label="Accesibilidad">${icono('accessibility', 'icono icono--grande')}</button>`;

document.querySelector('[data-panel-aviso]').insertAdjacentHTML('afterbegin', icono('info'));

const vistaRaiz = document.querySelector('[data-panel-vista]');
const DIA = 24 * 60 * 60 * 1000;
const fechaCorta = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' });
const fechaLarga = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const ETIQUETA_GENERAL = {
  favorable: 'Favorable',
  por_fortalecer: 'Por fortalecer',
  desafios: 'Desafíos actuales',
  insuficiente: 'Insuficiente',
};
const COLOR_GENERAL = { favorable: '#86A992', por_fortalecer: '#D8B76E', desafios: '#CC8C78', insuficiente: '#C9CED2' };
const INSIGNIA_GENERAL = { favorable: 'adecuado', por_fortalecer: 'por_fortalecer', desafios: 'requiere_atencion', insuficiente: 'sin_dato' };
const MODULO = { adulto: 'Adulto', nino: 'Niña o niño' };
const ESTADO = Object.fromEntries(ESTADOS);

const insigniaGeneral = (g) => `<span class="insignia insignia--${INSIGNIA_GENERAL[g]}">${ETIQUETA_GENERAL[g]}</span>`;
const insigniaNivel = (n) => `<span class="insignia insignia--${n}">${etiquetasNivel[n]}</span>`;

/* Estado de la vista (todo en memoria: la demo no guarda nada). */
const filtros = { semanas: 12, modulo: 'todos', lugar: 'todos' };
const tabla = { busqueda: '', modulo: 'todos', general: 'todos', prioridad: 'todos', area: null, pagina: 0 };
const notasPorCodigo = new Map();

function filtrados() {
  const desde = HOY.getTime() - filtros.semanas * 7 * DIA;
  return registros.filter(
    (r) =>
      r.fecha.getTime() > desde &&
      (filtros.modulo === 'todos' || r.modulo === filtros.modulo) &&
      (filtros.lugar === 'todos' || r.lugar === filtros.lugar),
  );
}

/* ------------------------------------------------------------------ menú lateral */
const SECCIONES = [
  ['tablero', 'Tablero', 'layout-dashboard'],
  ['registros', 'Registros', 'list'],
  ['prioritarios', 'Prioritarios', 'flag'],
  ['seguimiento', 'Seguimiento', 'square-kanban'],
  ['herramientas', 'Reportes y configuración', 'settings'],
];
const menu = document.querySelector('[data-panel-menu]');
let seccion = SECCIONES.some(([id]) => `#${id}` === window.location.hash) ? window.location.hash.slice(1) : 'tablero';

function pintarMenu() {
  const pendientes = registros.filter((r) => r.estado === 'pendiente').length;
  menu.innerHTML = SECCIONES.map(
    ([id, texto, i]) =>
      `<li><a href="#${id}" class="panel__enlace" ${id === seccion ? 'aria-current="page"' : ''}>${icono(i)}<span>${texto}</span>${
        id === 'prioritarios' ? `<span class="panel__contador" aria-label="${pendientes} pendientes">${pendientes}</span>` : ''
      }</a></li>`,
  ).join('');
  // En el celular el menú es una fila desplazable: la sección activa queda a la vista.
  const activo = menu.querySelector('[aria-current]');
  if (activo && menu.scrollWidth > menu.clientWidth) menu.scrollLeft = activo.parentElement.offsetLeft - 16;
}

window.addEventListener('hashchange', () => {
  const id = window.location.hash.slice(1);
  if (SECCIONES.some(([s]) => s === id)) {
    seccion = id;
    pintar();
    vistaRaiz.querySelector('h1')?.focus();
  }
});

/* ------------------------------------------------------------------ gráficas (SVG hechas a mano) */

function graficaSemanas(lista) {
  const semanas = filtros.semanas;
  const conteo = Array.from({ length: semanas }, () => 0);
  lista.forEach((r) => {
    const indice = semanas - 1 - Math.floor((HOY - r.fecha) / (7 * DIA));
    if (indice >= 0 && indice < semanas) conteo[indice] += 1;
  });
  // La gráfica se dibuja al ancho real de la tarjeta para que el texto conserve su tamaño.
  const W = Math.round(Math.min(1200, Math.max(280, vistaRaiz.clientWidth - 42)));
  const H = W < 560 ? 220 : 260;
  const m = { izq: 36, der: 16, arr: 16, aba: 34 };
  const maximo = Math.max(10, Math.ceil(Math.max(...conteo) / 10) * 10);
  const x = (i) => m.izq + (i * (W - m.izq - m.der)) / Math.max(1, semanas - 1);
  const y = (v) => H - m.aba - (v / maximo) * (H - m.arr - m.aba);
  const puntos = conteo.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const etiquetas = conteo.map((_, i) => fechaCorta.format(new Date(HOY.getTime() - (semanas - 1 - i) * 7 * DIA)));
  const lineasGuia = [0, 0.5, 1].map((f) => {
    const v = Math.round(maximo * f);
    return `<line x1="${m.izq}" x2="${W - m.der}" y1="${y(v)}" y2="${y(v)}" stroke="var(--piedra-200)"/><text x="${m.izq - 8}" y="${y(v) + 4}" text-anchor="end" class="grafica__eje">${v}</text>`;
  });
  return `<figure class="grafica">
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="g-semanas-titulo">
      <title id="g-semanas-titulo">Aplicaciones por semana: de ${conteo[0]} a ${conteo[semanas - 1]} en la última semana</title>
      ${lineasGuia.join('')}
      <polygon points="${m.izq},${H - m.aba} ${puntos.join(' ')} ${x(semanas - 1)},${H - m.aba}" fill="var(--pizarra-100)"/>
      <polyline points="${puntos.join(' ')}" fill="none" stroke="var(--pizarra-700)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${conteo.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="var(--blanco)" stroke="var(--pizarra-700)" stroke-width="2"><title>${etiquetas[i]}: ${v}</title></circle>`).join('')}
      ${etiquetas
        .map((e, i) => {
          // Una etiqueta cada tantas semanas como quepan (unos 80 px por etiqueta), siempre con la última.
          const paso = Math.max(1, Math.ceil(semanas / Math.floor((W - m.izq - m.der) / 80)));
          const visible = (semanas - 1 - i) % paso === 0;
          const ancla = i === semanas - 1 ? 'end' : i === 0 ? 'start' : 'middle';
          return visible ? `<text x="${x(i) + (ancla === 'end' ? 4 : ancla === 'start' ? -4 : 0)}" y="${H - 10}" text-anchor="${ancla}" class="grafica__eje">${e}</text>` : '';
        })
        .join('')}
    </svg>
    <details class="grafica__datos"><summary>Ver datos</summary>
      <table class="tabla-simple"><thead><tr><th scope="col">Semana que termina</th><th scope="col">Aplicaciones</th></tr></thead>
      <tbody>${conteo.map((v, i) => `<tr><td>${etiquetas[i]}</td><td>${v}</td></tr>`).join('')}</tbody></table>
    </details>
  </figure>`;
}

function barrasGenerales(lista) {
  const grupos = [
    ['adulto', 'Personas adultas'],
    ['nino', 'Niñas y niños'],
  ].filter(([m]) => filtros.modulo === 'todos' || filtros.modulo === m);
  const claves = ['favorable', 'por_fortalecer', 'desafios', 'insuficiente'];
  return `<div class="barras-apiladas">${grupos
    .map(([modulo, nombre]) => {
      const del = lista.filter((r) => r.modulo === modulo);
      const segmentos = claves
        .map((k) => [k, del.filter((r) => r.resultado.resultadoGeneral === k).length])
        .filter(([, n]) => n > 0);
      return `<div class="barras-apiladas__fila">
        <p class="barras-apiladas__nombre">${nombre} <span class="texto-secundario">(${del.length})</span></p>
        <div class="barras-apiladas__barra" role="img" aria-label="${esc(`${nombre}: ${segmentos.map(([k, n]) => `${ETIQUETA_GENERAL[k]} ${pct(n, del.length)} %`).join(', ')}`)}">
          ${segmentos.map(([k, n]) => `<span style="flex:${n};background:${COLOR_GENERAL[k]}" title="${ETIQUETA_GENERAL[k]}: ${n}">${pct(n, del.length) >= 9 ? `${pct(n, del.length)} %` : ''}</span>`).join('')}
        </div>
      </div>`;
    })
    .join('')}
    <ul class="leyenda">${claves.map((k) => `<li><span class="leyenda__muestra" style="background:${COLOR_GENERAL[k]}"></span>${ETIQUETA_GENERAL[k]}</li>`).join('')}</ul>
  </div>`;
}

function mapaCalor(lista) {
  const filas = areas
    .map((area) => {
      const conDato = lista.filter((r) => r.resultado.niveles[area.id] !== 'sin_dato');
      const n = (nivel) => conDato.filter((r) => r.resultado.niveles[area.id] === nivel).length;
      return { area, adecuado: pct(n('adecuado'), conDato.length), por_fortalecer: pct(n('por_fortalecer'), conDato.length), requiere_atencion: pct(n('requiere_atencion'), conDato.length) };
    })
    .sort((a, b) => b.requiere_atencion - a.requiere_atencion || b.por_fortalecer - a.por_fortalecer);
  const fondo = { adecuado: '134 169 146', por_fortalecer: '216 183 110', requiere_atencion: '204 140 120' };
  const celda = (nivel, valor) => `<td style="background:rgb(${fondo[nivel]} / ${(0.08 + (valor / 100) * 0.9).toFixed(2)})">${valor} %</td>`;
  return `<div class="tabla-desplazable"><table class="mapa-calor">
    <caption class="sr-only">Porcentaje de personas en cada nivel, por área. Ordenado de mayor a menor «requiere atención».</caption>
    <thead><tr><th scope="col">Área</th><th scope="col">Adecuado</th><th scope="col">Por fortalecer</th><th scope="col">Requiere atención</th></tr></thead>
    <tbody>${filas
      .map(
        (f) => `<tr><th scope="row"><button class="mapa-calor__area" type="button" data-ver-area="${f.area.id}">${icono(f.area.icono)}${esc(f.area.nombre)}</button></th>${celda('adecuado', f.adecuado)}${celda('por_fortalecer', f.por_fortalecer)}${celda('requiere_atencion', f.requiere_atencion)}</tr>`,
      )
      .join('')}</tbody>
  </table></div>`;
}

function barrasLugares(lista) {
  const conteo = LUGARES.map((l) => [l, lista.filter((r) => r.lugar === l).length]).sort((a, b) => b[1] - a[1]);
  const maximo = Math.max(1, ...conteo.map(([, n]) => n));
  return `<ul class="barras-lugares">${conteo
    .map(([lugar, n]) => `<li><span>${lugar}</span><span class="barras-lugares__pista"><span style="width:${((n / maximo) * 100).toFixed(1)}%"></span></span><span class="barras-lugares__valor">${n}</span></li>`)
    .join('')}</ul>`;
}

/* ------------------------------------------------------------------ vistas */

function selectorHtml(id, etiqueta, opciones, valor) {
  return `<div class="campo campo--compacto"><label for="${id}">${etiqueta}</label><select id="${id}" data-filtro-tablero="${id}">${opciones
    .map(([v, t]) => `<option value="${v}" ${v === String(valor) ? 'selected' : ''}>${t}</option>`)
    .join('')}</select></div>`;
}

function vistaTablero() {
  const lista = filtrados();
  const total = lista.length;
  const pendientes = lista.filter((r) => r.estado === 'pendiente').length;
  const prioridad = lista.filter((r) => r.resultado.prioridad).length;
  const favorable = lista.filter((r) => r.resultado.resultadoGeneral === 'favorable').length;
  const anterior = registros.filter((r) => {
    const d = (HOY - r.fecha) / DIA;
    return d >= filtros.semanas * 7 && d < filtros.semanas * 14;
  }).length;
  return `<div class="panel__cabecera">
      <h1 tabindex="-1">Tablero</h1>
      <p class="texto-secundario">Resultados orientativos. No constituyen diagnóstico.</p>
    </div>
    <form class="panel__filtros" aria-label="Filtros del tablero">
      ${selectorHtml('semanas', 'Periodo', [['12', 'Últimas 12 semanas'], ['4', 'Últimas 4 semanas']], filtros.semanas)}
      ${selectorHtml('modulo', 'Módulo', [['todos', 'Todos'], ['adulto', 'Personas adultas'], ['nino', 'Niñas y niños']], filtros.modulo)}
      ${selectorHtml('lugar', 'Lugar de residencia', [['todos', 'Todos'], ...LUGARES.map((l) => [l, l])], filtros.lugar)}
    </form>
    <ul class="indicadores">
      <li class="indicador"><p class="indicador__valor">${total}</p><p class="indicador__nombre">Aplicaciones</p><p class="texto-pequeno texto-secundario">${filtros.semanas === 12 ? 'Desde agosto' : `Antes: ${anterior} en el periodo anterior`}</p></li>
      <li class="indicador indicador--alerta"><p class="indicador__valor">${pendientes}</p><p class="indicador__nombre">Prioritarios pendientes</p><p class="texto-pequeno texto-secundario">${prioridad} con prioridad en total</p></li>
      <li class="indicador"><p class="indicador__valor">${pct(favorable, total)} %</p><p class="indicador__nombre">Resultado favorable</p><p class="texto-pequeno texto-secundario">${favorable} de ${total}</p></li>
      <li class="indicador"><p class="indicador__valor">${pct(lista.filter((r) => r.modulo === 'nino').length, total)} %</p><p class="indicador__nombre">Niñas y niños</p><p class="texto-pequeno texto-secundario">El resto, personas adultas</p></li>
    </ul>
    <div class="panel__rejilla">
      <section class="panel__tarjeta panel__tarjeta--ancha" aria-labelledby="t-semanas"><h2 id="t-semanas">Aplicaciones por semana</h2>${graficaSemanas(lista)}</section>
      <section class="panel__tarjeta" aria-labelledby="t-general"><h2 id="t-general">Resultado general por módulo</h2>${barrasGenerales(lista)}</section>
      <section class="panel__tarjeta" aria-labelledby="t-lugares"><h2 id="t-lugares">Aplicaciones por lugar</h2>${barrasLugares(lista)}</section>
      <section class="panel__tarjeta panel__tarjeta--ancha" aria-labelledby="t-calor">
        <div class="panel__tarjeta-cabecera"><h2 id="t-calor">Mapa de calor de las 20 áreas</h2><p class="texto-pequeno texto-secundario">Porcentaje de personas en cada nivel. Elige un área para ver sus registros en «requiere atención».</p></div>
        ${mapaCalor(lista)}
      </section>
    </div>`;
}

const POR_PAGINA = 12;

function registrosFiltrados() {
  const texto = tabla.busqueda.trim().toLowerCase();
  return registros.filter(
    (r) =>
      (!texto || r.codigo.toLowerCase().includes(texto) || r.lugar.toLowerCase().includes(texto)) &&
      (tabla.modulo === 'todos' || r.modulo === tabla.modulo) &&
      (tabla.general === 'todos' || r.resultado.resultadoGeneral === tabla.general) &&
      (tabla.prioridad === 'todos' || (tabla.prioridad === 'si') === r.resultado.prioridad) &&
      (!tabla.area || r.resultado.niveles[tabla.area] === 'requiere_atencion'),
  );
}

function filaRegistro(r) {
  return `<tr>
    <th scope="row"><button class="boton boton--enlace" type="button" data-detalle="${r.codigo}">${r.codigo}</button></th>
    <td>${fechaCorta.format(r.fecha)}</td>
    <td>${MODULO[r.modulo]}</td>
    <td>${r.lugar}</td>
    <td>${insigniaGeneral(r.resultado.resultadoGeneral)}</td>
    <td class="numero">${r.resultado.conteo.requiereAtencion}</td>
    <td>${r.resultado.prioridad ? `<span class="prioridad">${icono('flag')}Sí</span>` : '<span class="texto-secundario">No</span>'}</td>
    <td>${r.estado ? ESTADO[r.estado] : '<span class="texto-secundario">—</span>'}</td>
  </tr>`;
}

function vistaRegistros() {
  const lista = registrosFiltrados();
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  tabla.pagina = Math.min(tabla.pagina, paginas - 1);
  const pagina = lista.slice(tabla.pagina * POR_PAGINA, (tabla.pagina + 1) * POR_PAGINA);
  const sel = (id, opciones, valor) =>
    `<select id="${id}" data-filtro-tabla="${id}">${opciones.map(([v, t]) => `<option value="${v}" ${v === valor ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
  return `<div class="panel__cabecera">
      <h1 tabindex="-1">Registros</h1>
      <p class="texto-secundario">${lista.length} de ${registros.length} registros. En la plataforma se busca por nombre, correo o teléfono; en esta demo, por código o lugar.</p>
    </div>
    <form class="panel__filtros" role="search" aria-label="Buscar y filtrar registros">
      <div class="campo campo--compacto campo--busqueda"><label for="busqueda">Buscar</label><input id="busqueda" type="search" value="${esc(tabla.busqueda)}" placeholder="Ej.: MD-0150 o Comuna 2" data-filtro-tabla="busqueda"></div>
      <div class="campo campo--compacto"><label for="modulo-t">Módulo</label>${sel('modulo-t', [['todos', 'Todos'], ['adulto', 'Adulto'], ['nino', 'Niña o niño']], tabla.modulo)}</div>
      <div class="campo campo--compacto"><label for="general">Resultado general</label>${sel('general', [['todos', 'Todos'], ...Object.entries(ETIQUETA_GENERAL)], tabla.general)}</div>
      <div class="campo campo--compacto"><label for="prioridad">Prioridad</label>${sel('prioridad', [['todos', 'Todos'], ['si', 'Con prioridad'], ['no', 'Sin prioridad']], tabla.prioridad)}</div>
    </form>
    ${tabla.area ? `<p class="filtro-activo">Área en «requiere atención»: <strong>${esc(areaPorId[tabla.area].nombre)}</strong> <button class="boton boton--enlace" type="button" data-quitar-area>Quitar filtro</button></p>` : ''}
    <div class="tabla-desplazable panel__tarjeta panel__tarjeta--tabla">
      <table class="tabla-registros">
        <caption class="sr-only">Registros (página ${tabla.pagina + 1} de ${paginas})</caption>
        <thead><tr><th scope="col">Código</th><th scope="col">Fecha</th><th scope="col">Módulo</th><th scope="col">Lugar</th><th scope="col">Resultado general</th><th scope="col">Áreas para cuidar</th><th scope="col">Prioridad</th><th scope="col">Seguimiento</th></tr></thead>
        <tbody>${pagina.length ? pagina.map(filaRegistro).join('') : '<tr><td colspan="8">No hay registros con estos filtros. Prueba quitando alguno.</td></tr>'}</tbody>
      </table>
    </div>
    <nav class="paginacion" aria-label="Páginas de registros" ${paginas === 1 ? 'hidden' : ''}>
      <button class="boton boton--secundario boton--sm" type="button" data-pagina="-1" ${tabla.pagina === 0 ? 'disabled' : ''}>${icono('chevron-left')}Anterior</button>
      <p class="texto-pequeno" aria-live="polite">Página ${tabla.pagina + 1} de ${paginas}</p>
      <button class="boton boton--secundario boton--sm" type="button" data-pagina="1" ${tabla.pagina >= paginas - 1 ? 'disabled' : ''}>Siguiente${icono('chevron-right')}</button>
    </nav>`;
}

function vistaPrioritarios() {
  const lista = registros.filter((r) => r.estado === 'pendiente').sort((a, b) => b.diasSinGestion - a.diasSinGestion);
  return `<div class="panel__cabecera">
      <h1 tabindex="-1">Prioritarios</h1>
      <p class="texto-secundario">Casos con prioridad que aún nadie ha gestionado, del más antiguo al más reciente. La alerta aparece a los 3 días sin gestión.</p>
    </div>
    <ul class="prioritarios">${lista
      .map(
        (r) => `<li class="prioritario ${r.diasSinGestion >= 3 ? 'prioritario--alerta' : ''}">
          <div>
            <p class="prioritario__codigo">${r.codigo} <span class="texto-secundario texto-pequeno">${MODULO[r.modulo]}, ${r.lugar}</span></p>
            <ul class="prioritario__motivos">${r.resultado.motivosPrioridad.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
          </div>
          <p class="prioritario__dias">${r.diasSinGestion === 0 ? 'Hoy' : `${r.diasSinGestion} ${r.diasSinGestion === 1 ? 'día' : 'días'} sin gestión`}</p>
          <button class="boton boton--secundario boton--sm" type="button" data-detalle="${r.codigo}">Ver detalle</button>
        </li>`,
      )
      .join('')}</ul>`;
}

function vistaSeguimiento() {
  const conEstado = registros.filter((r) => r.estado);
  return `<div class="panel__cabecera">
      <h1 tabindex="-1">Seguimiento</h1>
      <p class="texto-secundario">Cada caso con prioridad avanza por estos estados. Cambia el estado con el selector de cada tarjeta. En la plataforma también se puede arrastrar y soltar, y cerrar un caso pide un motivo.</p>
    </div>
    <div class="tablero-seguimiento">${ESTADOS.map(([id, nombre]) => {
      const casos = conEstado.filter((r) => r.estado === id);
      return `<section class="columna-seguimiento" aria-labelledby="col-${id}">
        <h2 id="col-${id}">${nombre} <span class="pestana__cuenta">${casos.length}</span></h2>
        <ul>${casos
          .slice(0, 6)
          .map(
            (r) => `<li class="caso">
              <button class="boton boton--enlace caso__codigo" type="button" data-detalle="${r.codigo}">${r.codigo}</button>
              <p class="texto-pequeno texto-secundario">${MODULO[r.modulo]}, ${fechaCorta.format(r.fecha)}${r.asignado ? `<br>Asignado a ${r.asignado}` : ''}</p>
              <label class="sr-only" for="estado-${r.codigo}">Estado de ${r.codigo}</label>
              <select id="estado-${r.codigo}" data-cambiar-estado="${r.codigo}">${ESTADOS.map(([v, t]) => `<option value="${v}" ${v === r.estado ? 'selected' : ''}>${t}</option>`).join('')}</select>
            </li>`,
          )
          .join('')}${casos.length > 6 ? `<li class="texto-pequeno texto-secundario">Y ${casos.length - 6} más</li>` : ''}</ul>
      </section>`;
    }).join('')}</div>`;
}

function vistaHerramientas() {
  const bloques = [
    ['file-down', 'Reportes', 'Reporte agregado (sin datos personales) en Excel, CSV o PDF, por periodo, módulo, lugar, área y nivel. El reporte nominal solo lo genera el superadministrador, con motivo, y queda en la auditoría.'],
    ['sliders-horizontal', 'Configuración', 'Reglas de resultados con versión y nota de validación, líneas de ayuda, lugares de residencia, módulos activos, modo kiosco y textos legales. Todo sin tocar código.'],
    ['users', 'Usuarios del panel', 'Invitaciones por correo con rol (profesional, consulta o superadministrador), doble factor obligatorio y desactivación de cuentas.'],
    ['rotate-ccw-clock', 'Auditoría', 'Registro de solo lectura de quién vio datos de contacto, exportó, cambió una regla o un estado, y cuándo.'],
    ['shield-check', 'Derechos de los titulares', 'Bandeja de solicitudes de consulta, actualización o eliminación de datos (hábeas data), con anonimización y registro.'],
  ];
  return `<div class="panel__cabecera">
      <h1 tabindex="-1">Reportes y configuración</h1>
      <p class="texto-secundario">Herramientas de gestión que trae la plataforma (Fase 9). Aquí puedes probar la exportación del reporte agregado.</p>
    </div>
    <div class="panel__tarjeta exportar">
      <div><h2>Reporte agregado de prueba</h2><p class="texto-secundario">Porcentaje de personas por nivel en cada área, con los filtros del tablero. No contiene datos personales.</p></div>
      <button class="boton boton--primario" type="button" data-exportar>${icono('file-down')}Descargar CSV</button>
    </div>
    <ul class="herramientas">${bloques
      .map(([i, t, d]) => `<li class="panel__tarjeta"><span class="herramientas__icono">${icono(i, 'icono icono--grande')}</span><h2>${t}</h2><p class="texto-secundario">${d}</p></li>`)
      .join('')}</ul>`;
}

/* ------------------------------------------------------------------ detalle de un registro */

const cajonDetalle = document.createElement('dialog');
cajonDetalle.className = 'cajon cajon--ancho';
cajonDetalle.setAttribute('aria-labelledby', 'detalle-titulo');
activarDialogo(cajonDetalle);
document.body.append(cajonDetalle);

function abrirDetalle(codigo) {
  const r = registros.find((x) => x.codigo === codigo);
  if (!r) return;
  const opciones = Object.fromEntries(cuestionarios[r.modulo].opciones.map((o) => [o.valor, o.etiqueta]));
  const notas = notasPorCodigo.get(codigo) ?? (r.estado && r.estado !== 'pendiente' ? [{ autor: r.asignado, texto: 'Primer contacto telefónico realizado. Se compartieron rutas de apoyo.', fecha: new Date(r.fecha.getTime() + 2 * DIA) }] : []);
  notasPorCodigo.set(codigo, notas);
  cajonDetalle.innerHTML = `<div class="cajon__interior">
    <div class="cajon__cabecera">
      <div><h2 id="detalle-titulo">${r.codigo}</h2><p class="texto-secundario texto-pequeno">${MODULO[r.modulo]}${r.edad ? `, ${r.edad} años` : ''}. ${r.lugar}. ${fechaLarga.format(r.fecha)}</p></div>
      <button class="boton boton--fantasma boton--icono" type="button" data-cerrar aria-label="Cerrar">${icono('x', 'icono icono--grande')}</button>
    </div>
    <div class="detalle">
      <section class="detalle__resumen">
        ${insigniaGeneral(r.resultado.resultadoGeneral)}
        <p><strong>Índice:</strong> ${r.resultado.indice ?? '—'} de 100 <span class="texto-secundario texto-pequeno">(solo visible para profesionales)</span></p>
        <p class="texto-pequeno">${r.resultado.conteo.adecuado} adecuado, ${r.resultado.conteo.porFortalecer} por fortalecer, ${r.resultado.conteo.requiereAtencion} requiere atención${r.resultado.conteo.sinDato ? `, ${r.resultado.conteo.sinDato} sin dato` : ''}.</p>
      </section>
      ${r.resultado.motivosPrioridad.length ? `<div class="aviso aviso--apoyo">${icono('flag')}<div class="aviso__cuerpo"><p class="aviso__titulo">Motivos de prioridad</p><ul class="lista-puntos">${r.resultado.motivosPrioridad.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div></div>` : ''}
      <section>
        <h3>Datos de contacto</h3>
        <p class="texto-secundario texto-pequeno" data-contacto>Ocultos. Mostrarlos queda registrado en la auditoría.</p>
        <button class="boton boton--secundario boton--sm" type="button" data-mostrar-contacto>${icono('eye')}Mostrar datos de contacto</button>
      </section>
      ${r.estado ? `<section>
        <h3>Seguimiento</h3>
        <div class="campo campo--compacto"><label for="detalle-estado">Estado</label><select id="detalle-estado" data-cambiar-estado="${r.codigo}">${ESTADOS.map(([v, t]) => `<option value="${v}" ${v === r.estado ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
        <p class="texto-pequeno texto-secundario">Asignado a: ${r.asignado ?? 'sin asignar'}</p>
        <ul class="notas" data-notas>${notas.map((n) => `<li><p>${esc(n.texto)}</p><p class="texto-pequeno texto-secundario">${esc(n.autor)}, ${fechaLarga.format(n.fecha)}</p></li>`).join('')}</ul>
        <form class="nota-nueva" data-nota="${r.codigo}">
          <label for="nota-texto">Agregar nota</label>
          <textarea id="nota-texto" rows="3" required placeholder="Las notas no se editan ni se borran."></textarea>
          <button class="boton boton--primario boton--sm" type="submit">Agregar nota</button>
        </form>
      </section>` : ''}
      <section>
        <h3>Respuestas y niveles por área</h3>
        <div class="tabla-desplazable"><table class="tabla-simple">
          <thead><tr><th scope="col">Área</th><th scope="col">Respuesta</th><th scope="col">Nivel</th></tr></thead>
          <tbody>${instrumentoDe(r.modulo)
            .preguntas.map((p) => `<tr><th scope="row">${esc(areaPorId[p.areaId].nombre)}</th><td>${esc(opciones[r.respuestas[p.areaId]])}</td><td>${insigniaNivel(r.resultado.niveles[p.areaId])}</td></tr>`)
            .join('')}</tbody>
        </table></div>
      </section>
      <button class="boton boton--fantasma" type="button" data-imprimir-ficha>${icono('printer')}Imprimir ficha (confidencial)</button>
    </div>
  </div>`;
  cajonDetalle.dataset.codigo = codigo;
  cajonDetalle.showModal();
}

// Al cerrar el detalle, la vista se actualiza (por si cambió el estado) y el foco vuelve al registro.
cajonDetalle.addEventListener('close', () => {
  const codigo = cajonDetalle.dataset.codigo;
  pintar();
  vistaRaiz.querySelector(`[data-detalle="${codigo}"]`)?.focus();
});

cajonDetalle.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-mostrar-contacto]')) {
    cajonDetalle.querySelector('[data-contacto]').textContent =
      'En la demostración no hay datos de contacto. En la plataforma verías aquí el correo y el teléfono, y esta consulta quedaría en la auditoría.';
    notificar('Acción registrada en la auditoría (simulado)');
  }
  if (evento.target.closest('[data-imprimir-ficha]')) window.print();
});

cajonDetalle.addEventListener('submit', (evento) => {
  const formulario = evento.target.closest('[data-nota]');
  if (!formulario) return;
  evento.preventDefault();
  const texto = formulario.querySelector('textarea').value.trim();
  if (!texto) return;
  const notas = notasPorCodigo.get(formulario.dataset.nota);
  notas.push({ autor: 'Profesional de demostración', texto, fecha: new Date() });
  cajonDetalle.querySelector('[data-notas]').insertAdjacentHTML(
    'beforeend',
    `<li><p>${esc(texto)}</p><p class="texto-pequeno texto-secundario">Profesional de demostración, ahora</p></li>`,
  );
  formulario.querySelector('textarea').value = '';
  notificar('Nota agregada');
});

/* ------------------------------------------------------------------ eventos */

function exportarCsv() {
  const lista = filtrados();
  const filas = [['Área', 'Personas con dato', 'Adecuado (%)', 'Por fortalecer (%)', 'Requiere atención (%)']];
  areas.forEach((area) => {
    const conDato = lista.filter((r) => r.resultado.niveles[area.id] !== 'sin_dato');
    const n = (nivel) => pct(conDato.filter((r) => r.resultado.niveles[area.id] === nivel).length, conDato.length);
    filas.push([area.nombre, conDato.length, n('adecuado'), n('por_fortalecer'), n('requiere_atencion')]);
  });
  const csv = '﻿' + filas.map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const enlace = document.createElement('a');
  enlace.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  enlace.download = 'mente-al-dia-reporte-agregado-demo.csv';
  enlace.click();
  URL.revokeObjectURL(enlace.href);
  notificar('Reporte descargado (datos ficticios)');
}

document.addEventListener('change', (evento) => {
  const objetivo = evento.target;
  if (objetivo.matches('[data-filtro-tablero]')) {
    const clave = objetivo.dataset.filtroTablero;
    filtros[clave] = clave === 'semanas' ? Number(objetivo.value) : objetivo.value;
    pintar(clave);
  } else if (objetivo.matches('[data-filtro-tabla]') && objetivo.type !== 'search') {
    tabla[{ 'modulo-t': 'modulo' }[objetivo.id] ?? objetivo.id] = objetivo.value;
    tabla.pagina = 0;
    pintar(objetivo.id);
  } else if (objetivo.matches('[data-cambiar-estado]')) {
    const r = registros.find((x) => x.codigo === objetivo.dataset.cambiarEstado);
    r.estado = objetivo.value;
    if (r.estado !== 'pendiente' && !r.asignado) r.asignado = PROFESIONALES[0];
    notificar(`${r.codigo}: ${ESTADO[r.estado]}. Cambio registrado en la auditoría (simulado).`);
    pintarMenu();
    if (!cajonDetalle.open) pintar(objetivo.id);
  }
});

vistaRaiz.addEventListener('input', (evento) => {
  if (evento.target.id !== 'busqueda') return;
  tabla.busqueda = evento.target.value;
  tabla.pagina = 0;
  const posicion = evento.target.selectionStart;
  pintar('busqueda');
  const campo = vistaRaiz.querySelector('#busqueda');
  campo.setSelectionRange(posicion, posicion);
});

vistaRaiz.addEventListener('submit', (evento) => evento.preventDefault());

vistaRaiz.addEventListener('click', (evento) => {
  const detalle = evento.target.closest('[data-detalle]');
  if (detalle) return abrirDetalle(detalle.dataset.detalle);
  const area = evento.target.closest('[data-ver-area]');
  if (area) {
    Object.assign(tabla, { area: area.dataset.verArea, pagina: 0, busqueda: '', general: 'todos', prioridad: 'todos', modulo: 'todos' });
    window.location.hash = 'registros';
    return;
  }
  if (evento.target.closest('[data-quitar-area]')) {
    tabla.area = null;
    return pintar();
  }
  const pagina = evento.target.closest('[data-pagina]');
  if (pagina) {
    tabla.pagina += Number(pagina.dataset.pagina);
    pintar();
    vistaRaiz.querySelector('.tabla-registros')?.scrollIntoView({ block: 'start' });
    return;
  }
  if (evento.target.closest('[data-exportar]')) exportarCsv();
});

/** Vuelve a pintar la sección; si se indica, devuelve el foco al control que cambió. */
function pintar(idEnfoque = null) {
  pintarMenu();
  const vistas = { tablero: vistaTablero, registros: vistaRegistros, prioritarios: vistaPrioritarios, seguimiento: vistaSeguimiento, herramientas: vistaHerramientas };
  vistaRaiz.innerHTML = vistas[seccion]();
  if (idEnfoque) vistaRaiz.querySelector(`#${CSS.escape(idEnfoque)}`)?.focus();
}

pintar();

// La gráfica de semanas se vuelve a dibujar si cambia mucho el ancho (girar el celular, cambiar la ventana).
let anchoPrevio = vistaRaiz.clientWidth;
let esperaAncho;
window.addEventListener('resize', () => {
  clearTimeout(esperaAncho);
  esperaAncho = setTimeout(() => {
    if (seccion === 'tablero' && Math.abs(vistaRaiz.clientWidth - anchoPrevio) > 40) pintar();
    anchoPrevio = vistaRaiz.clientWidth;
  }, 200);
});
