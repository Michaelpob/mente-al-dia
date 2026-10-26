import { useEffect, useRef } from 'react';

/**
 * Título de un paso. Al cambiar de paso (no al llegar a la página, de eso se encarga el layout)
 * recibe el foco, para que el lector de pantalla anuncie dónde está la persona.
 */
export function useTituloDelPaso<T extends HTMLElement = HTMLHeadingElement>(paso: unknown) {
  const ref = useRef<T>(null);
  const anterior = useRef(paso);
  useEffect(() => {
    if (anterior.current === paso) return;
    anterior.current = paso;
    window.scrollTo({ top: 0 });
    ref.current?.focus({ preventScroll: true });
  }, [paso]);
  return ref;
}
