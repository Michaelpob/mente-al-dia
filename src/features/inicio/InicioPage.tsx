import {
  BadgeCheck,
  Backpack,
  Check,
  Clock,
  Compass,
  FileCheck,
  Lock,
  Minus,
  School,
  ShieldCheck,
  UserCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { RespiracionGuiada } from '@/components/bienestar/respiracion-guiada';
import { HelplineList } from '@/components/layout/helplines';
import { PageMeta } from '@/components/layout/page';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, TiltCard } from '@/components/ui/card';
import { Eyebrow } from '@/components/ui/feedback';
import { MotionScope } from '@/components/ui/motion-scope';
import { Reveal } from '@/components/ui/reveal';
import { inicio } from '@/content/inicio';
import { textos } from '@/content/textos-interfaz';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils/cn';
import { ExploradorAreas } from './ExploradorAreas';
import { Orbe } from './orbe/Orbe';

const RUTA_REGISTRO = '/registro';

interface SeccionProps {
  id?: string;
  titulo: string;
  texto?: string;
  alterna?: boolean;
  children: ReactNode;
}

/** Sección con título y entrada suave. `alterna` usa el fondo piedra-100. */
function Seccion({ id, titulo, texto, alterna = false, children }: SeccionProps) {
  const tituloId = `${id ?? 'seccion'}-titulo`;
  return (
    <section
      id={id}
      aria-labelledby={tituloId}
      className={cn('seccion', alterna && 'bg-piedra-100')}
    >
      <div className="contenedor">
        <Reveal className="mb-10 max-w-176">
          <h2 id={tituloId} className="text-h2">
            {titulo}
          </h2>
          {texto ? <p className="mt-3 text-cuerpo-grande text-grafito-600">{texto}</p> : null}
        </Reveal>
        {children}
      </div>
    </section>
  );
}

const iconosConfianza: readonly LucideIcon[] = [BadgeCheck, Lock, Clock, Compass];

/** Escena del hero: se aleja un poco al desplazarse (sin «reducir movimiento»). */
function EscenaHero() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const escena = ref.current;
    if (!escena || reducedMotion) return;
    let cuadro = 0;
    const actualizar = () => {
      cuadro = 0;
      const avance = Math.min(window.scrollY / 600, 1);
      escena.style.transform = `translateY(${(avance * 40).toFixed(1)}px) scale(${(1 - avance * 0.06).toFixed(3)})`;
      escena.style.opacity = String(1 - avance * 0.35);
    };
    const alDesplazar = () => {
      if (!cuadro) cuadro = requestAnimationFrame(actualizar);
    };
    window.addEventListener('scroll', alDesplazar, { passive: true });
    actualizar();
    return () => {
      window.removeEventListener('scroll', alDesplazar);
      cancelAnimationFrame(cuadro);
      escena.style.transform = '';
      escena.style.opacity = '';
    };
  }, [reducedMotion]);

  return (
    <div
      ref={ref}
      className="-order-1 mx-auto w-[min(17rem,72vw)] will-change-transform lg:order-none lg:w-full lg:max-w-120"
    >
      <Orbe />
    </div>
  );
}

function Hero() {
  const h = inicio.hero;
  return (
    <section
      aria-labelledby="hero-titulo"
      className="relative overflow-hidden bg-[radial-gradient(55%_60%_at_78%_45%,var(--salvia-100),transparent_72%)] pt-[clamp(2rem,6vw,5rem)] pb-[clamp(1rem,3vw,2.5rem)] contraste-alto:bg-none"
    >
      <div className="contenedor grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <div className="flex flex-col gap-5">
          <Eyebrow>{textos.sitio.alcaldia}</Eyebrow>
          <h1 id="hero-titulo" className="max-w-[14ch] text-display">
            {h.titulo}
          </h1>
          <p className="max-w-136 text-cuerpo-grande text-grafito-600">{h.intro}</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={RUTA_REGISTRO}>{h.comenzar}</Link>
            </Button>
            <Button asChild size="lg" variant="secundario">
              <Link to="/#como-funciona">{h.comoFunciona}</Link>
            </Button>
          </div>
          <ul
            aria-label={h.confianzaEtiqueta}
            className="mt-3 flex flex-wrap gap-x-6 gap-y-3 text-pequeno font-semibold text-grafito-600"
          >
            {h.confianza.map((texto, i) => {
              const Icono = iconosConfianza[i] ?? Check;
              return (
                <li key={texto} className="inline-flex items-center gap-2">
                  <Icono aria-hidden className="size-5 text-salvia-600" />
                  {texto}
                </li>
              );
            })}
          </ul>
        </div>
        <EscenaHero />
      </div>
    </section>
  );
}

function QueEs() {
  const q = inicio.queEs;
  return (
    <Seccion id="que-es" titulo={q.titulo} texto={q.texto}>
      <div className="grid grid-cols-1 gap-5 hyphens-auto md:grid-cols-2">
        <Reveal className="rounded-xl bg-salvia-100 p-7 contraste-alto:border contraste-alto:border-piedra-200">
          <h3 className="mb-4 text-h3">{q.esTitulo}</h3>
          <ul className="grid gap-3">
            {q.es.map((texto) => (
              <li key={texto} className="flex gap-3">
                <Check
                  aria-hidden
                  strokeWidth={2.5}
                  className="mt-1 size-5 shrink-0 text-salvia-600"
                />
                {texto}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal index={1} className="rounded-xl border border-piedra-200 bg-blanco p-7">
          <h3 className="mb-4 text-h3">{q.noEsTitulo}</h3>
          <ul className="grid gap-3">
            {q.noEs.map((texto) => (
              <li key={texto} className="flex gap-3">
                <Minus
                  aria-hidden
                  strokeWidth={2.5}
                  className="mt-1 size-5 shrink-0 text-grafito-600"
                />
                {texto}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </Seccion>
  );
}

function ComoFunciona() {
  const c = inicio.comoFunciona;
  return (
    <Seccion id="como-funciona" titulo={c.titulo} texto={c.texto} alterna>
      {/* Es una secuencia: lista numerada con una línea que une los pasos. */}
      <ol className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-4 lg:gap-6">
        {c.pasos.map((paso, i) => (
          <li
            key={paso.titulo}
            className={cn(
              'relative h-full pl-16 lg:pt-16 lg:pl-0',
              i < c.pasos.length - 1 &&
                'before:absolute before:top-11 before:-bottom-8 before:left-[1.3rem] before:w-0.5 before:bg-piedra-300 lg:before:top-[1.35rem] lg:before:right-[-1.5rem] lg:before:bottom-auto lg:before:left-12 lg:before:h-0.5 lg:before:w-auto',
            )}
          >
            <span
              aria-hidden
              className="absolute top-0 left-0 grid size-11 place-items-center rounded-pill border-2 border-pizarra-700 bg-blanco font-titulo font-extrabold text-pizarra-700"
            >
              {i + 1}
            </span>
            <Reveal index={i}>
              <h3 className="mb-1.5 pt-2 text-h3">{paso.titulo}</h3>
              <p className="text-grafito-600">{paso.texto}</p>
            </Reveal>
          </li>
        ))}
      </ol>
      <Button asChild variant="enlace">
        <Link to={RUTA_REGISTRO}>{inicio.hero.comenzar}</Link>
      </Button>
    </Seccion>
  );
}

function Publicos() {
  const p = inicio.publicos;
  const grupos = [
    { id: 'nino', icono: Backpack, ...p.grupos.nino },
    { id: 'adolescente', icono: School, ...p.grupos.adolescente },
    { id: 'adulto', icono: UserRound, ...p.grupos.adulto },
  ] as const;
  return (
    <Seccion id="para-quien" titulo={p.titulo} texto={p.texto} alterna>
      <ul className="grid grid-cols-1 gap-5 hyphens-auto lg:grid-cols-3">
        {grupos.map((grupo, i) => {
          const pronto = grupo.id === 'adolescente';
          const Tarjeta = pronto ? Card : TiltCard;
          return (
            <li key={grupo.id} className="h-full">
              <Reveal index={i} className="h-full">
                <Tarjeta
                  className={cn(
                    'flex h-full flex-col gap-3 p-7',
                    pronto ? 'border-dashed border-borde-campo bg-piedra-50' : 'shadow-1',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-13 place-items-center rounded-lg [&_svg]:size-7',
                      pronto ? 'bg-piedra-200 text-grafito-600' : 'bg-salvia-100 text-salvia-600',
                    )}
                  >
                    <grupo.icono />
                  </span>
                  <h3 className="flex flex-wrap items-center gap-2 text-h3">
                    {grupo.titulo}
                    {pronto ? (
                      <span className="rounded-pill bg-piedra-200 px-2.5 py-0.5 text-pequeno font-semibold text-grafito-900 contraste-alto:border contraste-alto:border-current">
                        {p.proximamente}
                      </span>
                    ) : null}
                  </h3>
                  <p className="flex-1 text-grafito-600">{grupo.texto}</p>
                  {pronto ? (
                    <Button asChild variant="enlace" className="self-start">
                      <Link to="/lineas-de-ayuda">{p.verLineas}</Link>
                    </Button>
                  ) : (
                    <Button asChild variant="secundario" size="sm" className="self-start">
                      <Link
                        to={`${RUTA_REGISTRO}?grupo=${grupo.id}`}
                        aria-label={p.empezarComo(grupo.titulo)}
                      >
                        {p.empezar}
                      </Link>
                    </Button>
                  )}
                </Tarjeta>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Seccion>
  );
}

function Privacidad() {
  const p = inicio.privacidad;
  const iconos: readonly LucideIcon[] = [FileCheck, UserCheck, Lock, ShieldCheck];
  return (
    <Seccion id="privacidad" titulo={p.titulo} texto={p.texto}>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-7 md:grid-cols-2">
        {p.garantias.map((garantia, i) => {
          const Icono = iconos[i] ?? ShieldCheck;
          return (
            <li key={garantia.titulo}>
              <Reveal index={i} className="flex gap-4">
                <span
                  aria-hidden
                  className="grid size-12 shrink-0 place-items-center rounded-pill bg-pizarra-100 text-pizarra-700 [&_svg]:size-6"
                >
                  <Icono />
                </span>
                <div>
                  <h3 className="mb-1 text-cuerpo-grande">{garantia.titulo}</h3>
                  <p className="text-grafito-600">{garantia.texto}</p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
      <Button asChild variant="enlace" className="mt-8">
        <Link to="/privacidad">{p.verPolitica}</Link>
      </Button>
    </Seccion>
  );
}

function Pausa() {
  return (
    <section id="pausa" aria-label={inicio.respiracion.etiqueta} className="bg-piedra-100 seccion">
      <div className="contenedor">
        <Reveal>
          <RespiracionGuiada />
        </Reveal>
      </div>
    </section>
  );
}

function PreguntasFrecuentes() {
  const p = inicio.preguntas;
  return (
    <Seccion id="preguntas-frecuentes" titulo={p.titulo}>
      <Accordion type="multiple" className="max-w-216">
        {p.lista.map((item, i) => (
          <AccordionItem key={item.pregunta} value={`pregunta-${i}`}>
            <AccordionTrigger>{item.pregunta}</AccordionTrigger>
            <AccordionContent>
              <p>{item.respuesta}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Seccion>
  );
}

function Cierre() {
  return (
    <section aria-labelledby="cierre-titulo" className="textura-grano bg-pizarra-800 seccion">
      <div className="contenedor flex flex-col items-start gap-7 md:flex-row md:items-center md:justify-between">
        <h2 id="cierre-titulo" className="max-w-[20ch] text-h2 text-blanco">
          {inicio.cierre.titulo}
        </h2>
        <Button
          asChild
          size="lg"
          className="bg-blanco text-pizarra-800 hover:bg-salvia-100 focus-visible:outline-blanco"
        >
          <Link to={RUTA_REGISTRO}>{inicio.hero.comenzar}</Link>
        </Button>
      </div>
    </section>
  );
}

/** Lleva a la sección del ancla (/#areas) cuando la página termina de cargar. */
function useAnclaInicial() {
  const { hash } = useLocation();
  const primeraVez = useRef(true);
  useEffect(() => {
    if (!primeraVez.current || !hash) return;
    primeraVez.current = false;
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' });
  }, [hash]);
}

/** Página de inicio institucional (Fase 3). */
export default function InicioPage() {
  const info = textos.paginas.inicio;
  useAnclaInicial();
  return (
    <MotionScope>
      <PageMeta title={info.titulo} indexable={info.indexable} />
      <Hero />
      <QueEs />
      <ComoFunciona />
      <Seccion id="areas" titulo={inicio.areas.titulo} texto={inicio.areas.texto}>
        <ExploradorAreas />
      </Seccion>
      <Publicos />
      <Privacidad />
      <Pausa />
      <PreguntasFrecuentes />
      <Seccion
        id="lineas-de-ayuda"
        titulo={inicio.lineas.titulo}
        texto={inicio.lineas.texto}
        alterna
      >
        <HelplineList className="grid-cols-[repeat(auto-fit,minmax(min(13.5rem,100%),1fr))]" />
      </Seccion>
      <Cierre />
    </MotionScope>
  );
}
