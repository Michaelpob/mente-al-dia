import { UserRound } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { cuenta } from '@/content/cuenta';
import { cn } from '@/lib/utils/cn';
import { useCuentaGuardada } from './sesion-guardada';

const t = cuenta.encabezado;

type BotonCuentaProps = Omit<ComponentProps<typeof Button>, 'asChild' | 'children'> & {
  /** Con espacio (menú del teléfono): el nombre completo en lugar del primer nombre. */
  ancho?: boolean;
};

/**
 * «Ingresar» del encabezado, o el nombre de la cuenta con sesión, que lleva a «Mi cuenta» (D-77).
 * Lee la sesión guardada sin cargar Supabase. En la fila completa del encabezado (1280 px) el
 * nombre se corta para no pasar del ancho de «Ingresar». Las demás propiedades van al enlace
 * (por ejemplo, el cierre del menú del teléfono).
 */
export function BotonCuenta({ className, ancho = false, ...props }: BotonCuentaProps) {
  const cuentaGuardada = useCuentaGuardada();
  if (!cuentaGuardada) {
    return (
      <Button asChild variant="secundario" size="sm" className={className} {...props}>
        <Link to="/cuenta/ingresar">{t.ingresar}</Link>
      </Button>
    );
  }
  const nombre = cuentaGuardada.nombre.trim() || cuentaGuardada.usuario;
  const primerNombre = nombre.split(/\s+/)[0] ?? nombre;
  return (
    <Button
      asChild
      variant="secundario"
      size="sm"
      className={cn(!ancho && 'gap-1.5 px-3', className)}
      {...props}
    >
      <Link to="/cuenta" aria-label={t.etiqueta(nombre)} title={nombre}>
        <UserRound aria-hidden className={cn(!ancho && 'size-4!')} />
        <span className={cn('truncate', !ancho && 'max-w-14')}>
          {ancho ? nombre : primerNombre}
        </span>
      </Link>
    </Button>
  );
}
