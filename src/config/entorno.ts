/**
 * Banderas de compilación (variables VITE_* de los archivos .env.*).
 * - Vista previa (`pnpm build:vista-previa`): un solo HTML para publicar como Artifact de claude.ai,
 *   con navegación en memoria y una barra para saltar entre páginas.
 */
export const vistaPrevia = import.meta.env.VITE_VISTA_PREVIA === 'true';

/**
 * Vista previa publicada sin base de datos (GitHub Pages): al final del cuestionario se puede ver
 * el resultado calculado en el navegador, marcado como ejemplo y sin guardar (D-62).
 * Solo la build de la vista previa define VITE_EJEMPLOS=true; la plataforma real no lo usa.
 */
export const ejemplosHabilitados = import.meta.env.VITE_EJEMPLOS === 'true';

/** La guía de estilo existe en desarrollo, en la build de pruebas y en la vista previa. */
export const guiaEstiloHabilitada =
  import.meta.env.DEV || import.meta.env.VITE_GUIA_ESTILO === 'true' || vistaPrevia;
