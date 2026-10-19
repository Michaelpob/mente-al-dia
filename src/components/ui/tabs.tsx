import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        'inline-flex max-w-full gap-1 overflow-x-auto rounded-pill border border-piedra-200 bg-piedra-100 p-1',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'min-h-11 shrink-0 rounded-pill px-4 text-pequeno font-semibold whitespace-nowrap text-grafito-600',
        'transition-[background-color,color,box-shadow] duration-(--duracion-micro) ease-estandar',
        'hover:text-pizarra-800 data-[state=active]:bg-blanco data-[state=active]:text-pizarra-800 data-[state=active]:shadow-1',
        'contraste-alto:data-[state=active]:outline contraste-alto:data-[state=active]:outline-2 contraste-alto:data-[state=active]:outline-pizarra-700',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-6 rounded-md', className)} {...props} />;
}
