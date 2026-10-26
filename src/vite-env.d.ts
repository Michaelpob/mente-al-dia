/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 'true' muestra /guia-de-estilo fuera del modo desarrollo (build de pruebas). */
  readonly VITE_GUIA_ESTILO?: 'true' | 'false';
  /** 'true' en la vista previa para Artifact: navegación en memoria y barra de páginas. */
  readonly VITE_VISTA_PREVIA?: 'true' | 'false';
  /** 'true' solo en la vista previa sin base de datos: resultados de ejemplo, sin guardar. */
  readonly VITE_EJEMPLOS?: 'true' | 'false';
  /** Proyecto de Supabase (Fase 4). Sin estas dos variables el panel muestra su página provisional. */
  readonly VITE_SUPABASE_URL?: string;
  /** Clave publicable (sb_publishable_…) o, en proyectos antiguos, la anon key. Nunca la service role. */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
