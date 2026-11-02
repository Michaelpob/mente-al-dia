import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { PageLoading, PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { TextField } from '@/components/ui/field';
import { cuenta } from '@/content/cuenta';
import { enfocarPrimerError } from './foco';
import { AvisoError, TarjetaCuenta } from './piezas';
import { definirNuevaContrasena, haySesion, motivoDeError } from './servicio';
import { hayErrores, validarNuevaContrasena, type ErroresFormulario } from './validacion';

const t = cuenta.nuevaContrasena;

/**
 * /cuenta/nueva-contrasena: destino del enlace de recuperación de una cuenta pública (D-77).
 * Al cargar el cliente de Supabase, el enlace abre una sesión; con ella se guarda la contraseña.
 */
export default function NuevaContrasenaPage() {
  const navigate = useNavigate();
  const formulario = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<'cargando' | 'vencido' | 'listo'>('cargando');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errores, setErrores] = useState<ErroresFormulario<'contrasena' | 'confirmacion'>>({});
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vigente = true;
    const enlaceConError = new URLSearchParams(window.location.hash.slice(1)).has('error_code');
    haySesion()
      .then((hay) => vigente && setEstado(hay && !enlaceConError ? 'listo' : 'vencido'))
      .catch(() => vigente && setEstado('vencido'));
    return () => {
      vigente = false;
    };
  }, []);

  async function alGuardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevos = validarNuevaContrasena(contrasena, confirmacion);
    setErrores(nuevos);
    setError(null);
    if (hayErrores(nuevos)) {
      enfocarPrimerError(formulario.current);
      return;
    }
    setEnviando(true);
    try {
      await definirNuevaContrasena(contrasena);
      navigate('/cuenta', { replace: true });
    } catch (e) {
      setError(cuenta.errores[motivoDeError(e)]);
      setEnviando(false);
    }
  }

  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      {estado === 'cargando' ? (
        <PageLoading />
      ) : estado === 'vencido' ? (
        <TarjetaCuenta titulo={t.titulo}>
          <Callout variant="apoyo">{t.enlaceVencido}</Callout>
          <Button
            variant="secundario"
            className="self-start"
            onClick={() => navigate('/cuenta/ingresar')}
          >
            {t.pedirOtro}
          </Button>
        </TarjetaCuenta>
      ) : (
        <TarjetaCuenta titulo={t.titulo} texto={t.texto}>
          <form ref={formulario} noValidate className="flex flex-col gap-5" onSubmit={alGuardar}>
            <TextField
              label={t.contrasena}
              name="contrasena"
              type="password"
              autoComplete="new-password"
              required
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              error={errores.contrasena}
            />
            <TextField
              label={t.confirmar}
              name="confirmacion"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacion}
              onChange={(e) => setConfirmacion(e.target.value)}
              error={errores.confirmacion}
            />
            <AvisoError mensaje={error} />
            <Button type="submit" loading={enviando} loadingLabel={t.guardando}>
              {t.boton}
            </Button>
          </form>
        </TarjetaCuenta>
      )}
    </>
  );
}
