import { CircleAlert, CircleCheck, CircleDot, CircleMinus, type LucideIcon } from 'lucide-react';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';
import type { Nivel } from '@/types/dominio';

const estilos: Record<Nivel, { Icon: LucideIcon; className: string }> = {
  adecuado: { Icon: CircleCheck, className: 'bg-nivel-adecuado-fondo text-nivel-adecuado' },
  por_fortalecer: { Icon: CircleDot, className: 'bg-nivel-fortalecer-fondo text-nivel-fortalecer' },
  requiere_atencion: {
    Icon: CircleAlert,
    className: 'bg-nivel-atencion-fondo text-nivel-atencion',
  },
  sin_dato: { Icon: CircleMinus, className: 'bg-nivel-sin-dato-fondo text-nivel-sin-dato' },
};

interface NivelBadgeProps {
  nivel: Nivel;
  size?: 'sm' | 'md';
  className?: string;
}

/** Insignia de nivel: siempre ícono + texto + color, nunca solo color. */
export function NivelBadge({ nivel, size = 'md', className }: NivelBadgeProps) {
  const { Icon, className: colores } = estilos[nivel];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill font-semibold contraste-alto:border contraste-alto:border-current',
        size === 'sm' ? 'px-2.5 py-0.5 text-pequeno' : 'px-3 py-1 text-pequeno',
        colores,
        className,
      )}
    >
      <Icon aria-hidden className={size === 'sm' ? 'size-3.5' : 'size-4'} strokeWidth={2.25} />
      {textos.niveles[nivel]}
    </span>
  );
}
