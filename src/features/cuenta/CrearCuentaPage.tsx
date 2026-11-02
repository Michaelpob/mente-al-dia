import { UserPlus } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { Callout } from '@/components/ui/feedback';
import { TextField } from '@/components/ui/field';
import { cuenta } from '@/content/cuenta';
import { enfocarPrimerError } from './foco';
import { AvisoError, TarjetaCuenta } from './piezas';
import { crearCuenta, motivoDeError, usuarioDisponible } from './servicio';
import { useCuentaGuardada } from './sesion-guardada';
import {
  hayErrores,
  normalizarUsuario,
  PATRON_USUARIO,
  validarCrearCuenta,
  type CampoCrearCuenta,
  type DatosCrearCuenta,
  type ErroresFormulario,
} from './validacion';

const t = cuenta.crear;

const VACIO: DatosCrearCuenta = {
  nombre: '',
  usuario: '',
  correo: '',
  contrasena: '',
  confirmacion: '',
  mayorDeEdad: false,
  autoriza: false,
};

/**
 * /cuenta/crear: registro de una cuenta pública (D-77). La contraseña la guarda Supabase Auth; la
 * base de datos crea el perfil y vuelve a exigir la mayoría de edad y la autorización de datos.
 */
export default function CrearCuentaPage() {
  const navigate = useNavigate();
  const desde = (useLocation().state as { desde?: string } | null)?.desde;
  const cuentaGuardada = useCuentaGuardada();
  const formulario = useRef<HTMLFormElement>(null);
  const [datos, setDatos] = useState<DatosCrearCuenta>(VACIO);
  const [errores, setErrores] = useState<ErroresFormulario<CampoCrearCuenta>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confirmarCorreo, setConfirmarCorreo] = useState(false);

  if (cuentaGuardada && !enviando) return <Navigate to={desde ?? '/cuenta'} replace />;

  const cambiar = <C extends CampoCrearCuenta>(campo: C, valor: DatosCrearCuenta[C]) => {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
    // El aviso de un campo se va cuando la persona lo corrige.
    if (errores[campo]) setErrores((previo) => ({ ...previo, [campo]: undefined }));
  };

  // Al salir del campo se revisa si el usuario está libre, para avisar antes de enviar.
  async function revisarUsuario() {
    const usuario = normalizarUsuario(datos.usuario);
    if (!PATRON_USUARIO.test(usuario)) return;
    try {
      if (!(await usuarioDisponible(usuario))) {
        setErrores((previo) => ({ ...previo, usuario: cuenta.errores.usuarioTomado }));
      }
    } catch {
      // Sin conexión se revisa de nuevo al crear la cuenta.
    }
  }

  async function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevos = validarCrearCuenta(datos);
    setErrores(nuevos);
    setError(null);
    if (hayErrores(nuevos)) {
      setError(cuenta.errores.revisar);
      enfocarPrimerError(formulario.current);
      return;
    }
    setEnviando(true);
    try {
      const { conSesion } = await crearCuenta(datos);
      if (conSesion) {
        navigate(desde ?? '/cuenta', { replace: true, state: { bienvenida: true } });
        return;
      }
      setConfirmarCorreo(true);
    } catch (e) {
      const motivo = motivoDeError(e);
      if (motivo === 'usuarioTomado') setErrores({ usuario: cuenta.errores.usuarioTomado });
      if (motivo === 'correoTomado') setErrores({ correo: cuenta.errores.correoTomado });
      setError(cuenta.errores[motivo]);
      enfocarPrimerError(formulario.current);
    }
    setEnviando(false);
  }

  if (confirmarCorreo) {
    return (
      <>
        <PageMeta title={t.titulo} indexable={false} />
        <TarjetaCuenta titulo={t.titulo}>
          <Callout>{t.confirmaCorreo}</Callout>
          <Button asChild variant="secundario" className="self-start">
            <Link to="/cuenta/ingresar">{t.ingresar}</Link>
          </Button>
        </TarjetaCuenta>
      </>
    );
  }

  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      <TarjetaCuenta titulo={t.titulo} texto={t.descripcion}>
        <form ref={formulario} noValidate className="flex flex-col gap-5" onSubmit={alEnviar}>
          <TextField
            label={t.nombre}
            name="nombre"
            autoComplete="name"
            required
            maxLength={120}
            value={datos.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
            error={errores.nombre}
          />
          <TextField
            label={t.usuario}
            name="usuario"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={30}
            hint={t.usuarioAyuda}
            value={datos.usuario}
            onChange={(e) => cambiar('usuario', e.target.value)}
            onBlur={() => void revisarUsuario()}
            error={errores.usuario}
          />
          <TextField
            label={t.correo}
            name="correo"
            type="email"
            autoComplete="email"
            required
            value={datos.correo}
            onChange={(e) => cambiar('correo', e.target.value)}
            error={errores.correo}
          />
          <TextField
            label={t.contrasena}
            name="contrasena"
            type="password"
            autoComplete="new-password"
            required
            hint={t.contrasenaAyuda}
            value={datos.contrasena}
            onChange={(e) => cambiar('contrasena', e.target.value)}
            error={errores.contrasena}
          />
          <TextField
            label={t.confirmar}
            name="confirmacion"
            type="password"
            autoComplete="new-password"
            required
            value={datos.confirmacion}
            onChange={(e) => cambiar('confirmacion', e.target.value)}
            error={errores.confirmacion}
          />
          <CheckboxField
            label={t.mayorDeEdad}
            description={t.mayorDeEdadAyuda}
            name="mayorDeEdad"
            required
            checked={datos.mayorDeEdad}
            onCheckedChange={(valor) => cambiar('mayorDeEdad', valor === true)}
            error={errores.mayorDeEdad}
          />
          <CheckboxField
            label={
              <>
                {t.autorizo}{' '}
                <Link
                  to="/privacidad"
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-4"
                >
                  {t.politica}
                </Link>
                .
              </>
            }
            name="autoriza"
            required
            checked={datos.autoriza}
            onCheckedChange={(valor) => cambiar('autoriza', valor === true)}
            error={errores.autoriza}
          />
          <AvisoError mensaje={error} />
          <Button type="submit" loading={enviando} loadingLabel={t.creando}>
            <UserPlus aria-hidden />
            {t.boton}
          </Button>
        </form>
        <p className="text-grafito-600">
          {t.yaTengo}{' '}
          <Link
            to="/cuenta/ingresar"
            state={desde ? { desde } : undefined}
            className="font-semibold underline underline-offset-4"
          >
            {t.ingresar}
          </Link>
        </p>
      </TarjetaCuenta>
    </>
  );
}
