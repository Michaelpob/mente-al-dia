import { cuenta } from '@/content/cuenta';

/**
 * Validación de los formularios de cuenta (D-77). Funciones puras, con pruebas. La base de datos y
 * Supabase Auth vuelven a validar lo mismo: esto solo da avisos claros antes de enviar.
 */

const e = cuenta.errores;

/** Igual que la base de datos: empieza con letra; luego letras minúsculas, números, punto o «_». */
export const PATRON_USUARIO = /^[a-z][a-z0-9._]{2,29}$/;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Igual que Supabase Auth (supabase/config.toml): 12 caracteres con mayúsculas, minúsculas y números. */
export function contrasenaValida(contrasena: string): boolean {
  return (
    contrasena.length >= 12 &&
    /[a-z]/.test(contrasena) &&
    /[A-Z]/.test(contrasena) &&
    /[0-9]/.test(contrasena)
  );
}

export const normalizarUsuario = (usuario: string) => usuario.trim().toLowerCase();
export const correoValido = (correo: string) => PATRON_CORREO.test(correo.trim());

export interface DatosCrearCuenta {
  nombre: string;
  usuario: string;
  correo: string;
  contrasena: string;
  confirmacion: string;
  mayorDeEdad: boolean;
  autoriza: boolean;
}

export type CampoCrearCuenta = keyof DatosCrearCuenta;
export type ErroresFormulario<C extends string> = Partial<Record<C, string>>;

export function validarCrearCuenta(datos: DatosCrearCuenta): ErroresFormulario<CampoCrearCuenta> {
  const errores: ErroresFormulario<CampoCrearCuenta> = {};
  if (datos.nombre.trim().length < 3 || datos.nombre.trim().length > 120) errores.nombre = e.nombre;
  if (!PATRON_USUARIO.test(normalizarUsuario(datos.usuario))) errores.usuario = e.usuario;
  if (!correoValido(datos.correo)) errores.correo = e.correo;
  if (!contrasenaValida(datos.contrasena)) errores.contrasena = e.contrasena;
  if (!datos.confirmacion || datos.confirmacion !== datos.contrasena)
    errores.confirmacion = e.confirmar;
  if (!datos.mayorDeEdad) errores.mayorDeEdad = e.mayorDeEdad;
  if (!datos.autoriza) errores.autoriza = e.autorizo;
  return errores;
}

export function validarIngreso(correo: string, contrasena: string) {
  const errores: ErroresFormulario<'correo' | 'contrasena'> = {};
  if (!correoValido(correo)) errores.correo = e.correo;
  if (!contrasena) errores.contrasena = e.obligatorio;
  return errores;
}

export function validarNuevaContrasena(contrasena: string, confirmacion: string) {
  const errores: ErroresFormulario<'contrasena' | 'confirmacion'> = {};
  if (!contrasenaValida(contrasena)) errores.contrasena = e.contrasena;
  if (!confirmacion || confirmacion !== contrasena) errores.confirmacion = e.confirmar;
  return errores;
}

export const hayErrores = (errores: object) => Object.keys(errores).length > 0;
