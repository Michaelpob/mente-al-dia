import { isAuthError, type SupabaseClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { guardarAlcance } from '../instituciones/alcance';
import { direccionDefinirContrasena } from './enlaces';
import {
  perfilDeFila,
  resolverEstado,
  type CierreSesion,
  type EstadoSesion,
  type FilaMiPerfil,
} from './estado-sesion';
import { SesionContext, type SesionContextValue } from './sesion-context';

async function leerEstado(cliente: SupabaseClient): Promise<EstadoSesion> {
  const { data: sesion } = await cliente.auth.getSession();
  if (!sesion.session) return { tipo: 'sin_sesion' };

  const perfil = await cliente.rpc('mi_perfil').maybeSingle<FilaMiPerfil>();
  if (perfil.error) throw perfil.error;

  return resolverEstado({ haySesion: true, perfil: perfilDeFila(perfil.data) });
}

function exigirCliente(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

/** Acciones de la sesión. Son funciones fijas: no cambian entre renders. */
const acciones: Omit<SesionContextValue, 'estado' | 'cerrarSesion'> = {
  async ingresar(correo, contrasena) {
    const { error } = await exigirCliente().auth.signInWithPassword({
      email: correo,
      password: contrasena,
    });
    if (error) throw error;
  },

  async enviarRecuperacion(correo) {
    const { error } = await exigirCliente().auth.resetPasswordForEmail(correo, {
      redirectTo: direccionDefinirContrasena(window.location.origin, import.meta.env.BASE_URL),
    });
    if (error) throw error;
  },

  async definirContrasena(contrasena) {
    const { error } = await exigirCliente().auth.updateUser({ password: contrasena });
    if (error) throw error;
  },
};

/** Sesión del panel: correo y contraseña (D-89) y perfil con rol. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(
    supabase ? { tipo: 'cargando' } : { tipo: 'sin_configurar' },
  );
  const queryClient = useQueryClient();
  const ultimoPerfil = useRef<string | null>(null);

  // Los datos del panel en memoria son de quien tenía la sesión: al cerrarla o al entrar otra
  // cuenta se borran antes de mostrar nada, para que nadie vea lo de otra institución (D-86).
  // RequierePanel, además, vuelve a montar el panel cuando cambia la cuenta.
  const cambiarDeCuenta = useCallback(
    (nuevo: EstadoSesion) => {
      const id = nuevo.tipo === 'lista' ? nuevo.perfil.id : null;
      if (ultimoPerfil.current !== null && id !== ultimoPerfil.current) {
        queryClient.removeQueries({ queryKey: ['panel'] });
        // La institución que había elegido el general tampoco pasa a la siguiente cuenta.
        try {
          guardarAlcance(window.sessionStorage, null);
        } catch {
          // Sin almacenamiento no hay nada guardado que borrar.
        }
      }
      ultimoPerfil.current = id;
    },
    [queryClient],
  );

  const actualizar = useCallback(async () => {
    const cliente = exigirCliente();
    try {
      const nuevo = await leerEstado(cliente);
      cambiarDeCuenta(nuevo);
      // Una sesión ya cerrada conserva cómo se cerró, porque de eso depende adónde se va (D-74).
      setEstado((previo) =>
        nuevo.tipo === 'sin_sesion' && previo.tipo === 'sin_sesion' ? previo : nuevo,
      );
    } catch (error) {
      // Un token vencido o revocado cierra la sesión guardada; un fallo de red solo vuelve al ingreso.
      if (isAuthError(error) || /^PGRST30/.test((error as { code?: string }).code ?? '')) {
        await cliente.auth.signOut({ scope: 'local' });
      }
      cambiarDeCuenta({ tipo: 'sin_sesion' });
      setEstado({ tipo: 'sin_sesion' });
    }
  }, [cambiarDeCuenta]);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      // Supabase pide no esperar otras llamadas dentro de este aviso: se leen en la siguiente vuelta.
      if (evento !== 'TOKEN_REFRESHED') setTimeout(() => void actualizar(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [actualizar]);

  // Supabase borra la sesión de este navegador aunque falle la llamada de cierre, así que el
  // cierre se marca siempre. RequierePanel e IngresoPanelPage deciden con él adónde ir.
  const cerrarSesion = useCallback(
    async (cierre: CierreSesion = 'manual') => {
      try {
        await exigirCliente().auth.signOut();
      } finally {
        cambiarDeCuenta({ tipo: 'sin_sesion' });
        setEstado({ tipo: 'sin_sesion', cierre });
      }
    },
    [cambiarDeCuenta],
  );

  const value = useMemo<SesionContextValue>(
    () => ({ estado, ...acciones, cerrarSesion }),
    [estado, cerrarSesion],
  );

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}
