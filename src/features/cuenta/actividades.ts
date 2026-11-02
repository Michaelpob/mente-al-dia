/**
 * Nombres de las actividades que se guardan en public.progreso (D-77). Archivo liviano: lo usan el
 * sitio y el panel sin cargar los cuestionarios.
 * - «cuestionario»: el cuestionario en curso (uno a la vez).
 * - «resultado:<código>»: cada cuestionario terminado.
 */
export const ACTIVIDAD_CUESTIONARIO = 'cuestionario';
const PREFIJO_RESULTADO = 'resultado:';
export const actividadResultado = (codigo: string) => `${PREFIJO_RESULTADO}${codigo}`;
export const esActividadResultado = (actividad: string) => actividad.startsWith(PREFIJO_RESULTADO);
