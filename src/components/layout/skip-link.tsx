import type { MouseEvent } from 'react';
import { textos } from '@/content/textos-interfaz';

export const MAIN_CONTENT_ID = 'contenido';

/** Primer elemento enfocable de cada página: lleva el foco al contenido principal. */
export function SkipLink() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const main = document.getElementById(MAIN_CONTENT_ID);
    if (!main) return;
    event.preventDefault();
    main.focus();
    main.scrollIntoView({ block: 'start' });
  }

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={handleClick}
      className="sr-only rounded-pill bg-pizarra-700 px-5 py-3 font-semibold text-blanco no-underline shadow-3 focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70]"
    >
      {textos.saltarAlContenido}
    </a>
  );
}
