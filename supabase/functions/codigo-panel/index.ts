/**
 * Edge Function «codigo-panel» (D-89): punto de entrada en Supabase.
 * La lógica está en manejador.ts (con pruebas); aquí solo se conectan Auth, la base de datos y el entorno.
 *
 * Variables: SUPABASE_URL, SUPABASE_ANON_KEY y SUPABASE_SERVICE_ROLE_KEY (las pone Supabase) y
 * ORIGENES_PERMITIDOS. El correo con el código sale por el SMTP de Supabase Auth (D-79), con la
 * plantilla supabase/templates/codigo.html.
 */
import { createClient } from '@supabase/supabase-js';
import { variable } from '../_compartido/entorno.ts';
import { leerOrigenes } from '../_compartido/http.ts';
import { crearManejador, LimiteAuth, type PerfilCodigo } from './manejador.ts';

const url = variable('SUPABASE_URL');
const opciones = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
} as const;
const servidor = createClient(url, variable('SUPABASE_SERVICE_ROLE_KEY'), opciones);
const clavePublica = variable('SUPABASE_ANON_KEY');
/** Un cliente nuevo para cada pedido a Auth: la sesión que abre verifyOtp no se mezcla con nada. */
const publico = () => createClient(url, clavePublica, opciones);

const esLimite = (error: { status?: number; code?: string } | null) =>
  error?.status === 429 || /rate_limit/.test(error?.code ?? '');

const manejar = crearManejador({
  origenes: leerOrigenes(Deno.env.get('ORIGENES_PERMITIDOS')),

  async sesionDeToken(token) {
    // getClaims verifica la firma del token; la sesión (session_id) y cómo se abrió (amr) vienen ahí.
    const { data, error } = await servidor.auth.getClaims(token);
    if (error || !data) return null;
    const claims = data.claims as {
      sub: string;
      session_id?: string;
      amr?: { method?: string }[];
    };
    // El correo, de la cuenta en Auth (no del token): es adonde debe llegar el código.
    const { data: usuario, error: errorUsuario } = await servidor.auth.admin.getUserById(
      claims.sub,
    );
    if (errorUsuario) throw errorUsuario;
    return {
      usuario: claims.sub,
      correo: usuario.user?.email ?? null,
      sesion: claims.session_id ?? null,
      metodos: (claims.amr ?? []).map((m) => m.method ?? ''),
    };
  },

  async perfil(usuario) {
    const { data, error } = await servidor
      .from('perfiles')
      .select('activo, rol, instituciones(activa)')
      .eq('id', usuario)
      .maybeSingle<{ activo: boolean; rol: string; instituciones: { activa: boolean } | null }>();
    if (error) throw error;
    if (!data) return null;
    const perfil: PerfilCodigo = {
      activo: data.activo,
      rol: data.rol,
      institucionActiva: data.instituciones ? data.instituciones.activa : null,
    };
    return perfil;
  },

  async enviarCodigo(correo) {
    const { error } = await publico().auth.signInWithOtp({
      email: correo,
      options: { shouldCreateUser: false },
    });
    if (esLimite(error)) throw new LimiteAuth();
    if (error) throw error;
  },

  async comprobarCodigo(correo, codigo) {
    const { data, error } = await publico().auth.verifyOtp({
      email: correo,
      token: codigo,
      type: 'email',
    });
    if (esLimite(error)) throw new LimiteAuth();
    if (error || !data.session) return false;
    // Esa sesión solo sirvió para comprobar el código: se cierra en el acto.
    const { error: errorCierre } = await servidor.auth.admin.signOut(
      data.session.access_token,
      'local',
    );
    if (errorCierre) console.error('codigo-panel: cierre', errorCierre.message);
    return true;
  },

  async intentosRestantes(usuario) {
    const { data, error } = await servidor.rpc('intentos_codigo_restantes', {
      p_usuario: usuario,
    });
    if (error) throw error;
    return data as number;
  },

  async registrarFallo(usuario) {
    const { data, error } = await servidor.rpc('registrar_fallo_codigo', { p_usuario: usuario });
    if (error) throw error;
    return data as number;
  },

  async marcarVerificada(usuario, sesion) {
    const { error } = await servidor.rpc('registrar_verificacion_correo', {
      p_usuario: usuario,
      p_sesion: sesion,
    });
    if (error) throw error;
  },

  registrarError(contexto, error) {
    console.error(
      contexto,
      error instanceof Error ? error.message : (error as { message?: string })?.message,
    );
  },
});

Deno.serve(manejar);
