/**
 * Edge Function «enviar-cuestionario»: punto de entrada en Supabase.
 * La lógica está en manejador.ts (con pruebas); aquí solo se conectan la base de datos y el entorno.
 *
 * Variables: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (las pone Supabase) y ORIGENES_PERMITIDOS.
 */
import { createClient } from '@supabase/supabase-js';
import { variable } from '../_compartido/entorno.ts';
import { leerOrigenes } from '../_compartido/http.ts';
import { crearManejador } from './manejador.ts';

const servidor = createClient(variable('SUPABASE_URL'), variable('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const manejar = crearManejador({
  origenes: leerOrigenes(Deno.env.get('ORIGENES_PERMITIDOS')),

  async reglasVigentes() {
    const { data, error } = await servidor
      .from('reglas_resultados')
      .select('reglas')
      .eq('vigente', true)
      .single();
    if (error) throw error;
    return data.reglas;
  },

  async versionTextosLegales() {
    const { data, error } = await servidor
      .from('configuracion')
      .select('valor')
      .eq('clave', 'version_textos_legales')
      .single();
    if (error) throw error;
    if (typeof data.valor !== 'string')
      throw new Error('version_textos_legales debe ser un texto.');
    return data.valor;
  },

  async registrar({ participante, consentimientos, respuestas, resultado }) {
    const { data, error } = await servidor
      .rpc('registrar_aplicacion', {
        p_participante: participante,
        p_consentimientos: consentimientos,
        p_respuestas: respuestas,
        p_resultado: resultado,
      })
      .single<{ id: string; codigo: string }>();
    if (error) throw error;
    return { codigo: data.codigo };
  },

  registrarError(contexto, error) {
    // Solo el mensaje: nunca se registran los datos de quien responde.
    console.error(
      contexto,
      error instanceof Error ? error.message : (error as { message?: string })?.message,
    );
  },
});

Deno.serve(manejar);
