import { LogOut, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { PageLoading, PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { cuenta } from '@/content/cuenta';
import { participar } from '@/content/participar';
import {
  guardarEstado,
  nuevaClaveEnvio,
  type EstadoParticipacion,
} from '@/features/participar/estado';
import {
  ACTIVIDAD_CUESTIONARIO,
  avanceDe,
  esActividadResultado,
  estadoParaContinuar,
  estadoParaVerResultado,
} from './progreso';
import { TarjetaCuenta } from './piezas';
import {
  leerMiCuenta,
  motivoDeError,
  salir,
  type ActividadGuardada,
  type EstadoMiCuenta,
} from './servicio';

const t = cuenta.miCuenta;
const fecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });
const fechaHora = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });

function almacenSesion(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Avance del cuestionario en curso: barra accesible con el número de preguntas respondidas. */
function BarraAvance({ estado }: { estado: EstadoParticipacion }) {
  const { respondidas, total } = avanceDe(estado);
  const porcentaje = total ? Math.round((respondidas / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label={t.enCurso}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={respondidas}
        aria-valuetext={t.respondidas(respondidas, total)}
        className="h-2.5 overflow-hidden rounded-pill bg-piedra-200"
      >
        <div className="h-full rounded-pill bg-pizarra-700" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="text-pequeno text-grafito-600">{t.respondidas(respondidas, total)}</p>
    </div>
  );
}

/**
 * /cuenta: página privada de la cuenta pública (D-77). Sin sesión lleva a ingresar y vuelve aquí.
 * Desde aquí se continúa el cuestionario guardado en cualquier dispositivo.
 */
export default function MiCuentaPage() {
  const navigate = useNavigate();
  const bienvenida = Boolean((useLocation().state as { bienvenida?: boolean } | null)?.bienvenida);
  const [estado, setEstado] = useState<EstadoMiCuenta | 'cargando' | 'error'>('cargando');
  const [saliendo, setSaliendo] = useState(false);

  const cargar = useCallback(() => {
    setEstado('cargando');
    leerMiCuenta()
      .then(setEstado)
      .catch((e: unknown) => {
        // Una sesión vencida o revocada se trata como sin sesión; lo demás, como un error de red.
        setEstado(motivoDeError(e) === 'credenciales' ? { tipo: 'sin_sesion' } : 'error');
      });
  }, []);

  useEffect(cargar, [cargar]);

  async function cerrarSesion() {
    setSaliendo(true);
    await salir();
    navigate('/', { replace: true });
  }

  if (estado === 'cargando') return <PageLoading />;
  if (estado === 'error') {
    return (
      <TarjetaCuenta titulo={t.titulo}>
        <Callout variant="apoyo">{t.error}</Callout>
        <Button variant="secundario" className="self-start" onClick={cargar}>
          <RotateCcw aria-hidden />
          {t.reintentar}
        </Button>
      </TarjetaCuenta>
    );
  }
  if (estado.tipo === 'sin_sesion') {
    return <Navigate to="/cuenta/ingresar" replace state={{ desde: '/cuenta' }} />;
  }
  if (estado.tipo === 'equipo') {
    return (
      <TarjetaCuenta titulo={t.titulo} texto={t.esEquipo}>
        <Button asChild className="self-start">
          <Link to="/panel">{t.irPanel}</Link>
        </Button>
      </TarjetaCuenta>
    );
  }

  const { cuenta: datos, progreso } = estado;
  const enCurso = progreso.find((p) => p.actividad === ACTIVIDAD_CUESTIONARIO && !p.completado);
  const guardado = enCurso ? estadoParaContinuar(enCurso.estado) : null;
  const terminados = progreso.filter((p) => esActividadResultado(p.actividad));
  const primerNombre = datos.nombre.split(/\s+/)[0] ?? datos.nombre;

  const continuar = () => {
    if (!guardado) return;
    guardarEstado(almacenSesion(), guardado);
    navigate(guardado.registroCompleto ? '/cuestionario' : '/registro');
  };

  const verResultado = (actividad: ActividadGuardada) => {
    const estadoResultado = estadoParaVerResultado(actividad.estado, nuevaClaveEnvio());
    if (!estadoResultado) return;
    guardarEstado(almacenSesion(), estadoResultado);
    navigate('/resultados');
  };

  return (
    <>
      <PageMeta title={t.titulo} indexable={false} />
      <section className="contenedor seccion">
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex max-w-xl flex-col gap-2">
              <h1 className="text-h1 break-words">{t.saludo(primerNombre)}</h1>
              <p className="text-cuerpo-grande text-grafito-600">{t.texto}</p>
            </div>
            <Button
              variant="secundario"
              size="sm"
              loading={saliendo}
              onClick={() => void cerrarSesion()}
            >
              <LogOut aria-hidden />
              {t.salir}
            </Button>
          </div>

          {bienvenida ? <Callout>{cuenta.crear.bienvenida}</Callout> : null}

          <section aria-labelledby="progreso-titulo" className="flex flex-col gap-4">
            <h2 id="progreso-titulo" className="text-h3">
              {t.progreso}
            </h2>
            <div className="flex flex-col gap-5 rounded-xl border border-piedra-200 bg-blanco p-6 shadow-1">
              {guardado?.modulo ? (
                <>
                  <div className="flex flex-col gap-1">
                    <p className="text-pequeno font-semibold text-salvia-600">{t.enCurso}</p>
                    <p className="text-cuerpo-grande font-semibold text-grafito-900">
                      {participar.resultados.modulo[guardado.modulo]}
                    </p>
                    {enCurso ? (
                      <p className="text-pequeno text-grafito-600">
                        {fechaHora.format(new Date(enCurso.actualizadoEn))}
                      </p>
                    ) : null}
                  </div>
                  <BarraAvance estado={guardado} />
                  {guardado.registroCompleto ? null : (
                    <p className="text-pequeno text-grafito-600">{t.sinRegistro}</p>
                  )}
                  <Button className="self-start" onClick={continuar}>
                    <Play aria-hidden />
                    {t.continuar}
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-grafito-600">{t.sinProgreso}</p>
                  <Button asChild className="self-start">
                    <Link to="/registro">{t.comenzar}</Link>
                  </Button>
                </>
              )}
            </div>
          </section>

          <section aria-labelledby="terminados-titulo" className="flex flex-col gap-4">
            <h2 id="terminados-titulo" className="text-h3">
              {t.terminados}
            </h2>
            {terminados.length ? (
              <ul className="flex flex-col gap-3">
                {terminados.map((actividad) => {
                  const resultado = estadoParaVerResultado(actividad.estado, 'x')?.enviado;
                  if (!resultado) return null;
                  return (
                    <li
                      key={actividad.actividad}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-piedra-200 bg-blanco p-5"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="font-semibold text-grafito-900">
                          {participar.resultados.modulo[resultado.modulo]}
                        </p>
                        <p className="text-grafito-900">
                          {
                            participar.resultados.titulosGenerales[
                              resultado.resultado.resultadoGeneral
                            ]
                          }
                        </p>
                        <p className="text-pequeno text-grafito-600">
                          {fecha.format(new Date(resultado.fecha ?? actividad.actualizadoEn))}
                        </p>
                      </div>
                      <Button
                        variant="secundario"
                        size="sm"
                        onClick={() => verResultado(actividad)}
                      >
                        {t.verResultado}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-grafito-600">{t.sinTerminados}</p>
            )}
          </section>

          <section aria-labelledby="datos-titulo" className="flex flex-col gap-4">
            <h2 id="datos-titulo" className="text-h3">
              {t.datos}
            </h2>
            <dl className="grid gap-4 rounded-xl border border-piedra-200 bg-blanco p-6 sm:grid-cols-2">
              {(
                [
                  [t.nombre, datos.nombre],
                  [t.usuario, datos.usuario],
                  [t.correo, datos.correo],
                  [t.creada, fecha.format(new Date(datos.creadoEn))],
                ] as const
              ).map(([etiqueta, valor]) => (
                <div key={etiqueta} className="flex min-w-0 flex-col gap-1">
                  <dt className="text-pequeno text-grafito-600">{etiqueta}</dt>
                  <dd className="font-semibold break-words text-grafito-900">{valor}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </section>
    </>
  );
}
