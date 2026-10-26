// GENERADO por scripts/sincronizar-funciones.mjs desde src/types/dominio.ts. No editar a mano.
/**
 * Tipos del dominio de Mente al Día (Fase 2).
 * Nombres del dominio en español sin tildes, como pide la Fase 0.
 */

export type Modulo = 'nino' | 'adolescente' | 'adulto';

export type ValorRespuesta = 'si' | 'a_veces' | 'no' | 'prefiero_no_responder';

export type Nivel = 'adecuado' | 'por_fortalecer' | 'requiere_atencion' | 'sin_dato';

export type ResultadoGeneral = 'favorable' | 'por_fortalecer' | 'desafios' | 'insuficiente';

export type AreaId =
  | 'bienestar_emocional'
  | 'sueno_descanso'
  | 'energia_vitalidad'
  | 'motivacion_interes'
  | 'manejo_estres'
  | 'red_apoyo'
  | 'relaciones_interpersonales'
  | 'valoracion_respeto'
  | 'concentracion'
  | 'afrontamiento_dificultades'
  | 'regulacion_emocional'
  | 'actividad_fisica_recreacion'
  | 'equilibrio_responsabilidades_descanso'
  | 'seguridad_entorno'
  | 'perspectiva_futuro'
  | 'proposito_sentido_vida'
  | 'afrontamiento_consumo_sustancias'
  | 'busqueda_ayuda'
  | 'funcionamiento_cotidiano'
  | 'bienestar_psicologico_general';

export type DimensionId =
  | 'emociones_mente'
  | 'cuerpo_energia'
  | 'vinculos_apoyo'
  | 'afrontamiento'
  | 'proyecto_vida_entorno';

/** «validado» = texto del documento base; «borrador» = contenido nuevo pendiente de validar. */
export type EstadoContenido = 'validado' | 'borrador';
export type FuenteContenido = 'documento base' | 'propuesta';

export interface MetaContenido {
  version: string;
  estado: EstadoContenido;
  fuente: FuenteContenido;
}

export interface Area {
  numero: number;
  id: AreaId;
  nombre: string;
  dimension: DimensionId;
  /** Nombre del ícono de Lucide (Anexo A, propuesta). */
  icono: string;
  descripcionCorta: string;
  sensible: boolean;
}

export interface Dimension {
  id: DimensionId;
  nombre: string;
  areas: readonly AreaId[];
}

export interface Pregunta {
  numero: number;
  areaId: AreaId;
  texto: string;
  /** En una pregunta invertida «Sí» cuenta como «No» y viceversa (instrumentos futuros). */
  invertida?: boolean;
}

export interface OpcionRespuesta {
  valor: ValorRespuesta;
  etiqueta: string;
}

export interface Cuestionario extends MetaContenido {
  modulo: Modulo;
  activo: boolean;
  edad: string;
  instrucciones: { texto: string; estado: EstadoContenido };
  opciones: readonly OpcionRespuesta[];
  preguntas: readonly Pregunta[];
}

export interface Respuesta {
  areaId: AreaId;
  valor: ValorRespuesta;
}

export interface ReglasResultados {
  version: string;
  /** Puntos por respuesta (la de «Sí» es el máximo de cada área). */
  puntos: { si: number; a_veces: number; no: number };
  umbralFavorable: number;
  umbralDesafios: number;
  minRespondidas: number;
  minRespondidasCompleto: number;
  ajusteAtencionNoFavorable: number;
  ajusteAtencionDesafios: number;
  areasSensibles: readonly AreaId[];
  prioridadPorDesafios: boolean;
}

export interface ConteoNiveles {
  adecuado: number;
  porFortalecer: number;
  requiereAtencion: number;
  sinDato: number;
}

/** Clave del mensaje que corresponde a un área: «modulo.area.nivel». */
export type ClaveMensaje = `${Modulo}.${AreaId}.${Nivel}`;

export interface ResultadoAplicacion {
  niveles: Record<AreaId, Nivel>;
  mensajes: Record<AreaId, ClaveMensaje>;
  conteo: ConteoNiveles;
  respondidas: number;
  puntos: number;
  /** 0 a 100. SOLO para profesionales: nunca se muestra al participante. */
  indice: number | null;
  resultadoGeneral: ResultadoGeneral;
  resultadoParcial: boolean;
  rutaAtencionEspecial: boolean;
  prioridad: boolean;
  motivosPrioridad: string[];
  reglasVersion: string;
  instrumentoVersion: string;
}
