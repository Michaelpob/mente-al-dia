import type { RolPanel } from '@/features/panel/acceso/estado-sesion';
import type { TipoDispositivo } from '@/features/visitas/dispositivo';
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

/** panel_visitas (D-80): visitas al sitio del periodo, por tipo de dispositivo. */
export interface Visitas {
  total: number;
  /** El periodo de los mismos días que termina justo antes de este. */
  anterior: number;
  porDispositivo: Record<TipoDispositivo, number>;
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
  /** Nombre de la institución (D-86). */
  institucion?: string | null;
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
  /** La institución del cuestionario (D-86). */
  institucion?: { id: string; nombre: string } | null;
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
  institucion?: string | null;
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

/** panel_cuentas_resumen (D-77): cuentas públicas, actividad y progreso. */
export interface ResumenCuentas {
  total: number;
  nuevas30: number;
  activas7: number;
  activas30: number;
  enCurso: number;
  completados: number;
  conProgreso: number;
  porSemana: { semana: string; cuentas: number }[];
}

/** Avance de una actividad, sin el contenido guardado. */
export interface ActividadCuenta {
  actividad: string;
  avance: number;
  completado: boolean;
  actualizadoEn: string;
}

export interface FilaCuenta {
  id: string;
  nombre: string;
  usuario: string;
  /** Enmascarado: «an***@correo.co». */
  correo: string | null;
  creadoEn: string;
  ultimoIngreso: string | null;
  ultimaActividad: string | null;
  actividades: ActividadCuenta[];
}

export interface PaginaCuentas {
  total: number;
  pagina: number;
  tamano: number;
  filas: FilaCuenta[];
}

// ---------------------------------------------------------------------------------- censo (D-83)

/** Periodo, módulo y lugar del censo. Sin fechas, cuenta todo el historial. */
export interface FiltrosCenso {
  desde: string | null;
  hasta: string | null;
  modulo: Modulo | null;
  lugar: string | null;
}

export const ORDENES_CENSO = ['falencias', 'fortalezas', 'fecha', 'nombre'] as const;
export type OrdenCenso = (typeof ORDENES_CENSO)[number];

/** La lista del censo: los filtros del resumen más búsqueda, área y nivel, orden y página. */
export interface FiltrosPersonasCenso extends FiltrosCenso {
  q: string;
  area: AreaId | null;
  nivel: Nivel | null;
  orden: OrdenCenso;
  pagina: number;
  tamano: number;
}

/** panel_censo: cada persona cuenta una vez, con su cuestionario más reciente del periodo. */
export interface Censo {
  personas: number;
  cuestionarios: number;
  conPrioridad: number;
  conFalencias: number;
  porModulo: Partial<Record<Modulo, number>>;
  /** Personas por institución (D-86): en la vista de todas, una fila por institución. */
  porInstitucion?: { institucion: string; n: number }[];
  resultados: Partial<Record<ResultadoGeneral, number>>;
  porEdad: { edad: number; n: number }[];
  /** Solo niñas, niños y adolescentes; null es «prefirió no responder». */
  porSexo: { sexo: string | null; n: number }[];
  porGrado: { grado: string; n: number }[];
  lugares: { lugar: string; n: number }[];
  areas: { area: AreaId; nivel: Nivel; n: number }[];
}

/** panel_censo_personas: una fila por persona, sin contacto. */
export interface PersonaCenso {
  id: string;
  codigo: string;
  creadoEn: string;
  nombre: string;
  modulo: Modulo;
  edad: number | null;
  sexo: string | null;
  grado: string | null;
  lugar: string | null;
  institucion?: string | null;
  resultadoGeneral: ResultadoGeneral;
  prioridad: boolean;
  niveles: Partial<Record<AreaId, Nivel>>;
  cuestionarios: number;
  fortalezas: number;
  porFortalecer: number;
  falencias: number;
  sinDato: number;
}

export interface PaginaCenso {
  total: number;
  pagina: number;
  tamano: number;
  filas: PersonaCenso[];
}

/** panel_censo_exportar (D-84): el censo completo para el Excel, sin contacto y con auditoría. */
export interface ExportacionCenso {
  generadoEn: string;
  generadoPor: string | null;
  /** La institución descargada; null o ausente es «todas» (solo el administrador general). */
  institucion?: string | null;
  resumen: Censo;
  personas: PersonaCenso[];
}

// ---------------------------------------------------------------------------------- instituciones (D-86)

/** panel_instituciones: cada institución con su enlace y su actividad del periodo. */
export interface InstitucionPanel {
  id: string;
  nombre: string;
  /** Lo que va después de ?sede= en el enlace. */
  slug: string;
  activa: boolean;
  creadoEn: string;
  cuestionarios: number;
  personas: number;
  prioritariosPendientes: number;
  ultimoCuestionario: string | null;
  visitas: number;
  administradores: number;
}

export interface CambioInstitucion {
  id: string;
  nombre: string;
  slug: string;
  activa: boolean;
}

/** panel_administradores: el general y los administradores de cada institución. */
export interface AdministradorPanel {
  id: string;
  nombre: string;
  correo: string | null;
  rol: RolPanel;
  activo: boolean;
  institucion: { id: string; nombre: string; activa: boolean } | null;
  creadoEn: string;
  ultimoIngreso: string | null;
  dobleFactor: boolean;
}

export interface InvitacionAdministrador {
  nombre: string;
  correo: string;
  rol: 'superadministrador' | 'administrador_institucional';
  /** Obligatoria para el administrador institucional; el general no lleva. */
  institucionId?: string;
}

export interface FiltrosAuditoria {
  desde: string | null;
  hasta: string | null;
  accion: string | null;
  pagina: number;
}

export interface FilaAuditoria {
  id: number;
  ocurridoEn: string;
  actor: string | null;
  actorRol: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  institucion: string | null;
  detalle: Record<string, unknown> | null;
}

export interface PaginaAuditoria {
  total: number;
  pagina: number;
  tamano: number;
  /** Todas las acciones registradas, para el filtro. */
  acciones: string[];
  filas: FilaAuditoria[];
}
