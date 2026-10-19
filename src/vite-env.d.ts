/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' muestra /guia-de-estilo fuera del modo desarrollo (build de pruebas). */
  readonly VITE_GUIA_ESTILO?: 'true' | 'false';
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
