import { describe, expect, it, vi } from 'vitest';
import {
  CLAVE_SEDE,
  consultarSede,
  enlaceConSede,
  esSede,
  estadoInicialSede,
  guardarSede,
  leerSedeGuardada,
  listarSedes,
  slugDelEnlace,
} from './sede';

const COLEGIO = { slug: 'colegio1', nombre: 'Colegio 1' };

const memoria = (inicial: Record<string, string> = {}) => {
  const datos = new Map(Object.entries(inicial));
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  };
};

describe('slug del enlace', () => {
  it('lee ?sede= en minúsculas y sin espacios', () => {
    expect(slugDelEnlace('?sede=colegio1')).toBe('colegio1');
    expect(slugDelEnlace('?grupo=nino&sede=%20Alcaldia2%20')).toBe('alcaldia2');
    expect(enlaceConSede('?sede=colegio1')).toBe(true);
  });

  it('descarta lo que no tiene el formato de un enlace de institución', () => {
    for (const busqueda of ['', '?sede=', '?sede=ab', '?sede=colegio_1', '?sede=<script>']) {
      expect(slugDelEnlace(busqueda)).toBeNull();
    }
    expect(slugDelEnlace(`?sede=${'a'.repeat(41)}`)).toBeNull();
    // Mal escrito, pero el enlace sí traía sede: se avisa que no es válido.
    expect(enlaceConSede('?sede=colegio_1')).toBe(true);
    expect(enlaceConSede('?grupo=nino')).toBe(false);
  });

  it('solo acepta una sede con slug válido y nombre', () => {
    expect(esSede(COLEGIO)).toBe(true);
    expect(esSede({ slug: 'colegio1', nombre: '  ' })).toBe(false);
    expect(esSede({ slug: 'Colegio 1', nombre: 'Colegio 1' })).toBe(false);
    expect(esSede('colegio1')).toBe(false);
    expect(esSede(null)).toBe(false);
  });
});

describe('sede guardada en la pestaña', () => {
  it('se guarda, se lee y se borra', () => {
    const almacen = memoria();
    guardarSede(almacen, COLEGIO);
    expect(leerSedeGuardada(almacen)).toEqual(COLEGIO);
    guardarSede(almacen, null);
    expect(leerSedeGuardada(almacen)).toBeNull();
  });

  it('lo dañado o ajeno no cuenta como sede, y sin almacenamiento no falla', () => {
    expect(leerSedeGuardada(memoria({ [CLAVE_SEDE]: '{roto' }))).toBeNull();
    expect(leerSedeGuardada(memoria({ [CLAVE_SEDE]: '{"slug":"x"}' }))).toBeNull();
    expect(leerSedeGuardada(null)).toBeNull();
    const bloqueado = {
      setItem: () => {
        throw new Error('bloqueado');
      },
      removeItem: () => undefined,
    };
    expect(() => guardarSede(bloqueado, COLEGIO)).not.toThrow();
  });
});

describe('consultarSede', () => {
  const config = { url: 'https://proyecto.supabase.co/', clave: 'sb_publishable_prueba' };
  const respuesta = (cuerpo: unknown, status = 200) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }));

  it('pregunta a institucion_publica con la clave publicable y devuelve el nombre', async () => {
    const fetch = respuesta([{ slug: 'colegio1', nombre: 'Colegio 1' }]);
    await expect(consultarSede('colegio1', { ...config, fetch })).resolves.toEqual(COLEGIO);
    const [url, opciones] = fetch.mock.calls[0]!;
    expect(url).toBe('https://proyecto.supabase.co/rest/v1/rpc/institucion_publica');
    expect(opciones.headers).toMatchObject({ apikey: 'sb_publishable_prueba' });
    expect(JSON.parse(opciones.body)).toEqual({ p_slug: 'colegio1' });
  });

  it('una institución desconocida o inactiva no devuelve filas: null', async () => {
    await expect(consultarSede('otra', { ...config, fetch: respuesta([]) })).resolves.toBeNull();
  });

  it('un error de la base o la falta de configuración se informan como error', async () => {
    await expect(
      consultarSede('colegio1', { ...config, fetch: respuesta({}, 500) }),
    ).rejects.toThrow('500');
    await expect(consultarSede('colegio1', { url: undefined, clave: undefined })).rejects.toThrow();
  });
});

describe('listarSedes', () => {
  const config = { url: 'https://proyecto.supabase.co', clave: 'sb_publishable_prueba' };
  const respuesta = (cuerpo: unknown, status = 200) =>
    vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status }));

  it('pide a instituciones_publicas las activas y devuelve solo nombre y enlace', async () => {
    const fetch = respuesta([
      { nombre: 'Alcaldía 2', slug: 'alcaldia2', extra: 'no' },
      { nombre: 'Colegio 1', slug: 'colegio1' },
      { nombre: '', slug: 'vacio' },
      { nombre: 'Mal escrito', slug: 'Mal Escrito' },
    ]);
    await expect(listarSedes({ ...config, fetch })).resolves.toEqual([
      { nombre: 'Alcaldía 2', slug: 'alcaldia2' },
      COLEGIO,
    ]);
    const [url, opciones] = fetch.mock.calls[0]!;
    expect(url).toBe('https://proyecto.supabase.co/rest/v1/rpc/instituciones_publicas');
    expect(opciones.headers).toMatchObject({ apikey: 'sb_publishable_prueba' });
  });

  it('un error de la base o la falta de configuración se informan como error', async () => {
    await expect(listarSedes({ ...config, fetch: respuesta({}, 503) })).rejects.toThrow('503');
    await expect(listarSedes({ url: undefined, clave: undefined })).rejects.toThrow();
    await expect(listarSedes({ ...config, fetch: respuesta({ no: 'lista' }) })).resolves.toEqual(
      [],
    );
  });
});

describe('estadoInicialSede', () => {
  it('un enlace con sede manda sobre la guardada', () => {
    expect(estadoInicialSede('?sede=alcaldia1', COLEGIO)).toEqual({
      tipo: 'cargando',
      slug: 'alcaldia1',
    });
    expect(estadoInicialSede('?sede=colegio1', COLEGIO)).toEqual({ tipo: 'valida', sede: COLEGIO });
    expect(estadoInicialSede('?sede=mal_escrita', COLEGIO)).toEqual({ tipo: 'invalida' });
  });

  it('sin sede en el enlace sigue la de la pestaña, si la hay', () => {
    expect(estadoInicialSede('', COLEGIO)).toEqual({ tipo: 'valida', sede: COLEGIO });
    expect(estadoInicialSede('?grupo=nino', null)).toEqual({ tipo: 'sin_sede' });
  });
});
