import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { HelplineList } from '@/components/layout/helplines';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Callout } from '@/components/ui/feedback';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { participar } from '@/content/participar';
import { textos } from '@/content/textos-interfaz';
import { listarSedes, type Sede } from './sede';
import { useSede } from './sede-context';

const t = participar.elegirSede;

const configuracion = {
  url: import.meta.env.VITE_SUPABASE_URL,
  clave: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
};

/**
 * Sin el enlace de una institución, la persona elige de la lista con cuál va a responder (D-88).
 * Elegir equivale a entrar con su enlace: la base lo vuelve a comprobar al guardar. Con
 * `actual`, sirve para cambiar la institución antes de empezar el registro.
 */
export function ElegirSede({
  confirmando = false,
  actual,
  alCancelar,
  alElegir,
}: {
  /** Mientras se confirma el enlace de la dirección, solo se avisa. */
  confirmando?: boolean;
  /** La institución que ya tenía, para cambiarla. */
  actual?: Sede | null;
  alCancelar?: () => void;
  alElegir?: (sede: Sede) => void;
}) {
  const { elegir } = useSede();
  const [parametros, setParametros] = useSearchParams();
  const [elegida, setElegida] = useState(actual?.slug ?? '');
  const [error, setError] = useState<string>();
  const sedes = useQuery({
    queryKey: ['sedes-publicas'],
    queryFn: () => listarSedes(configuracion),
    staleTime: 5 * 60_000,
    retry: 1,
    enabled: !confirmando,
  });

  if (confirmando) {
    return (
      <p role="status" className="py-10 text-center text-grafito-600">
        {t.confirmando}
      </p>
    );
  }

  const continuar = () => {
    const sede = sedes.data?.find((s) => s.slug === elegida);
    if (!sede) {
      setError(t.falta);
      return;
    }
    elegir(sede);
    // Un ?sede= que quedara en la dirección ya no manda: la institución es la elegida.
    if (parametros.has('sede')) {
      const siguientes = new URLSearchParams(parametros);
      siguientes.delete('sede');
      setParametros(siguientes, { replace: true });
    }
    alElegir?.(sede);
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <Building2 aria-hidden className="size-10 text-salvia-600" />
        <h1 className="text-h1">{t.titulo}</h1>
        <p className="max-w-lectura text-cuerpo-grande text-grafito-600">{t.texto}</p>
      </div>

      {sedes.isPending ? (
        <p role="status" className="text-grafito-600">
          {t.cargando}
        </p>
      ) : sedes.isError ? (
        <Callout variant="apoyo" className="flex flex-col items-start gap-3">
          <span>{t.error}</span>
          <Button variant="secundario" size="sm" onClick={() => void sedes.refetch()}>
            {t.reintentar}
          </Button>
        </Callout>
      ) : sedes.data.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <Callout variant="apoyo">{t.ninguna}</Callout>
          <Link to="/" className={buttonVariants({ variant: 'secundario' })}>
            {t.inicio}
          </Link>
        </div>
      ) : (
        <form
          noValidate
          className="flex flex-col gap-8"
          onSubmit={(e) => {
            e.preventDefault();
            continuar();
          }}
        >
          <RadioCardGroup
            legend={t.leyenda}
            hideLegend
            className="sm:grid-cols-2"
            value={elegida}
            error={error}
            onValueChange={(valor) => {
              setElegida(valor);
              setError(undefined);
            }}
          >
            {sedes.data.map((sede) => (
              <RadioCard
                key={sede.slug}
                value={sede.slug}
                title={sede.nombre}
                icon={<Building2 />}
              />
            ))}
          </RadioCardGroup>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg">
              {t.continuar}
            </Button>
            {alCancelar ? (
              <Button type="button" size="lg" variant="secundario" onClick={alCancelar}>
                {t.volver}
              </Button>
            ) : null}
          </div>
        </form>
      )}

      <section aria-labelledby="elegir-sede-lineas" className="flex flex-col gap-3">
        <h2 id="elegir-sede-lineas" className="text-h3">
          {textos.lineasAyuda.titulo}
        </h2>
        <p className="text-grafito-600">{t.lineas}</p>
        <HelplineList className="sm:grid-cols-2" />
      </section>
    </div>
  );
}
