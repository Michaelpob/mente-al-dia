import { isAuthError, type SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase/cliente';
import { direccionDefinirContrasena } from './enlaces';
import { qrComoImagen } from './qr';
import { resolverEstado, type EstadoSesion, type PerfilPanel } from './estado-sesion';
import { SesionContext, type SesionContextValue } from './sesion-context';

async function leerEstado(cliente: SupabaseClient): Promise<EstadoSesion> {
  const { data: sesion } = await cliente.auth.getSession();
  if (!sesion.session) return { tipo: 'sin_sesion' };

  const [nivel, factores, perfil] = await Promise.all([
    cliente.auth.mfa.getAuthenticatorAssuranceLevel(),
    cliente.auth.mfa.listFactors(),
    cliente.rpc('mi_perfil').maybeSingle<PerfilPanel>(),
  ]);
  if (nivel.error) throw nivel.error;
  if (factores.error) throw factores.error;
  if (perfil.error) throw perfil.error;

  return resolverEstado({
    haySesion: true,
    nivel: nivel.data.currentLevel,
    factoresVerificados: factores.data.totp.map((f) => f.id),
    perfil: perfil.data,
  });
}

function exigirCliente(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado.');
  return supabase;
}

/** Acciones de la sesión. Son funciones fijas: no cambian entre renders (el QR no se regenera). */
const acciones: Omit<SesionContextValue, 'estado'> = {
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

  async iniciarInscripcion() {
    const cliente = exigirCliente();
    // Un intento anterior sin terminar deja un factor sin verificar: se descarta.
    const { data: factores, error: errorFactores } = await cliente.auth.mfa.listFactors();
    if (errorFactores) throw errorFactores;
    for (const factor of factores.all.filter((f) => f.status === 'unverified')) {
      const { error } = await cliente.auth.mfa.unenroll({ factorId: factor.id });
      if (error) throw error;
    }
    const { data, error } = await cliente.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Mente al Día',
      issuer: 'Mente al Día',
    });
    if (error) throw error;
    return { factorId: data.id, qr: qrComoImagen(data.totp.qr_code), secreto: data.totp.secret };
  },

  async verificarCodigo(factorId, codigo) {
    const { error } = await exigirCliente().auth.mfa.challengeAndVerify({ factorId, code: codigo });
    if (error) throw error;
  },

  async cerrarSesion() {
    await exigirCliente().auth.signOut();
  },
};

/** Sesión del panel: contraseña + doble factor (TOTP) y perfil con rol. */
export function SesionProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>(
    supabase ? { tipo: 'cargando' } : { tipo: 'sin_configurar' },
  );

  const actualizar = useCallback(async () => {
    const cliente = exigirCliente();
    try {
      setEstado(await leerEstado(cliente));
    } catch (error) {
      // Un token vencido o revocado cierra la sesión guardada; un fallo de red solo vuelve al ingreso.
      if (isAuthError(error) || /^PGRST30/.test((error as { code?: string }).code ?? '')) {
        await cliente.auth.signOut({ scope: 'local' });
      }
      setEstado({ tipo: 'sin_sesion' });
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((evento) => {
      // Supabase pide no esperar otras llamadas dentro de este aviso: se leen en la siguiente vuelta.
      if (evento !== 'TOKEN_REFRESHED') setTimeout(() => void actualizar(), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [actualizar]);

  const value = useMemo<SesionContextValue>(() => ({ estado, ...acciones }), [estado]);

  return <SesionContext.Provider value={value}>{children}</SesionContext.Provider>;
}
