import { ZONA_HORARIA } from './filtros';

/** Formatos del panel: fechas en hora de Colombia y números con la convención de es-CO. */

const fecha = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_HORARIA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const fechaHora = new Intl.DateTimeFormat('es-CO', {
  timeZone: ZONA_HORARIA,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
// Un día AAAA-MM-DD no tiene hora: se formatea en UTC para que no cambie de fecha.
const dia = new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const diaConAno = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const numero = new Intl.NumberFormat('es-CO');
const porcentaje = new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 0 });

export const formatearFecha = (iso: string) => fecha.format(new Date(iso));
export const formatearFechaHora = (iso: string) => fechaHora.format(new Date(iso));
export const formatearDia = (aaaammdd: string) => dia.format(new Date(`${aaaammdd}T00:00:00Z`));
export const formatearDiaConAno = (aaaammdd: string) =>
  diaConAno.format(new Date(`${aaaammdd}T00:00:00Z`));
export const formatearNumero = (n: number) => numero.format(n);
/** Fracción entre 0 y 1 → «37 %». */
export const formatearPorcentaje = (fraccion: number) => porcentaje.format(fraccion);
