import { KeyRound, LogOut, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { TextField } from '@/components/ui/field';
import { textos } from '@/content/textos-interfaz';
import { mensajeError } from './errores';
import type { MotivoSinAcceso } from './estado-sesion';
import { useSesion, type InscripcionDobleFactor } from './sesion-context';

const t = textos.accesoPanel;

/** Tarjeta centrada de los pasos del ingreso. */
export function TarjetaAcceso({
  titulo,
  texto,
  children,
}: {
  titulo: string;
  texto?: string;
  children: ReactNode;
}) {
  return (
    <section className="contenedor seccion">
      <div className="mx-auto flex max-w-md flex-col gap-6 rounded-xl border border-piedra-200 bg-blanco p-6 sm:p-8">
        <div className="flex flex-col gap-2">
          {/* break-words: con el texto agrandado a 320 px, «administración» no cabe en una línea. */}
          <h1 className="text-h2 break-words">{titulo}</h1>
          {texto ? <p className="text-grafito-600">{texto}</p> : null}
        </div>
        {children}
      </div>
    </section>
  );
}

function AvisoError({ mensaje }: { mensaje: string | null }) {
  return (
    <div role="alert" aria-live="assertive">
      {mensaje ? <Callout variant="apoyo">{mensaje}</Callout> : null}
    </div>
  );
}

/** Ejecuta una acción del formulario mostrando «enviando» y el error amable si falla. */
function useAccion() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function ejecutar(accion: () => Promise<void>) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  }
  return { enviando, error, setError, ejecutar };
}

const valor = (evento: FormEvent<HTMLFormElement>, campo: string) =>
  String(new FormData(evento.currentTarget).get(campo) ?? '').trim();

export function FormularioIngreso() {
  const { ingresar, enviarRecuperacion } = useSesion();
  const { enviando, error, ejecutar } = useAccion();
  const [recuperar, setRecuperar] = useState(false);
  const [enlaceEnviado, setEnlaceEnviado] = useState(false);

  if (recuperar) {
    return (
      <TarjetaAcceso titulo={t.recuperarTitulo} texto={t.recuperarTexto}>
        {enlaceEnviado ? (
          <p role="status" className="text-grafito-900">
            {t.enlaceEnviado}
          </p>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const correo = valor(e, 'correo');
              void ejecutar(async () => {
                await enviarRecuperacion(correo);
                setEnlaceEnviado(true);
              });
            }}
          >
            <TextField label={t.correo} name="correo" type="email" autoComplete="email" required />
            <AvisoError mensaje={error} />
            <Button type="submit" disabled={enviando}>
              {t.enviarEnlace}
            </Button>
          </form>
        )}
        <Button
          variant="enlace"
          className="self-start"
          onClick={() => {
            setRecuperar(false);
            setEnlaceEnviado(false);
          }}
        >
          {t.volverIngreso}
        </Button>
      </TarjetaAcceso>
    );
  }

  return (
    <TarjetaAcceso titulo={t.titulo} texto={t.descripcion}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const correo = valor(e, 'correo');
          const contrasena = String(new FormData(e.currentTarget).get('contrasena') ?? '');
          void ejecutar(() => ingresar(correo, contrasena));
        }}
      >
        <TextField label={t.correo} name="correo" type="email" autoComplete="username" required />
        <TextField
          label={t.contrasena}
          name="contrasena"
          type="password"
          autoComplete="current-password"
          required
        />
        <AvisoError mensaje={error} />
        <Button type="submit" disabled={enviando}>
          <KeyRound aria-hidden />
          {enviando ? t.ingresando : t.ingresar}
        </Button>
      </form>
      <div className="flex flex-col gap-2">
        <Button variant="enlace" className="self-start" onClick={() => setRecuperar(true)}>
          {t.olvide}
        </Button>
        <p className="text-pequeno text-grafito-600">{t.soloInvitacion}</p>
      </div>
    </TarjetaAcceso>
  );
}

function CampoCodigo() {
  return (
    <TextField
      label={t.codigo}
      name="codigo"
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="[0-9]{6}"
      maxLength={6}
      required
      className="max-w-48 text-center font-semibold tracking-[0.3em]"
    />
  );
}

export function VerificarDobleFactor({ factorId }: { factorId: string }) {
  const { verificarCodigo, cerrarSesion } = useSesion();
  const { enviando, error, ejecutar } = useAccion();
  return (
    <TarjetaAcceso titulo={t.verificarTitulo} texto={t.verificarTexto}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const codigo = valor(e, 'codigo');
          void ejecutar(() => verificarCodigo(factorId, codigo));
        }}
      >
        <CampoCodigo />
        <AvisoError mensaje={error} />
        <Button type="submit" disabled={enviando}>
          <ShieldCheck aria-hidden />
          {enviando ? t.verificando : t.verificar}
        </Button>
      </form>
      <BotonCerrarSesion onClick={cerrarSesion} />
    </TarjetaAcceso>
  );
}

export function InscribirDobleFactor() {
  const { iniciarInscripcion, verificarCodigo, cerrarSesion } = useSesion();
  const { enviando, error, setError, ejecutar } = useAccion();
  const [inscripcion, setInscripcion] = useState<InscripcionDobleFactor | null>(null);

  useEffect(() => {
    let vigente = true;
    iniciarInscripcion()
      .then((datos) => vigente && setInscripcion(datos))
      .catch((e: unknown) => vigente && setError(mensajeError(e)));
    return () => {
      vigente = false;
    };
  }, [iniciarInscripcion, setError]);

  return (
    <TarjetaAcceso titulo={t.inscribirTitulo} texto={t.inscribirTexto}>
      {inscripcion ? (
        <>
          <img
            src={inscripcion.qr}
            alt={t.qrAlternativo}
            width={192}
            height={192}
            className="mx-auto size-48 rounded-md border border-piedra-200 bg-blanco p-2"
          />
          <div className="flex flex-col gap-1">
            <p className="text-pequeno text-grafito-600">{t.secreto}</p>
            <code className="font-mono rounded-md bg-piedra-100 px-3 py-2 text-pequeno break-all">
              {inscripcion.secreto}
            </code>
          </div>
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              const codigo = valor(e, 'codigo');
              void ejecutar(() => verificarCodigo(inscripcion.factorId, codigo));
            }}
          >
            <CampoCodigo />
            <AvisoError mensaje={error} />
            <Button type="submit" disabled={enviando}>
              <ShieldCheck aria-hidden />
              {enviando ? t.verificando : t.activar}
            </Button>
          </form>
        </>
      ) : (
        <AvisoError mensaje={error} />
      )}
      <BotonCerrarSesion onClick={cerrarSesion} />
    </TarjetaAcceso>
  );
}

const TEXTO_SIN_ACCESO: Record<MotivoSinAcceso, string> = {
  sin_perfil: t.sinPerfil,
  inactivo: t.inactivo,
  sin_permiso: t.soloAdministracion,
};

export function SinAcceso({ motivo }: { motivo: MotivoSinAcceso }) {
  const { cerrarSesion } = useSesion();
  return (
    <TarjetaAcceso titulo={t.sinAccesoTitulo} texto={TEXTO_SIN_ACCESO[motivo]}>
      <BotonCerrarSesion onClick={cerrarSesion} />
    </TarjetaAcceso>
  );
}

export function FormularioDefinirContrasena({ alGuardar }: { alGuardar: () => void }) {
  const { definirContrasena } = useSesion();
  const { enviando, error, setError, ejecutar } = useAccion();
  return (
    <TarjetaAcceso titulo={t.definirTitulo} texto={t.definirTexto}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget);
          const contrasena = String(datos.get('contrasena') ?? '');
          if (contrasena !== String(datos.get('confirmacion') ?? '')) {
            setError(t.noCoinciden);
            return;
          }
          void ejecutar(async () => {
            await definirContrasena(contrasena);
            alGuardar();
          });
        }}
      >
        <TextField
          label={t.nuevaContrasena}
          name="contrasena"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <TextField
          label={t.confirmarContrasena}
          name="confirmacion"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
        />
        <AvisoError mensaje={error} />
        <Button type="submit" disabled={enviando}>
          {t.guardarContrasena}
        </Button>
      </form>
    </TarjetaAcceso>
  );
}

export function BotonCerrarSesion({ onClick }: { onClick: () => Promise<void> }) {
  return (
    <Button variant="fantasma" size="sm" className="self-start" onClick={() => void onClick()}>
      <LogOut aria-hidden />
      {t.cerrarSesion}
    </Button>
  );
}
