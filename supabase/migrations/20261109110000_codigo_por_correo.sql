-- D-89: el segundo paso para entrar al panel es un código que llega al correo de la cuenta, en vez
-- de una aplicación de autenticación (TOTP). Después de la contraseña, la Edge Function
-- «codigo-panel» pide el código a Supabase Auth, que lo envía con el correo propio (D-79), y al
-- comprobarlo marca la sesión como verificada aquí. Las políticas y las funciones del panel exigen
-- esa marca en lugar del nivel aal2, que ya no cuenta: así nadie entra con solo la contraseña,
-- aunque inscriba una aplicación de autenticación por su cuenta.

-- =============================================================================================
-- Sesiones verificadas y códigos equivocados
-- =============================================================================================
create table privado.sesiones_verificadas (
  session_id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  verificada_en timestamptz not null default now(),
  expira_en timestamptz not null
);
create index sesiones_verificadas_usuario on privado.sesiones_verificadas (user_id);

-- Con cinco códigos equivocados en un cuarto de hora, hay que esperar o pedir otro código.
create table privado.fallos_codigo (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  fallido_en timestamptz not null default now()
);
create index fallos_codigo_usuario on privado.fallos_codigo (user_id, fallido_en);

alter table privado.sesiones_verificadas enable row level security;
alter table privado.fallos_codigo enable row level security;
revoke all on privado.sesiones_verificadas, privado.fallos_codigo from public, anon, authenticated;

-- ¿La sesión de quien consulta pasó el código del correo y sigue vigente esa verificación?
-- La sesión es la del token (session_id), de la misma cuenta (sub).
create function privado.sesion_verificada() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from privado.sesiones_verificadas s
    where s.user_id = auth.uid()
      and s.session_id::text = auth.jwt() ->> 'session_id'
      and s.expira_en > now()
  )
$$;
revoke all on function privado.sesion_verificada() from public, anon, authenticated;

-- =============================================================================================
-- El panel exige la sesión verificada (antes, aal2)
-- =============================================================================================
create or replace function privado.rol_actual() returns public.rol_panel
language sql stable security definer set search_path = '' as $$
  select p.rol
  from public.perfiles p
  left join public.instituciones i on i.id = p.institucion_id
  where p.id = auth.uid()
    and p.activo
    and privado.sesion_verificada()
    and (p.rol = 'superadministrador' or (p.rol = 'administrador_institucional' and i.activa))
$$;

-- doble_factor ahora dice si la sesión ya pasó el código del correo.
create or replace function public.mi_perfil()
returns table (
  id uuid,
  nombre text,
  rol public.rol_panel,
  activo boolean,
  doble_factor boolean,
  institucion_id uuid,
  institucion_nombre text,
  institucion_slug text,
  institucion_activa boolean
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombre, p.rol, p.activo, privado.sesion_verificada(),
         i.id, i.nombre, i.slug, i.activa
  from public.perfiles p
  left join public.instituciones i on i.id = p.institucion_id
  where p.id = auth.uid()
$$;

-- =============================================================================================
-- Funciones de la Edge Function «codigo-panel» (solo con la clave del servidor)
-- =============================================================================================

-- Marca la sesión como verificada por 12 horas y deja el ingreso en la auditoría.
create function public.registrar_verificacion_correo(p_usuario uuid, p_sesion uuid)
returns timestamptz
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_expira timestamptz := now() + interval '12 hours';
  v_institucion uuid;
begin
  if p_usuario is null or p_sesion is null then
    raise exception 'Faltan la cuenta o la sesión.' using errcode = 'invalid_parameter_value';
  end if;
  select p.institucion_id into v_institucion from public.perfiles p where p.id = p_usuario;

  delete from privado.sesiones_verificadas where user_id = p_usuario and expira_en <= now();
  insert into privado.sesiones_verificadas (session_id, user_id, expira_en)
  values (p_sesion, p_usuario, v_expira)
  on conflict (session_id) do update
    set verificada_en = now(), expira_en = excluded.expira_en
    where privado.sesiones_verificadas.user_id = excluded.user_id;
  delete from privado.fallos_codigo where user_id = p_usuario;

  perform set_config('mad.actor_id', p_usuario::text, true);
  perform privado.auditar('ingresar_panel', 'perfiles', p_usuario::text, '{}'::jsonb, v_institucion);
  return v_expira;
end
$$;

-- Cuántos códigos más puede probar la cuenta en este cuarto de hora.
create function public.intentos_codigo_restantes(p_usuario uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(0, 5 - count(*))::integer
  from privado.fallos_codigo f
  where f.user_id = p_usuario and f.fallido_en > now() - interval '15 minutes'
$$;

create function public.registrar_fallo_codigo(p_usuario uuid) returns integer
language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into privado.fallos_codigo (user_id) values (p_usuario);
  return public.intentos_codigo_restantes(p_usuario);
end
$$;

-- ¿Esta sesión de esta cuenta está verificada? Lo usa «invitar-usuario», que solo tiene el token.
create function public.sesion_verificada_de(p_usuario uuid, p_sesion uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from privado.sesiones_verificadas s
    where s.user_id = p_usuario and s.session_id = p_sesion and s.expira_en > now()
  )
$$;

-- =============================================================================================
-- Usuarios del panel: en vez de la aplicación de autenticación, la última verificación por correo
-- =============================================================================================
create or replace function public.panel_administradores()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.exigir_superadministrador();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id,
             'nombre', p.nombre,
             'correo', u.email,
             'rol', p.rol,
             'activo', p.activo,
             'institucion', case when i.id is null then null
                                 else jsonb_build_object('id', i.id, 'nombre', i.nombre, 'activa', i.activa) end,
             'creadoEn', p.creado_en,
             'ultimoIngreso', (
               select max(s.verificada_en) from privado.sesiones_verificadas s where s.user_id = p.id
             )
           ) order by (p.rol = 'superadministrador') desc, i.creado_en nulls first, p.nombre)
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.instituciones i on i.id = p.institucion_id
    where p.rol in ('superadministrador', 'administrador_institucional')
  ), '[]'::jsonb);
end
$$;

-- =============================================================================================
-- Permisos
-- =============================================================================================
revoke all on function public.registrar_verificacion_correo(uuid, uuid) from public, anon, authenticated;
revoke all on function public.intentos_codigo_restantes(uuid) from public, anon, authenticated;
revoke all on function public.registrar_fallo_codigo(uuid) from public, anon, authenticated;
revoke all on function public.sesion_verificada_de(uuid, uuid) from public, anon, authenticated;
grant execute on function public.registrar_verificacion_correo(uuid, uuid) to service_role;
grant execute on function public.intentos_codigo_restantes(uuid) to service_role;
grant execute on function public.registrar_fallo_codigo(uuid) to service_role;
grant execute on function public.sesion_verificada_de(uuid, uuid) to service_role;
