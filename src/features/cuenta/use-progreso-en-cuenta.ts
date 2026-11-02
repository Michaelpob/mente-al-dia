import { useEffect, useRef, type RefObject } from 'react';
import type { EstadoParticipacion } from '@/features/participar/estado';
import { ACTIVIDAD_CUESTIONARIO, progresoDe, type CambioProgreso } from './progreso';
import { useCuentaGuardada } from './sesion-guardada';

/** Pausa antes de guardar lo que está en curso: así no se escribe en cada clic. */
const PAUSA_EN_CURSO = 1200;

async function sincronizar(cambio: CambioProgreso | null, guardoEnCurso: RefObject<boolean>) {
  const { borrarProgreso, guardarProgreso } = await import('./servicio');
  if (cambio?.tipo === 'en_curso') {
    await guardarProgreso(ACTIVIDAD_CUESTIONARIO, {
      avance: cambio.avance,
      completado: false,
      estado: cambio.estado,
    });
    guardoEnCurso.current = true;
    return;
  }
  if (cambio?.tipo === 'terminado') {
    await guardarProgreso(cambio.actividad, {
      avance: 100,
      completado: true,
      estado: { enviado: cambio.enviado },
    });
  }
  // Terminado o reiniciado en esta pestaña: el cuestionario en curso ya no hace falta en la cuenta.
  // Si esta pestaña no lo guardó (por ejemplo, solo se abrió un resultado), no se toca.
  if (guardoEnCurso.current) {
    await borrarProgreso(ACTIVIDAD_CUESTIONARIO);
    guardoEnCurso.current = false;
  }
}

/**
 * Con una cuenta pública abierta, guarda en la cuenta el cuestionario en curso (solo después de la
 * autorización) y cada cuestionario terminado, para continuar en cualquier dispositivo (D-77).
 * Si algo falla (por ejemplo, sin conexión), el progreso sigue en la pestaña y se vuelve a intentar
 * con el próximo cambio.
 */
export function useProgresoEnCuenta(estado: EstadoParticipacion) {
  const conCuenta = Boolean(useCuentaGuardada());
  const ultimaFirma = useRef<string | null>(null);
  const guardoEnCurso = useRef(false);

  useEffect(() => {
    if (!conCuenta) return;
    const cambio = progresoDe(estado);
    const firma = JSON.stringify(cambio);
    if (firma === ultimaFirma.current) return;
    const temporizador = window.setTimeout(
      () => {
        ultimaFirma.current = firma;
        sincronizar(cambio, guardoEnCurso).catch(() => {
          ultimaFirma.current = null;
        });
      },
      cambio?.tipo === 'en_curso' ? PAUSA_EN_CURSO : 0,
    );
    return () => window.clearTimeout(temporizador);
  }, [conCuenta, estado]);
}
