-- Visitas al sitio por tipo de dispositivo (D-80): cuántas personas entran al sitio público y si
-- lo hacen desde un teléfono móvil, una tableta o un computador. Es un conteo anónimo: cada fila
-- guarda solo el tipo de dispositivo y la hora. No guarda dirección IP, navegador, identificador ni
-- cookies, así que no es un dato personal y no se puede saber quién entró.
-- El sitio cuenta una visita por sesión del navegador (al abrirlo en una pestaña nueva).

create type public.tipo_dispositivo as enum ('movil', 'tableta', 'escritorio');

create table public.visitas (
  id bigint generated always as identity primary key,
  dispositivo public.tipo_dispositivo not null,
  creado_en timestamptz not null default now()
);
create index visitas_creado_en on public.visitas (creado_en);
comment on table public.visitas is
  'Visitas al sitio público (D-80): solo el tipo de dispositivo y la hora, sin datos de la persona.';

-- Nadie del navegador lee ni escribe la tabla: se registra con registrar_visita y se consulta con
-- panel_visitas (las dos security definer).
alter table public.visitas enable row level security;
revoke all on public.visitas from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Registrar una visita (sitio público, sin sesión)
-- ---------------------------------------------------------------------------------------------

-- El tipo de dispositivo es una de tres opciones (el enum rechaza cualquier otro valor).
create function public.registrar_visita(p_dispositivo public.tipo_dispositivo)
returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.visitas (dispositivo) values (p_dispositivo)
$$;

-- ---------------------------------------------------------------------------------------------
-- Panel: visitas del periodo por tipo de dispositivo
-- ---------------------------------------------------------------------------------------------

-- Los días se cuentan en hora de Colombia, igual que el tablero. «anterior» es el periodo de los
-- mismos días que termina justo antes de este.
create function public.panel_visitas(p_desde date, p_hasta date)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz;
  v_fin timestamptz;
  v_inicio_anterior timestamptz;
  v_visitas jsonb;
begin
  perform privado.exigir_equipo();
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 3660 then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;
  v_inicio := privado.inicio_dia(p_desde);
  v_fin := privado.inicio_dia(p_hasta + 1);
  v_inicio_anterior := privado.inicio_dia(p_desde - (p_hasta - p_desde + 1));

  select jsonb_build_object(
    'total', count(*) filter (where v.creado_en >= v_inicio),
    'anterior', count(*) filter (where v.creado_en < v_inicio),
    'porDispositivo', jsonb_build_object(
      'movil', count(*) filter (where v.creado_en >= v_inicio and v.dispositivo = 'movil'),
      'tableta', count(*) filter (where v.creado_en >= v_inicio and v.dispositivo = 'tableta'),
      'escritorio', count(*) filter (where v.creado_en >= v_inicio and v.dispositivo = 'escritorio')
    )
  ) into v_visitas
  from public.visitas v
  where v.creado_en >= v_inicio_anterior and v.creado_en < v_fin;

  return v_visitas;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Permisos
-- ---------------------------------------------------------------------------------------------

revoke all on function public.registrar_visita(public.tipo_dispositivo) from public;
grant execute on function public.registrar_visita(public.tipo_dispositivo) to anon, authenticated;

revoke all on function public.panel_visitas(date, date) from public, anon;
grant execute on function public.panel_visitas(date, date) to authenticated;
