/**
 * Página «El proyecto»: qué incluye Mente al Día, sus fases y lo que falta definir.
 */
import { montarChrome, notificar, pintarIconos } from '../comun.js';

montarChrome({ pagina: 'proyecto' });
pintarIconos();

// «Copiar el enlace» copia la dirección de inicio de la demostración, para compartirla con el equipo.
document.querySelector('[data-copiar-enlace]')?.addEventListener('click', async () => {
  const enlace = new URL('./', window.location.href).href;
  try {
    await navigator.clipboard.writeText(enlace);
    notificar('Enlace copiado. Ya puedes compartirlo.');
  } catch {
    notificar(`Copia este enlace: ${enlace}`, 9000);
  }
});
