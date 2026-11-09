import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, ShieldAlert, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
import { Callout, EmptyState, Skeleton } from '@/components/ui/feedback';
import { TextField } from '@/components/ui/field';
import { panelInstituciones } from '@/content/panel-instituciones';
import { cn } from '@/lib/utils/cn';
import { useSesion } from '../acceso/sesion-context';
import { CampoSelect, EncabezadoPanel, ErrorCarga, PaginaPanel } from '../compartido';
import {
  actualizarAdministrador,
  ErrorInvitacion,
  invitarAdministrador,
  obtenerAdministradores,
} from '../datos/consultas';
import { formatearFechaHora } from '../datos/formato';
import type { AdministradorPanel, InvitacionAdministrador } from '../datos/tipos';
import { useInstituciones } from './alcance';

const t = panelInstituciones.usuarios;
const i = t.invitar;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * /panel/usuarios (D-86), solo el administrador general: quién administra cada institución, la
 * invitación por correo y los cambios de estado o de institución (todo queda en la auditoría).
 */
export default function UsuariosPage() {
  const { estado } = useSesion();
  const yo = estado.tipo === 'lista' ? estado.perfil.id : null;
  const [aviso, setAviso] = useState('');
  const consulta = useQuery({
    queryKey: ['panel', 'administradores'],
    queryFn: obtenerAdministradores,
  });

  return (
    <PaginaPanel>
      <PageMeta title={t.titulo} indexable={false} />
      <EncabezadoPanel titulo={t.titulo} descripcion={t.descripcion}>
        <InvitarAdministrador alEnviar={(correo) => setAviso(i.enviada(correo))} />
      </EncabezadoPanel>

      <p role="status" className="text-pequeno font-semibold text-grafito-900 empty:hidden">
        {aviso}
      </p>

      {consulta.isError ? (
        <ErrorCarga error={consulta.error} alReintentar={() => void consulta.refetch()} />
      ) : null}

      {consulta.data && consulta.data.length === 0 ? (
        <EmptyState icon={<Users aria-hidden className="size-8" />} title={t.vacio} />
      ) : consulta.data ? (
        <div className="overflow-x-auto rounded-xl border border-piedra-200 bg-blanco">
          <table className="w-full min-w-[56rem] text-left text-pequeno">
            <caption className="sr-only">{t.lista}</caption>
            <thead className="bg-piedra-50">
              <tr>
                {(['nombre', 'rol', 'institucion', 'estado', 'ingreso', 'acciones'] as const).map(
                  (c) => (
                    <th key={c} scope="col" className="px-3 py-2 font-semibold whitespace-nowrap">
                      {t.columnas[c]}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {consulta.data.map((admin) => (
                <FilaAdministrador
                  key={admin.id}
                  admin={admin}
                  esYo={admin.id === yo}
                  alCambiar={() => setAviso(t.guardado)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : consulta.isPending ? (
        <div
          aria-busy="true"
          className="flex flex-col gap-2 rounded-xl border border-piedra-200 bg-blanco p-4"
        >
          {Array.from({ length: 7 }, (_, n) => (
            <Skeleton key={n} className="h-12" />
          ))}
        </div>
      ) : null}
    </PaginaPanel>
  );
}

function FilaAdministrador({
  admin,
  esYo,
  alCambiar,
}: {
  admin: AdministradorPanel;
  esYo: boolean;
  alCambiar: () => void;
}) {
  const queryClient = useQueryClient();
  const cambio = useMutation({
    mutationFn: ({ activo, institucion }: { activo: boolean; institucion: string | null }) =>
      actualizarAdministrador(admin.id, activo, institucion),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['panel', 'administradores'] });
      await queryClient.invalidateQueries({ queryKey: ['panel', 'instituciones'] });
      alCambiar();
    },
  });
  const institucional = admin.rol === 'administrador_institucional';

  return (
    <tr className="border-t border-piedra-200 align-top hover:bg-piedra-50">
      <th scope="row" className="px-3 py-2 text-left font-normal">
        <span className="font-semibold text-grafito-900">{admin.nombre}</span>
        {esYo ? (
          <span className="ml-2 rounded-pill bg-pizarra-100 px-2 py-0.5 text-[0.75rem] font-semibold text-pizarra-800">
            {t.tu}
          </span>
        ) : null}
        <span className="font-mono block text-[0.8125rem] text-grafito-600">
          {admin.correo ?? '—'}
        </span>
      </th>
      <td className="px-3 py-2">{t.roles[admin.rol]}</td>
      <td className="px-3 py-2">{admin.institucion?.nombre ?? t.todas}</td>
      <td className="px-3 py-2">
        <span
          className={cn(
            'inline-flex rounded-pill px-2.5 py-0.5 font-semibold whitespace-nowrap contraste-alto:border contraste-alto:border-current',
            admin.activo
              ? 'bg-nivel-adecuado-fondo text-nivel-adecuado'
              : 'bg-nivel-sin-dato-fondo text-nivel-sin-dato',
          )}
        >
          {admin.activo ? t.activo : t.inactivo}
        </span>
        <span className="mt-1 flex items-center gap-1 text-[0.8125rem] text-grafito-600">
          {admin.dobleFactor ? (
            <ShieldCheck aria-hidden className="size-3.5 text-nivel-adecuado" />
          ) : (
            <ShieldAlert aria-hidden className="size-3.5" />
          )}
          {admin.dobleFactor ? t.dobleFactor : t.sinDobleFactor}
        </span>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        {admin.ultimoIngreso ? formatearFechaHora(admin.ultimoIngreso) : t.nunca}
      </td>
      <td className="px-3 py-2">
        {institucional && !esYo ? (
          <div className="flex flex-col items-start gap-1">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secundario"
                size="sm"
                disabled={cambio.isPending}
                onClick={() => cambio.mutate({ activo: !admin.activo, institucion: null })}
                aria-label={admin.activo ? t.desactivarA(admin.nombre) : t.activarA(admin.nombre)}
              >
                {admin.activo ? t.desactivar : t.activar}
              </Button>
              <MoverDeInstitucion
                admin={admin}
                enviando={cambio.isPending}
                alMover={(institucion) => cambio.mutate({ activo: admin.activo, institucion })}
              />
            </div>
            {cambio.isError ? (
              <p role="alert" className="text-[0.8125rem] font-medium text-nivel-atencion">
                {t.errorCambio}
              </p>
            ) : null}
          </div>
        ) : null}
      </td>
    </tr>
  );
}

function MoverDeInstitucion({
  admin,
  enviando,
  alMover,
}: {
  admin: AdministradorPanel;
  enviando: boolean;
  alMover: (institucion: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState(admin.institucion?.id ?? '');
  const instituciones = useInstituciones();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button
          variant="fantasma"
          size="sm"
          disabled={enviando}
          aria-label={t.cambiarInstitucionA(admin.nombre)}
        >
          <ArrowRightLeft aria-hidden className="size-4" />
          {t.cambiarInstitucion}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t.cambiarInstitucion}</DialogTitle>
        <DialogDescription>{admin.nombre}</DialogDescription>
        <form
          className="mt-5 flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!destino || destino === admin.institucion?.id) return setAbierto(false);
            alMover(destino);
            setAbierto(false);
          }}
        >
          <CampoSelect
            etiqueta={t.moverA(admin.nombre)}
            valor={destino}
            opciones={(instituciones.data ?? []).map((inst) => ({
              valor: inst.id,
              etiqueta: inst.activa
                ? inst.nombre
                : panelInstituciones.alcance.inactiva(inst.nombre),
            }))}
            alCambiar={setDestino}
          />
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="secundario">
                {i.cancelar}
              </Button>
            </DialogClose>
            <Button type="submit">{t.mover}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Errores = Partial<Record<'nombre' | 'correo' | 'institucion', string>>;

function InvitarAdministrador({ alEnviar }: { alEnviar: (correo: string) => void }) {
  const queryClient = useQueryClient();
  const instituciones = useInstituciones();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rol, setRol] = useState<InvitacionAdministrador['rol']>('administrador_institucional');
  const [institucion, setInstitucion] = useState('');
  const [errores, setErrores] = useState<Errores>({});

  const invitar = useMutation({
    mutationFn: invitarAdministrador,
    onSuccess: async (_, enviada) => {
      await queryClient.invalidateQueries({ queryKey: ['panel', 'administradores'] });
      setAbierto(false);
      setNombre('');
      setCorreo('');
      setInstitucion('');
      alEnviar(enviada.correo);
    },
  });

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const datos = { nombre: nombre.trim(), correo: correo.trim().toLowerCase() };
    const nuevos: Errores = {
      nombre: datos.nombre.length < 2 || datos.nombre.length > 120 ? i.errores.nombre : undefined,
      correo: PATRON_CORREO.test(datos.correo) ? undefined : i.errores.correo,
      institucion:
        rol === 'administrador_institucional' && !institucion ? i.errores.institucion : undefined,
    };
    setErrores(nuevos);
    if (nuevos.nombre || nuevos.correo || nuevos.institucion) return;
    invitar.mutate({
      ...datos,
      rol,
      ...(rol === 'administrador_institucional' ? { institucionId: institucion } : {}),
    });
  };

  const codigo = invitar.error instanceof ErrorInvitacion ? invitar.error.codigo : 'error';

  return (
    <Dialog
      open={abierto}
      onOpenChange={(valor) => {
        setAbierto(valor);
        if (!valor) {
          setErrores({});
          invitar.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus aria-hidden className="size-4" />
          {i.boton}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{i.titulo}</DialogTitle>
        <DialogDescription>{i.texto}</DialogDescription>
        <form onSubmit={enviar} noValidate className="mt-5 flex flex-col gap-4">
          <TextField
            label={i.nombre}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={120}
            autoComplete="off"
            error={errores.nombre}
            required
          />
          <TextField
            label={i.correo}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            error={errores.correo}
            required
          />
          <CampoSelect
            etiqueta={i.rol}
            valor={rol}
            opciones={[
              {
                valor: 'administrador_institucional',
                etiqueta: t.roles.administrador_institucional,
              },
              { valor: 'superadministrador', etiqueta: t.roles.superadministrador },
            ]}
            alCambiar={(valor) => setRol(valor as InvitacionAdministrador['rol'])}
          />
          {rol === 'administrador_institucional' ? (
            <div className="flex flex-col gap-1.5">
              <CampoSelect
                etiqueta={i.institucion}
                valor={institucion}
                opciones={[
                  { valor: '', etiqueta: i.elegir },
                  ...(instituciones.data ?? [])
                    .filter((inst) => inst.activa)
                    .map((inst) => ({ valor: inst.id, etiqueta: inst.nombre })),
                ]}
                alCambiar={setInstitucion}
              />
              {errores.institucion ? (
                <p className="text-pequeno font-medium text-nivel-atencion">
                  {errores.institucion}
                </p>
              ) : null}
            </div>
          ) : null}
          {invitar.isError ? <Callout variant="apoyo">{i.errores[codigo]}</Callout> : null}
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="secundario">
                {i.cancelar}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={invitar.isPending}>
              {invitar.isPending ? i.enviando : i.enviar}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
