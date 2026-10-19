import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { AccessibilityProvider } from '@/lib/a11y/AccessibilityProvider';

/**
 * Proveedores globales. Motion y los tooltips NO van aquí: cada página que los usa los trae
 * (MotionScope, TooltipProvider) para que no pesen en la primera carga.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 2, refetchOnWindowFocus: false, staleTime: 60_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AccessibilityProvider>
        {children}
        <Toaster />
      </AccessibilityProvider>
    </QueryClientProvider>
  );
}
