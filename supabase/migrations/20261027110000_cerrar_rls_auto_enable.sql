-- Mente al Día · Proyecto en la nube: nadie del navegador ejecuta rls_auto_enable() (ver D-67).
--
-- Supabase crea public.rls_auto_enable() cuando el proyecto se crea con «activar RLS
-- automáticamente»: es la función del disparador de eventos que activa RLS en las tablas nuevas.
-- Queda ejecutable por anon y authenticated en /rest/v1/rpc, y el disparador no lo necesita.
-- En una base sin esa función (pruebas, entorno local) no hace nada.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
