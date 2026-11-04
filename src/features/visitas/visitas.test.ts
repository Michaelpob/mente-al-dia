import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clasificarDispositivo, type SenalesDispositivo } from './dispositivo';
import { registrarVisita, reiniciarVisitaParaPruebas } from './registrar-visita';

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  androidTelefono:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidTableta:
    'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ipadAntiguo:
    'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  windowsTabletPc:
    'Mozilla/5.0 (Windows NT 6.1; WOW64; Trident/7.0; SLCC2; Tablet PC 2.0; rv:11.0) like Gecko',
  firefoxTableta: 'Mozilla/5.0 (Android 14; Tablet; rv:130.0) Gecko/130.0 Firefox/130.0',
  linux:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
};

const computador: Omit<SenalesDispositivo, 'userAgent'> = {
  puntosTactiles: 0,
  ladoCorto: 1080,
  punteroGrueso: false,
};

describe('clasificarDispositivo', () => {
  it.each([
    ['un iPhone', UA.iphone, 'movil'],
    ['un teléfono Android', UA.androidTelefono, 'movil'],
    ['una tableta Android (sin «Mobile»)', UA.androidTableta, 'tableta'],
    ['un iPad antiguo', UA.ipadAntiguo, 'tableta'],
    ['Firefox en una tableta', UA.firefoxTableta, 'tableta'],
    ['un computador con Windows', UA.windows, 'escritorio'],
    ['un Mac', UA.mac, 'escritorio'],
    ['un Windows viejo que dice «Tablet PC»', UA.windowsTabletPc, 'escritorio'],
  ] as const)('reconoce %s', (_, userAgent, esperado) => {
    expect(clasificarDispositivo({ ...computador, userAgent })).toBe(esperado);
  });

  it('reconoce un iPad que se presenta como Mac porque tiene pantalla táctil', () => {
    expect(
      clasificarDispositivo({
        userAgent: UA.mac,
        puntosTactiles: 5,
        ladoCorto: 820,
        punteroGrueso: true,
      }),
    ).toBe('tableta');
  });

  it('cree al navegador cuando dice que es un móvil', () => {
    expect(
      clasificarDispositivo({ ...computador, userAgent: UA.linux, movilSegunNavegador: true }),
    ).toBe('movil');
  });

  it('sin pistas en el navegador, una pantalla táctil se cuenta por su tamaño', () => {
    const tactil = { userAgent: UA.linux, puntosTactiles: 5, punteroGrueso: true };
    expect(clasificarDispositivo({ ...tactil, ladoCorto: 412 })).toBe('movil');
    expect(clasificarDispositivo({ ...tactil, ladoCorto: 800 })).toBe('tableta');
  });

  it('un computador con pantalla táctil y mouse sigue siendo un computador', () => {
    expect(
      clasificarDispositivo({
        userAgent: UA.windows,
        puntosTactiles: 10,
        ladoCorto: 1080,
        punteroGrueso: false,
      }),
    ).toBe('escritorio');
  });
});

describe('registrarVisita', () => {
  const memoria = () => {
    const datos = new Map<string, string>();
    return {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
    };
  };
  const base = {
    url: 'https://proyecto.supabase.co/',
    clave: 'sb_publishable_prueba',
    dispositivo: () => 'tableta' as const,
    esAutomatizado: () => false,
  };

  beforeEach(() => reiniciarVisitaParaPruebas());

  it('envía el tipo de dispositivo a registrar_visita con la clave publicable', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    expect(await registrarVisita({ ...base, fetch, almacen: memoria() })).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, opciones] = fetch.mock.calls[0]!;
    expect(url).toBe('https://proyecto.supabase.co/rest/v1/rpc/registrar_visita');
    expect(opciones.headers).toMatchObject({ apikey: 'sb_publishable_prueba' });
    expect(JSON.parse(opciones.body)).toEqual({ p_dispositivo: 'tableta' });
  });

  it('cuenta una sola visita por sesión del navegador', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const almacen = memoria();
    await registrarVisita({ ...base, fetch, almacen });
    reiniciarVisitaParaPruebas(); // otra carga de la página en la misma pestaña
    expect(await registrarVisita({ ...base, fetch, almacen })).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('sin almacenamiento, cuenta una vez por carga de la página', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(await registrarVisita({ ...base, fetch, almacen: roto })).toBe(true);
    expect(await registrarVisita({ ...base, fetch, almacen: roto })).toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('no cuenta robots ni navegadores automatizados', async () => {
    const fetch = vi.fn();
    expect(
      await registrarVisita({ ...base, fetch, almacen: memoria(), esAutomatizado: () => true }),
    ).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sin Supabase configurado no envía nada', async () => {
    const fetch = vi.fn();
    expect(await registrarVisita({ ...base, url: undefined, fetch, almacen: memoria() })).toBe(
      false,
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it('si la red falla no lanza ningún error', async () => {
    const fetch = vi.fn().mockRejectedValue(new TypeError('sin conexión'));
    await expect(registrarVisita({ ...base, fetch, almacen: memoria() })).resolves.toBe(false);
  });
});
