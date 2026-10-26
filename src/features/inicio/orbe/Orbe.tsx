import { useEffect, useRef, useState } from 'react';
import posterOrbe from '@/assets/orbe.webp';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { cn } from '@/lib/utils/cn';
import { montarEscena } from './escena';

interface NavigatorConAhorro extends Navigator {
  connection?: { saveData?: boolean };
}

const ahorroDeDatos = () => Boolean((navigator as NavigatorConAhorro).connection?.saveData);

/**
 * Escena 3D del inicio: el «Orbe de equilibrio».
 * Primero se ve el póster (imagen estática del mismo orbe) y, cuando el primer cuadro de WebGL
 * está listo, la escena lo reemplaza con un fundido. Se queda solo el póster si se pide reducir
 * el movimiento, si está activo el ahorro de datos o si el equipo no tiene WebGL.
 * Es decorativa: no tiene texto alternativo y no recibe foco.
 */
export function Orbe({ className }: { className?: string }) {
  const escenaRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const contenedor = escenaRef.current;
    if (!contenedor || reducedMotion || ahorroDeDatos()) return;
    const detener = montarEscena(contenedor, {
      interactivo: finePointer,
      alPintar: () => setListo(true),
      alPerderContexto: () => setListo(false),
    });
    return () => {
      detener?.();
      setListo(false);
    };
  }, [reducedMotion, finePointer]);

  return (
    <div
      ref={escenaRef}
      className={cn(
        'relative aspect-square w-full',
        '*:absolute *:inset-0 *:size-full *:transition-opacity *:duration-(--duracion-escena) *:ease-estandar',
        '[&>canvas]:opacity-0',
        listo && '[&>canvas]:opacity-100 [&>img]:opacity-0',
        className,
      )}
    >
      <img
        src={posterOrbe}
        alt=""
        width={880}
        height={880}
        fetchPriority="high"
        decoding="async"
        className="object-contain"
      />
    </div>
  );
}
