import { Pause, Play } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { inicio } from '@/content/inicio';
import { CICLOS_RESPIRACION, FASES_RESPIRACION, faseRespiracion } from '@/content/respiracion';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils/cn';

interface Paso {
  ciclo: number;
  fase: number;
  restante: number;
}

const PRIMER_PASO: Paso = { ciclo: 0, fase: 0, restante: faseRespiracion(0).segundos };

/** Mensaje para el lector de pantalla al empezar cada fase (no se anuncia la cuenta regresiva). */
const mensajeFase = ({ ciclo, fase }: Paso) =>
  inicio.respiracion.fase(faseRespiracion(fase).nombre, ciclo + 1);

/** El segundo siguiente, o null cuando terminan las respiraciones. */
function siguiente({ ciclo, fase, restante }: Paso): Paso | null {
  if (restante > 1) return { ciclo, fase, restante: restante - 1 };
  const otraFase = (fase + 1) % FASES_RESPIRACION.length;
  const otroCiclo = otraFase === 0 ? ciclo + 1 : ciclo;
  if (otroCiclo >= CICLOS_RESPIRACION) return null;
  return { ciclo: otroCiclo, fase: otraFase, restante: faseRespiracion(otraFase).segundos };
}

interface RespiracionGuiadaProps {
  titulo?: string;
  /** Nivel del título según la página donde va. */
  nivelTitulo?: 'h2' | 'h3';
  className?: string;
}

/**
 * Respiración guiada: un círculo que crece al inhalar y se encoge al exhalar, con cuenta regresiva.
 * El estado se anuncia una vez por fase (no cada segundo). Con «reducir movimiento» el círculo
 * no cambia de tamaño: se guía solo con el texto.
 */
export function RespiracionGuiada({
  titulo = inicio.respiracion.titulo,
  nivelTitulo: Titulo = 'h2',
  className,
}: RespiracionGuiadaProps) {
  const textos = inicio.respiracion;
  const reducedMotion = useReducedMotion();
  const [paso, setPaso] = useState<Paso | null>(null);
  const [mensaje, setMensaje] = useState<string>(textos.inicial);

  useEffect(() => {
    if (!paso) return;
    const temporizador = window.setTimeout(() => {
      const otro = siguiente(paso);
      if (!otro) setMensaje(textos.terminada);
      else if (otro.fase !== paso.fase) setMensaje(mensajeFase(otro));
      setPaso(otro);
    }, 1000);
    return () => window.clearTimeout(temporizador);
  }, [paso, textos.terminada]);

  const fase = paso ? faseRespiracion(paso.fase) : null;

  function alternar() {
    if (paso) {
      setPaso(null);
      setMensaje(textos.pausada);
    } else {
      setPaso(PRIMER_PASO);
      setMensaje(mensajeFase(PRIMER_PASO));
    }
  }

  const estiloCirculo = {
    '--escala-respiracion': fase && !reducedMotion ? fase.escala : 1,
    '--duracion-respiracion': fase ? `${fase.segundos}s` : '1.2s',
  } as CSSProperties;

  return (
    <div
      className={cn(
        'grid items-center gap-8 rounded-xl bg-blanco p-[clamp(1.5rem,4vw,3rem)] shadow-2 md:grid-cols-2 contraste-alto:border contraste-alto:border-piedra-200',
        className,
      )}
    >
      <div>
        <Titulo className="text-h2">{titulo}</Titulo>
        <p className="mt-3 text-cuerpo-grande text-grafito-600">{textos.texto}</p>
        <Button className="mt-6" onClick={alternar}>
          {paso ? <Pause aria-hidden /> : <Play aria-hidden />}
          {paso ? textos.pausar : textos.empezar}
        </Button>
        <p role="status" className="mt-3 text-pequeno text-grafito-600">
          {mensaje}
        </p>
      </div>
      <div
        aria-hidden
        className="relative mx-auto grid aspect-square w-[min(16rem,70vw)] place-items-center"
      >
        <span className="absolute inset-0 rounded-pill border border-piedra-300" />
        <span
          style={estiloCirculo}
          className="aspect-square w-[45%] scale-(--escala-respiracion) rounded-pill bg-[radial-gradient(circle_at_35%_30%,var(--blanco),var(--salvia-100)_45%,var(--arena-400))] shadow-[inset_0_-10px_30px_color-mix(in_srgb,var(--salvia-600)_25%,transparent)] transition-[scale] duration-(--duracion-respiracion) ease-[cubic-bezier(0.45,0,0.55,1)]"
        />
        <span className="absolute inset-x-0 -bottom-2 text-center font-titulo text-h3 text-pizarra-700">
          {paso && fase ? `${fase.nombre} ${paso.restante}` : ''}
        </span>
      </div>
    </div>
  );
}
