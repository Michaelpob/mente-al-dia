import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactElement, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Ayuda breve al pasar el puntero o enfocar con teclado. Nunca guarda información esencial.
 * Trae su propio proveedor para no cargar Floating UI en páginas que no tienen tooltips.
 */
export function Tooltip({ content, children, side = 'bottom' }: TooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className="z-50 max-w-xs rounded-sm bg-grafito-900 px-3 py-1.5 text-pequeno text-blanco shadow-2 data-[state=delayed-open]:animate-velo-entrar data-[state=instant-open]:animate-velo-entrar"
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-grafito-900" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
