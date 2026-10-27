import type { AreaId, Modulo, Nivel, ValorRespuesta } from '@/types/dominio';

/** Tipos de lo que devuelven las consultas del panel (migración 20261027120000, D-68). */

export type ResultadoGeneral = 'favorable' | 'por_fortalecer' | 'desafios' | 'insuficiente';
export type EstadoSeguimiento = 'pendiente' | 'en_contacto' | 'orientado' | 'remitido' | 'cerrado';
export type TipoAutorizacion = 'tratamiento_datos' | 'datos_sensibles' | 'autorizacion_acudiente';

export interface FiltrosTablero {
  /** Días en hora de Colombia, AAAA-MM-DD. */
  desde: string;
  hasta: string;
  modulo: Modulo | null;
  lugar: string | null;
}

export interface Tablero {
  aplicaciones: number;
  aplicacionesAnterior: number;
  personas: number;
  prioritariosPendientes: number;
  resultados: Partial<Record<ResultadoGeneral, number>>;
  porSemana: { semana: string; aplicaciones: number }[];
  porModulo: { modulo: Modulo; resultado: ResultadoGeneral; n: number }[];
  mapaCalor: { area: AreaId; nivel: Nivel; n: number }[];
  lugares: { lugar: string; n: number }[];
  opcionesLugar: string[];
}

export const ORDENES = [
  'fecha',
  'nombre',
  'modulo',
  'lugar',
  'resultado',
  'atencion',
  'prioridad',
  'estado',
] as const;
export type OrdenRegistros = (typeof ORDENES)[number];

export interface FiltrosRegistros {
  q: string;
  desde: string | null;
  hasta: string | null;
  modulo: Modulo | null;
  lugar: string | null;
  resultado: ResultadoGeneral | null;
  area: AreaId | null;
  nivel: Nivel | null;
  prioridad: boolean | null;
  estado: EstadoSeguimiento | null;
  orden: OrdenRegistros;
  descendente: boolean;
  pagina: number;
  tamano: number;
}

export interface FilaRegistro {
  id: string;
  codigo: string;
  creadoEn: string;
  nombre: string;
  modulo: Modulo;
  edad: number | null;
  lugar: string | null;
  resultadoGeneral: ResultadoGeneral;
  atencion: number;
  prioridad: boolean;
  estado: EstadoSeguimiento | null;
  asignado: string | null;
  /** Enmascarados en el servidor («ma***@correo.com», «*** *** **89»). */
  correo: string | null;
  telefono: string | null;
}

export interface PaginaRegistros {
  total: number;
  pagina: number;
  tamano: number;
  filas: FilaRegistro[];
}

export interface Ficha {
  id: string;
  codigo: string;
  creadoEn: string;
  actualizadoEn: string;
  modulo: Modulo;
  nombre: string;
  edad: number | null;
  grado: string | null;
  lugar: string | null;
  correo: string | null;
  telefono: string | null;
  resultadoGeneral: ResultadoGeneral;
  indice: number | null;
  prioridad: boolean;
  rutaAtencionEspecial: boolean;
  resultadoParcial: boolean;
  resultado: {
    niveles?: Partial<Record<AreaId, Nivel>>;
    conteo?: { adecuado: number; porFortalecer: number; requiereAtencion: number; sinDato: number };
    motivosPrioridad?: string[];
    respondidas?: number;
  };
  respuestas: { areaId: AreaId; valor: ValorRespuesta }[];
  reglasVersion: string;
  instrumentoVersion: string;
  estado: EstadoSeguimiento | null;
  asignado: string | null;
  autorizaciones: { tipo: TipoAutorizacion; version: string; aceptadoEn: string }[];
  historial: {
    id: string;
    codigo: string;
    creadoEn: string;
    resultadoGeneral: ResultadoGeneral;
    indice: number | null;
    niveles: Partial<Record<AreaId, Nivel>> | null;
  }[];
}

export interface Prioritario {
  id: string;
  codigo: string;
  creadoEn: string;
  nombre: string;
  modulo: Modulo;
  lugar: string | null;
  resultadoGeneral: ResultadoGeneral;
  motivos: string[];
  asignado: string | null;
  diasSinGestion: number;
}

/** ver_datos_contacto (Fase 4): cada consulta queda en la auditoría. */
export interface DatosContacto {
  nombre: string;
  correo: string | null;
  telefono: string | null;
  lugarResidencia: string | null;
  grado: string | null;
  sexo: string | null;
  acudiente: {
    nombre?: string;
    parentesco?: string;
    correo?: string;
    telefono?: string;
    lugarResidencia?: string;
  } | null;
}
