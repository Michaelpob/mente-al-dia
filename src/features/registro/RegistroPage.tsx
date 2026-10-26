import { Backpack, School, UserRound } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { PageMeta } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { CheckboxField } from '@/components/ui/checkbox';
import { TextField } from '@/components/ui/field';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { participar } from '@/content/participar';
import { textos } from '@/content/textos-interfaz';
import {
  autorizacionesRequeridas,
  camposDe,
  claveCampo,
  EDAD_NINO,
  esModuloDisponible,
  faltanAutorizaciones,
  validarRegistro,
  type Autorizaciones,
  type ErroresRegistro,
  type GrupoCampos,
  type ModuloDisponible,
} from '@/features/participar/modelo';
import { useParticipacion } from '@/features/participar/participacion-context';
import {
  PantallaParticipacion,
  PasosParticipacion,
  SelectField,
} from '@/features/participar/piezas';
import { useTituloDelPaso } from '@/features/participar/use-titulo-del-paso';

type Paso = 'grupo' | 'datos' | 'autorizacion';
const NUMERO_PASO: Record<Paso, number> = { grupo: 0, datos: 1, autorizacion: 2 };

const claseEnlace =
  'rounded-sm text-pizarra-700 underline decoration-1 underline-offset-4 hover:decoration-2';

/** id del control de un campo: «participante-nombre». */
const idCampo = (clave: string) => clave.replace('.', '-');

interface PasoProps {
  tituloRef: RefObject<HTMLHeadingElement | null>;
}

/**
 * Registro (Fase 5): quién responde, sus datos y la autorización. Al terminar lleva al
 * cuestionario. Los datos quedan en esta pestaña hasta enviar (ver Participacion).
 */
export default function RegistroPage() {
  const { estado, despachar } = useParticipacion();
  const [parametros] = useSearchParams();
  const grupoPedido = parametros.get('grupo');
  const [paso, setPaso] = useState<Paso>(() => (estado.modulo ? 'datos' : 'grupo'));
  const pasoActual = estado.modulo ? paso : 'grupo';
  const tituloRef = useTituloDelPaso(pasoActual);

  // /registro?grupo=nino (desde las tarjetas del inicio) llega con el grupo elegido.
  useEffect(() => {
    if (!estado.modulo && esModuloDisponible(grupoPedido)) {
      despachar({ tipo: 'elegirModulo', modulo: grupoPedido });
    }
  }, [estado.modulo, grupoPedido, despachar]);

  return (
    <>
      <PageMeta title={textos.paginas.registro.titulo} indexable={false} />
      <PantallaParticipacion>
        <PasosParticipacion actual={NUMERO_PASO[pasoActual]} />
        {pasoActual === 'grupo' || !estado.modulo ? (
          <PasoGrupo tituloRef={tituloRef} onContinuar={() => setPaso('datos')} />
        ) : pasoActual === 'datos' ? (
          <PasoDatos
            modulo={estado.modulo}
            tituloRef={tituloRef}
            onVolver={() => setPaso('grupo')}
            onContinuar={() => setPaso('autorizacion')}
          />
        ) : (
          <PasoAutorizacion
            modulo={estado.modulo}
            tituloRef={tituloRef}
            onVolver={() => setPaso('datos')}
          />
        )}
      </PantallaParticipacion>
    </>
  );
}

function PasoGrupo({ tituloRef, onContinuar }: PasoProps & { onContinuar: () => void }) {
  const { estado, despachar } = useParticipacion();
  const [error, setError] = useState<string>();
  const t = participar.grupo;

  return (
    <>
      <h1 ref={tituloRef} tabIndex={-1} className="text-h1 outline-none">
        {t.titulo}
      </h1>
      <p className="mt-3 text-cuerpo-grande text-grafito-600">{t.texto}</p>
      <RadioCardGroup
        legend={t.leyenda}
        hideLegend
        className="mt-8"
        value={estado.modulo ?? ''}
        error={error}
        onValueChange={(valor) => {
          if (!esModuloDisponible(valor)) return;
          despachar({ tipo: 'elegirModulo', modulo: valor });
          setError(undefined);
        }}
      >
        <RadioCard
          value="nino"
          title={t.nino.titulo}
          description={t.nino.detalle}
          icon={<Backpack />}
        />
        <RadioCard
          value="adolescente"
          disabled
          title={t.adolescente.titulo}
          description={t.adolescente.detalle}
          badge={t.adolescente.insignia}
          icon={<School />}
        />
        <RadioCard
          value="adulto"
          title={t.adulto.titulo}
          description={t.adulto.detalle}
          icon={<UserRound />}
        />
      </RadioCardGroup>
      <p className="mt-6 text-pequeno text-grafito-600">
        {t.adolescenteAyuda}{' '}
        <Link to="/lineas-de-ayuda" className={claseEnlace}>
          {t.verLineas}
        </Link>
      </p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Button size="lg" onClick={() => (estado.modulo ? onContinuar() : setError(t.falta))}>
          {participar.comunes.continuar}
        </Button>
      </div>
    </>
  );
}

function PasoDatos({
  modulo,
  tituloRef,
  onVolver,
  onContinuar,
}: PasoProps & { modulo: ModuloDisponible; onVolver: () => void; onContinuar: () => void }) {
  const { estado, despachar } = useParticipacion();
  const [errores, setErrores] = useState<ErroresRegistro>({});
  const t = participar.datos;
  const c = t.campos;
  const nino = modulo === 'nino';

  /** value, onChange, id y error de un campo. */
  const campo = (grupo: GrupoCampos, nombre: string) => {
    const clave = claveCampo(grupo, nombre);
    return {
      id: idCampo(clave),
      value: estado.valores[grupo][nombre] ?? '',
      error: errores[clave],
      onChange: (evento: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        despachar({ tipo: 'escribir', grupo, campo: nombre, valor: evento.target.value });
        if (errores[clave]) {
          setErrores((actuales) =>
            Object.fromEntries(Object.entries(actuales).filter(([otra]) => otra !== clave)),
          );
        }
      },
    };
  };

  function continuar(evento: FormEvent) {
    evento.preventDefault();
    const registro = validarRegistro(modulo, estado.valores);
    if (registro.ok) {
      setErrores({});
      onContinuar();
      return;
    }
    setErrores(registro.errores);
    // El foco va al primer campo por corregir, en el orden del formulario.
    const orden = [
      ...camposDe[modulo].participante.map((n) => claveCampo('participante', n)),
      ...camposDe[modulo].acudiente.map((n) => claveCampo('acudiente', n)),
    ];
    const primero = orden.find((clave) => registro.errores[clave]);
    if (primero) document.getElementById(idCampo(primero))?.focus();
  }

  const titulo = nino ? t.nino : t.adulto;

  return (
    <form noValidate onSubmit={continuar}>
      <h1 ref={tituloRef} tabIndex={-1} className="text-h1 outline-none">
        {titulo.titulo}
      </h1>
      <p className="mt-3 text-cuerpo-grande text-grafito-600">{titulo.texto}</p>
      <p className="mt-4 text-pequeno text-grafito-600">{t.obligatorios}</p>

      {nino ? (
        <div className="mt-8 grid gap-6">
          <TextField
            label={c.nombreNino}
            required
            autoComplete="off"
            {...campo('participante', 'nombre')}
          />
          <SelectField label={c.edad} required {...campo('participante', 'edad')}>
            <option value="">{c.edadElegir}</option>
            {Array.from({ length: EDAD_NINO.max - EDAD_NINO.min + 1 }, (_, i) => {
              const edad = String(EDAD_NINO.min + i);
              return (
                <option key={edad} value={edad}>
                  {edad}
                </option>
              );
            })}
          </SelectField>
          <SelectField label={c.grado} required {...campo('participante', 'grado')}>
            <option value="">{c.gradoElegir}</option>
            {t.grados.map((grado) => (
              <option key={grado} value={grado}>
                {grado}
              </option>
            ))}
          </SelectField>
          <SelectField label={c.sexo} hint={c.sexoAyuda} {...campo('participante', 'sexo')}>
            <option value="">{t.sexoSinResponder}</option>
            {t.opcionesSexo.map((opcion) => (
              <option key={opcion} value={opcion}>
                {opcion}
              </option>
            ))}
          </SelectField>

          <div className="mt-6 border-t border-piedra-200 pt-8">
            <h2 className="text-h3">{t.acudiente.titulo}</h2>
            <p className="mt-2 text-grafito-600">{t.acudiente.texto}</p>
          </div>
          <TextField
            label={c.nombreAcudiente}
            required
            autoComplete="name"
            {...campo('acudiente', 'nombre')}
          />
          <TextField
            label={c.parentesco}
            hint={c.parentescoAyuda}
            required
            autoComplete="off"
            {...campo('acudiente', 'parentesco')}
          />
          <TextField
            label={c.correoAcudiente}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            {...campo('acudiente', 'correo')}
          />
          <TextField
            label={c.telefonoAcudiente}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            {...campo('acudiente', 'telefono')}
          />
          <TextField
            label={c.lugarAcudiente}
            hint={c.lugarAyuda}
            required
            autoComplete="off"
            {...campo('acudiente', 'lugarResidencia')}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-6">
          <TextField
            label={c.nombreAdulto}
            required
            autoComplete="name"
            {...campo('participante', 'nombre')}
          />
          <TextField
            label={c.correo}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            {...campo('participante', 'correo')}
          />
          <TextField
            label={c.telefono}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            {...campo('participante', 'telefono')}
          />
          <TextField
            label={c.lugarResidencia}
            hint={c.lugarAyuda}
            required
            autoComplete="off"
            {...campo('participante', 'lugarResidencia')}
          />
        </div>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Button type="submit" size="lg">
          {participar.comunes.continuar}
        </Button>
        <Button type="button" variant="fantasma" size="lg" onClick={onVolver}>
          {participar.comunes.volver}
        </Button>
      </div>
    </form>
  );
}

function PasoAutorizacion({
  modulo,
  tituloRef,
  onVolver,
}: PasoProps & { modulo: ModuloDisponible; onVolver: () => void }) {
  const { estado, despachar } = useParticipacion();
  const navigate = useNavigate();
  const [faltan, setFaltan] = useState<(keyof Autorizaciones)[]>([]);
  const t = participar.autorizacion;
  const etiquetas: Record<keyof Autorizaciones, string> = {
    tratamientoDatos: t.tratamientoDatos,
    datosSensibles: modulo === 'nino' ? t.datosSensiblesNino : t.datosSensibles,
    autorizacionAcudiente: t.autorizacionAcudiente,
  };
  const idCasilla = (clave: keyof Autorizaciones) => `autorizacion-${clave}`;

  function aceptar(evento: FormEvent) {
    evento.preventDefault();
    const pendientes = faltanAutorizaciones(modulo, estado.autorizaciones);
    const primera = pendientes[0];
    if (primera) {
      setFaltan(pendientes);
      document.getElementById(idCasilla(primera))?.focus();
      return;
    }
    despachar({ tipo: 'completarRegistro' });
    void navigate('/cuestionario');
  }

  return (
    <form noValidate onSubmit={aceptar}>
      <h1 ref={tituloRef} tabIndex={-1} className="text-h1 outline-none">
        {t.titulo}
      </h1>
      <p className="mt-3 text-cuerpo-grande text-grafito-600">{t.texto}</p>
      <ul className="mt-4 flex flex-col gap-1">
        <li>
          <Link to="/privacidad" target="_blank" rel="noopener" className={claseEnlace}>
            {t.politica}
            <span className="sr-only"> {t.otraPestana}</span>
          </Link>
        </li>
        <li>
          <Link to="/terminos" target="_blank" rel="noopener" className={claseEnlace}>
            {t.terminos}
            <span className="sr-only"> {t.otraPestana}</span>
          </Link>
        </li>
      </ul>

      <div className="mt-8 flex flex-col gap-5">
        {autorizacionesRequeridas(modulo).map((clave) => (
          <CheckboxField
            key={clave}
            id={idCasilla(clave)}
            label={etiquetas[clave]}
            required
            checked={estado.autorizaciones[clave]}
            error={faltan.includes(clave) ? t.falta : undefined}
            onCheckedChange={(valor) => {
              despachar({ tipo: 'autorizar', campo: clave, valor });
              if (valor) setFaltan((lista) => lista.filter((otra) => otra !== clave));
            }}
          />
        ))}
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button type="submit" size="lg">
          {t.continuar}
        </Button>
        <Button type="button" variant="fantasma" size="lg" onClick={onVolver}>
          {participar.comunes.volver}
        </Button>
      </div>
    </form>
  );
}
