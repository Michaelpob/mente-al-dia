/**
 * Datos institucionales que muestra la demostración.
 * Son los mismos marcadores de la plataforma (src/config/sitio.ts): se reemplazan cuando la
 * Alcaldía entregue la información. Nunca se inventan nombres, cifras ni teléfonos.
 */
export const sitio = {
  municipio: '[MUNICIPIO]',
  secretaria: '[SECRETARÍA RESPONSABLE]',
  correoContacto: '[CORREO DE CONTACTO]',
  telefonoContacto: '[TELÉFONO DE CONTACTO]',
  /** Ruta de una imagen dentro de demo/assets/img (por ejemplo 'assets/img/logo-alcaldia.svg'). */
  logoAlcaldia: null,
  /** Fecha de esta versión de la demostración. */
  version: 'octubre de 2026',
  repositorio: 'https://github.com/Michaelpob/mente-al-dia',
};

/** true si el valor sigue siendo un marcador pendiente, como «[MUNICIPIO]». */
export const esMarcador = (valor) => /^\[.*\]$/.test(String(valor).trim());
