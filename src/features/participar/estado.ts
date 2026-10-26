import { cuestionarios } from '@/content/v1/cuestionarios';
import type { AreaId, ValorRespuesta } from '@/types/dominio';
import {
  esModuloDisponible,
  faltanAutorizaciones,
  preguntasDe,
  sinAutorizaciones,
  validarRegistro,
  type Autorizaciones,
  type GrupoCampos,
  type ModuloDisponible,
  type RespuestasParciales,
  type ResultadoParticipante,
  type ValoresRegistro,
} from './modelo';

/**
 * Estado del registro y del cuestionario. Función pura (reductor), con pruebas.
 * Vive en sessionStorage: sobrevive a recargar la página, pero se borra al cerrar la pestaña,
 * para que en un computador compartido no queden datos personales ni respuestas (D-51).
 */

export const CLAVE_ALMACEN = 'mente-al-dia:participacion';

export type FaseCuestionario = 'antes' | 'pregunta' | 'revision';

export interface Enviado {
  modulo: ModuloDisponible;
  codigo: string;
  resultado: ResultadoParticipante;
  /** ISO 8601. Opcional: los envíos guardados antes de la Fase 7 no la tienen. */
  fecha?: string;
  /** Calculado en el navegador y sin guardar (vista previa sin base de datos, D-62). */
  ejemplo?: boolean;
}

export interface EstadoParticipacion {
  version: 1;
  /** Identifica este envío: un reintento con la misma clave no se guarda dos veces (D-50). */
  claveEnvio: string;
  modulo: ModuloDisponible | null;
  valores: ValoresRegistro;
  autorizaciones: Autorizaciones;
  /** Datos válidos y autorizaciones dadas: ya se puede responder. */
  registroCompleto: boolean;
  fase: FaseCuestionario;
  respuestas: RespuestasParciales;
  indice: number;
  /** La pregunta se abrió desde la revisión: «Siguiente» vuelve a la revisión. */
  desdeRevision: boolean;
  /** Mensajes de ánimo ya mostrados (preguntas 5, 10 y 15). */
  hitos: number[];
  /** Último cuestionario enviado en esta pestaña (sin datos personales ni respuestas). */
  enviado: Enviado | null;
}

export type Accion =
  | { tipo: 'elegirModulo'; modulo: ModuloDisponible }
  | { tipo: 'escribir'; grupo: GrupoCampos; campo: string; valor: string }
  | { tipo: 'autorizar'; campo: keyof Autorizaciones; valor: boolean }
  | { tipo: 'completarRegistro' }
  | { tipo: 'irAPregunta'; indice: number; desdeRevision?: boolean }
  | { tipo: 'responder'; areaId: AreaId; valor: ValorRespuesta }
  | { tipo: 'siguiente' }
  | { tipo: 'anterior' }
  | { tipo: 'revisar' }
  | { tipo: 'marcarHito'; numero: number }
  /** claveSiguiente: la del próximo cuestionario; la usada ya quedó guardada en el servidor. */
  | {
      tipo: 'enviado';
      codigo: string;
      resultado: ResultadoParticipante;
      fecha: string;
      claveSiguiente: string;
      ejemplo?: boolean;
    }
  | { tipo: 'reiniciar'; claveEnvio: string };

export function estadoInicial(claveEnvio: string): EstadoParticipacion {
  return {
    version: 1,
    claveEnvio,
    modulo: null,
    valores: { participante: {}, acudiente: {} },
    autorizaciones: sinAutorizaciones(),
    registroCompleto: false,
    fase: 'antes',
    respuestas: {},
    indice: 0,
    desdeRevision: false,
    hitos: [],
    enviado: null,
  };
}

/** Lo que se borra al cambiar de módulo o al terminar: datos, autorizaciones y respuestas. */
const sinDatos = (estado: EstadoParticipacion): EstadoParticipacion => ({
  ...estadoInicial(estado.claveEnvio),
  enviado: estado.enviado,
});

export function reducir(estado: EstadoParticipacion, accion: Accion): EstadoParticipacion {
  switch (accion.tipo) {
    case 'elegirModulo':
      if (estado.modulo === accion.modulo) return estado;
      return { ...sinDatos(estado), modulo: accion.modulo };

    case 'escribir':
      // Cambiar un dato obliga a pasar otra vez por la autorización antes de responder.
      return {
        ...estado,
        registroCompleto: false,
        valores: {
          ...estado.valores,
          [accion.grupo]: { ...estado.valores[accion.grupo], [accion.campo]: accion.valor },
        },
      };

    case 'autorizar':
      return {
        ...estado,
        registroCompleto: accion.valor && estado.registroCompleto,
        autorizaciones: { ...estado.autorizaciones, [accion.campo]: accion.valor },
      };

    case 'completarRegistro': {
      if (!estado.modulo) return estado;
      const valido =
        validarRegistro(estado.modulo, estado.valores).ok &&
        faltanAutorizaciones(estado.modulo, estado.autorizaciones).length === 0;
      return valido ? { ...estado, registroCompleto: true } : estado;
    }

    case 'irAPregunta': {
      if (!estado.modulo) return estado;
      const ultima = preguntasDe(estado.modulo).length - 1;
      return {
        ...estado,
        fase: 'pregunta',
        indice: Math.min(Math.max(Math.trunc(accion.indice), 0), ultima),
        desdeRevision: accion.desdeRevision ?? false,
      };
    }

    case 'responder': {
      if (!estado.modulo) return estado;
      const permitidos = cuestionarios[estado.modulo].opciones.map((o) => o.valor);
      const delModulo = preguntasDe(estado.modulo).some((p) => p.areaId === accion.areaId);
      if (!delModulo || !permitidos.includes(accion.valor)) return estado;
      return { ...estado, respuestas: { ...estado.respuestas, [accion.areaId]: accion.valor } };
    }

    case 'siguiente': {
      if (!estado.modulo || estado.fase !== 'pregunta') return estado;
      const preguntas = preguntasDe(estado.modulo);
      const actual = preguntas[estado.indice];
      if (!actual || !estado.respuestas[actual.areaId]) return estado;
      if (estado.desdeRevision || estado.indice >= preguntas.length - 1) {
        return { ...estado, fase: 'revision', desdeRevision: false };
      }
      return { ...estado, indice: estado.indice + 1 };
    }

    case 'anterior':
      if (estado.fase !== 'pregunta') return estado;
      if (estado.desdeRevision) return { ...estado, fase: 'revision', desdeRevision: false };
      return estado.indice > 0 ? { ...estado, indice: estado.indice - 1 } : estado;

    case 'revisar':
      return { ...estado, fase: 'revision', desdeRevision: false };

    case 'marcarHito':
      return estado.hitos.includes(accion.numero)
        ? estado
        : { ...estado, hitos: [...estado.hitos, accion.numero] };

    case 'enviado':
      if (!estado.modulo) return estado;
      // Guardado en el servidor: aquí ya no quedan datos personales ni respuestas.
      return {
        ...estadoInicial(accion.claveSiguiente),
        enviado: {
          modulo: estado.modulo,
          codigo: accion.codigo,
          resultado: accion.resultado,
          fecha: accion.fecha,
          ...(accion.ejemplo ? { ejemplo: true } : {}),
        },
      };

    case 'reiniciar':
      return estadoInicial(accion.claveEnvio);
  }
}

/** Lee el estado guardado; si no hay o no se reconoce, empieza de cero con una clave nueva. */
export function leerEstado(
  almacen: Pick<Storage, 'getItem'> | null,
  nuevaClave: () => string,
): EstadoParticipacion {
  try {
    const crudo = almacen?.getItem(CLAVE_ALMACEN);
    if (crudo) {
      const guardado = JSON.parse(crudo) as Partial<EstadoParticipacion> | null;
      if (
        guardado?.version === 1 &&
        typeof guardado.claveEnvio === 'string' &&
        (guardado.modulo === null || esModuloDisponible(guardado.modulo))
      ) {
        return { ...estadoInicial(guardado.claveEnvio), ...guardado };
      }
    }
  } catch {
    // Almacenamiento bloqueado o dañado: se empieza de nuevo.
  }
  return estadoInicial(nuevaClave());
}

export function guardarEstado(
  almacen: Pick<Storage, 'setItem'> | null,
  estado: EstadoParticipacion,
): void {
  try {
    almacen?.setItem(CLAVE_ALMACEN, JSON.stringify(estado));
  } catch {
    // Sin almacenamiento el flujo sigue funcionando; solo no sobrevive a una recarga.
  }
}

/** uuid v4. crypto.randomUUID solo existe en contextos seguros (https o localhost). */
export function nuevaClaveEnvio(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
