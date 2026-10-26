import {
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  Clock,
  Cloud,
  CloudSun,
  Compass,
  ListChecks,
  Lock,
  Pause,
  Sun,
  Users,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { iconosAreas } from '@/components/bienestar/iconos-areas';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Callout } from '@/components/ui/feedback';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { toast } from '@/components/ui/toast-store';
import { participar } from '@/content/participar';
import { textos } from '@/content/textos-interfaz';
import { areas } from '@/content/v1/areas';
import { cuestionarios } from '@/content/v1/cuestionarios';
import { enviador, ErrorEnvio, type CodigoErrorEnvio } from '@/features/participar/envio';
import { nuevaClaveEnvio } from '@/features/participar/estado';
import {
  construirEnvio,
  contarRespondidas,
  type ModuloDisponible,
} from '@/features/participar/modelo';
import { useParticipacion } from '@/features/participar/participacion-context';
import { PantallaParticipacion, PasosParticipacion } from '@/features/participar/piezas';
import { useTituloDelPaso } from '@/features/participar/use-titulo-del-paso';
import { useAccessibility } from '@/lib/a11y/accessibility-context';
import type { Pregunta as PreguntaCuestionario, ValorRespuesta } from '@/types/dominio';

const areaPorId = new Map(areas.map((area) => [area.id, area]));
const iconosNino: Partial<Record<ValorRespuesta, LucideIcon>> = {
  si: Sun,
  a_veces: CloudSun,
  no: Cloud,
};
const iconosQueEsperar: readonly LucideIcon[] = [
  ListChecks,
  Clock,
  Pause,
  CircleCheck,
  Compass,
  Lock,
];

interface VistaProps {
  modulo: ModuloDisponible;
  tituloRef: RefObject<HTMLHeadingElement | null>;
}

/**
 * Cuestionario (Fase 6): antes de empezar, una pregunta por pantalla, revisión y envío.
 * Sin registro completo vuelve al registro; con el envío hecho, a los resultados.
 */
export default function CuestionarioPage() {
  const { estado } = useParticipacion();
  const pasoTitulo = estado.fase === 'pregunta' ? `pregunta-${estado.indice}` : estado.fase;
  const tituloRef = useTituloDelPaso(pasoTitulo);

  if (!estado.modulo || !estado.registroCompleto) {
    return <Navigate to={estado.enviado ? '/resultados' : '/registro'} replace />;
  }
  const pregunta = cuestionarios[estado.modulo].preguntas[estado.indice];

  return (
    <>
      <PageMeta title={textos.paginas.cuestionario.titulo} indexable={false} />
      {estado.fase === 'antes' ? (
        <Antes modulo={estado.modulo} tituloRef={tituloRef} />
      ) : estado.fase === 'pregunta' && pregunta ? (
        <Pregunta modulo={estado.modulo} pregunta={pregunta} tituloRef={tituloRef} />
      ) : (
        <Revision modulo={estado.modulo} tituloRef={tituloRef} />
      )}
    </>
  );
}

function Antes({ modulo, tituloRef }: VistaProps) {
  const { estado, despachar } = useParticipacion();
  const { preferences } = useAccessibility();
  const navigate = useNavigate();
  const t = participar.antes;

  return (
    <PantallaParticipacion>
      <PasosParticipacion actual={3} />
      <h1 ref={tituloRef} tabIndex={-1} className="text-h1 outline-none">
        {t.titulo}
      </h1>
      {modulo === 'nino' ? (
        <Callout className="mt-6" title={t.acompanante.titulo} icon={<Users />}>
          {t.acompanante.texto}
        </Callout>
      ) : null}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {t.queEsperar.map((texto, i) => {
          const Icono = iconosQueEsperar[i] ?? CircleCheck;
          return (
            <li key={texto} className="flex items-start gap-3">
              <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-salvia-600" />
              <span>{texto}</span>
            </li>
          );
        })}
      </ul>
      <h2 className="mt-10 text-h3">{t.comoResponder}</h2>
      <p className="mt-3 text-cuerpo-grande">{cuestionarios[modulo].instrucciones.texto}</p>
      <p className="mt-3 text-pequeno text-grafito-600">
        {preferences.autoAdvance ? t.conAvance : t.sinAvance}
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => despachar({ tipo: 'irAPregunta', indice: estado.indice })}>
          {t.empezar}
        </Button>
        <Button variant="fantasma" size="lg" onClick={() => void navigate('/registro')}>
          {t.editarDatos}
        </Button>
      </div>
    </PantallaParticipacion>
  );
}

function PausarYSalir() {
  const t = participar.pregunta;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="fantasma" size="sm">
          <Pause aria-hidden />
          {t.pausar}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t.pausarTitulo}</DialogTitle>
        <DialogDescription>{t.pausarTexto}</DialogDescription>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secundario">{t.seguir}</Button>
          </DialogClose>
          <Button asChild>
            <Link to="/">{t.salir}</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const vozDisponible = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function Pregunta({
  modulo,
  pregunta,
  tituloRef,
}: VistaProps & { pregunta: PreguntaCuestionario }) {
  const { estado, despachar } = useParticipacion();
  const { preferences } = useAccessibility();
  const tituloId = useId();
  const t = participar.pregunta;
  const cuestionario = cuestionarios[modulo];
  const { opciones, preguntas } = cuestionario;
  const total = preguntas.length;
  const area = areaPorId.get(pregunta.areaId);
  const IconoArea = area ? iconosAreas[area.icono] : undefined;
  const elegida = estado.respuestas[pregunta.areaId];
  const respondidas = contarRespondidas(modulo, estado.respuestas);
  const faltan = total - respondidas;
  const ultima = estado.indice === total - 1;
  // Con las flechas se recorre el grupo: ahí no se avanza solo, para no saltar de pregunta.
  const porFlechas = useRef(false);
  const avance = useRef<number | undefined>(undefined);

  const elegir = useCallback(
    (valor: ValorRespuesta, avanzar: boolean) => {
      despachar({ tipo: 'responder', areaId: pregunta.areaId, valor });
      window.clearTimeout(avance.current);
      if (avanzar && preferences.autoAdvance) {
        avance.current = window.setTimeout(() => despachar({ tipo: 'siguiente' }), 500);
      }
    },
    [despachar, pregunta.areaId, preferences.autoAdvance],
  );

  // Al cambiar de pregunta se cancela el avance pendiente y la lectura en voz alta.
  useEffect(
    () => () => {
      window.clearTimeout(avance.current);
      if (vozDisponible()) window.speechSynthesis.cancel();
    },
    [estado.indice],
  );

  // Mensajes de ánimo al llegar a las preguntas 6, 11 y 16 (una sola vez).
  useEffect(() => {
    const mensaje = t.hitos[estado.indice];
    if (mensaje && !estado.hitos.includes(estado.indice)) {
      toast({ title: mensaje });
      despachar({ tipo: 'marcarHito', numero: estado.indice });
    }
  }, [estado.indice, estado.hitos, despachar, t.hitos]);

  // Atajos: 1 a 4 eligen y Enter continúa (no dentro de campos, enlaces, botones ni diálogos).
  useEffect(() => {
    function alPresionar(evento: KeyboardEvent) {
      if (evento.altKey || evento.ctrlKey || evento.metaKey) return;
      const objetivo = evento.target as HTMLElement;
      if (objetivo.closest('input, select, textarea, a, [role="dialog"]')) return;
      if (objetivo.closest('button') && !objetivo.closest('[role="radio"]')) return;
      const numero = Number(evento.key);
      const opcion = Number.isInteger(numero) && numero >= 1 ? opciones[numero - 1] : undefined;
      if (opcion) {
        evento.preventDefault();
        elegir(opcion.valor, true);
      } else if (evento.key === 'Enter' && elegida) {
        evento.preventDefault();
        despachar({ tipo: 'siguiente' });
      }
    }
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [opciones, elegir, elegida, despachar]);

  function escuchar() {
    const texto = `${pregunta.texto}. ${t.opcionesVoz}: ${opciones.map((o) => o.etiqueta).join(', ')}.`;
    const voz = new SpeechSynthesisUtterance(texto);
    voz.lang = 'es-CO';
    const espanol = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('es'));
    if (espanol) voz.voice = espanol;
    voz.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(voz);
  }

  const minutos = Math.max(1, Math.round((faltan * 30) / 60));

  return (
    <PantallaParticipacion>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-grafito-900">{t.numero(estado.indice + 1, total)}</p>
        <PausarYSalir />
      </div>
      <SegmentedProgress
        className="mt-3"
        value={respondidas}
        total={total}
        label={t.progreso}
        valueText={t.progresoTexto(respondidas, total)}
      />
      <p className="mt-2 text-pequeno text-grafito-600">
        {faltan === 0 ? t.todasRespondidas : t.tiempo(minutos)}
      </p>

      <div className="mt-10">
        {area ? (
          <p className="inline-flex items-center gap-2 rounded-pill bg-salvia-100 px-3 py-1 text-pequeno font-semibold text-pizarra-800 [&_svg]:size-4">
            {IconoArea ? <IconoArea aria-hidden /> : null}
            {area.nombre}
          </p>
        ) : null}
        <h1 id={tituloId} ref={tituloRef} tabIndex={-1} className="mt-4 text-h2 outline-none">
          {pregunta.texto}
        </h1>
      </div>

      <RadioCardGroup
        legend={pregunta.texto}
        labelledBy={tituloId}
        className="mt-8"
        value={elegida ?? ''}
        onKeyDownCapture={(evento) => {
          if (evento.key.startsWith('Arrow')) porFlechas.current = true;
        }}
        onValueChange={(valor) => {
          const opcion = opciones.find((o) => o.valor === valor);
          if (opcion) elegir(opcion.valor, !porFlechas.current);
          porFlechas.current = false;
        }}
      >
        {opciones.map((opcion) => {
          const Icono = modulo === 'nino' ? iconosNino[opcion.valor] : undefined;
          return (
            <RadioCard
              key={opcion.valor}
              value={opcion.valor}
              title={opcion.etiqueta}
              icon={Icono ? <Icono /> : undefined}
            />
          );
        })}
      </RadioCardGroup>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {vozDisponible() ? (
          <Button variant="fantasma" size="sm" onClick={escuchar}>
            <Volume2 aria-hidden />
            {t.escuchar}
          </Button>
        ) : (
          <span />
        )}
        <p aria-live="polite" className="text-pequeno text-grafito-600">
          {elegida ? t.guardada : ''}
        </p>
      </div>

      <div className="mt-8 flex flex-wrap justify-between gap-3">
        <Button
          variant="secundario"
          onClick={() => despachar({ tipo: 'anterior' })}
          disabled={estado.indice === 0 && !estado.desdeRevision}
        >
          <ArrowLeft aria-hidden />
          {t.anterior}
        </Button>
        <Button onClick={() => despachar({ tipo: 'siguiente' })} disabled={!elegida}>
          {estado.desdeRevision ? t.volverRevision : ultima ? t.revisar : t.siguiente}
          <ArrowRight aria-hidden />
        </Button>
      </div>
      <p className="mt-6 text-pequeno text-grafito-600">{t.atajos(opciones.length)}</p>
    </PantallaParticipacion>
  );
}

type EstadoEnvio =
  { tipo: 'listo' } | { tipo: 'enviando' } | { tipo: 'error'; codigo: CodigoErrorEnvio };

function Revision({ modulo, tituloRef }: VistaProps) {
  const { estado, despachar } = useParticipacion();
  const [envio, setEnvio] = useState<EstadoEnvio>({ tipo: 'listo' });
  const t = participar.revision;
  const { opciones, preguntas } = cuestionarios[modulo];
  const etiquetas = new Map(opciones.map((o) => [o.valor, o.etiqueta]));

  async function enviar() {
    let datos;
    try {
      datos = construirEnvio({ ...estado, modulo });
    } catch {
      setEnvio({ tipo: 'error', codigo: 'datos_invalidos' });
      return;
    }
    setEnvio({ tipo: 'enviando' });
    try {
      const { codigo, resultado } = await enviador.enviar(datos);
      // Sin registro pendiente, la página lleva a los resultados.
      despachar({
        tipo: 'enviado',
        codigo,
        resultado,
        fecha: new Date().toISOString(),
        claveSiguiente: nuevaClaveEnvio(),
      });
    } catch (error) {
      setEnvio({ tipo: 'error', codigo: error instanceof ErrorEnvio ? error.codigo : 'servidor' });
    }
  }

  return (
    <PantallaParticipacion>
      <PasosParticipacion actual={4} />
      <h1 ref={tituloRef} tabIndex={-1} className="text-h1 outline-none">
        {t.titulo}
      </h1>
      <p className="mt-3 text-cuerpo-grande text-grafito-600">{t.texto}</p>

      <ol className="mt-8 flex flex-col gap-3">
        {preguntas.map((pregunta, i) => {
          const valor = estado.respuestas[pregunta.areaId];
          return (
            <li
              key={pregunta.areaId}
              className="flex items-start gap-4 rounded-lg border border-piedra-200 bg-blanco p-4"
            >
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-pizarra-100 text-pequeno font-semibold text-pizarra-700"
              >
                {i + 1}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="text-pequeno text-grafito-600">
                  {areaPorId.get(pregunta.areaId)?.nombre}
                </p>
                <p className="text-grafito-900">{pregunta.texto}</p>
                <p className="font-semibold text-pizarra-700">
                  <span className="sr-only">{t.tuRespuesta} </span>
                  {(valor && etiquetas.get(valor)) ?? t.sinResponder}
                </p>
              </div>
              <Button
                variant="enlace"
                size="sm"
                aria-label={t.cambiarDe(i + 1)}
                onClick={() => despachar({ tipo: 'irAPregunta', indice: i, desdeRevision: true })}
              >
                {t.cambiar}
              </Button>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-col gap-4" role="status">
        {!enviador.configurado ? (
          <Callout>{participar.envio.noConectado}</Callout>
        ) : envio.tipo === 'error' ? (
          <Callout>{participar.envio.errores[envio.codigo]}</Callout>
        ) : (
          <Callout>{t.aviso}</Callout>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          size="lg"
          onClick={() => void enviar()}
          disabled={!enviador.configurado}
          loading={envio.tipo === 'enviando'}
          loadingLabel={t.enviando}
        >
          {envio.tipo === 'error' ? participar.envio.reintentar : t.enviar}
        </Button>
        <Button
          variant="fantasma"
          size="lg"
          onClick={() =>
            despachar({ tipo: 'irAPregunta', indice: preguntas.length - 1, desdeRevision: false })
          }
        >
          {t.volver}
        </Button>
      </div>
    </PantallaParticipacion>
  );
}
