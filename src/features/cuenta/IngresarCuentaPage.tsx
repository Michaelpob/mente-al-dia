import { KeyRound } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { cuenta } from '@/content/cuenta';
import { enfocarPrimerError } from './foco';
import { AvisoError, TarjetaCuenta } from './piezas';
import { enviarRecuperacion, ingresar, motivoDeError } from './servicio';
import { useCuentaGuardada } from './sesion-guardada';
import { correoValido, hayErrores, validarIngreso, type ErroresFormulario } from './validacion';

const t = cuenta.ingresar;
const r = cuenta.recuperar;

/**
 * /cuenta/ingresar: el ingreso de todas las personas (D-78). Una cuenta pública va a «Mi cuenta»
 * (o a donde iba); el equipo del panel sigue a su verificación en dos pasos.
 */
export default function IngresarCuentaPage() {
  const navigate = useNavigate();
  const desde = (useLocation().state as { desde?: string } | null)?.desde;
  const cuentaGuardada = useCuentaGuardada();
  const formulario = useRef<HTMLFormElement>(null);
  const [recuperar, setRecuperar] = useState(false);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errores, setErrores] = useState<ErroresFormulario<'correo' | 'contrasena'>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enlaceEnviado, setEnlaceEnviado] = useState(false);

  // Con la sesión de una cuenta ya abierta no hace falta ingresar otra vez.
  if (cuentaGuardada && !enviando) return <Navigate to={desde ?? '/cuenta'} replace />;

  async function alIngresar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevos = validarIngreso(correo, contrasena);
    setErrores(nuevos);
    setError(null);
    if (hayErrores(nuevos)) {
      enfocarPrimerError(formulario.current);
      return;
    }
    setEnviando(true);
    try {
      const tipo = await ingresar(correo, contrasena);
      navigate(tipo === 'equipo' ? '/panel/ingresar' : (desde ?? '/cuenta'), { replace: true });
    } catch (e) {
      setError(cuenta.errores[motivoDeError(e)]);
      setEnviando(false);
    }
  }

  async function alRecuperar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    if (!correoValido(correo)) {
      setErrores({ correo: cuenta.errores.correo });
      enfocarPrimerError(formulario.current);
      return;
    }
    setErrores({});
    setEnviando(true);
    try {
      await enviarRecuperacion(correo);
      setEnlaceEnviado(true);
    } catch (e) {
      setError(cuenta.errores[motivoDeError(e)]);
    } finally {
      setEnviando(false);
    }
  }

  if (recuperar) {
    return (
      <>
        <PageMeta title={r.titulo} indexable={false} />
        <TarjetaCuenta titulo={r.titulo} texto={r.texto}>
          {enlaceEnviado ? (
            <p role="status" className="text-grafito-900">
              {r.enviado}
            </p>
          ) : (
            <form
              ref={formulario}
              noValidate
              className="flex flex-col gap-5"
              onSubmit={alRecuperar}
            >
              <TextField
                label={t.correo}
                name="correo"
                type="email"
                autoComplete="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                error={errores.correo}
              />
              <AvisoError mensaje={error} />
              <Button type="submit" loading={enviando} loadingLabel={r.enviando}>
                {r.boton}
              </Button>
            </form>
          )}
          <Button
            variant="enlace"
            className="self-start"
            onClick={() => {
              setRecuperar(false);
              setEnlaceEnviado(false);
              setError(null);
            }}
          >
            {r.volver}
          </Button>
        </TarjetaCuenta>
      </>
    );
  }

  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      <TarjetaCuenta titulo={t.titulo} texto={t.descripcion}>
        <form ref={formulario} noValidate className="flex flex-col gap-5" onSubmit={alIngresar}>
          <TextField
            label={t.correo}
            name="correo"
            type="email"
            autoComplete="username"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            error={errores.correo}
          />
          <TextField
            label={t.contrasena}
            name="contrasena"
            type="password"
            autoComplete="current-password"
            required
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            error={errores.contrasena}
          />
          <AvisoError mensaje={error} />
          <Button type="submit" loading={enviando} loadingLabel={t.ingresando}>
            <KeyRound aria-hidden />
            {t.boton}
          </Button>
        </form>
        <div className="flex flex-col gap-3">
          <Button
            variant="enlace"
            className="self-start"
            onClick={() => {
              setRecuperar(true);
              setError(null);
            }}
          >
            {t.olvide}
          </Button>
          <p className="text-grafito-600">
            {t.sinCuenta}{' '}
            <Link
              to="/cuenta/crear"
              state={desde ? { desde } : undefined}
              className="font-semibold underline underline-offset-4"
            >
              {t.crear}
            </Link>
          </p>
          <p className="text-pequeno text-grafito-600">{t.equipo}</p>
        </div>
      </TarjetaCuenta>
    </>
  );
}
