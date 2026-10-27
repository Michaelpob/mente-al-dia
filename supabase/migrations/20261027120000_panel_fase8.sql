-- Mente al Día · Fase 8: consultas del panel (tablero, registros, ficha y prioritarios). Ver D-68.
--
-- Todas exigen una sesión del equipo con doble factor (privado.es_equipo) y son security definer,
-- porque leen participantes, que no tiene permisos directos. La lista muestra el nombre y el
-- contacto enmascarado; el contacto completo sigue en ver_datos_contacto, que deja auditoría, igual
-- que imprimir una ficha (panel_registrar_impresion). Las fechas se cuentan en hora de Colombia.

-- ---------------------------------------------------------------------------------------------
-- Ayudas
-- ---------------------------------------------------------------------------------------------

create function privado.exigir_equipo() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not privado.es_equipo() then
    raise exception 'No tienes permiso para ver el panel.' using errcode = 'insufficient_privilege';
  end if;
end
$$;

-- Una persona: el mismo nombre con el mismo correo (el del adulto responsable en el módulo
-- infantil). Cada aplicación guarda su propia copia de los datos: el historial se arma con esta clave.
create function privado.clave_persona(p_nombre text, p_correo text, p_acudiente jsonb)
returns text
language sql immutable set search_path = '' as $$
  select lower(btrim(p_nombre)) || '|' || lower(btrim(coalesce(p_correo, p_acudiente ->> 'correo', '')))
$$;

-- «ma***@correo.com»
create function privado.enmascarar_correo(p_correo text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_correo is null or position('@' in p_correo) = 0 then null
    else left(split_part(p_correo, '@', 1), 2) || '***@' || split_part(p_correo, '@', 2)
  end
$$;

-- «*** *** **89»
create function privado.enmascarar_telefono(p_telefono text)
returns text
language sql immutable set search_path = '' as $$
  select case
    when p_telefono is null then null
    when char_length(regexp_replace(p_telefono, '\D', '', 'g')) < 4 then '***'
    else '*** *** **' || right(regexp_replace(p_telefono, '\D', '', 'g'), 2)
  end
$$;

-- Patrón de LIKE con los comodines de quien busca escapados.
create function privado.patron_busqueda(p_texto text)
returns text
language sql immutable set search_path = '' as $$
  select '%' || replace(replace(replace(lower(btrim(left(p_texto, 120))), '\', '\\'), '%', '\%'), '_', '\_') || '%'
$$;

-- ---------------------------------------------------------------------------------------------
-- Tablero: indicadores y series del periodo, con filtros de módulo y lugar.
-- ---------------------------------------------------------------------------------------------
create function public.panel_tablero(
  p_desde date,
  p_hasta date,
  p_modulo public.modulo default null,
  p_lugar text default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_inicio timestamptz;
  v_fin timestamptz;
  v_inicio_anterior timestamptz;
  v_lugar text := nullif(lower(btrim(p_lugar)), '');
  v_tablero jsonb;
begin
  perform privado.exigir_equipo();
  if p_desde is null or p_hasta is null or p_hasta < p_desde or p_hasta - p_desde > 3660 then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;
  v_inicio := privado.inicio_dia(p_desde);
  v_fin := privado.inicio_dia(p_hasta + 1);
  -- El periodo anterior tiene los mismos días y termina justo antes de este.
  v_inicio_anterior := privado.inicio_dia(p_desde - (p_hasta - p_desde + 1));

  with base as (
    select a.creado_en, a.modulo, a.lugar_residencia, a.resultado_general, a.resultado,
           a.prioridad, a.estado_seguimiento,
           privado.clave_persona(pa.nombre, pa.correo, pa.acudiente) as persona,
           (a.creado_en at time zone privado.zona_horaria())::date as dia
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    where (p_modulo is null or a.modulo = p_modulo)
      and (v_lugar is null or lower(btrim(a.lugar_residencia)) = v_lugar)
  ),
  periodo as (
    select * from base where creado_en >= v_inicio and creado_en < v_fin
  )
  select jsonb_build_object(
    'aplicaciones', (select count(*) from periodo),
    'aplicacionesAnterior',
      (select count(*) from base where creado_en >= v_inicio_anterior and creado_en < v_inicio),
    'personas', (select count(distinct persona) from periodo),
    -- Los prioritarios pendientes son todos los que esperan gestión, sin importar la fecha.
    'prioritariosPendientes',
      (select count(*) from base where prioridad and estado_seguimiento = 'pendiente'),
    'resultados',
      (select coalesce(jsonb_object_agg(resultado_general, n), '{}'::jsonb)
       from (select resultado_general, count(*) as n from periodo group by 1) r),
    -- Semanas de lunes a domingo, con las que no tuvieron aplicaciones en cero.
    'porSemana',
      (select coalesce(jsonb_agg(jsonb_build_object('semana', s.semana, 'aplicaciones', coalesce(c.n, 0))
                                 order by s.semana), '[]'::jsonb)
       from (select generate_series(date_trunc('week', p_desde::timestamp), p_hasta::timestamp,
                                    interval '7 days')::date as semana) s
       left join (select date_trunc('week', dia::timestamp)::date as semana, count(*) as n
                  from periodo group by 1) c using (semana)),
    'porModulo',
      (select coalesce(jsonb_agg(jsonb_build_object('modulo', modulo, 'resultado', resultado_general, 'n', n)
                                 order by modulo, resultado_general), '[]'::jsonb)
       from (select modulo, resultado_general, count(*) as n from periodo group by 1, 2) m),
    'mapaCalor',
      (select coalesce(jsonb_agg(jsonb_build_object('area', area, 'nivel', nivel, 'n', n)
                                 order by area, nivel), '[]'::jsonb)
       from (select x.area, x.nivel, count(*) as n
             from periodo p
             cross join lateral jsonb_each_text(p.resultado -> 'niveles') as x(area, nivel)
             group by 1, 2) h),
    'lugares',
      (select coalesce(jsonb_agg(jsonb_build_object('lugar', lugar, 'n', n) order by n desc, lugar), '[]'::jsonb)
       from (select min(btrim(lugar_residencia)) as lugar, count(*) as n
             from periodo
             where nullif(btrim(lugar_residencia), '') is not null
             group by lower(btrim(lugar_residencia))
             order by count(*) desc, 1
             limit 10) l),
    'opcionesLugar',
      (select coalesce(jsonb_agg(lugar order by lugar), '[]'::jsonb)
       from (select min(btrim(a.lugar_residencia)) as lugar
             from public.aplicaciones a
             where nullif(btrim(a.lugar_residencia), '') is not null
             group by lower(btrim(a.lugar_residencia))) o)
  ) into v_tablero;

  return v_tablero;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Registros: búsqueda, filtros, orden y paginación en el servidor.
-- ---------------------------------------------------------------------------------------------
create function public.panel_registros(
  p_busqueda text default null,
  p_desde date default null,
  p_hasta date default null,
  p_modulo public.modulo default null,
  p_lugar text default null,
  p_resultado public.resultado_general default null,
  p_area text default null,
  p_nivel text default null,
  p_prioridad boolean default null,
  p_estado public.estado_seguimiento default null,
  p_orden text default 'fecha',
  p_descendente boolean default true,
  p_pagina integer default 1,
  p_tamano integer default 25
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_texto text;
  v_digitos text := regexp_replace(left(coalesce(p_busqueda, ''), 120), '\D', '', 'g');
  v_lugar text := nullif(lower(btrim(p_lugar)), '');
  v_tamano integer := least(greatest(coalesce(p_tamano, 25), 10), 100);
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_orden text := coalesce(p_orden, 'fecha');
  v_desc boolean := coalesce(p_descendente, true);
  v_registros jsonb;
begin
  perform privado.exigir_equipo();
  if v_orden not in ('fecha', 'nombre', 'modulo', 'lugar', 'resultado', 'atencion', 'prioridad', 'estado') then
    raise exception 'El orden no es válido.' using errcode = 'invalid_parameter_value';
  end if;
  if char_length(btrim(coalesce(p_busqueda, ''))) >= 2 then
    v_texto := privado.patron_busqueda(p_busqueda);
  end if;
  -- Un teléfono se busca por sus dígitos, con al menos cuatro.
  if char_length(v_digitos) < 4 then
    v_digitos := null;
  end if;

  with filtradas as (
    select a.id, a.codigo, a.creado_en, a.modulo, a.edad, a.lugar_residencia, a.resultado_general,
           coalesce((a.resultado -> 'conteo' ->> 'requiereAtencion')::integer, 0) as atencion,
           a.prioridad, a.estado_seguimiento, pf.nombre as asignado, pa.nombre,
           coalesce(pa.correo, pa.acudiente ->> 'correo') as correo,
           coalesce(pa.telefono, pa.acudiente ->> 'telefono') as telefono
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    left join public.perfiles pf on pf.id = a.asignado_a
    where (p_desde is null or a.creado_en >= privado.inicio_dia(p_desde))
      and (p_hasta is null or a.creado_en < privado.inicio_dia(p_hasta + 1))
      and (p_modulo is null or a.modulo = p_modulo)
      and (v_lugar is null or lower(btrim(a.lugar_residencia)) = v_lugar)
      and (p_resultado is null or a.resultado_general = p_resultado)
      and (p_area is null or p_nivel is null or a.resultado -> 'niveles' ->> p_area = p_nivel)
      and (p_prioridad is null or a.prioridad = p_prioridad)
      and (p_estado is null or a.estado_seguimiento = p_estado)
      and (
        (v_texto is null and v_digitos is null)
        or lower(pa.nombre) like v_texto
        or lower(coalesce(pa.correo, pa.acudiente ->> 'correo', '')) like v_texto
        or lower(coalesce(pa.acudiente ->> 'nombre', '')) like v_texto
        or lower(a.codigo) like v_texto
        or regexp_replace(coalesce(pa.telefono, pa.acudiente ->> 'telefono', ''), '\D', '', 'g')
             like '%' || v_digitos || '%'
      )
  ),
  numeradas as (
    select f.*,
           count(*) over () as total,
           row_number() over (order by
             case when v_orden = 'fecha' and not v_desc then f.creado_en end asc,
             case when v_orden = 'fecha' and v_desc then f.creado_en end desc,
             case when v_orden = 'nombre' and not v_desc then lower(f.nombre) end asc,
             case when v_orden = 'nombre' and v_desc then lower(f.nombre) end desc,
             case when v_orden = 'modulo' and not v_desc then f.modulo end asc,
             case when v_orden = 'modulo' and v_desc then f.modulo end desc,
             case when v_orden = 'lugar' and not v_desc then lower(f.lugar_residencia) end asc,
             case when v_orden = 'lugar' and v_desc then lower(f.lugar_residencia) end desc,
             case when v_orden = 'resultado' and not v_desc then f.resultado_general end asc,
             case when v_orden = 'resultado' and v_desc then f.resultado_general end desc,
             case when v_orden = 'atencion' and not v_desc then f.atencion end asc,
             case when v_orden = 'atencion' and v_desc then f.atencion end desc,
             case when v_orden = 'prioridad' and not v_desc then f.prioridad end asc,
             case when v_orden = 'prioridad' and v_desc then f.prioridad end desc,
             case when v_orden = 'estado' and not v_desc then f.estado_seguimiento end asc,
             case when v_orden = 'estado' and v_desc then f.estado_seguimiento end desc,
             f.creado_en desc, f.id) as n
    from filtradas f
  )
  select jsonb_build_object(
    'total', coalesce((select max(total) from numeradas), 0),
    'pagina', v_pagina,
    'tamano', v_tamano,
    'filas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', id,
               'codigo', codigo,
               'creadoEn', creado_en,
               'nombre', nombre,
               'modulo', modulo,
               'edad', edad,
               'lugar', lugar_residencia,
               'resultadoGeneral', resultado_general,
               'atencion', atencion,
               'prioridad', prioridad,
               'estado', estado_seguimiento,
               'asignado', asignado,
               'correo', privado.enmascarar_correo(correo),
               'telefono', privado.enmascarar_telefono(telefono)
             ) order by n)
      from numeradas
      where n > (v_pagina - 1) * v_tamano and n <= v_pagina * v_tamano
    ), '[]'::jsonb)
  ) into v_registros;

  return v_registros;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Ficha de una aplicación: resultados, respuestas, historial de la persona y autorizaciones.
-- El contacto va enmascarado; completo, solo con ver_datos_contacto.
-- ---------------------------------------------------------------------------------------------
create function public.panel_detalle(p_aplicacion uuid)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_ficha jsonb;
begin
  perform privado.exigir_equipo();

  select jsonb_build_object(
    'id', a.id,
    'codigo', a.codigo,
    'creadoEn', a.creado_en,
    'actualizadoEn', a.actualizado_en,
    'modulo', a.modulo,
    'nombre', pa.nombre,
    'edad', coalesce(a.edad, pa.edad),
    'grado', pa.grado,
    'lugar', a.lugar_residencia,
    'correo', privado.enmascarar_correo(coalesce(pa.correo, pa.acudiente ->> 'correo')),
    'telefono', privado.enmascarar_telefono(coalesce(pa.telefono, pa.acudiente ->> 'telefono')),
    'resultadoGeneral', a.resultado_general,
    'indice', a.indice,
    'prioridad', a.prioridad,
    'rutaAtencionEspecial', a.ruta_atencion_especial,
    'resultadoParcial', a.resultado_parcial,
    'resultado', a.resultado,
    'respuestas', a.respuestas,
    'reglasVersion', a.reglas_version,
    'instrumentoVersion', a.instrumento_version,
    'estado', a.estado_seguimiento,
    'asignado', pf.nombre,
    'autorizaciones', (
      select coalesce(jsonb_agg(jsonb_build_object('tipo', c.tipo, 'version', c.version_texto,
                                                   'aceptadoEn', c.aceptado_en) order by c.tipo), '[]'::jsonb)
      from public.consentimientos c
      where c.participante_id = a.participante_id
    ),
    'historial', (
      select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'codigo', h.codigo, 'creadoEn', h.creado_en,
                                                   'resultadoGeneral', h.resultado_general, 'indice', h.indice,
                                                   'niveles', h.resultado -> 'niveles') order by h.creado_en), '[]'::jsonb)
      from public.aplicaciones h
      join public.participantes hp on hp.id = h.participante_id
      where h.modulo = a.modulo
        and privado.clave_persona(hp.nombre, hp.correo, hp.acudiente)
            = privado.clave_persona(pa.nombre, pa.correo, pa.acudiente)
    )
  )
  into v_ficha
  from public.aplicaciones a
  join public.participantes pa on pa.id = a.participante_id
  left join public.perfiles pf on pf.id = a.asignado_a
  where a.id = p_aplicacion;

  if v_ficha is null then
    raise exception 'La aplicación no existe.' using errcode = 'no_data_found';
  end if;
  return v_ficha;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Prioritarios pendientes, del más antiguo al más reciente, con los días sin gestión.
-- ---------------------------------------------------------------------------------------------
create function public.panel_prioritarios()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.exigir_equipo();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id,
             'codigo', a.codigo,
             'creadoEn', a.creado_en,
             'nombre', pa.nombre,
             'modulo', a.modulo,
             'lugar', a.lugar_residencia,
             'resultadoGeneral', a.resultado_general,
             'motivos', coalesce(a.resultado -> 'motivosPrioridad', '[]'::jsonb),
             'asignado', pf.nombre,
             'diasSinGestion', floor(extract(epoch from now() - a.actualizado_en) / 86400)::integer
           ) order by a.creado_en, a.id)
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    left join public.perfiles pf on pf.id = a.asignado_a
    where a.prioridad and a.estado_seguimiento = 'pendiente'
  ), '[]'::jsonb);
end
$$;

-- Imprimir una ficha queda en la auditoría, como ver los datos de contacto.
create function public.panel_registrar_impresion(p_aplicacion uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
begin
  perform privado.exigir_equipo();
  select a.codigo into v_codigo from public.aplicaciones a where a.id = p_aplicacion;
  if v_codigo is null then
    raise exception 'La aplicación no existe.' using errcode = 'no_data_found';
  end if;
  perform privado.auditar('imprimir_ficha', 'aplicaciones', v_codigo);
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Permisos: las ayudas no se llaman desde fuera; las consultas, solo con sesión.
-- ---------------------------------------------------------------------------------------------
revoke all on function privado.exigir_equipo() from public, anon, authenticated;
revoke all on function privado.clave_persona(text, text, jsonb) from public, anon, authenticated;
revoke all on function privado.enmascarar_correo(text) from public, anon, authenticated;
revoke all on function privado.enmascarar_telefono(text) from public, anon, authenticated;
revoke all on function privado.patron_busqueda(text) from public, anon, authenticated;

revoke all on function public.panel_tablero(date, date, public.modulo, text) from public, anon;
revoke all on function public.panel_registros(text, date, date, public.modulo, text, public.resultado_general,
  text, text, boolean, public.estado_seguimiento, text, boolean, integer, integer) from public, anon;
revoke all on function public.panel_detalle(uuid) from public, anon;
revoke all on function public.panel_prioritarios() from public, anon;
revoke all on function public.panel_registrar_impresion(uuid) from public, anon;

grant execute on function public.panel_tablero(date, date, public.modulo, text) to authenticated;
grant execute on function public.panel_registros(text, date, date, public.modulo, text, public.resultado_general,
  text, text, boolean, public.estado_seguimiento, text, boolean, integer, integer) to authenticated;
grant execute on function public.panel_detalle(uuid) to authenticated;
grant execute on function public.panel_prioritarios() to authenticated;
grant execute on function public.panel_registrar_impresion(uuid) to authenticated;
