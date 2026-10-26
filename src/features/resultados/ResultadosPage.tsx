import { ChevronDown, Compass, Phone, Printer, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { RespiracionGuiada } from '@/components/bienestar/respiracion-guiada';
import { iconosAreas } from '@/components/bienestar/iconos-areas';
import { LeyendaNiveles, RuedaNiveles } from '@/components/bienestar/rueda-niveles';
import { HelplineList } from '@/components/layout/helplines';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Callout, Eyebrow } from '@/components/ui/feedback';
import { NivelBadge } from '@/components/ui/nivel-badge';
import { esMarcable, lineasActivas, type LineaAyuda } from '@/content/lineas-ayuda';
import { participar } from '@/content/participar';
import { textos } from '@/content/textos-interfaz';
import { mensajesAtencionEspecial, mensajesGenerales } from '@/content/v1/mensajes';
import type { ModuloDisponible } from '@/features/participar/modelo';
import { useParticipacion } from '@/features/participar/participacion-context';
import { PantallaParticipacion } from '@/features/participar/piezas';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import type { Area, AreaId, Nivel } from '@/types/dominio';
import {
  fechaLarga,
  fraseGuia,
  gruposPorNivel,
  mensajeDeArea,
  mensajeGeneral,
  resumenConteo,
} from './presentacion';

const idTarjeta = (areaId: AreaId) => `area-${areaId}`;

/** Botones de llamada del apoyo inmediato: las tres primeras líneas con número marcable. */
const LINEAS_APOYO = lineasActivas.filter((linea) => esMarcable(linea.numero)).slice(0, 3);
/** «Línea ICBF (141)»; si el nombre ya trae el número («Línea 155»), sin repetirlo. */
const etiquetaLinea = (linea: LineaAyuda) =>
  linea.nombre.includes(linea.numero) ? linea.nombre : `${linea.nombre} (${linea.numero})`;

/**
 * Resultados (Fase 7): apoyo inmediato si aplica, mensaje general, rueda con el nivel de cada
 * área, tarjetas por área agrupadas por nivel, recursos y versión imprimible.
 * Todo sale del resultado que devolvió el servidor (guardado en esta pestaña al enviar).
 */
export default function ResultadosPage() {
  const { estado, reiniciar } = useParticipacion();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const contenedorRef = useRef<HTMLDivElement>(null);
  const [activa, setActiva] = useState<AreaId | null>(null);
  const enviado = estado.enviado;

  // Al imprimir se abren todas las tarjetas; después vuelven como estaban.
  useEffect(() => {
    const raiz = contenedorRef.current;
    if (!raiz) return;
    let cerradas: HTMLDetailsElement[] = [];
    const antes = () => {
      cerradas = [...raiz.querySelectorAll('details')].filter((d) => !d.open);
      for (const tarjeta of cerradas) tarjeta.open = true;
    };
    const despues = () => {
      for (const tarjeta of cerradas) tarjeta.open = false;
      cerradas = [];
    };
    window.addEventListener('beforeprint', antes);
    window.addEventListener('afterprint', despues);
    return () => {
      window.removeEventListener('beforeprint', antes);
      window.removeEventListener('afterprint', despues);
    };
  }, [enviado]);

  if (!enviado) return <SinEnvio />;

  const t = participar.resultados;
  const { modulo, codigo, resultado } = enviado;
  const nino = modulo === 'nino';
  const general = resultado.resultadoGeneral;
  const grupos = gruposPorNivel(resultado.niveles);
  const fecha = fechaLarga(enviado.fecha);

  /** Desde la rueda: abre la tarjeta del área y lleva el foco a ella. */
  function elegirArea(areaId: AreaId) {
    const tarjeta = document.getElementById(idTarjeta(areaId));
    if (!(tarjeta instanceof HTMLDetailsElement)) return;
    tarjeta.open = true;
    tarjeta.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    tarjeta.querySelector('summary')?.focus({ preventScroll: true });
  }

  return (
    <>
      <PageMeta title={textos.paginas.resultados.titulo} indexable={false} />
      <div ref={contenedorRef}>
        <section className="contenedor pt-[clamp(2rem,5vw,4rem)]">
          <div className="mx-auto max-w-lectura">
            {resultado.rutaAtencionEspecial ? (
              <ApoyoInmediato modulo={modulo} titulo={t.apoyoTitulo} />
            ) : null}

            <Eyebrow className={resultado.rutaAtencionEspecial ? 'mt-10' : undefined}>
              {t.modulo[modulo]}
              {fecha ? ` · ${fecha}` : ''}
            </Eyebrow>
            <h1 className="mt-3 text-h1">{t.titulo}</h1>
            <p className="mt-4 inline-flex items-center gap-2 rounded-pill bg-salvia-100 px-3 py-1 text-pequeno font-semibold text-pizarra-800 [&_svg]:size-4">
              <Compass aria-hidden />
              {t.orientacionNoDiagnostico}
            </p>

            <div className="mt-8 rounded-xl border border-piedra-200 bg-blanco p-6 shadow-1 sm:p-8">
              <h2 className="text-h2">{t.titulosGenerales[general]}</h2>
              <p className="mt-3 text-cuerpo-grande">{mensajeGeneral(modulo, general)}</p>
              <p className="mt-4 font-titulo font-bold text-salvia-600">{fraseGuia(general)}</p>
              {resultado.resultadoParcial && general !== 'insuficiente' ? (
                <Callout className="mt-6">
                  {mensajesGenerales.parcial.replace(
                    '{respondidas}',
                    String(resultado.respondidas),
                  )}
                </Callout>
              ) : null}
            </div>
          </div>
        </section>

        <section aria-labelledby="areas-titulo" className="contenedor seccion">
          <div className="grid items-start gap-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-14 print:grid-cols-1">
            <div className="flex flex-col gap-4 lg:sticky lg:top-28 print:static">
              <h2 id="areas-titulo" className="text-h2">
                {t.areasTitulo}
              </h2>
              <p className="text-grafito-600">{resumenConteo(resultado.conteo)}.</p>
              <RuedaNiveles
                className="max-w-[18rem] sm:max-w-sm print:max-w-[16rem]"
                niveles={resultado.niveles}
                centro={t.centroRueda}
                activa={activa}
                onActivar={setActiva}
                onElegir={elegirArea}
              />
              <LeyendaNiveles etiqueta={t.leyenda} className="justify-center" />
            </div>

            <div className="flex min-w-0 flex-col gap-10">
              {grupos.map(({ nivel, areas }) => (
                <section key={nivel} aria-labelledby={`grupo-${nivel}`}>
                  <h3 id={`grupo-${nivel}`} className="text-h3">
                    {t.grupos[nivel]}{' '}
                    <span className="font-cuerpo text-cuerpo font-normal text-grafito-600">
                      ({areas.length})
                    </span>
                  </h3>
                  <ul className="mt-4 flex flex-col gap-3">
                    {areas.map((area) => (
                      <TarjetaArea
                        key={area.id}
                        area={area}
                        nivel={nivel}
                        modulo={modulo}
                        abierta={nivel === 'requiere_atencion'}
                        onActivar={setActiva}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              {nino ? (
                <Callout title={participar.enviado.acompanante} icon={<Users />}>
                  {mensajesGenerales.adultoAcompanante}
                </Callout>
              ) : null}
            </div>
          </div>
        </section>

        <section className="contenedor pb-[clamp(2rem,5vw,4rem)]">
          <div className="mx-auto max-w-lectura rounded-lg border border-piedra-200 bg-blanco p-5">
            <p className="text-pequeno text-grafito-600">{participar.enviado.codigo}</p>
            <p className="font-titulo text-h2 text-pizarra-700 tabular-nums">{codigo}</p>
            <p className="mt-1 text-pequeno text-grafito-600">{participar.enviado.codigoAyuda}</p>
          </div>
        </section>

        <section aria-label={t.pausa} className="bg-piedra-100 seccion print:hidden">
          <div className="contenedor flex flex-col gap-14">
            <RespiracionGuiada titulo={t.pausa} nivelTitulo="h2" />
            <div id="lineas-resultado">
              <h2 className="text-h2">{textos.lineasAyuda.titulo}</h2>
              <p className="mt-2 mb-6 text-grafito-600">{t.lineasTexto}</p>
              <HelplineList className="sm:grid-cols-2 lg:grid-cols-3" />
            </div>
          </div>
        </section>

        <section className="contenedor seccion print:hidden">
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={() => window.print()}>
              <Printer aria-hidden />
              {t.imprimir}
            </Button>
            <Button
              variant="secundario"
              size="lg"
              onClick={() => {
                reiniciar();
                void navigate('/registro');
              }}
            >
              {participar.enviado.otra}
            </Button>
            <Button asChild variant="fantasma" size="lg">
              <Link to="/">{participar.enviado.inicio}</Link>
            </Button>
          </div>
        </section>

        <p className="contenedor hidden pb-8 text-pequeno print:block">{t.aviso}</p>
      </div>
    </>
  );
}

function ApoyoInmediato({ modulo, titulo }: { modulo: ModuloDisponible; titulo: string }) {
  return (
    <section aria-labelledby="apoyo-titulo">
      <Callout variant="apoyo">
        <h2 id="apoyo-titulo" className="font-titulo text-h3 text-grafito-900">
          {titulo}
        </h2>
        <p className="mt-2 text-cuerpo-grande">{mensajesAtencionEspecial[modulo]}</p>
        {modulo === 'nino' ? (
          <>
            <p className="mt-4 font-semibold">{participar.enviado.acompanante}</p>
            <p className="mt-1">{mensajesAtencionEspecial.adulto}</p>
          </>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          {LINEAS_APOYO.map((linea, i) => (
            <Button key={linea.id} asChild variant={i === 0 ? 'primario' : 'secundario'}>
              <a
                href={`tel:${linea.numero}`}
                aria-label={textos.lineasAyuda.llamarA(linea.numero, linea.nombre)}
              >
                <Phone aria-hidden />
                {i === 0 ? participar.resultados.llamar123 : etiquetaLinea(linea)}
              </a>
            </Button>
          ))}
        </div>
        <a
          href="#lineas-resultado"
          className="mt-4 inline-block rounded-sm text-pizarra-700 underline decoration-1 underline-offset-4 hover:decoration-2 print:hidden"
        >
          {textos.lineasAyuda.verTodas}
        </a>
      </Callout>
    </section>
  );
}

function TarjetaArea({
  area,
  nivel,
  modulo,
  abierta,
  onActivar,
}: {
  area: Area;
  nivel: Nivel;
  modulo: ModuloDisponible;
  abierta: boolean;
  onActivar: (id: AreaId | null) => void;
}) {
  const Icono = iconosAreas[area.icono];
  return (
    <li>
      <details
        id={idTarjeta(area.id)}
        open={abierta}
        className="group rounded-lg border border-piedra-200 bg-blanco transition-shadow duration-(--duracion-micro) ease-estandar open:shadow-1 contraste-alto:border-piedra-300"
      >
        <summary
          className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-lg p-4 [&::-webkit-details-marker]:hidden"
          onPointerEnter={() => onActivar(area.id)}
          onPointerLeave={() => onActivar(null)}
        >
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-md bg-piedra-100 text-grafito-900 [&_svg]:size-5"
          >
            {Icono ? <Icono /> : null}
          </span>
          <span className="min-w-0 flex-1 font-semibold text-grafito-900">{area.nombre}</span>
          <NivelBadge nivel={nivel} size="sm" />
          <ChevronDown
            aria-hidden
            className="size-5 shrink-0 text-grafito-600 transition-transform duration-(--duracion-base) group-open:rotate-180 print:hidden"
          />
        </summary>
        <p className="px-4 pb-5 text-grafito-900 sm:pl-[4.25rem]">
          {mensajeDeArea(modulo, area.id, nivel)}
        </p>
      </details>
    </li>
  );
}

function SinEnvio() {
  const t = participar.enviado.sinEnvio;
  return (
    <>
      <PageMeta title={textos.paginas.resultados.titulo} indexable={false} />
      <PantallaParticipacion>
        <h1 className="text-h1">{t.titulo}</h1>
        <p className="mt-4 text-cuerpo-grande text-grafito-600">{t.texto}</p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/registro">{t.empezar}</Link>
        </Button>
      </PantallaParticipacion>
    </>
  );
}
