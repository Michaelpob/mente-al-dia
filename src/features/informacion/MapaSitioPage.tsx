import { Link } from 'react-router';
import { footerLinks, mainNavItems } from '@/components/layout/navigation';
import { PageMeta } from '@/components/layout/page';
import { textos } from '@/content/textos-interfaz';

const enlaces = [
  mainNavItems[0],
  { to: '/registro', label: textos.paginas.registro.titulo },
  { to: '/ingresar', label: textos.paginas.ingresar.titulo },
  { to: '/lineas-de-ayuda', label: textos.lineasAyuda.titulo },
  ...footerLinks.filter((link) => link.to !== '/mapa-del-sitio'),
].filter((link) => link !== undefined);

export default function MapaSitioPage() {
  return (
    <>
      <PageMeta title={textos.mapaSitio.titulo} />
      <section className="contenedor seccion">
        <div className="max-w-lectura">
          <h1 className="text-h1">{textos.mapaSitio.titulo}</h1>
          <p className="mt-4 text-cuerpo-grande text-grafito-600">{textos.mapaSitio.descripcion}</p>
          <ul className="mt-8 flex flex-col gap-1">
            {enlaces.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="inline-flex min-h-11 items-center rounded-sm text-cuerpo-grande underline decoration-1 underline-offset-4 hover:decoration-2"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
