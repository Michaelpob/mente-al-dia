import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, LayoutDashboard, Pencil } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Callout, EmptyState, Skeleton } from '@/components/ui/feedback';
import { TextField } from '@/components/ui/field';
import { SwitchField } from '@/components/ui/switch';
import { panelInstituciones } from '@/content/panel-instituciones';
import { cn } from '@/lib/utils/cn';
import { CampoSelect, EncabezadoPanel, ErrorCarga, PaginaPanel } from '../compartido';
import { ListaBarras } from '../censo/piezas';
import { actualizarInstitucion, obtenerInstituciones } from '../datos/consultas';
import { hoyEnColombia, sumarDias } from '../datos/filtros';
import { formatearFecha, formatearNumero } from '../datos/formato';
import type { InstitucionPanel } from '../datos/tipos';
import { useAlcance } from './alcance';
import { CampoEnlace } from './piezas';

const t = panelInstituciones.instituciones;
const PERIODOS = [30, 90, 365] as const;
type Periodo = 'todo' | (typeof PERIODOS)[number];
const PATRON_SLUG = /^[a-z0-9-]{3,40}$/;

function leerPeriodo(params: URLSearchParams): Periodo {
  const n = Number(params.get('periodo'));
  return (PERIODOS as readonly number[]).includes(n) ? (n as Periodo) : 'todo';
}

/**
 * /panel/instituciones (D-86), solo el administrador general: cada institución con su enlace, su
 * actividad y su estado, y una comparación de cuántos cuestionarios llegaron por cada una.
 */
export default function InstitucionesPage() {
  const [params, setParams] = useSearchParams();
  const hoy = useMemo(() => hoyEnColombia(), []);
  const periodo = leerPeriodo(params);
  const desde = periodo === 'todo' ? null : sumarDias(hoy, 1 - periodo);
  const hasta = periodo === 'todo' ? null : hoy;
  const [editando, setEditando] = useState<InstitucionPanel | null>(null);
  const [aviso, setAviso] = useState('');

  const consulta = useQuery({
    queryKey: ['panel', 'instituciones', desde, hasta],
    queryFn: () => obtenerInstituciones(desde, hasta),
    placeholderData: keepPreviousData,
  });
  const lista = consulta.data ?? [];
  const totalCuestionarios = lista.reduce((suma, i) => suma + i.cuestionarios, 0);
  const totalPersonas = lista.reduce((suma, i) => suma + i.personas, 0);

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel titulo={t.titulo} descripcion={t.descripcion}>
        <CampoSelect
          className="w-full sm:w-56"
          etiqueta={t.periodo}
          valor={String(periodo)}
          opciones={[
            { valor: 'todo', etiqueta: t.periodos.todo },
            ...PERIODOS.map((n) => ({ valor: String(n), etiqueta: t.periodos[n] })),
          ]}
          alCambiar={(valor) =>
            setParams(valor === 'todo' ? {} : { periodo: valor }, { replace: true })
          }
        />
      </EncabezadoPanel>
      {consulta.data ? (
        <p className="text-grafito-600 tabular-nums">
          {t.totales(formatearNumero(totalCuestionarios), formatearNumero(totalPersonas))}
        </p>
      ) : null}

      <p role="status" className="text-pequeno font-semibold text-grafito-900 empty:hidden">
        {aviso}
      </p>

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {consulta.data && consulta.data.length === 0 ? (
        <EmptyState icon={<Building2 aria-hidden className="size-8" />} title={t.vacio} />
      ) : consulta.data ? (
        <div
          className={cn(
            'flex flex-col gap-6',
            consulta.isPlaceholderData && 'opacity-60 transition-opacity',
          )}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <ListaBarras
              titulo={t.comparacion.titulo}
              nota={t.comparacion.descripcion}
              total={totalCuestionarios}
              filas={lista.map((i) => ({ etiqueta: i.nombre, n: i.cuestionarios }))}
            />
            <ListaBarras
              titulo={t.comparacion.personas}
              total={totalPersonas}
              filas={lista.map((i) => ({ etiqueta: i.nombre, n: i.personas }))}
            />
          </div>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lista.map((institucion) => (
              <li key={institucion.id}>
                <TarjetaInstitucion
                  institucion={institucion}
                  alEditar={() => {
                    setAviso('');
                    setEditando(institucion);
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : consulta.isPending ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : null}

      <EditarInstitucion
        institucion={editando}
        alCerrar={() => setEditando(null)}
        alGuardar={(nombre) => {
          setEditando(null);
          setAviso(t.formulario.guardado(nombre));
        }}
      />
    </PaginaPanel>
  );
}

function TarjetaInstitucion({
  institucion: i,
  alEditar,
}: {
  institucion: InstitucionPanel;
  alEditar: () => void;
}) {
  const { elegir } = useAlcance();
  const navigate = useNavigate();
  const datos: [string, number][] = [
    [t.indicadores.cuestionarios, i.cuestionarios],
    [t.indicadores.personas, i.personas],
    [t.indicadores.prioritarios, i.prioritariosPendientes],
    [t.indicadores.visitas, i.visitas],
    [t.indicadores.administradores, i.administradores],
  ];
  return (
    <Card className="flex h-full flex-col gap-4 bg-blanco p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-h4 text-grafito-900">{i.nombre}</h2>
        <span
          className={cn(
            'shrink-0 rounded-pill px-2.5 py-0.5 text-pequeno font-semibold contraste-alto:border contraste-alto:border-current',
            i.activa
              ? 'bg-nivel-adecuado-fondo text-nivel-adecuado'
              : 'bg-nivel-sin-dato-fondo text-nivel-sin-dato',
          )}
        >
          {i.activa ? t.activa : t.inactiva}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-pequeno">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="flex flex-col gap-0.5">
            <dt className="text-grafito-600">{etiqueta}</dt>
            <dd className="text-h4 text-grafito-900 tabular-nums">{formatearNumero(valor)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-pequeno text-grafito-600">
        {i.ultimoCuestionario ? t.ultimo(formatearFecha(i.ultimoCuestionario)) : t.sinCuestionarios}
      </p>
      <CampoEnlace nombre={i.nombre} slug={i.slug} />
      <div className="mt-auto flex flex-wrap gap-2">
        <Button
          variant="secundario"
          size="sm"
          onClick={() => {
            elegir(i.id);
            navigate('/panel');
          }}
        >
          <LayoutDashboard aria-hidden className="size-4" />
          {t.verTablero}
        </Button>
        <Button variant="fantasma" size="sm" onClick={alEditar} aria-label={t.editarA(i.nombre)}>
          <Pencil aria-hidden className="size-4" />
          {t.editar}
        </Button>
      </div>
    </Card>
  );
}

const f = t.formulario;

function EditarInstitucion({
  institucion,
  alCerrar,
  alGuardar,
}: {
  institucion: InstitucionPanel | null;
  alCerrar: () => void;
  alGuardar: (nombre: string) => void;
}) {
  return (
    <Dialog open={institucion !== null} onOpenChange={(abierto) => !abierto && alCerrar()}>
      <DialogContent>
        {institucion ? (
          <FormularioInstitucion
            key={institucion.id}
            institucion={institucion}
            alGuardar={alGuardar}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioInstitucion({
  institucion,
  alGuardar,
}: {
  institucion: InstitucionPanel;
  alGuardar: (nombre: string) => void;
}) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(institucion.nombre);
  const [slug, setSlug] = useState(institucion.slug);
  const [activa, setActiva] = useState(institucion.activa);
  const [errores, setErrores] = useState<{ nombre?: string; slug?: string }>({});

  const guardar = useMutation({
    mutationFn: actualizarInstitucion,
    onSuccess: async (guardada) => {
      await queryClient.invalidateQueries({ queryKey: ['panel', 'instituciones'] });
      await queryClient.invalidateQueries({ queryKey: ['panel', 'administradores'] });
      alGuardar(guardada.nombre);
    },
  });

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    const slugLimpio = slug.trim().toLowerCase();
    const nuevos = {
      nombre: nombreLimpio.length < 2 || nombreLimpio.length > 120 ? f.errores.nombre : undefined,
      slug: PATRON_SLUG.test(slugLimpio) ? undefined : f.errores.slug,
    };
    setErrores(nuevos);
    if (nuevos.nombre || nuevos.slug) return;
    guardar.mutate({ id: institucion.id, nombre: nombreLimpio, slug: slugLimpio, activa });
  };

  const repetido = (guardar.error as { code?: string } | null)?.code === '23505';
  const cambiaEnlace = slug.trim().toLowerCase() !== institucion.slug;

  return (
    <>
      <DialogTitle>{f.titulo(institucion.nombre)}</DialogTitle>
      <DialogDescription>{f.descripcion}</DialogDescription>
      <form onSubmit={enviar} noValidate className="mt-5 flex flex-col gap-4">
        <TextField
          label={f.nombre}
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          maxLength={120}
          error={errores.nombre}
          required
        />
        <TextField
          label={f.slug}
          hint={f.slugAyuda}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          maxLength={40}
          autoCapitalize="none"
          spellCheck={false}
          error={errores.slug}
          required
        />
        {cambiaEnlace ? <Callout variant="apoyo">{f.slugCambia}</Callout> : null}
        <SwitchField
          label={f.activa}
          description={f.activaAyuda}
          checked={activa}
          onCheckedChange={setActiva}
        />
        {guardar.isError ? (
          <Callout variant="apoyo">{repetido ? f.errores.repetido : f.errores.general}</Callout>
        ) : null}
        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button type="button" variant="secundario">
              {f.cancelar}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={guardar.isPending}>
            {guardar.isPending ? f.guardando : f.guardar}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
