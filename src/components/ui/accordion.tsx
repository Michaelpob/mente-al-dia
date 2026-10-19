import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      className={cn('border-b border-piedra-200 last:border-b-0', className)}
      {...props}
    />
  );
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header asChild>
      <h3 className="text-cuerpo-grande">
        <AccordionPrimitive.Trigger
          className={cn(
            'group flex min-h-14 w-full items-center justify-between gap-4 rounded-sm py-4 text-left font-titulo font-bold text-pizarra-700',
            'hover:text-pizarra-800',
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-grafito-600 transition-transform duration-(--duracion-base) ease-estandar group-data-[state=open]:rotate-180"
          />
        </AccordionPrimitive.Trigger>
      </h3>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden data-[state=closed]:animate-acordeon-cerrar data-[state=open]:animate-acordeon-abrir"
      {...props}
    >
      <div className={cn('max-w-lectura pb-5 text-grafito-600', className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
