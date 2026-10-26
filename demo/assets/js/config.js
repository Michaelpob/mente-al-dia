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

// <admin-panel> (generado por scripts/definir-admin-demo.mjs)
/**
 * Cuenta de administración del panel de la demostración (D-64). Solo está la huella de la
 * contraseña (PBKDF2-SHA-256), no la contraseña. Para cambiarla: corepack pnpm demo:admin.
 */
export const adminPanel = {
  correo: 'administrador@mentealdia.test',
  sal: '884e5a435288e0cd6b267619d4cc51f0',
  iteraciones: 600000,
  huella: '0d8a44ac19ef0f8ce640c17854192b2bf0cc45323ddd79c956070f02ee70d153',
};
// </admin-panel>
