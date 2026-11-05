import { useMutation } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useState, type FormEvent } from 'react';
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
import { Callout } from '@/components/ui/feedback';
import { Field } from '@/components/ui/field';
import { fieldControlClasses } from '@/components/ui/field-styles';
import { panel } from '@/content/panel';
import { cn } from '@/lib/utils/cn';
import { exportarCenso } from '../datos/consultas';
import { esFaltaDePermiso } from '../datos/errores';
import { formatearNumero } from '../datos/formato';
import type { FiltrosCenso } from '../datos/tipos';
import { cargarExcelJS, construirLibroCenso, nombreArchivoCenso, TIPO_XLSX } from './excel';

const t = panel.censo.descarga;
const MOTIVO_MINIMO = 10;

/** Entrega el archivo al navegador como una descarga. */
function descargarArchivo(contenido: BlobPart, nombre: string) {
  const url = URL.createObjectURL(new Blob([contenido], { type: TIPO_XLSX }));
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.append(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * «Descargar en Excel» (D-84): pide el motivo, que la base guarda en la auditoría junto con quién
 * descargó y cuántas personas salieron, y arma el archivo en el navegador.
 */
export function DescargaCenso({
  filtros,
  personas,
}: {
  filtros: FiltrosCenso;
  personas: number | undefined;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const [aviso, setAviso] = useState('');

  const descarga = useMutation({
    mutationFn: async (motivoLimpio: string) => {
      // Primero la base: si no autoriza la descarga, no se arma nada.
      const datos = await exportarCenso(filtros, motivoLimpio);
      const excel = await cargarExcelJS();
      const libro = construirLibroCenso(excel, datos, { filtros, motivo: motivoLimpio });
      descargarArchivo(await libro.xlsx.writeBuffer(), nombreArchivoCenso(datos.generadoEn));
      return datos.personas.length;
    },
    onSuccess: (n) => {
      setAbierto(false);
      setMotivo('');
      setAviso(t.lista(panel.censo.quienes.personas(formatearNumero(n))));
    },
  });

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const limpio = motivo.trim();
    if (limpio.length < MOTIVO_MINIMO) {
      setErrorMotivo(t.motivoCorto);
      return;
    }
    setErrorMotivo(null);
    descarga.mutate(limpio);
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Dialog
        open={abierto}
        onOpenChange={(valor) => {
          setAbierto(valor);
          if (valor) setAviso('');
          else {
            setErrorMotivo(null);
            descarga.reset();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="secundario" disabled={!personas}>
            <FileSpreadsheet aria-hidden className="size-4" />
            {t.boton}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>{t.titulo}</DialogTitle>
          <DialogDescription>
            {t.descripcion(panel.censo.quienes.personas(formatearNumero(personas ?? 0)))}
          </DialogDescription>
          <form onSubmit={enviar} noValidate className="mt-5 flex flex-col gap-4">
            <Field label={t.motivo} hint={t.motivoAyuda} error={errorMotivo ?? undefined} required>
              {(ids) => (
                <textarea
                  id={ids.controlId}
                  aria-describedby={ids.describedBy}
                  aria-invalid={ids.invalid || undefined}
                  aria-required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  maxLength={300}
                  className={cn(fieldControlClasses, 'min-h-24 resize-y py-3')}
                />
              )}
            </Field>
            <Callout>{t.aviso}</Callout>
            {descarga.isError ? (
              <Callout variant="apoyo">
                {esFaltaDePermiso(descarga.error) ? t.sinPermiso : t.error}
              </Callout>
            ) : null}
            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button type="button" variant="secundario">
                  {t.cancelar}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={descarga.isPending}>
                <Download aria-hidden className="size-4" />
                {descarga.isPending ? t.preparando : t.descargar}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <p role="status" className="text-pequeno text-grafito-600 empty:hidden">
        {aviso}
      </p>
    </div>
  );
}
