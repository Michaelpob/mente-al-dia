-- Guardar el progreso de la propia cuenta (D-77). Toma la cuenta de la sesión (auth.uid()): nadie
-- puede escribir a nombre de otra. Corre con los permisos de quien llama, así que también la
-- protegen las políticas de public.progreso; solo cambia avance, completado y estado.
create function public.guardar_progreso(
  p_actividad text,
  p_avance integer,
  p_completado boolean,
  p_estado jsonb
)
returns void
language sql volatile security invoker set search_path = '' as $$
  insert into public.progreso (cuenta_id, actividad, avance, completado, estado)
  values ((select auth.uid()), p_actividad, p_avance, p_completado, coalesce(p_estado, '{}'::jsonb))
  on conflict (cuenta_id, actividad) do update
    set avance = excluded.avance,
        completado = excluded.completado,
        estado = excluded.estado
$$;

revoke all on function public.guardar_progreso(text, integer, boolean, jsonb) from public, anon;
grant execute on function public.guardar_progreso(text, integer, boolean, jsonb) to authenticated;
