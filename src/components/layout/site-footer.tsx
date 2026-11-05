import { useId } from 'react';
import { Link } from 'react-router';
import { MenteAlDiaLogo } from '@/components/brand/logos';
import { textos } from '@/content/textos-interfaz';
import { footerLinks } from './navigation';

/** Pie de página: qué es Mente al Día, los enlaces de información y el aviso de orientación. */
export function SiteFooter() {
  const linksId = useId();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-piedra-200 bg-piedra-100">
      <div className="contenedor grid gap-10 py-12 md:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          <MenteAlDiaLogo />
          <p className="max-w-lectura text-grafito-600">{textos.pie.descripcion}</p>
        </div>

        <nav aria-labelledby={linksId}>
          <h2 id={linksId} className="text-pequeno font-semibold text-grafito-600">
            {textos.pie.informacion}
          </h2>
          <ul className="mt-3 flex flex-col gap-1">
            {footerLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-11 items-center rounded-sm underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-piedra-200">
        <div className="contenedor flex flex-col gap-3 py-6 text-pequeno text-grafito-600 md:flex-row md:items-start md:justify-between md:gap-8">
          <p className="max-w-lectura">{textos.sitio.avisoOrientacion}</p>
          <p className="shrink-0">{textos.pie.derechos(year)}</p>
        </div>
      </div>
    </footer>
  );
}
