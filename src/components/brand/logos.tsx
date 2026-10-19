import { sitio } from '@/config/sitio';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';

/**
 * Isotipo provisional de Mente al Día: un círculo (mente) con un arco de horizonte
 * y un sol que asoma (día). Se reemplaza por el oficial cuando exista.
 */
export function MenteAlDiaIsotipo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden className={cn('size-9 shrink-0', className)}>
      <circle cx="24" cy="24" r="21" className="fill-blanco stroke-pizarra-700" strokeWidth="3" />
      <path d="M15.5 30.5a8.5 8.5 0 0 1 17 0Z" className="fill-arena-400" />
      <path
        d="M9 31.5Q24 26 39 31.5"
        className="fill-none stroke-salvia-600"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface MenteAlDiaLogoProps {
  className?: string;
  /** Clases para el texto del logotipo (por ejemplo, ocultarlo en pantallas muy pequeñas). */
  wordmarkClassName?: string;
}

export function MenteAlDiaLogo({ className, wordmarkClassName }: MenteAlDiaLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <MenteAlDiaIsotipo />
      <span
        className={cn(
          'font-titulo text-cuerpo-grande leading-none font-extrabold whitespace-nowrap text-pizarra-700',
          wordmarkClassName,
        )}
      >
        Mente <span className="text-salvia-600">al</span> Día
      </span>
    </span>
  );
}

/** Logo de la Alcaldía. Mientras no exista el archivo oficial, muestra el marcador. */
export function AlcaldiaLogo({ className }: { className?: string }) {
  if (sitio.logoAlcaldia) {
    return (
      <img
        src={sitio.logoAlcaldia}
        alt={textos.logoAlcaldia.alternativo}
        // Máximo 160 px de ancho: más ancho no cabe junto al menú completo a 1280 px.
        className={cn('h-10 w-auto max-w-40 object-contain', className)}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={textos.logoAlcaldia.alternativo}
      className={cn(
        'inline-flex h-10 shrink-0 items-center rounded-sm border border-dashed border-borde-campo px-3 text-etiqueta whitespace-nowrap text-grafito-600 uppercase',
        className,
      )}
    >
      {textos.logoAlcaldia.marcador}
    </span>
  );
}
