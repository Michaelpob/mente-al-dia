-- D-88: el enlace general deja elegir la institución de una lista. El sitio público necesita los
-- nombres y los enlaces (slug) de las instituciones activas; nada más: ni ids, ni las inactivas,
-- ni sus datos. Elegir de la lista equivale a entrar con el enlace de la institución: al guardar,
-- registrar_aplicacion vuelve a resolver el enlace y exige que la institución siga activa.
create function public.instituciones_publicas()
returns table (nombre text, slug text)
language sql stable security definer set search_path = '' as $$
  select i.nombre, i.slug
  from public.instituciones i
  where i.activa
  order by i.nombre, i.slug
$$;

comment on function public.instituciones_publicas() is
  'Nombre y enlace (slug) de las instituciones activas, para elegir con cuál responder (D-88).';

revoke all on function public.instituciones_publicas() from public;
grant execute on function public.instituciones_publicas() to anon, authenticated;
