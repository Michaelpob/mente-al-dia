/**
 * Edge Function «invitar-usuario»: punto de entrada en Supabase.
 * La lógica está en manejador.ts (con pruebas); aquí solo se conectan Auth, la base de datos y el entorno.
 *
 * Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las pone Supabase), ORIGENES_PERMITIDOS y
 * SITIO_URL (dirección pública del sitio, para el enlace de la invitación).
 */
import { createClient } from '@supabase/supabase-js';
import { variable } from '../_compartido/entorno.ts';
import { leerOrigenes } from '../_compartido/http.ts';
import { crearManejador, type PerfilSesion } from './manejador.ts';

const servidor = createClient(variable('SUPABASE_URL'), variable('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const sitio = (Deno.env.get('SITIO_URL') ?? '').replace(/\/$/, '');

const manejar = crearManejador({
  origenes: leerOrigenes(Deno.env.get('ORIGENES_PERMITIDOS')),

  async perfilDeSesion(token) {
    // getClaims verifica la firma del token; el nivel de autenticación (aal) viene en los claims.
    const { data, error } = await servidor.auth.getClaims(token);
    if (error || !data) return null;
    const { data: perfil, error: errorPerfil } = await servidor
      .from('perfiles')
      .select('id, rol, activo')
      .eq('id', data.claims.sub)
      .maybeSingle<Omit<PerfilSesion, 'doble_factor'>>();
    if (errorPerfil) throw errorPerfil;
    return perfil ? { ...perfil, doble_factor: data.claims.aal === 'aal2' } : null;
  },

  async invitar(correo) {
    const { data, error } = await servidor.auth.admin.inviteUserByEmail(correo, {
      redirectTo: `${sitio}/panel/definir-contrasena`,
    });
    if (error?.code === 'email_exists') return null;
    if (error) throw error;
    return { id: data.user.id };
  },

  async crearPerfil(actor, id, { nombre, rol }) {
    const { error } = await servidor.rpc('crear_perfil_invitado', {
      p_actor: actor,
      p_id: id,
      p_nombre: nombre,
      p_rol: rol,
    });
    if (error) throw error;
  },

  async eliminarUsuario(id) {
    const { error } = await servidor.auth.admin.deleteUser(id);
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
