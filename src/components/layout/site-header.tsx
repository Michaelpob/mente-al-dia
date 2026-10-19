import { Menu } from 'lucide-react';
import { Link, useLocation } from 'react-router';
import { AlcaldiaLogo, MenteAlDiaLogo } from '@/components/brand/logos';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { textos } from '@/content/textos-interfaz';
import { useScrolled } from '@/hooks/use-scrolled';
import { cn } from '@/lib/utils/cn';
import { AccessibilityButton } from './accessibility-panel';
import { HelplinesButton } from './helplines';
import { mainNavItems, type NavItem } from './navigation';

function useIsCurrent() {
  const location = useLocation();
  return (item: NavItem) => item.to === '/' && location.pathname === '/' && !location.hash;
}

function MobileMenu() {
  const isCurrent = useIsCurrent();
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button
          variant="fantasma"
          size="icono"
          aria-label={textos.nav.abrirMenu}
          className="xl:hidden xl:texto-grande:inline-flex"
        >
          <Menu aria-hidden className="size-6!" />
        </Button>
      </DrawerTrigger>
      <DrawerContent title={textos.nav.tituloMenu}>
        <AlcaldiaLogo className="mb-6" />
        <nav aria-label={textos.nav.etiqueta}>
          <ul className="flex flex-col gap-1">
            {mainNavItems.map((item) => (
              <li key={item.to}>
                <DrawerClose asChild>
                  <Link
                    to={item.to}
                    aria-current={isCurrent(item) ? 'page' : undefined}
                    className="flex min-h-12 items-center rounded-md px-3 font-semibold text-pizarra-700 no-underline hover:bg-pizarra-100 aria-[current=page]:bg-pizarra-100"
                  >
                    {item.label}
                  </Link>
                </DrawerClose>
              </li>
            ))}
          </ul>
        </nav>
        <DrawerClose asChild>
          <Button asChild variant="secundario" className="mt-6 w-full">
            <Link to="/ingresar">{textos.nav.ingresar}</Link>
          </Button>
        </DrawerClose>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Encabezado institucional fijo. Se compacta y toma un fondo con desenfoque al hacer scroll.
 * Con el texto agrandado (barra de accesibilidad) el menú completo pasa al panel «Menú» y los
 * botones muestran su versión corta; si aun así no cabe, la fila de botones baja a una segunda línea.
 */
export function SiteHeader() {
  const scrolled = useScrolled();
  const isCurrent = useIsCurrent();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-(--duracion-base) ease-estandar',
        scrolled
          ? 'border-piedra-200 bg-piedra-50/90 shadow-1 backdrop-blur-md'
          : 'border-transparent bg-piedra-50',
      )}
    >
      <div
        className={cn(
          'contenedor flex flex-wrap items-center gap-x-2 gap-y-1 py-2 transition-[min-height] duration-(--duracion-base) ease-estandar',
          scrolled ? 'min-h-16' : 'min-h-20',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <AlcaldiaLogo className="hidden xl:inline-flex xl:texto-grande:hidden" />
          <span
            aria-hidden
            className="hidden h-8 w-px bg-piedra-200 xl:block xl:texto-grande:hidden"
          />
          <Link
            to="/"
            aria-label={textos.encabezado.irAlInicio}
            className="rounded-sm no-underline"
          >
            <MenteAlDiaLogo wordmarkClassName="hidden xs:inline texto-grande:hidden sm:texto-grande:inline" />
          </Link>
        </div>

        <nav
          aria-label={textos.nav.etiqueta}
          className="ml-auto hidden xl:block xl:texto-grande:hidden"
        >
          <ul className="flex items-center gap-0.5">
            {mainNavItems.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  aria-current={isCurrent(item) ? 'page' : undefined}
                  className="flex min-h-11 items-center rounded-pill px-2 font-semibold text-grafito-600 no-underline transition-colors duration-(--duracion-micro) hover:bg-pizarra-100 hover:text-pizarra-800 aria-[current=page]:text-pizarra-700 aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 xl:ml-2 xl:texto-grande:ml-auto">
          <HelplinesButton />
          <AccessibilityButton />
          <Button
            asChild
            variant="secundario"
            size="sm"
            className="hidden sm:inline-flex sm:texto-grande:hidden"
          >
            <Link to="/ingresar">{textos.nav.ingresar}</Link>
          </Button>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
