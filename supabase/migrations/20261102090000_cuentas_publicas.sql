-- Cuentas públicas (D-77): cualquier persona mayor de edad crea su cuenta con correo y contraseña
-- (Supabase Auth), ve su nombre al ingresar y guarda su progreso para continuar desde cualquier
-- dispositivo. Las contraseñas solo viven en Supabase Auth, nunca en estas tablas.
-- No toca al equipo del panel: los roles siguen en public.perfiles y solo se asignan por invitación,
-- así que crear una cuenta no da ningún permiso administrativo.

-- ---------------------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------------------

-- Perfil de cada cuenta pública. Se crea junto con la cuenta (disparador) y solo lo ve su dueño.
-- El usuario va siempre en minúsculas, así que el índice único no distingue mayúsculas.
create table public.cuentas (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 3 and 120),
  usuario text not null check (usuario ~ '^[a-z][a-z0-9._]{2,29}$'),
  correo text not null check (char_length(correo) between 3 and 254),
  autorizacion_version text not null,
  autorizado_en timestamptz not null default now(),
  creado_en timestamptz not null default now()
);
create unique index cuentas_usuario_unico on public.cuentas (usuario);
comment on table public.cuentas is
  'Cuentas públicas (D-77): nombre, usuario único y correo. La contraseña vive solo en Supabase Auth.';

-- Progreso de una cuenta en cada actividad: hoy el cuestionario en curso («cuestionario») y cada
-- cuestionario terminado («resultado:<código>»); la misma tabla sirve para actividades futuras.
-- «estado» guarda lo necesario para continuar; el panel solo ve el avance, nunca ese contenido.
create table public.progreso (
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  actividad text not null check (actividad ~ '^[A-Za-z0-9_:-]{1,60}$'),
  avance smallint not null default 0 check (avance between 0 and 100),
  completado boolean not null default false,
  estado jsonb not null default '{}'::jsonb check (octet_length(estado::text) <= 65536),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (cuenta_id, actividad)
);
create index progreso_actualizado_en on public.progreso (actualizado_en desc);
comment on table public.progreso is
  'Progreso de cada cuenta pública por actividad (D-77). Solo su dueño lo lee o lo cambia.';

create trigger progreso_actualizado_en before update on public.progreso
  for each row execute function privado.tocar_actualizado_en();

-- ---------------------------------------------------------------------------------------------
-- Alta de la cuenta: el perfil se crea con la cuenta de Supabase Auth
-- ---------------------------------------------------------------------------------------------

-- Solo las cuentas creadas desde «Crear cuenta» traen tipo = 'cuenta'; las invitaciones del equipo
-- no lo traen y siguen igual. Los datos vienen del formulario, pero aquí se vuelven a exigir: mayoría
-- de edad, autorización de datos, nombre y usuario válidos (si no, la cuenta no se crea).
create function privado.crear_cuenta_publica()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_version text;
begin
  if v_datos ->> 'tipo' is distinct from 'cuenta' then
    return new;
  end if;
  if v_datos -> 'mayor_de_edad' is distinct from 'true'::jsonb
     or v_datos -> 'autoriza_datos' is distinct from 'true'::jsonb then
    raise exception 'Para crear una cuenta hay que ser mayor de edad y autorizar el tratamiento de datos.'
      using errcode = 'check_violation';
  end if;
  select c.valor #>> '{}' into v_version
  from public.configuracion c
  where c.clave = 'version_textos_legales';

  insert into public.cuentas (id, nombre, usuario, correo, autorizacion_version)
  values (new.id, btrim(v_datos ->> 'nombre'), lower(btrim(v_datos ->> 'usuario')), new.email,
          coalesce(v_version, 'sin_version'));
  return new;
end
$$;

create trigger crear_cuenta_publica after insert on auth.users
  for each row execute function privado.crear_cuenta_publica();

-- Antes de crear la cuenta, el formulario pregunta si el usuario está libre (y bien escrito).
create function public.usuario_disponible(p_usuario text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(btrim(coalesce(p_usuario, ''))) ~ '^[a-z][a-z0-9._]{2,29}$'
     and not exists (
       select 1 from public.cuentas c where c.usuario = lower(btrim(p_usuario))
     )
$$;

-- ---------------------------------------------------------------------------------------------
-- Permisos y políticas: cada cuenta solo ve y cambia lo suyo
-- ---------------------------------------------------------------------------------------------

alter table public.cuentas enable row level security;
alter table public.progreso enable row level security;

revoke all on public.cuentas, public.progreso from public, anon, authenticated;

grant select on public.cuentas to authenticated;
grant update (nombre) on public.cuentas to authenticated;
create policy cuentas_leer_propia on public.cuentas for select to authenticated
  using (id = (select auth.uid()));
create policy cuentas_editar_propia on public.cuentas for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select, delete on public.progreso to authenticated;
grant insert (cuenta_id, actividad, avance, completado, estado) on public.progreso to authenticated;
grant update (avance, completado, estado) on public.progreso to authenticated;
create policy progreso_leer_propio on public.progreso for select to authenticated
  using (cuenta_id = (select auth.uid()));
create policy progreso_crear_propio on public.progreso for insert to authenticated
  with check (cuenta_id = (select auth.uid()));
create policy progreso_editar_propio on public.progreso for update to authenticated
  using (cuenta_id = (select auth.uid()))
  with check (cuenta_id = (select auth.uid()));
create policy progreso_borrar_propio on public.progreso for delete to authenticated
  using (cuenta_id = (select auth.uid()));

-- ---------------------------------------------------------------------------------------------
-- Panel: cuentas registradas, actividad y progreso (solo el equipo con doble factor, D-68)
-- ---------------------------------------------------------------------------------------------

-- Resumen. Una cuenta está activa si ingresó o avanzó en el periodo. Semanas de lunes a domingo
-- en hora de Colombia, las últimas 12, con ceros donde no hubo registros.
create function public.panel_cuentas_resumen()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_zona text := privado.zona_horaria();
  v_lunes date := date_trunc('week', (now() at time zone privado.zona_horaria()))::date;
  v_resultado jsonb;
begin
  perform privado.exigir_equipo();
  with actividad as (
    select c.id,
           c.creado_en,
           greatest(u.last_sign_in_at,
                    (select max(p.actualizado_en) from public.progreso p where p.cuenta_id = c.id))
             as ultima
    from public.cuentas c
    join auth.users u on u.id = c.id
  )
  select jsonb_build_object(
           'total', count(*),
           'nuevas30', count(*) filter (where a.creado_en >= now() - interval '30 days'),
           'activas7', count(*) filter (where a.ultima >= now() - interval '7 days'),
           'activas30', count(*) filter (where a.ultima >= now() - interval '30 days'),
           'enCurso', (select count(*) from public.progreso p
                       where p.actividad = 'cuestionario' and not p.completado),
           'completados', (select count(*) from public.progreso p where p.actividad like 'resultado:%'),
           'conProgreso', (select count(distinct p.cuenta_id) from public.progreso p),
           'porSemana', (
             select coalesce(jsonb_agg(jsonb_build_object('semana', s.semana, 'cuentas', s.n)
                                       order by s.semana), '[]'::jsonb)
             from (
               select g.semana::date as semana,
                      (select count(*) from public.cuentas c
                       where date_trunc('week', c.creado_en at time zone v_zona)::date = g.semana::date) as n
               from generate_series(v_lunes - 77, v_lunes, interval '7 days') as g(semana)
             ) s
           )
         )
  into v_resultado
  from actividad a;
  return v_resultado;
end
$$;

-- Lista de cuentas, de la más reciente a la más antigua, con su actividad y su progreso (sin el
-- contenido guardado). El correo va enmascarado, como en los registros (D-68).
create function public.panel_cuentas(
  p_busqueda text default null,
  p_pagina integer default 1,
  p_tamano integer default 25
)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tamano integer := least(greatest(coalesce(p_tamano, 25), 10), 100);
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_patron text := case when nullif(btrim(p_busqueda), '') is null then null
                        else privado.patron_busqueda(p_busqueda) end;
  v_total integer;
  v_filas jsonb;
begin
  perform privado.exigir_equipo();
  select count(*) into v_total
  from public.cuentas c
  where v_patron is null or lower(c.nombre) like v_patron or c.usuario like v_patron;

  select coalesce(jsonb_agg(f.fila order by f.creado_en desc, f.id), '[]'::jsonb) into v_filas
  from (
    select c.id,
           c.creado_en,
           jsonb_build_object(
             'id', c.id,
             'nombre', c.nombre,
             'usuario', c.usuario,
             'correo', privado.enmascarar_correo(c.correo),
             'creadoEn', c.creado_en,
             'ultimoIngreso', u.last_sign_in_at,
             'ultimaActividad', greatest(u.last_sign_in_at, pr.ultima),
             'actividades', coalesce(pr.actividades, '[]'::jsonb)
           ) as fila
    from public.cuentas c
    join auth.users u on u.id = c.id
    left join lateral (
      select max(p.actualizado_en) as ultima,
             jsonb_agg(jsonb_build_object(
               'actividad', p.actividad,
               'avance', p.avance,
               'completado', p.completado,
               'actualizadoEn', p.actualizado_en
             ) order by p.actualizado_en desc) as actividades
      from public.progreso p
      where p.cuenta_id = c.id
    ) pr on true
    where v_patron is null or lower(c.nombre) like v_patron or c.usuario like v_patron
    order by c.creado_en desc, c.id
    limit v_tamano offset (v_pagina - 1) * v_tamano
  ) f;

  return jsonb_build_object('total', v_total, 'pagina', v_pagina, 'tamano', v_tamano, 'filas', v_filas);
end
$$;

revoke all on function privado.crear_cuenta_publica() from public, anon, authenticated;
revoke all on function public.usuario_disponible(text) from public;
grant execute on function public.usuario_disponible(text) to anon, authenticated;
revoke all on function public.panel_cuentas_resumen() from public, anon;
revoke all on function public.panel_cuentas(text, integer, integer) from public, anon;
grant execute on function public.panel_cuentas_resumen() to authenticated;
grant execute on function public.panel_cuentas(text, integer, integer) to authenticated;
