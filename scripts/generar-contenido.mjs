// Genera el contenido tipado de src/content/v1/ a partir del JSON fuente (Anexos A a I).
// Los textos se copian tal cual: no se corrige estilo, signos, tildes ni comillas.
// Uso: node scripts/generar-contenido.mjs  (y luego pnpm format)
import { readFileSync, writeFileSync } from 'node:fs';

const raiz = new URL('../src/content/v1/', import.meta.url);
const fuente = JSON.parse(
  readFileSync(new URL('fuente/mente-al-dia-contenido.json', raiz), 'utf8'),
);

const s = (valor) => JSON.stringify(valor);
const cabecera = `// GENERADO por scripts/generar-contenido.mjs desde fuente/mente-al-dia-contenido.json.
// No editar a mano: cambia el JSON fuente (con validación del equipo profesional) y vuelve a generar.
`;

const idPorNumero = new Map(fuente.areas.map((area) => [area.numero, area.id]));
const estado = (valor) => (valor === 'documento_base' ? 'validado' : 'borrador');
const VERSION = fuente.meta.version_contenido;

// ── Áreas y dimensiones (Anexo A) ────────────────────────────────────────────
const areas = fuente.areas.map(
  (a) => `  {
    numero: ${a.numero},
    id: ${s(a.id)},
    nombre: ${s(a.nombre)},
    dimension: ${s(a.dimension)},
    icono: ${s(a.icono_sugerido)},
    descripcionCorta: ${s(a.descripcion_corta)},
    sensible: ${a.sensible},
  }`,
);
const dimensiones = fuente.dimensiones.lista.map(
  (d) => `  {
    id: ${s(d.id)},
    nombre: ${s(d.nombre)},
    areas: [${d.areas.map((n) => s(idPorNumero.get(n))).join(', ')}],
  }`,
);
writeFileSync(
  new URL('areas.ts', raiz),
  `${cabecera}import type { Area, Dimension } from '@/types/dominio';

/** Nombres: DOCUMENTO BASE. Ids, dimensiones, íconos y descripciones: PROPUESTA. Sensibles: PROVISIONAL. */
export const areasMeta = { version: ${s(VERSION)}, fuenteNombres: 'documento base', fuenteResto: 'propuesta' } as const;

export const areas: readonly Area[] = [
${areas.join(',\n')},
];

/** Dimensiones (PROPUESTA): solo organizan la visualización; no alteran el cálculo. */
export const dimensiones: readonly Dimension[] = [
${dimensiones.join(',\n')},
];
`,
);

// ── Cuestionarios (Anexos B y C) ─────────────────────────────────────────────
function preguntas(modulo) {
  return fuente.areas
    .map((a) => `    { numero: ${a.numero}, areaId: ${s(a.id)}, texto: ${s(a.pregunta[modulo])} }`)
    .join(',\n');
}
function opciones(modulo) {
  return fuente.opciones_respuesta[modulo]
    .map((o) => `    { valor: ${s(o.valor)}, etiqueta: ${s(o.etiqueta)} }`)
    .join(',\n');
}
writeFileSync(
  new URL('cuestionarios.ts', raiz),
  `${cabecera}import type { Cuestionario, Modulo } from '@/types/dominio';

/** Preguntas y opciones: DOCUMENTO BASE. Instrucciones: BORRADOR (el documento base no las trae). */
export const cuestionarioAdulto: Cuestionario = {
  modulo: 'adulto',
  version: ${s(VERSION)},
  estado: 'validado',
  fuente: 'documento base',
  activo: ${fuente.modulos.adulto.activo},
  edad: ${s(fuente.modulos.adulto.edad)},
  instrucciones: { texto: ${s(fuente.instrucciones.adulto.texto)}, estado: 'borrador' },
  opciones: [
${opciones('adulto')},
  ],
  preguntas: [
${preguntas('adulto')},
  ],
};

/** Preguntas y opciones: DOCUMENTO BASE. Instrucciones: adaptación web (PROPUESTA) del texto original. */
export const cuestionarioNino: Cuestionario = {
  modulo: 'nino',
  version: ${s(VERSION)},
  estado: 'validado',
  fuente: 'documento base',
  activo: ${fuente.modulos.nino.activo},
  edad: ${s(fuente.modulos.nino.edad)},
  instrucciones: { texto: ${s(fuente.instrucciones.nino.texto)}, estado: 'borrador' },
  opciones: [
${opciones('nino')},
  ],
  preguntas: [
${preguntas('nino')},
  ],
};

/** Texto original del documento base para niñas y niños (en papel: «marca con una X»). */
export const instruccionesNinoOriginal = ${s(fuente.instrucciones.nino.original)};

/** Módulo PREPARADO y DESACTIVADO: sin cuestionario validado. No se inventan preguntas. */
export const cuestionarioAdolescente: Cuestionario = {
  modulo: 'adolescente',
  version: ${s(VERSION)},
  estado: 'borrador',
  fuente: 'propuesta',
  activo: ${fuente.modulos.adolescente.activo},
  edad: ${s(fuente.modulos.adolescente.edad)},
  instrucciones: { texto: '', estado: 'borrador' },
  opciones: [],
  preguntas: [],
};

export const cuestionarios: Record<Modulo, Cuestionario> = {
  adulto: cuestionarioAdulto,
  nino: cuestionarioNino,
  adolescente: cuestionarioAdolescente,
};
`,
);

// ── Mensajes (Anexos D, E, F y H) ────────────────────────────────────────────
const mensajesAdulto = fuente.areas.map(
  (a) => `  ${a.id}: {
    adecuado: ${s(a.mensajes_adulto.adecuado)},
    por_fortalecer: ${s(a.mensajes_adulto.por_fortalecer)},
    requiere_atencion: ${s(a.mensajes_adulto.requiere_atencion)},
  }`,
);
const mg = fuente.mensajes_generales;
const niveles = fuente.niveles;
writeFileSync(
  new URL('mensajes.ts', raiz),
  `${cabecera}import type { AreaId, Nivel } from '@/types/dominio';

type NivelConMensaje = Exclude<Nivel, 'sin_dato'>;

/** D.1 Mensajes por área y nivel (adultos). DOCUMENTO BASE: texto literal. */
export const mensajesAdulto: Record<AreaId, Record<NivelConMensaje, string>> = {
${mensajesAdulto.join(',\n')},
};

/** D.2 Mensajes sencillos por nivel para niñas y niños. BORRADOR. */
export const mensajesNinoPorNivel: Record<NivelConMensaje, string> = {
  adecuado: ${s(fuente.mensajes_nino_por_nivel.adecuado)},
  por_fortalecer: ${s(fuente.mensajes_nino_por_nivel.por_fortalecer)},
  requiere_atencion: ${s(fuente.mensajes_nino_por_nivel.requiere_atencion)},
};

/** E.1 Mensaje general (adultos): DOCUMENTO BASE. E.2 Complementarios: BORRADOR. */
export const mensajesGenerales = {
  adulto: {
    favorable: ${s(mg.adulto.favorable)},
    por_fortalecer: ${s(mg.adulto.por_fortalecer)},
    desafios: ${s(mg.adulto.desafios)},
  },
  nino: {
    favorable: ${s(mg.nino.favorable)},
    por_fortalecer: ${s(mg.nino.por_fortalecer)},
    desafios: ${s(mg.nino.desafios)},
  },
  adultoAcompanante: ${s(mg.adulto_acompanante.texto)},
  insuficiente: ${s(mg.insuficiente.texto)},
  /** Contiene el marcador {respondidas}. */
  parcial: ${s(mg.parcial.texto)},
  /** PROPUESTA. */
  sinDatoArea: ${s(mg.sin_dato_area.texto)},
} as const;

export const estadoMensajesGenerales = {
  adulto: ${s(estado(mg.adulto.estado))},
  nino: 'borrador',
  adultoAcompanante: 'borrador',
  insuficiente: 'borrador',
  parcial: 'borrador',
  sinDatoArea: 'borrador',
} as const;

/** F.1 Atención especial: DOCUMENTO BASE. F.2 Versión para niñas y niños: BORRADOR. */
export const mensajesAtencionEspecial = {
  adulto: ${s(fuente.atencion_especial.mensaje.texto)},
  nino: ${s(fuente.atencion_especial.mensaje_nino.texto)},
} as const;

/** H.1 Frases guía. DOCUMENTO BASE. */
export const frasesGuia = [
${fuente.frases_guia.lista.map((f) => `  ${s(f)}`).join(',\n')},
] as const;

/** H.2 Lenguaje: usar y evitar frente al participante. PROPUESTA. */
export const lenguaje = {
  usar: [${fuente.lenguaje.usar.map(s).join(', ')}],
  evitar: [${fuente.lenguaje.evitar.map(s).join(', ')}],
} as const;

/** H.3 Definición de los niveles. DOCUMENTO BASE («sin dato»: PROPUESTA). */
export const definicionesNiveles: Record<Nivel, { etiqueta: string; definicion: string }> = {
  adecuado: { etiqueta: ${s(niveles.adecuado.etiqueta)}, definicion: ${s(niveles.adecuado.definicion)} },
  por_fortalecer: { etiqueta: ${s(niveles.por_fortalecer.etiqueta)}, definicion: ${s(niveles.por_fortalecer.definicion)} },
  requiere_atencion: { etiqueta: ${s(niveles.requiere_atencion.etiqueta)}, definicion: ${s(niveles.requiere_atencion.definicion)} },
  sin_dato: { etiqueta: ${s(niveles.sin_dato.etiqueta)}, definicion: ${s(niveles.sin_dato.definicion)} },
};
`,
);

// ── Registro (Anexo C.1 y documento base) ────────────────────────────────────
writeFileSync(
  new URL('registro.ts', raiz),
  `${cabecera}
/** Campos del registro de adultos. DOCUMENTO BASE. */
export const camposRegistroAdulto = [${fuente.registro_adulto_campos.campos.map(s).join(', ')}] as const;

/** Encabezado del cuestionario infantil. DOCUMENTO BASE. */
export const camposRegistroNino = [${fuente.registro_nino_campos.campos.map(s).join(', ')}] as const;

/** Datos del adulto responsable. PROPUESTA. */
export const camposAcudiente = [${fuente.registro_nino_campos.acudiente.campos.map(s).join(', ')}] as const;
`,
);

// ── Reglas provisionales (Anexo G) ───────────────────────────────────────────
const r = fuente.reglas_provisionales;
writeFileSync(
  new URL('reglas.ts', raiz),
  `${cabecera}import type { ReglasResultados } from '@/types/dominio';

/**
 * Reglas de resultados ${r.version}.
 * ${r.estado}.
 * En la Fase 4 pasan a la tabla de configuración, con versión y nota de validación.
 */
export const reglasProvisionales: ReglasResultados = {
  version: ${s(r.version)},
  puntos: { si: ${r.puntos.si}, a_veces: ${r.puntos.a_veces}, no: ${r.puntos.no} },
  umbralFavorable: ${r.umbral_favorable},
  umbralDesafios: ${r.umbral_desafios},
  minRespondidas: ${r.min_respondidas},
  minRespondidasCompleto: ${r.min_respondidas_completo},
  ajusteAtencionNoFavorable: ${r.ajuste_atencion_no_favorable},
  ajusteAtencionDesafios: ${r.ajuste_atencion_desafios},
  areasSensibles: [${r.areas_sensibles.map((n) => s(idPorNumero.get(n))).join(', ')}],
  prioridadPorDesafios: ${r.prioridad_por_desafios},
};
`,
);

console.log('Contenido generado en src/content/v1/');
