import { useId } from 'react';
import { Link } from 'react-router';
import { AlcaldiaLogo, MenteAlDiaLogo } from '@/components/brand/logos';
import { esMarcador, sitio } from '@/config/sitio';
import { textos } from '@/content/textos-interfaz';
import { GovCoFooter } from './govco';
import { footerLinks } from './navigation';

function ContactValue({ value, href }: { value: string; href: string }) {
  if (esMarcador(value)) return <span>{value}</span>;
  return <a href={href}>{value}</a>;
}

/** Pie de página institucional. */
export function SiteFooter() {
  const contactId = useId();
  const linksId = useId();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-piedra-200 bg-piedra-100">
      <div className="contenedor grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <AlcaldiaLogo />
            <MenteAlDiaLogo />
          </div>
          <div>
            <p className="font-semibold text-grafito-900">{sitio.secretaria}</p>
            <p className="text-grafito-600">{textos.sitio.alcaldia}</p>
          </div>
        </div>

        <section aria-labelledby={contactId}>
          <h2 id={contactId} className="text-etiqueta text-grafito-600 uppercase">
            {textos.pie.contacto}
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-grafito-900">
            <li>
              <span className="font-semibold">{textos.pie.correo}: </span>
              <ContactValue value={sitio.correoContacto} href={`mailto:${sitio.correoContacto}`} />
            </li>
            <li>
              <span className="font-semibold">{textos.pie.telefono}: </span>
              <ContactValue value={sitio.telefonoContacto} href={`tel:${sitio.telefonoContacto}`} />
            </li>
          </ul>
        </section>

        <nav aria-labelledby={linksId}>
          <h2 id={linksId} className="text-etiqueta text-grafito-600 uppercase">
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
      <GovCoFooter />
    </footer>
  );
}
