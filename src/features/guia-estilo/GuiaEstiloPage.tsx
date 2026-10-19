import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Baby, Inbox, PersonStanding, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlcaldiaLogo, MenteAlDiaIsotipo, MenteAlDiaLogo } from '@/components/brand/logos';
import { PageMeta } from '@/components/layout/page';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, TiltCard } from '@/components/ui/card';
import { CheckboxField } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer';
import { Callout, EmptyState, Eyebrow, Skeleton } from '@/components/ui/feedback';
import { TextField } from '@/components/ui/field';
import { NivelBadge } from '@/components/ui/nivel-badge';
import { RadioCard, RadioCardGroup } from '@/components/ui/radio-card';
import { MotionScope } from '@/components/ui/motion-scope';
import { Reveal } from '@/components/ui/reveal';
import { SegmentedProgress } from '@/components/ui/segmented-progress';
import { Stepper } from '@/components/ui/stepper';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/toast-store';
import { Tooltip } from '@/components/ui/tooltip';
import { useAccessibility } from '@/lib/a11y/accessibility-context';
import type { Nivel } from '@/types/dominio';
import { guia } from './contenido';

const SECCIONES = Object.entries(guia.secciones) as [keyof typeof guia.secciones, string][];
const NIVELES: { nivel: Nivel; texto: string; fondo: string }[] = [
  { nivel: 'adecuado', texto: 'nivel-adecuado', fondo: 'nivel-adecuado-fondo' },
  { nivel: 'por_fortalecer', texto: 'nivel-fortalecer', fondo: 'nivel-fortalecer-fondo' },
  { nivel: 'requiere_atencion', texto: 'nivel-atencion', fondo: 'nivel-atencion-fondo' },
  { nivel: 'sin_dato', texto: 'nivel-sin-dato', fondo: 'nivel-sin-dato-fondo' },
];

/** Lee el valor actual de un token (cambia con el modo de alto contraste). */
function useTokenValues(tokens: readonly string[]): Record<string, string> {
  const { preferences } = useAccessibility();
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    setValues(
      Object.fromEntries(
        tokens.map((token) => [token, styles.getPropertyValue(`--${token}`).trim().toUpperCase()]),
      ),
    );
  }, [tokens, preferences.highContrast]);
  return values;
}

const TODOS_LOS_TOKENS = [
  ...guia.paleta.grupos.flatMap((grupo) => grupo.tokens.map((item) => item.token)),
  ...NIVELES.flatMap((item) => [item.texto, item.fondo]),
];

function GuideSection({
  id,
  children,
  description,
}: {
  id: keyof typeof guia.secciones;
  children: ReactNode;
  description?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titulo`}
      className="scroll-mt-28 border-t border-piedra-200 py-14"
    >
      <h2 id={`${id}-titulo`} className="text-h2">
        {guia.secciones[id]}
      </h2>
      {description ? <p className="mt-2 max-w-lectura text-grafito-600">{description}</p> : null}
      <div className="mt-8">{children}</div>
    </section>
  );
}

function SubTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-4 text-h3">{children}</h3>;
}

function PaletteSection() {
  const values = useTokenValues(TODOS_LOS_TOKENS);
  return (
    <GuideSection id="paleta">
      <div className="flex flex-col gap-10">
        {guia.paleta.grupos.map((grupo) => (
          <div key={grupo.nombre}>
            <SubTitle>{grupo.nombre}</SubTitle>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {grupo.tokens.map(({ token, uso }) => (
                <li
                  key={token}
                  className="overflow-hidden rounded-lg border border-piedra-200 bg-blanco"
                >
                  <div
                    aria-hidden
                    className="h-20 border-b border-piedra-200"
                    style={{ backgroundColor: `var(--${token})` }}
                  />
                  <div className="flex flex-col gap-0.5 p-4">
                    <code className="font-semibold text-grafito-900">--{token}</code>
                    <span className="text-pequeno text-grafito-600 tabular-nums">
                      {values[token]}
                    </span>
                    <span className="text-pequeno text-grafito-600">{uso}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <SubTitle>{guia.paleta.niveles}</SubTitle>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {NIVELES.map(({ nivel, texto, fondo }) => (
              <li
                key={nivel}
                className="flex flex-col gap-3 rounded-lg border border-piedra-200 bg-blanco p-4"
              >
                <NivelBadge nivel={nivel} className="self-start" />
                <span className="text-pequeno text-grafito-600 tabular-nums">
                  {values[texto]} / {values[fondo]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </GuideSection>
  );
}

function TypographySection() {
  return (
    <GuideSection id="tipografia">
      <div className="grid gap-4 sm:grid-cols-2">
        {guia.tipografia.familias.map((familia) => (
          <Card key={familia.nombre} className="p-6">
            <p className={`${familia.clase} text-h2 text-pizarra-700`}>{familia.nombre}</p>
            <p className="mt-1 text-grafito-600">{familia.uso}</p>
            <p className={`${familia.clase} mt-4 text-cuerpo-grande`}>
              Aa Áá Éé Ññ ¿? ¡! 0123456789
            </p>
          </Card>
        ))}
      </div>
      <p className="mt-4 text-pequeno text-grafito-600">{guia.tipografia.lecturaFacil}</p>
      <dl className="mt-10 flex flex-col divide-y divide-piedra-200 rounded-lg border border-piedra-200 bg-blanco">
        {guia.tipografia.escala.map((nivel) => (
          <div
            key={nivel.nombre}
            className="grid gap-2 p-5 md:grid-cols-[10rem_1fr] md:items-baseline"
          >
            <dt className="text-pequeno font-semibold text-grafito-600">
              {nivel.nombre}
              <code className="block font-normal">{nivel.clase.split(' ')[0]}</code>
            </dt>
            <dd
              className={`${nivel.clase} ${nivel.clase.startsWith('text-display') || nivel.clase.startsWith('text-h') ? 'font-titulo text-pizarra-700' : 'text-grafito-900'}`}
            >
              {nivel.ejemplo}
            </dd>
          </div>
        ))}
      </dl>
    </GuideSection>
  );
}

function ShapesSection() {
  const [revealKey, setRevealKey] = useState(0);
  return (
    <GuideSection id="formas">
      <SubTitle>{guia.formas.radios}</SubTitle>
      <ul className="flex flex-wrap gap-4">
        {(['sm', 'md', 'lg', 'xl', 'pill'] as const).map((radio) => (
          <li key={radio} className="flex flex-col items-center gap-2">
            <span
              aria-hidden
              className="block size-20 border-2 border-pizarra-700 bg-pizarra-100"
              style={{ borderRadius: `var(--radio-${radio})` }}
            />
            <code className="text-pequeno text-grafito-600">--radio-{radio}</code>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <SubTitle>{guia.formas.sombras}</SubTitle>
        <ul className="grid gap-6 sm:grid-cols-3">
          {(['1', '2', '3'] as const).map((sombra) => (
            <li
              key={sombra}
              className="flex h-24 items-center justify-center rounded-lg bg-blanco"
              style={{ boxShadow: `var(--sombra-${sombra})` }}
            >
              <code className="text-pequeno text-grafito-600">--sombra-{sombra}</code>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-10">
        <SubTitle>{guia.formas.movimiento}</SubTitle>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {guia.formas.tiempos.map((tiempo) => (
            <li key={tiempo.nombre} className="rounded-lg border border-piedra-200 bg-blanco p-4">
              <p className="font-semibold text-grafito-900">
                {tiempo.nombre} · <span className="tabular-nums">{tiempo.valor}</span>
              </p>
              <p className="text-pequeno text-grafito-600">{tiempo.uso}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-pequeno text-grafito-600">{guia.formas.curva}</p>
        <Button
          variant="secundario"
          size="sm"
          className="mt-4"
          onClick={() => setRevealKey((key) => key + 1)}
        >
          {guia.formas.verEntrada}
        </Button>
        <div key={revealKey} className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Reveal key={index} index={index}>
              <div className="h-20 rounded-lg bg-salvia-100" />
            </Reveal>
          ))}
        </div>
      </div>
    </GuideSection>
  );
}

function ButtonsSection() {
  const b = guia.botones;
  return (
    <GuideSection id="botones" description={b.nota}>
      <SubTitle>{b.variantes}</SubTitle>
      <div className="flex flex-wrap items-center gap-3">
        <Button>{b.primario}</Button>
        <Button variant="secundario">{b.secundario}</Button>
        <Button variant="fantasma">{b.fantasma}</Button>
        <Button variant="apoyo">{b.apoyo}</Button>
        <Button variant="enlace">{b.enlace}</Button>
      </div>
      <div className="mt-8">
        <SubTitle>{b.tamanos}</SubTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">{b.pequeno}</Button>
          <Button size="md">{b.mediano}</Button>
          <Button size="lg">{b.grande}</Button>
        </div>
      </div>
      <div className="mt-8">
        <SubTitle>{b.estados}</SubTitle>
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            {b.conIcono}
            <ArrowRight aria-hidden />
          </Button>
          <Button loading loadingLabel={b.cargando}>
            {b.primario}
          </Button>
          <Button disabled>{b.deshabilitado}</Button>
          <Button variant="secundario" disabled>
            {b.deshabilitado}
          </Button>
        </div>
      </div>
    </GuideSection>
  );
}

function CardsSection() {
  const c = guia.tarjetas;
  return (
    <GuideSection id="tarjetas">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-6">
          <h3 className="text-h3">{c.base.titulo}</h3>
          <p className="mt-2 text-grafito-600">{c.base.texto}</p>
        </Card>
        <Card variant="elevada" className="p-6">
          <h3 className="text-h3">{c.elevada.titulo}</h3>
          <p className="mt-2 text-grafito-600">{c.elevada.texto}</p>
        </Card>
        <Card variant="interactiva" className="flex flex-col gap-2 p-6">
          <h3 className="text-h3">{c.interactiva.titulo}</h3>
          <p className="text-grafito-600">{c.interactiva.texto}</p>
          <Button variant="enlace" className="mt-auto self-start">
            {c.interactiva.accion}
          </Button>
        </Card>
        <TiltCard variant="elevada" className="p-6">
          <Sparkles aria-hidden className="size-7 text-salvia-600" />
          <h3 className="mt-3 text-h3">{c.tilt.titulo}</h3>
          <p className="mt-2 text-grafito-600">{c.tilt.texto}</p>
        </TiltCard>
      </div>
    </GuideSection>
  );
}

function LevelsSection() {
  return (
    <GuideSection id="niveles">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {NIVELES.map(({ nivel }) => (
            <NivelBadge key={nivel} nivel={nivel} />
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {NIVELES.map(({ nivel }) => (
            <NivelBadge key={nivel} nivel={nivel} size="sm" />
          ))}
        </div>
      </div>
    </GuideSection>
  );
}

const f = guia.formulario;

const formSchema = z.object({
  nombre: z.string().trim().min(3, f.nombreError).max(100, f.nombreError),
  correo: z.email(f.correoError),
  telefono: z.string().regex(/^\d{10}$/, f.telefonoError),
  lugar: z.string().min(1, f.lugarError),
  quien: z.string().min(1, f.quienError),
  autorizacion: z.boolean().refine((value) => value, f.autorizacionError),
});

type FormInput = z.input<typeof formSchema>;
type FormOutput = z.output<typeof formSchema>;

function FormSection() {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      correo: '',
      telefono: '',
      lugar: '',
      quien: '',
      autorizacion: false,
    },
  });

  return (
    <GuideSection id="formularios">
      <form
        noValidate
        onSubmit={handleSubmit(() => toast({ title: f.exito, tone: 'exito' }))}
        className="flex max-w-2xl flex-col gap-6 rounded-xl border border-piedra-200 bg-blanco p-4 sm:p-8"
        aria-labelledby="formulario-ejemplo"
      >
        <h3 id="formulario-ejemplo" className="text-h3">
          {f.titulo}
        </h3>
        <TextField
          label={f.nombre}
          hint={f.nombreAyuda}
          required
          autoComplete="name"
          error={errors.nombre?.message}
          {...register('nombre')}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField
            label={f.correo}
            type="email"
            required
            autoComplete="email"
            error={errors.correo?.message}
            {...register('correo')}
          />
          <TextField
            label={f.telefono}
            hint={f.telefonoAyuda}
            type="tel"
            inputMode="numeric"
            required
            autoComplete="tel-national"
            error={errors.telefono?.message}
            {...register('telefono')}
          />
        </div>
        <Controller
          control={control}
          name="lugar"
          render={({ field }) => (
            <Combobox
              label={f.lugar}
              required
              options={f.lugares}
              value={field.value || null}
              onValueChange={(value) => field.onChange(value ?? '')}
              placeholder={f.lugarPlaceholder}
              searchPlaceholder={f.lugarBuscar}
              error={errors.lugar?.message}
            />
          )}
        />
        <TextField label={f.deshabilitado} disabled defaultValue={f.deshabilitadoValor} />
        <Controller
          control={control}
          name="quien"
          render={({ field }) => (
            <RadioCardGroup
              legend={f.quien}
              value={field.value}
              onValueChange={field.onChange}
              error={errors.quien?.message}
            >
              <RadioCard
                value="nino"
                icon={<Baby />}
                title={f.quienOpciones.nino.titulo}
                description={f.quienOpciones.nino.descripcion}
              />
              <RadioCard
                value="adolescente"
                disabled
                icon={<PersonStanding />}
                title={f.quienOpciones.adolescente.titulo}
                description={f.quienOpciones.adolescente.descripcion}
                badge={f.quienOpciones.adolescente.badge}
              />
              <RadioCard
                value="adulto"
                icon={<UserRound />}
                title={f.quienOpciones.adulto.titulo}
                description={f.quienOpciones.adulto.descripcion}
              />
            </RadioCardGroup>
          )}
        />
        <Controller
          control={control}
          name="autorizacion"
          render={({ field }) => (
            <CheckboxField
              label={f.autorizacion}
              description={f.autorizacionDescripcion}
              required
              checked={field.value}
              onCheckedChange={field.onChange}
              error={errors.autorizacion?.message}
            />
          )}
        />
        <Button type="submit" className="self-start">
          {f.enviar}
        </Button>
      </form>
    </GuideSection>
  );
}

function ProgressSection() {
  const p = guia.progreso;
  const [step, setStep] = useState(1);
  const [answered, setAnswered] = useState(7);
  return (
    <GuideSection id="progreso">
      <Stepper steps={p.pasos} current={step} label={p.pasosEtiqueta} />
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          variant="secundario"
          size="sm"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          {p.anterior}
        </Button>
        <Button
          size="sm"
          disabled={step === p.pasos.length - 1}
          onClick={() => setStep((s) => s + 1)}
        >
          {p.siguiente}
        </Button>
      </div>
      <div className="mt-12 flex flex-col gap-3">
        <p className="font-semibold text-grafito-900">{p.barraTexto(answered)}</p>
        <SegmentedProgress
          value={answered}
          label={p.barraEtiqueta}
          valueText={p.barraTexto(answered)}
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secundario"
            size="sm"
            disabled={answered === 0}
            onClick={() => setAnswered((n) => n - 1)}
          >
            {p.menos}
          </Button>
          <Button
            variant="secundario"
            size="sm"
            disabled={answered === 20}
            onClick={() => setAnswered((n) => n + 1)}
          >
            {p.mas}
          </Button>
        </div>
      </div>
    </GuideSection>
  );
}

function ContentSection() {
  return (
    <GuideSection id="contenido">
      {/* min-w-0: sin esto, la fila de pestañas ensancha la columna y desborda en móvil. */}
      <div className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
        <Accordion
          type="single"
          collapsible
          className="rounded-lg border border-piedra-200 bg-blanco px-5"
        >
          {guia.acordeon.map((item) => (
            <AccordionItem key={item.pregunta} value={item.pregunta}>
              <AccordionTrigger>{item.pregunta}</AccordionTrigger>
              <AccordionContent>{item.respuesta}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Tabs defaultValue={guia.pestanas[0].valor}>
          <TabsList aria-label={guia.pestanasEtiqueta}>
            {guia.pestanas.map((tab) => (
              <TabsTrigger key={tab.valor} value={tab.valor}>
                {tab.titulo}
              </TabsTrigger>
            ))}
          </TabsList>
          {guia.pestanas.map((tab) => (
            <TabsContent key={tab.valor} value={tab.valor}>
              <Card className="p-6 text-grafito-600">{tab.texto}</Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </GuideSection>
  );
}

function OverlaysSection() {
  const s = guia.superposiciones;
  return (
    <GuideSection id="superposiciones">
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secundario">{s.abrirDialogo}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>{s.dialogoTitulo}</DialogTitle>
            <DialogDescription>{s.dialogoTexto}</DialogDescription>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secundario">{s.dialogoCancelar}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>{s.dialogoConfirmar}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Drawer>
          <DrawerTrigger asChild>
            <Button variant="secundario">{s.abrirPanel}</Button>
          </DrawerTrigger>
          <DrawerContent title={s.panelTitulo}>
            <p className="text-grafito-600">{s.panelTexto}</p>
          </DrawerContent>
        </Drawer>
        <Tooltip content={s.tooltipTexto}>
          <Button variant="secundario">{s.tooltipBoton}</Button>
        </Tooltip>
        <Button
          variant="secundario"
          onClick={() => toast({ title: s.toastTitulo, description: s.toastTexto, tone: 'exito' })}
        >
          {s.toastBoton}
        </Button>
      </div>
    </GuideSection>
  );
}

function StatesSection() {
  const e = guia.estados;
  return (
    <GuideSection id="estados">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-lg border border-piedra-200 bg-blanco p-6">
          <p className="font-semibold text-grafito-900">{e.cargando}</p>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-11 w-40 rounded-pill" />
        </div>
        <EmptyState
          icon={<Inbox />}
          title={e.vacioTitulo}
          description={e.vacioTexto}
          action={<Button size="sm">{e.vacioAccion}</Button>}
        />
        <Callout title={e.infoTitulo}>{e.infoTexto}</Callout>
        <Callout variant="apoyo" title={e.apoyoTitulo}>
          {e.apoyoTexto}
        </Callout>
      </div>
    </GuideSection>
  );
}

function BrandSection() {
  const mk = guia.marca;
  return (
    <GuideSection id="marca">
      <div className="grid gap-5 sm:grid-cols-3">
        <Card className="flex flex-col items-start gap-4 p-6">
          <MenteAlDiaLogo />
          <p className="text-pequeno text-grafito-600">{mk.completo}</p>
        </Card>
        <Card className="flex flex-col items-start gap-4 p-6">
          <MenteAlDiaIsotipo className="size-14" />
          <p className="text-pequeno text-grafito-600">{mk.isotipo}</p>
        </Card>
        <Card className="flex flex-col items-start gap-4 p-6">
          <AlcaldiaLogo />
          <p className="text-pequeno text-grafito-600">{mk.alcaldia}</p>
        </Card>
      </div>
    </GuideSection>
  );
}

/** Guía de estilo viva: paleta, tipografía y componentes con sus estados. */
export default function GuiaEstiloPage() {
  return (
    <MotionScope>
      <PageMeta title={guia.titulo} indexable={false} />
      <div className="contenedor pt-12 pb-20">
        <header className="max-w-lectura">
          <Eyebrow>Mente al Día</Eyebrow>
          <h1 className="mt-3 font-titulo text-display">{guia.titulo}</h1>
          <p className="mt-5 text-cuerpo-grande text-grafito-600">{guia.intro}</p>
          <Callout className="mt-6">{guia.nota}</Callout>
        </header>
        <nav aria-label={guia.indice} className="mt-10">
          <ul className="flex flex-wrap gap-2">
            {SECCIONES.map(([id, titulo]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center rounded-pill border border-piedra-200 bg-blanco px-4 text-pequeno font-semibold no-underline hover:bg-pizarra-100"
                >
                  {titulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-6">
          <PaletteSection />
          <TypographySection />
          <ShapesSection />
          <ButtonsSection />
          <CardsSection />
          <LevelsSection />
          <FormSection />
          <ProgressSection />
          <ContentSection />
          <OverlaysSection />
          <StatesSection />
          <BrandSection />
        </div>
      </div>
    </MotionScope>
  );
}
