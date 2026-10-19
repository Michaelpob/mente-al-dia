/**
 * Banderas de compilación (variables VITE_* de los archivos .env.*).
 * - Vista previa (`pnpm build:vista-previa`): un solo HTML para publicar como Artifact de claude.ai,
 *   con navegación en memoria y una barra para saltar entre páginas.
 */
export const vistaPrevia = import.meta.env.VITE_VISTA_PREVIA === 'true';

/** La guía de estilo existe en desarrollo, en la build de pruebas y en la vista previa. */
export const guiaEstiloHabilitada =
  import.meta.env.DEV || import.meta.env.VITE_GUIA_ESTILO === 'true' || vistaPrevia;
