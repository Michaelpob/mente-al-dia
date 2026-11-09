import type * as ExcelJSTipos from 'exceljs';
import type { Borders, DataBarRuleType, Fill, Font, Row, Workbook, Worksheet } from 'exceljs';
import { panel } from '@/content/panel';
import { areas, dimensiones } from '@/content/v1/areas';
import type { AreaId, Nivel } from '@/types/dominio';
import { MODULOS, ZONA_HORARIA } from '../datos/filtros';
import type { ExportacionCenso, FiltrosCenso, PersonaCenso } from '../datos/tipos';
import { fraccion, ordenarGrados, resumenAreas } from './analisis';

/**
 * El Excel del censo (D-84): «Resumen», «Áreas» y «Personas», con formato. ExcelJS pesa cerca de
 * 1 MB, así que la página lo carga solo al descargar y lo pasa aquí; las pruebas lo pasan directo.
 */
type ExcelJS = typeof ExcelJSTipos;

const c = panel.censo;
const x = c.descarga.excel;

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Carga ExcelJS solo cuando hace falta (queda en un archivo JS aparte). */
export async function cargarExcelJS(): Promise<ExcelJS> {
  // Es un paquete CommonJS: según quien lo empaquete, llega como «default» o con sus nombres.
  const modulo = (await import('exceljs')) as ExcelJS & { default?: ExcelJS };
  return modulo.default ?? modulo;
}

/** El día de Colombia (AAAA-MM-DD) de un instante. */
const diaColombia = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(new Date(iso));

/** «censo-mente-al-dia-2026-11-05.xlsx», con el día de Colombia. */
export const nombreArchivoCenso = (generadoEn: string) =>
  `censo-mente-al-dia-${diaColombia(generadoEn)}.xlsx`;

/** Fecha sin hora para Excel, que no guarda zona horaria: el día de Colombia a medianoche UTC. */
export const fechaExcel = (iso: string) => new Date(`${diaColombia(iso)}T00:00:00Z`);

const diaLargo = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const instanteLargo = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'long',
  timeStyle: 'short',
  timeZone: ZONA_HORARIA,
});

/** «Todo el tiempo», «Del 1 de enero de 2026 al 5 de noviembre de 2026», «Desde el …» o «Hasta el …». */
export function describirPeriodo(f: Pick<FiltrosCenso, 'desde' | 'hasta'>): string {
  const dia = (aaaammdd: string) => diaLargo.format(new Date(`${aaaammdd}T00:00:00Z`));
  if (f.desde && f.hasta) return x.desdeHasta(dia(f.desde), dia(f.hasta));
  if (f.desde) return x.desde(dia(f.desde));
  if (f.hasta) return x.hasta(dia(f.hasta));
  return x.todoElTiempo;
}

// ---------------------------------------------------------------------------------- estilos

/** Colores claros para leer en Excel (fondo blanco): relleno suave y texto oscuro de cada nivel. */
const NIVEL: Record<Nivel, { relleno: string; texto: string; barra: string }> = {
  adecuado: { relleno: 'FFD3F1F8', texto: 'FF0B5E75', barra: 'FF1592B5' },
  por_fortalecer: { relleno: 'FFFCEFC4', texto: 'FF7A5A00', barra: 'FFA67C0E' },
  requiere_atencion: { relleno: 'FFFAD4DD', texto: 'FF9B1C3C', barra: 'FFCF4A6A' },
  sin_dato: { relleno: 'FFE4E7F2', texto: 'FF46507A', barra: 'FF646FA3' },
};
const MARCA = 'FF3B2FB8';
const ENCABEZADO = 'FF1E2A5A';
const BARRA = 'FF6D5FE0';
const GRIS = 'FF4E5B65';
const BORDE = 'FFD5D9E8';

const relleno = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const bordes: Partial<Borders> = {
  top: { style: 'thin', color: { argb: BORDE } },
  bottom: { style: 'thin', color: { argb: BORDE } },
  left: { style: 'thin', color: { argb: BORDE } },
  right: { style: 'thin', color: { argb: BORDE } },
};
const fuente = (cambios: Partial<Font> = {}): Partial<Font> => ({
  name: 'Calibri',
  size: 11,
  ...cambios,
});

function estiloEncabezado(fila: Row) {
  fila.eachCell((celda) => {
    celda.font = fuente({ bold: true, color: { argb: 'FFFFFFFF' } });
    celda.fill = relleno(ENCABEZADO);
    celda.border = bordes;
    celda.alignment = { vertical: 'middle', wrapText: true };
  });
}

function estiloCuerpo(fila: Row) {
  fila.eachCell({ includeEmpty: true }, (celda) => {
    celda.font = fuente();
    celda.border = bordes;
    celda.alignment = { vertical: 'top', wrapText: true };
  });
}

/** Barra de datos de Excel en una columna (el nivel o el tamaño se lee también en el número). */
function barraDeDatos(hoja: Worksheet, ref: string, color: string, prioridad: number) {
  // ExcelJS escribe el color de la barra aunque su tipo no lo declare.
  const regla: DataBarRuleType & { color: { argb: string } } = {
    type: 'dataBar',
    priority: prioridad,
    gradient: false,
    cfvo: [{ type: 'num', value: 0 }, { type: 'max' }],
    color: { argb: color },
  };
  hoja.addConditionalFormatting({ ref, rules: [regla] });
}

const letra = (columna: number) => {
  let texto = '';
  for (let n = columna; n > 0; n = Math.floor((n - 1) / 26)) {
    texto = String.fromCharCode(65 + ((n - 1) % 26)) + texto;
  }
  return texto;
};

// ---------------------------------------------------------------------------------- hojas

export interface ContextoDescarga {
  filtros: FiltrosCenso;
  motivo: string;
}

function hojaResumen(libro: Workbook, datos: ExportacionCenso, contexto: ContextoDescarga) {
  const hoja = libro.addWorksheet(x.hojas.resumen, {
    views: [{ showGridLines: false }],
    properties: { tabColor: { argb: MARCA } },
  });
  hoja.columns = [{ width: 36 }, { width: 16 }, { width: 16 }, { width: 44 }];
  const r = datos.resumen;
  let prioridad = 1;

  const titulo = hoja.addRow([x.titulo]);
  titulo.font = fuente({ size: 16, bold: true, color: { argb: MARCA } });
  titulo.height = 26;
  hoja.mergeCells(titulo.number, 1, titulo.number, 4);
  for (const texto of [x.confidencial, x.cuidado]) {
    const fila = hoja.addRow([texto]);
    fila.font = fuente({ italic: true, color: { argb: GRIS } });
    hoja.mergeCells(fila.number, 1, fila.number, 4);
  }
  hoja.addRow([]);

  const f = contexto.filtros;
  const info: [string, string][] = [
    // La institución descargada (D-86); sin ella, el administrador general bajó todas.
    [x.datos.institucion, datos.institucion ?? x.todasInstituciones],
    [x.datos.periodo, describirPeriodo(f)],
    [x.datos.modulo, f.modulo ? panel.modulos[f.modulo] : x.todos],
    [x.datos.lugar, f.lugar ?? x.todos],
    [x.datos.por, datos.generadoPor ?? panel.sinDato],
    [x.datos.fecha, instanteLargo.format(new Date(datos.generadoEn))],
    [x.datos.motivo, contexto.motivo],
    [x.datos.cuenta, x.cuenta],
  ];
  for (const [etiqueta, valor] of info) {
    const fila = hoja.addRow([etiqueta, valor]);
    hoja.mergeCells(fila.number, 2, fila.number, 4);
    fila.getCell(1).font = fuente({ bold: true });
    fila.getCell(2).font = fuente();
    fila.getCell(2).alignment = { wrapText: true, vertical: 'top' };
    fila.getCell(1).alignment = { vertical: 'top' };
  }
  hoja.addRow([]);

  /** Una tabla «grupo · personas · porcentaje», con barra de datos en las personas. */
  const tabla = (encabezado: string, filas: [string, number][], total: number) => {
    const cabeza = hoja.addRow([encabezado, x.personas, x.porcentaje]);
    estiloEncabezado(cabeza);
    const inicio = cabeza.number + 1;
    for (const [etiqueta, n] of filas) {
      const fila = hoja.addRow([etiqueta, n, total ? n / total : null]);
      estiloCuerpo(fila);
      fila.getCell(3).numFmt = '0%';
    }
    if (filas.length) {
      barraDeDatos(hoja, `B${inicio}:B${inicio + filas.length - 1}`, BARRA, prioridad++);
    }
    hoja.addRow([]);
  };

  tabla(
    x.indicador,
    [
      [c.indicadores.personas, r.personas],
      [c.indicadores.conFalencias, r.conFalencias],
      [c.indicadores.sinFalencias, r.personas - r.conFalencias],
      [c.indicadores.conPrioridad, r.conPrioridad],
    ],
    r.personas,
  );
  const cuestionarios = hoja.addRow([x.cuestionarios, r.cuestionarios]);
  estiloCuerpo(cuestionarios);
  hoja.addRow([]);

  const menores = r.porSexo.reduce((suma, s) => suma + s.n, 0);
  if (!datos.institucion && r.porInstitucion?.length) {
    tabla(
      x.grupos.institucion,
      r.porInstitucion.map((i) => [i.institucion, i.n]),
      r.personas,
    );
  }
  tabla(
    x.grupos.modulo,
    MODULOS.filter((m) => !f.modulo || m === f.modulo).map((m) => [
      panel.modulos[m],
      r.porModulo[m] ?? 0,
    ]),
    r.personas,
  );
  tabla(
    x.grupos.lugar,
    r.lugares.map((l) => [l.lugar, l.n]),
    r.personas,
  );
  tabla(
    x.grupos.edad,
    r.porEdad.map((e) => [c.quienes.anos(e.edad), e.n]),
    r.porEdad.reduce((suma, e) => suma + e.n, 0),
  );
  tabla(
    x.grupos.sexo,
    r.porSexo.map((s) => [s.sexo ?? c.quienes.sinResponder, s.n]),
    menores,
  );
  tabla(
    x.grupos.grado,
    ordenarGrados(r.porGrado).map((g) => [g.grado, g.n]),
    menores,
  );
}

function hojaAreas(libro: Workbook, datos: ExportacionCenso) {
  const hoja = libro.addWorksheet(x.hojas.areas, { properties: { tabColor: { argb: BARRA } } });
  const k = x.columnasAreas;
  hoja.columns = [
    { width: 6 },
    { width: 36 },
    { width: 26 },
    { width: 12 },
    { width: 13 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 13 },
    { width: 11 },
    { width: 11 },
  ];
  const nombreDimension = new Map(dimensiones.map((d) => [d.id, d.nombre]));
  const cabeza = hoja.addRow([
    k.numero,
    k.area,
    k.dimension,
    k.fortaleza,
    k.pFortaleza,
    k.porFortalecer,
    k.pPorFortalecer,
    k.falencia,
    k.pFalencia,
    k.sinDato,
    k.total,
  ]);
  estiloEncabezado(cabeza);
  cabeza.height = 32;

  const resumen = resumenAreas(datos.resumen.areas);
  for (const r of resumen) {
    const fila = hoja.addRow([
      r.area.numero,
      r.area.nombre,
      nombreDimension.get(r.area.dimension) ?? '',
      r.conteo.adecuado,
      r.total ? fraccion(r, 'adecuado') : null,
      r.conteo.por_fortalecer,
      r.total ? fraccion(r, 'por_fortalecer') : null,
      r.conteo.requiere_atencion,
      r.total ? fraccion(r, 'requiere_atencion') : null,
      r.conteo.sin_dato,
      r.total,
    ]);
    estiloCuerpo(fila);
    for (const columna of [5, 7, 9]) fila.getCell(columna).numFmt = '0%';
  }
  const fin = resumen.length + 1;
  barraDeDatos(hoja, `E2:E${fin}`, NIVEL.adecuado.barra, 1);
  barraDeDatos(hoja, `G2:G${fin}`, NIVEL.por_fortalecer.barra, 2);
  barraDeDatos(hoja, `I2:I${fin}`, NIVEL.requiere_atencion.barra, 3);
  hoja.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
  hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 11 } };
}

const areasEnOrden = [...areas].sort((a, b) => a.numero - b.numero);

const nombresEn = (p: PersonaCenso, nivel: Nivel) =>
  areasEnOrden
    .filter((a) => (p.niveles[a.id] ?? 'sin_dato') === nivel)
    .map((a) => a.nombre)
    .join(', ');

function hojaPersonas(libro: Workbook, datos: ExportacionCenso) {
  const hoja = libro.addWorksheet(x.hojas.personas, {
    properties: { tabColor: { argb: NIVEL.requiere_atencion.barra } },
  });
  const k = x.columnasPersonas;
  const fijas = [
    [k.nombre, 30],
    [k.codigo, 11],
    [k.modulo, 18],
    [k.edad, 7],
    [k.sexo, 12],
    [k.grado, 14],
    [k.lugar, 22],
    [k.fecha, 13],
    [k.veces, 11],
    [k.resultado, 16],
    [k.prioridad, 10],
    [k.fortalezas, 11],
    [k.porFortalecer, 11],
    [k.falencias, 10],
    [k.sinDato, 9],
    [k.areasFalencia, 36],
    [k.areasPorFortalecer, 36],
    [k.areasFortaleza, 36],
  ] as const;
  // La institución va al final, después de las áreas: así las columnas de siempre no se mueven.
  hoja.columns = [
    ...fijas.map(([, width]) => ({ width })),
    ...areasEnOrden.map(() => ({ width: 17 })),
    { width: 24 },
  ];
  const cabeza = hoja.addRow([
    ...fijas.map(([titulo]) => titulo),
    ...areasEnOrden.map((a) => `${a.numero}. ${a.nombre}`),
    k.institucion,
  ]);
  estiloEncabezado(cabeza);
  cabeza.height = 48;

  const primeraArea = fijas.length + 1;
  for (const p of datos.personas) {
    const fila = hoja.addRow([
      p.nombre,
      p.codigo,
      panel.modulos[p.modulo],
      p.edad,
      p.sexo ?? (p.modulo === 'adulto' ? null : c.quienes.sinResponder),
      p.grado,
      p.lugar,
      fechaExcel(p.creadoEn),
      p.cuestionarios,
      panel.resultados[p.resultadoGeneral],
      p.prioridad ? x.si : x.no,
      p.fortalezas,
      p.porFortalecer,
      p.falencias,
      p.sinDato,
      nombresEn(p, 'requiere_atencion'),
      nombresEn(p, 'por_fortalecer'),
      nombresEn(p, 'adecuado'),
      ...areasEnOrden.map((a) => c.niveles[p.niveles[a.id] ?? 'sin_dato']),
      p.institucion ?? datos.institucion ?? null,
    ]);
    estiloCuerpo(fila);
    fila.getCell(8).numFmt = 'dd/mm/yyyy';
    if (p.prioridad)
      fila.getCell(11).font = fuente({
        bold: true,
        color: { argb: NIVEL.requiere_atencion.texto },
      });
    // Cada área con el texto del nivel y su color (nunca solo el color).
    areasEnOrden.forEach((a, i) => {
      const nivel: Nivel = p.niveles[a.id as AreaId] ?? 'sin_dato';
      const celda = fila.getCell(primeraArea + i);
      celda.fill = relleno(NIVEL[nivel].relleno);
      celda.font = fuente({
        color: { argb: NIVEL[nivel].texto },
        bold: nivel === 'requiere_atencion',
      });
      celda.alignment = { vertical: 'top', horizontal: 'center' };
    });
  }
  const columnas = fijas.length + areasEnOrden.length + 1;
  hoja.views = [{ state: 'frozen', xSplit: 1, ySplit: 1 }];
  hoja.autoFilter = `A1:${letra(columnas)}1`;
}

/** El libro completo: «Resumen», «Áreas» y «Personas». */
export function construirLibroCenso(
  excel: ExcelJS,
  datos: ExportacionCenso,
  contexto: ContextoDescarga,
): Workbook {
  const libro = new excel.Workbook();
  libro.creator = 'Mente al Día';
  libro.title = x.titulo;
  libro.created = new Date(datos.generadoEn);
  hojaResumen(libro, datos, contexto);
  hojaAreas(libro, datos);
  hojaPersonas(libro, datos);
  return libro;
}
