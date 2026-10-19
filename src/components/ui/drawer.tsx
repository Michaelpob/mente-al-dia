import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';
import { DialogOverlay } from './dialog';

/** Panel lateral (drawer). Usa el diálogo de Radix: atrapa el foco y se cierra con Escape. */
export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;

interface DrawerContentProps extends Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  side?: 'derecha' | 'izquierda';
}

export function DrawerContent({
  title,
  description,
  side = 'derecha',
  className,
  children,
  ...props
}: DrawerContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-y-0 z-50 flex w-[min(100%,26rem)] flex-col bg-piedra-50 shadow-3 outline-none',
          side === 'derecha'
            ? 'right-0 data-[state=closed]:animate-panel-derecha-salir data-[state=open]:animate-panel-derecha-entrar contraste-alto:border-l-2'
            : 'left-0 data-[state=closed]:animate-panel-izquierda-salir data-[state=open]:animate-panel-izquierda-entrar contraste-alto:border-r-2',
          'contraste-alto:border-piedra-200',
          className,
        )}
        // Sin descripción, Radix pide aria-describedby={undefined} de forma explícita.
        {...(description ? {} : { 'aria-describedby': undefined })}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-piedra-200 px-5 py-4">
          <div className="flex flex-col gap-1 pt-1.5">
            <DialogPrimitive.Title className="font-titulo text-h3 text-pizarra-700">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-pequeno text-grafito-600">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close className="flex size-11 shrink-0 items-center justify-center rounded-pill text-grafito-600 hover:bg-piedra-100 hover:text-grafito-900">
            <X aria-hidden className="size-5" />
            <span className="sr-only">{textos.comunes.cerrar}</span>
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
