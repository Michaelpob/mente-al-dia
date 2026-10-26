import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase del navegador (Fase 4). Usa la clave publicable: lo que cada sesión puede
 * leer o cambiar lo deciden las políticas RLS de la base de datos, no este código.
 * Es null mientras el proyecto no esté configurado (.env.local), y el panel lo indica.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase: SupabaseClient | null =
  url && clave
    ? createClient(url, clave, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
