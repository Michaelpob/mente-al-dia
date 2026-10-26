import { Link, useNavigate } from 'react-router';
import { HelplineList } from '@/components/layout/helplines';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/feedback';
import { participar } from '@/content/participar';
import { textos } from '@/content/textos-interfaz';
import { mensajesAtencionEspecial, mensajesGenerales } from '@/content/v1/mensajes';
import { useParticipacion } from '@/features/participar/participacion-context';
import { PantallaParticipacion } from '@/features/participar/piezas';

/**
 * Después de enviar: el código, el mensaje general y, si aplica, el apoyo inmediato.
 * El detalle por áreas (rueda, tarjetas y versión imprimible) se construye en la Fase 7.
 */
export default function ResultadosPage() {
  const { estado, reiniciar } = useParticipacion();
  const navigate = useNavigate();
  const t = participar.enviado;
  const enviado = estado.enviado;

  if (!enviado) {
    return (
      <>
        <PageMeta title={textos.paginas.resultados.titulo} indexable={false} />
        <PantallaParticipacion>
          <h1 className="text-h1">{t.sinEnvio.titulo}</h1>
          <p className="mt-4 text-cuerpo-grande text-grafito-600">{t.sinEnvio.texto}</p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/registro">{t.sinEnvio.empezar}</Link>
          </Button>
        </PantallaParticipacion>
      </>
    );
  }

  const { modulo, codigo, resultado } = enviado;
  const general =
    resultado.resultadoGeneral === 'insuficiente'
      ? mensajesGenerales.insuficiente
      : mensajesGenerales[modulo][resultado.resultadoGeneral];

  return (
    <>
      <PageMeta title={textos.paginas.resultados.titulo} indexable={false} />
      <PantallaParticipacion>
        <h1 className="text-h1">{t.titulo}</h1>

        {resultado.rutaAtencionEspecial ? (
          <section aria-labelledby="apoyo-titulo" className="mt-8">
            <Callout variant="apoyo">
              <h2 id="apoyo-titulo" className="font-semibold">
                {t.apoyo}
              </h2>
              <p className="mt-1">{mensajesAtencionEspecial[modulo]}</p>
            </Callout>
            <HelplineList className="mt-4" />
          </section>
        ) : null}

        <h2 className="mt-10 text-h2">{t.orientacion}</h2>
        <p className="mt-3 text-cuerpo-grande">{general}</p>
        {resultado.resultadoParcial ? (
          <p className="mt-3 text-grafito-600">
            {mensajesGenerales.parcial.replace('{respondidas}', String(resultado.respondidas))}
          </p>
        ) : null}

        {modulo === 'nino' ? (
          <>
            <h2 className="mt-10 text-h3">{t.acompanante}</h2>
            <p className="mt-3">{mensajesGenerales.adultoAcompanante}</p>
          </>
        ) : null}

        <div className="mt-10 rounded-lg border border-piedra-200 bg-blanco p-5">
          <p className="text-pequeno text-grafito-600">{t.codigo}</p>
          <p className="font-titulo text-h2 text-pizarra-700 tabular-nums">{codigo}</p>
          <p className="mt-1 text-pequeno text-grafito-600">{t.codigoAyuda}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/lineas-de-ayuda">{t.lineas}</Link>
          </Button>
          <Button asChild variant="secundario" size="lg">
            <Link to="/">{t.inicio}</Link>
          </Button>
          <Button
            variant="fantasma"
            size="lg"
            onClick={() => {
              reiniciar();
              void navigate('/registro');
            }}
          >
            {t.otra}
          </Button>
        </div>
      </PantallaParticipacion>
    </>
  );
}
