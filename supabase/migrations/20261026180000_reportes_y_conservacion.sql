-- Mente al Día · Ajustes de la Fase 4: tiempo de conservación y reportes (ver D-47 a D-49).
--
--   - «retencion_meses» solo admite null (sin definir) o un número entero de meses, mínimo 1:
--     con 0 o un valor negativo, purgar_datos_vencidos() borraría todos los datos personales.
--   - Los reportes cuentan los días y las semanas en hora de Colombia (America/Bogota), no en UTC:
--     una respuesta de las 8 p. m. ya no cae en el día siguiente.
--   - El reporte agregado no muestra grupos de menos de «reporte_minimo_grupo» personas (mínimo y
--     valor inicial: 5). Se suman, sin detalle, en una fila por semana. El periodo se amplía a
--     semanas completas para que no se pueda restar un reporte de otro y aislar a una persona.

-- ---------------------------------------------------------------------------------------------
-- Hora de Colombia
-- ---------------------------------------------------------------------------------------------
create function privado.zona_horaria() returns text
language sql immutable set search_path = '' as $$
  select 'America/Bogota'::text
$$;

-- Instante en que empieza un día en hora de Colombia.
create function privado.inicio_dia(p_dia date) returns timestamptz
language sql stable set search_path = '' as $$
  select p_dia::timestamp at time zone privado.zona_horaria()
$$;

-- ---------------------------------------------------------------------------------------------
-- Parámetros
-- ---------------------------------------------------------------------------------------------

-- CASE y no AND: así nunca se convierte a número un valor que no lo es.
alter table public.configuracion add constraint configuracion_retencion_meses_valida check (
  clave <> 'retencion_meses'
  or case jsonb_typeof(valor)
       when 'null' then true
       when 'number' then (valor #>> '{}')::numeric >= 1 and (valor #>> '{}')::numeric % 1 = 0
       else false
     end
);

alter table public.configuracion add constraint configuracion_reporte_minimo_grupo_valido check (
  clave <> 'reporte_minimo_grupo'
  or case jsonb_typeof(valor)
       when 'number' then (valor #>> '{}')::numeric >= 5 and (valor #>> '{}')::numeric % 1 = 0
       else false
     end
);

insert into public.configuracion (clave, valor, publica, descripcion, actualizado_por)
values (
  'reporte_minimo_grupo', '5'::jsonb, false,
  'Personas mínimas de un grupo para mostrarlo en el reporte agregado (mínimo 5). Pendiente F4-08.',
  null
);

-- Tamaño mínimo de grupo vigente. Nunca menos de 5, aunque falte el parámetro.
create function privado.minimo_grupo() returns integer
language sql stable security definer set search_path = '' as $$
  select greatest(5, coalesce((
    select (c.valor #>> '{}')::numeric::integer
    from public.configuracion c
    where c.clave = 'reporte_minimo_grupo'
  ), 5))
$$;

revoke all on function privado.zona_horaria() from public, anon, authenticated;
revoke all on function privado.inicio_dia(date) from public, anon, authenticated;
revoke all on function privado.minimo_grupo() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Tiempo de conservación: además de la restricción, la función no borra con menos de 1 mes.
-- ---------------------------------------------------------------------------------------------
create or replace function public.purgar_datos_vencidos() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_meses integer;
  v_borrados integer;
begin
  select (c.valor #>> '{}')::numeric::integer into v_meses
  from public.configuracion c where c.clave = 'retencion_meses';
  if v_meses is null or v_meses < 1 then
    return 0;
  end if;

  delete from public.participantes p
  where p.creado_en < now() - make_interval(months => v_meses);
  get diagnostics v_borrados = row_count;

  if v_borrados > 0 then
    perform privado.auditar('purgar_datos_vencidos', 'participantes', null,
      jsonb_build_object('retencionMeses', v_meses, 'borrados', v_borrados));
  end if;
  return v_borrados;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Reporte agregado: hora de Colombia, semanas completas y grupos pequeños sin detalle.
-- Cambia lo que devuelve (columna grupos_pequenos), por eso se borra y se crea de nuevo.
-- ---------------------------------------------------------------------------------------------
drop function public.reporte_agregado(date, date);

create function public.reporte_agregado(p_desde date, p_hasta date)
returns table (
  semana date,
  modulo public.modulo,
  lugar_residencia text,
  resultado_general public.resultado_general,
  prioridad boolean,
  -- true: suma de los grupos con menos personas que el mínimo, sin módulo, lugar ni resultado.
  -- Su total es null si esa suma también queda por debajo del mínimo.
  grupos_pequenos boolean,
  total bigint
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_minimo integer := privado.minimo_grupo();
  v_desde date;
  v_hasta date;
begin
  if privado.rol_actual() is null then
    raise exception 'No tienes permiso para ver reportes.' using errcode = 'insufficient_privilege';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  -- De lunes a domingo.
  v_desde := p_desde - (extract(isodow from p_desde)::integer - 1);
  v_hasta := p_hasta + (7 - extract(isodow from p_hasta)::integer);

  perform privado.auditar('reporte_agregado', 'aplicaciones', null,
    jsonb_build_object('desde', v_desde, 'hasta', v_hasta, 'minimoGrupo', v_minimo));

  return query
    with grupos as (
      select date_trunc('week', a.creado_en at time zone privado.zona_horaria())::date as g_semana,
             a.modulo as g_modulo,
             a.lugar_residencia as g_lugar,
             a.resultado_general as g_resultado,
             a.prioridad as g_prioridad,
             count(*) as g_total
      from public.aplicaciones a
      where a.creado_en >= privado.inicio_dia(v_desde)
        and a.creado_en < privado.inicio_dia(v_hasta + 1)
      group by 1, 2, 3, 4, 5
    )
    select g.g_semana, g.g_modulo, g.g_lugar, g.g_resultado, g.g_prioridad, false, g.g_total
    from grupos g
    where g.g_total >= v_minimo
    union all
    select g.g_semana, null, null, null, null, true,
           case when sum(g.g_total) >= v_minimo then sum(g.g_total)::bigint end
    from grupos g
    where g.g_total < v_minimo
    group by g.g_semana
    order by 1, 6, 2, 3, 4, 5;
end
$$;

revoke all on function public.reporte_agregado(date, date) from public, anon;
grant execute on function public.reporte_agregado(date, date) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Reporte nominal: mismo contenido, con los días en hora de Colombia.
-- ---------------------------------------------------------------------------------------------
create or replace function public.reporte_nominal(p_desde date, p_hasta date, p_motivo text)
returns table (
  codigo text,
  creado_en timestamptz,
  modulo public.modulo,
  nombre text,
  correo text,
  telefono text,
  lugar_residencia text,
  resultado_general public.resultado_general,
  prioridad boolean,
  estado_seguimiento public.estado_seguimiento
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_total bigint;
begin
  if not privado.es_superadministrador() then
    raise exception 'Solo el superadministrador genera el reporte nominal.' using errcode = 'insufficient_privilege';
  end if;
  if char_length(btrim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Indica el motivo del reporte (al menos 10 caracteres).' using errcode = 'invalid_parameter_value';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  select count(*) into v_total
  from public.aplicaciones a
  where a.creado_en >= privado.inicio_dia(p_desde) and a.creado_en < privado.inicio_dia(p_hasta + 1);

  perform privado.auditar('reporte_nominal', 'aplicaciones', null,
    jsonb_build_object('desde', p_desde, 'hasta', p_hasta, 'motivo', btrim(p_motivo), 'registros', v_total));

  return query
    select a.codigo, a.creado_en, a.modulo, pa.nombre, pa.correo, pa.telefono, pa.lugar_residencia,
           a.resultado_general, a.prioridad, a.estado_seguimiento
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    where a.creado_en >= privado.inicio_dia(p_desde) and a.creado_en < privado.inicio_dia(p_hasta + 1)
    order by a.creado_en;
end
$$;
