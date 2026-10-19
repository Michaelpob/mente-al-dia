import * as ToastPrimitive from '@radix-ui/react-toast';
import { CircleCheck, HeartHandshake, Info, X, type LucideIcon } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { textos } from '@/content/textos-interfaz';
import { cn } from '@/lib/utils/cn';
import { dismissToast, getToasts, subscribeToasts, type ToastTone } from './toast-store';

const tonos: Record<ToastTone, { Icon: LucideIcon; className: string }> = {
  info: { Icon: Info, className: 'text-pizarra-700' },
  exito: { Icon: CircleCheck, className: 'text-nivel-adecuado' },
  apoyo: { Icon: HeartHandshake, className: 'text-salvia-600' },
};

/** Región de avisos breves. Se monta una sola vez en la aplicación. */
export function Toaster() {
  const items = useSyncExternalStore(subscribeToasts, getToasts, getToasts);

  return (
    <ToastPrimitive.Provider swipeDirection="right" duration={6000}>
      {items.map((item) => {
        const { Icon, className } = tonos[item.tone];
        return (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) window.setTimeout(() => dismissToast(item.id), 200);
            }}
            className={cn(
              'flex items-start gap-3 rounded-lg border border-piedra-200 bg-blanco p-4 shadow-3',
              'data-[state=closed]:animate-toast-salir data-[state=open]:animate-toast-entrar',
            )}
          >
            <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', className)} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <ToastPrimitive.Title className="font-semibold text-grafito-900">
                {item.title}
              </ToastPrimitive.Title>
              {item.description ? (
                <ToastPrimitive.Description className="text-pequeno text-grafito-600">
                  {item.description}
                </ToastPrimitive.Description>
              ) : null}
            </div>
            <ToastPrimitive.Close className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-pill text-grafito-600 hover:bg-piedra-100">
              <X aria-hidden className="size-4" />
              <span className="sr-only">{textos.comunes.cerrar}</span>
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        );
      })}
      <ToastPrimitive.Viewport
        label={textos.toast.region}
        className="fixed right-0 bottom-0 z-[60] flex w-full max-w-sm flex-col gap-2 p-4 outline-none"
      />
    </ToastPrimitive.Provider>
  );
}
