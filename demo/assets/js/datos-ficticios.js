/**
 * Datos FICTICIOS para la vista previa del panel profesional.
 * Se generan siempre iguales (semilla fija) y se calculan con el motor real del proyecto.
 * Ningún registro corresponde a una persona: no hay nombres, correos ni teléfonos.
 */
import { calcular, instrumentoDe } from './motor-demo.js';

function mulberry32(semilla) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const LUGARES = ['Centro', 'Comuna 1', 'Comuna 2', 'Comuna 3', 'Comuna 4', 'Zona rural'];
const PESOS_LUGAR = [0.22, 0.18, 0.16, 0.14, 0.15, 0.15];
export const ESTADOS = [
  ['pendiente', 'Pendiente'],
  ['en_contacto', 'En contacto'],
  ['orientado', 'Orientado'],
  ['remitido', 'Remitido'],
  ['cerrado', 'Cerrado'],
];
export const PROFESIONALES = ['Profesional 1', 'Profesional 2', 'Profesional 3'];
/** Aplicaciones por semana (de la más antigua a la actual). */
const POR_SEMANA = [9, 11, 10, 14, 16, 15, 19, 22, 24, 27, 31, 34];
/** Áreas que, en estos datos inventados, suelen salir más bajas. */
const DIFICULTAD = {
  sueno_descanso: 0.1,
  manejo_estres: 0.12,
  equilibrio_responsabilidades_descanso: 0.12,
  actividad_fisica_recreacion: 0.14,
  perspectiva_futuro: 0.07,
  concentracion: 0.06,
  energia_vitalidad: 0.05,
  afrontamiento_consumo_sustancias: -0.1,
  seguridad_entorno: -0.06,
  valoracion_respeto: -0.04,
  regulacion_emocional: -0.02,
};
/** En las áreas sensibles, las dificultades suelen responderse más como «a veces» que como «no». */
const SENSIBLES = new Set(['valoracion_respeto', 'regulacion_emocional', 'seguridad_entorno', 'afrontamiento_consumo_sustancias']);

export const HOY = new Date('2026-10-25T12:00:00-05:00');
const DIA = 24 * 60 * 60 * 1000;

function elegirPonderado(azar, opciones, pesos) {
  let u = azar();
  for (let i = 0; i < opciones.length; i += 1) {
    u -= pesos[i];
    if (u <= 0) return opciones[i];
  }
  return opciones[opciones.length - 1];
}

function generar() {
  const azar = mulberry32(20261025);
  const normal = () => {
    const u = 1 - azar();
    const v = azar();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const registros = [];
  POR_SEMANA.forEach((cantidad, semana) => {
    for (let k = 0; k < cantidad; k += 1) {
      const modulo = azar() < 0.3 ? 'nino' : 'adulto';
      const fecha = new Date(HOY.getTime() - ((11 - semana) * 7 + Math.floor(azar() * 7)) * DIA - Math.floor(azar() * 10) * 3600 * 1000);
      if (fecha > HOY) fecha.setTime(HOY.getTime() - 3600 * 1000);
      const bienestar = Math.min(0.97, Math.max(0.2, 0.74 + normal() * 0.19));
      const respuestas = {};
      for (const pregunta of instrumentoDe(modulo).preguntas) {
        const pSi = Math.min(0.98, Math.max(0.03, bienestar - (DIFICULTAD[pregunta.areaId] ?? 0) + normal() * 0.08));
        const u = azar();
        let valor = 'no';
        if (modulo === 'adulto' && azar() < 0.025) valor = 'prefiero_no_responder';
        else if (u < pSi) valor = 'si';
        else if (u < pSi + (1 - pSi) * (SENSIBLES.has(pregunta.areaId) ? 0.86 : 0.64)) valor = 'a_veces';
        respuestas[pregunta.areaId] = valor;
      }
      const resultado = calcular(modulo, respuestas);
      const dias = Math.floor((HOY - fecha) / DIA);
      let estado = null;
      if (resultado.prioridad) {
        const u = azar();
        if (dias <= 4) estado = u < 0.7 ? 'pendiente' : 'en_contacto';
        else if (dias <= 14) estado = elegirPonderado(azar, ['pendiente', 'en_contacto', 'orientado', 'remitido'], [0.25, 0.4, 0.2, 0.15]);
        else estado = elegirPonderado(azar, ['en_contacto', 'orientado', 'remitido', 'cerrado'], [0.1, 0.3, 0.2, 0.4]);
      }
      registros.push({
        fecha,
        modulo,
        lugar: elegirPonderado(azar, LUGARES, PESOS_LUGAR),
        edad: modulo === 'nino' ? 6 + Math.floor(azar() * 6) : null,
        respuestas,
        resultado,
        estado,
        asignado: estado && estado !== 'pendiente' ? PROFESIONALES[Math.floor(azar() * PROFESIONALES.length)] : null,
        diasSinGestion: estado === 'pendiente' ? dias : null,
      });
    }
  });
  registros.sort((a, b) => a.fecha - b.fecha);
  registros.forEach((r, i) => {
    r.codigo = `MD-${String(i + 1).padStart(4, '0')}`;
  });
  return registros.reverse();
}

export const registros = generar();
