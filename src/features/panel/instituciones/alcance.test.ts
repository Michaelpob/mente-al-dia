import { describe, expect, it } from 'vitest';
import { escribirFiltrosAuditoria, leerFiltrosAuditoria } from '../datos/filtros';
import { esRutaSoloGeneral } from '../estructura/rutas';
import { CLAVE_ALCANCE, enlaceDeSede, guardarAlcance, leerAlcanceGuardado } from './alcance';

const ID = '00000000-0000-4000-8000-000000000001';

const memoria = (inicial: Record<string, string> = {}) => {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
};

describe('institución elegida por el administrador general', () => {
  it('se guarda en la pestaña y se borra al volver a «todas»', () => {
    const almacen = memoria();
    guardarAlcance(almacen, ID);
    expect(leerAlcanceGuardado(almacen)).toBe(ID);
    guardarAlcance(almacen, null);
    expect(leerAlcanceGuardado(almacen)).toBeNull();
  });

  it('lo que no tiene forma de id no cuenta, y sin almacenamiento no falla', () => {
    expect(leerAlcanceGuardado(memoria({ [CLAVE_ALCANCE]: 'colegio1' }))).toBeNull();
    expect(leerAlcanceGuardado(memoria({ [CLAVE_ALCANCE]: `${ID}' or 1=1` }))).toBeNull();
    expect(leerAlcanceGuardado(null)).toBeNull();
    const almacen = memoria();
    guardarAlcance(almacen, 'no-es-un-id');
    expect(almacen.getItem(CLAVE_ALCANCE)).toBeNull();
  });
});

describe('enlaceDeSede', () => {
  it('arma el enlace público con la carpeta del sitio', () => {
    expect(enlaceDeSede('colegio1', 'https://michaelpob.github.io', '/mente-al-dia/')).toBe(
      'https://michaelpob.github.io/mente-al-dia/?sede=colegio1',
    );
    expect(enlaceDeSede('alcaldia2', 'http://localhost:4173/', '/')).toBe(
      'http://localhost:4173/?sede=alcaldia2',
    );
  });
});

describe('secciones solo del administrador general', () => {
  it('cierra Cuentas, Instituciones, Usuarios, Auditoría y Configuración', () => {
    for (const ruta of [
      '/panel/cuentas',
      '/panel/instituciones',
      '/panel/usuarios',
      '/panel/auditoria',
      '/panel/configuracion',
      '/panel/usuarios/algo',
    ]) {
      expect(esRutaSoloGeneral(ruta)).toBe(true);
    }
  });

  it('deja abiertas las secciones de cada institución', () => {
    for (const ruta of [
      '/panel',
      '/panel/registros',
      '/panel/registros/123',
      '/panel/censo',
      '/panel/prioritarios',
      '/panel/cuentasx',
    ]) {
      expect(esRutaSoloGeneral(ruta)).toBe(false);
    }
  });
});

describe('filtros de la auditoría', () => {
  it('lee fechas válidas, ordena el periodo y solo acepta acciones con forma de acción', () => {
    expect(
      leerFiltrosAuditoria(
        new URLSearchParams('desde=2026-11-08&hasta=2026-11-01&accion=exportar_censo&pagina=3'),
      ),
    ).toEqual({ desde: '2026-11-01', hasta: '2026-11-08', accion: 'exportar_censo', pagina: 3 });
    expect(
      leerFiltrosAuditoria(new URLSearchParams('desde=ayer&accion=DROP TABLE&pagina=-1')),
    ).toEqual({ desde: null, hasta: null, accion: null, pagina: 1 });
  });

  it('escribe solo lo que no es por defecto', () => {
    expect(
      escribirFiltrosAuditoria({ desde: null, hasta: null, accion: null, pagina: 1 }).toString(),
    ).toBe('');
    expect(
      escribirFiltrosAuditoria({
        desde: '2026-11-01',
        hasta: null,
        accion: 'crear',
        pagina: 2,
      }).toString(),
    ).toBe('desde=2026-11-01&accion=crear&pagina=2');
  });
});
