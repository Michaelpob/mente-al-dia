import { useState } from 'react';
import { iconosAreas, tonoDimension } from '@/components/bienestar/iconos-areas';
import { RuedaBienestar } from '@/components/bienestar/rueda-bienestar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { inicio } from '@/content/inicio';
import { areas, dimensiones } from '@/content/v1/areas';
import { cn } from '@/lib/utils/cn';
import type { AreaId } from '@/types/dominio';

const TODAS = 'todas';
const areaPorId = new Map(areas.map((area) => [area.id, area]));
const opciones = [
  { id: TODAS, nombre: inicio.areas.todas, areas: areas.map((area) => area.id) },
  ...dimensiones,
];

/**
 * Explorador de las 20 áreas: la rueda y una lista filtrable por dimensión.
 * La lista (pestañas de Radix) es la vía accesible; la rueda la acompaña para el puntero:
 * al pasar sobre un área se destaca en ambas, y al tocarla se abre su dimensión.
 */
export function ExploradorAreas() {
  const [dimension, setDimension] = useState<string>(TODAS);
  const [activa, setActiva] = useState<AreaId | null>(null);
  const [elegida, setElegida] = useState<AreaId | null>(null);

  const resaltadas = dimensiones.find((d) => d.id === dimension)?.areas ?? null;

  function cambiarDimension(id: string) {
    setDimension(id);
    setElegida(null);
  }

  function elegirArea(id: AreaId) {
    const suya = dimensiones.find((d) => d.areas.includes(id));
    if (suya) setDimension(suya.id);
    setElegida(id);
  }

  return (
    <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-14">
      <RuedaBienestar
        className="max-w-sm lg:sticky lg:top-28"
        centro={{ titulo: inicio.areas.centroTitulo, detalle: inicio.areas.centroDetalle }}
        activa={activa ?? elegida}
        resaltadas={resaltadas}
        onActivar={setActiva}
        onElegir={elegirArea}
      />
      <Tabs value={dimension} onValueChange={cambiarDimension} className="min-w-0">
        <TabsList aria-label={inicio.areas.dimensionesEtiqueta} className="flex-wrap rounded-xl">
          {opciones.map((opcion) => (
            <TabsTrigger key={opcion.id} value={opcion.id}>
              {opcion.nombre}
            </TabsTrigger>
          ))}
        </TabsList>
        {opciones.map((opcion) => (
          <TabsContent key={opcion.id} value={opcion.id}>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {opcion.areas.map((id) => {
                const area = areaPorId.get(id);
                if (!area) return null;
                const Icono = iconosAreas[area.icono];
                return (
                  <li
                    key={id}
                    onPointerEnter={() => setActiva(id)}
                    onPointerLeave={() => setActiva(null)}
                    className={cn(
                      'flex items-start gap-3.5 rounded-md px-3 py-2.5 transition-[background-color,box-shadow] duration-(--duracion-micro) ease-estandar',
                      'hover:bg-blanco hover:shadow-1',
                      (id === elegida || id === activa) &&
                        'bg-blanco shadow-1 contraste-alto:outline contraste-alto:outline-2 contraste-alto:outline-pizarra-700',
                    )}
                  >
                    <span
                      aria-hidden
                      className="grid size-10 shrink-0 place-items-center rounded-md text-grafito-900 [&_svg]:size-5"
                      style={{ background: tonoDimension[area.dimension] }}
                    >
                      {Icono ? <Icono /> : null}
                    </span>
                    <span className="min-w-0 hyphens-auto">
                      <strong className="block text-grafito-900">{area.nombre}</strong>
                      <span className="mt-0.5 block text-pequeno text-grafito-600">
                        {area.descripcionCorta}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
