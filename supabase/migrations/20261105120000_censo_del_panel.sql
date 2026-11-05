-- Mente al Día · Censo del panel (D-83): quiénes respondieron y cuáles son sus fortalezas y falencias.
--
-- Una persona es la misma clave del historial de la ficha (nombre y correo, o el correo del adulto
-- responsable) dentro del mismo módulo, y el censo toma su cuestionario más reciente del periodo.
-- «Fortalezas» son las áreas en «adecuado» y «falencias» las que quedaron en «requiere atención».
-- Como el resto del panel, exige una sesión del equipo con doble factor y no devuelve el contacto.

-- ---------------------------------------------------------------------------------------------
-- Las personas del filtro, cada una con su cuestionario más reciente. Solo la llaman las dos
-- consultas del censo (security definer): no tiene permisos propios.
-- ---------------------------------------------------------------------------------------------
create function privado.censo_personas(
  p_desde date,
  p_hasta date,
  p_modulo public.modulo,
  p_lugar text
) returns table (
  id uuid,
  codigo text,
  creado_en timestamptz,
  modulo public.modulo,
  nombre text,
  edad smallint,
  sexo text,
  grado text,
  lugar text,
  resultado_general public.resultado_general,
  prioridad boolean,
  niveles jsonb,
  cuestionarios integer,
  fortalezas integer,
  por_fortalecer integer,
  falencias integer,
  sin_dato integer
)
language sql stable set search_path = '' as $$
  with filtradas as (
    select a.id, a.codigo, a.creado_en, a.modulo, pa.nombre,
           coalesce(a.edad, pa.edad) as edad,
           nullif(btrim(pa.sexo), '') as sexo,
           nullif(btrim(pa.grado), '') as grado,
           nullif(btrim(a.lugar_residencia), '') as lugar,
           a.resultado_general, a.prioridad,
           coalesce(a.resultado -> 'niveles', '{}'::jsonb) as niveles,
           privado.clave_persona(pa.nombre, pa.correo, pa.acudiente) as persona
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    where (p_desde is null or a.creado_en >= privado.inicio_dia(p_desde))
      and (p_hasta is null or a.creado_en < privado.inicio_dia(p_hasta + 1))
      and (p_modulo is null or a.modulo = p_modulo)
      and (nullif(lower(btrim(p_lugar)), '') is null
           or lower(btrim(a.lugar_residencia)) = lower(btrim(p_lugar)))
  ),
  ultimas as (
    -- La ventana se calcula antes de DISTINCT ON: cuenta todos los cuestionarios de la persona.
    select distinct on (f.modulo, f.persona) f.*,
           count(*) over (partition by f.modulo, f.persona)::integer as cuestionarios
    from filtradas f
    order by f.modulo, f.persona, f.creado_en desc, f.id desc
  )
  select u.id, u.codigo, u.creado_en, u.modulo, u.nombre, u.edad, u.sexo, u.grado, u.lugar,
         u.resultado_general, u.prioridad, u.niveles, u.cuestionarios,
         c.fortalezas, c.por_fortalecer, c.falencias, c.sin_dato
  from ultimas u
  cross join lateral (
    select count(*) filter (where n.value = 'adecuado')::integer as fortalezas,
           count(*) filter (where n.value = 'por_fortalecer')::integer as por_fortalecer,
           count(*) filter (where n.value = 'requiere_atencion')::integer as falencias,
           count(*) filter (where n.value = 'sin_dato')::integer as sin_dato
    from jsonb_each_text(case when jsonb_typeof(u.niveles) = 'object' then u.niveles else '{}'::jsonb end) n
  ) c
$$;

-- ---------------------------------------------------------------------------------------------
-- Resumen del censo: cuántas personas, quiénes son y cómo están en cada área.
-- ---------------------------------------------------------------------------------------------
create function public.panel_censo(
  p_desde date default null,
  p_hasta date default null,
  p_modulo public.modulo default null,
  p_lugar text default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_censo jsonb;
begin
  perform privado.exigir_equipo();
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  with personas as (
    select * from privado.censo_personas(p_desde, p_hasta, p_modulo, p_lugar)
  )
  select jsonb_build_object(
    'personas', (select count(*) from personas),
    'cuestionarios', (select coalesce(sum(p.cuestionarios), 0) from personas p),
    'conPrioridad', (select count(*) from personas p where p.prioridad),
    'conFalencias', (select count(*) from personas p where p.falencias > 0),
    'porModulo',
      (select coalesce(jsonb_object_agg(m.modulo, m.n), '{}'::jsonb)
       from (select p.modulo, count(*) as n from personas p group by 1) m),
    'resultados',
      (select coalesce(jsonb_object_agg(r.resultado_general, r.n), '{}'::jsonb)
       from (select p.resultado_general, count(*) as n from personas p group by 1) r),
    'porEdad',
      (select coalesce(jsonb_agg(jsonb_build_object('edad', e.edad, 'n', e.n) order by e.edad), '[]'::jsonb)
       from (select p.edad, count(*) as n from personas p where p.edad is not null group by 1) e),
    -- El sexo y el grado solo se preguntan a niñas, niños y adolescentes.
    'porSexo',
      (select coalesce(jsonb_agg(jsonb_build_object('sexo', s.sexo, 'n', s.n) order by s.n desc, s.sexo), '[]'::jsonb)
       from (select p.sexo, count(*) as n from personas p where p.modulo <> 'adulto' group by 1) s),
    'porGrado',
      (select coalesce(jsonb_agg(jsonb_build_object('grado', g.grado, 'n', g.n) order by g.n desc, g.grado), '[]'::jsonb)
       from (select min(p.grado) as grado, count(*) as n from personas p
             where p.modulo <> 'adulto' and p.grado is not null
             group by lower(p.grado)) g),
    'lugares',
      (select coalesce(jsonb_agg(jsonb_build_object('lugar', l.lugar, 'n', l.n) order by l.n desc, l.lugar), '[]'::jsonb)
       from (select min(p.lugar) as lugar, count(*) as n from personas p
             where p.lugar is not null
             group by lower(p.lugar)
             order by count(*) desc, 1
             limit 10) l),
    'areas',
      (select coalesce(jsonb_agg(jsonb_build_object('area', h.area, 'nivel', h.nivel, 'n', h.n)
                                 order by h.area, h.nivel), '[]'::jsonb)
       from (select x.area, x.nivel, count(*) as n
             from personas p
             cross join lateral jsonb_each_text(
               case when jsonb_typeof(p.niveles) = 'object' then p.niveles else '{}'::jsonb end
             ) as x(area, nivel)
             group by 1, 2) h)
  ) into v_censo;

  return v_censo;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Lista del censo: una fila por persona con sus fortalezas y falencias, con búsqueda, filtro por
-- área y nivel, orden y paginación en el servidor.
-- ---------------------------------------------------------------------------------------------
create function public.panel_censo_personas(
  p_desde date default null,
  p_hasta date default null,
  p_modulo public.modulo default null,
  p_lugar text default null,
  p_busqueda text default null,
  p_area text default null,
  p_nivel text default null,
  p_orden text default 'falencias',
  p_pagina integer default 1,
  p_tamano integer default 25
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_texto text;
  v_orden text := coalesce(p_orden, 'falencias');
  v_tamano integer := least(greatest(coalesce(p_tamano, 25), 10), 100);
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_lista jsonb;
begin
  perform privado.exigir_equipo();
  if v_orden not in ('falencias', 'fortalezas', 'fecha', 'nombre') then
    raise exception 'El orden no es válido.' using errcode = 'invalid_parameter_value';
  end if;
  if p_nivel is not null and p_nivel not in ('adecuado', 'por_fortalecer', 'requiere_atencion', 'sin_dato') then
    raise exception 'El nivel no es válido.' using errcode = 'invalid_parameter_value';
  end if;
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;
  if char_length(btrim(coalesce(p_busqueda, ''))) >= 2 then
    v_texto := privado.patron_busqueda(p_busqueda);
  end if;

  with personas as (
    select c.*
    from privado.censo_personas(p_desde, p_hasta, p_modulo, p_lugar) c
    where (v_texto is null or lower(c.nombre) like v_texto or lower(c.codigo) like v_texto)
      and (p_area is null or p_nivel is null or c.niveles ->> p_area = p_nivel)
  ),
  numeradas as (
    select p.*,
           count(*) over () as total,
           row_number() over (order by
             case when v_orden = 'falencias' then p.falencias end desc,
             case when v_orden = 'falencias' then p.por_fortalecer end desc,
             case when v_orden = 'fortalezas' then p.fortalezas end desc,
             case when v_orden = 'nombre' then lower(p.nombre) end asc,
             p.creado_en desc, p.id) as n
    from personas p
  )
  select jsonb_build_object(
    'total', coalesce((select max(x.total) from numeradas x), 0),
    'pagina', v_pagina,
    'tamano', v_tamano,
    'filas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', x.id,
               'codigo', x.codigo,
               'creadoEn', x.creado_en,
               'nombre', x.nombre,
               'modulo', x.modulo,
               'edad', x.edad,
               'sexo', x.sexo,
               'grado', x.grado,
               'lugar', x.lugar,
               'resultadoGeneral', x.resultado_general,
               'prioridad', x.prioridad,
               'niveles', x.niveles,
               'cuestionarios', x.cuestionarios,
               'fortalezas', x.fortalezas,
               'porFortalecer', x.por_fortalecer,
               'falencias', x.falencias,
               'sinDato', x.sin_dato
             ) order by x.n)
      from numeradas x
      where x.n > (v_pagina - 1) * v_tamano and x.n <= v_pagina * v_tamano
    ), '[]'::jsonb)
  ) into v_lista;

  return v_lista;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Permisos: la ayuda no se llama desde fuera; las consultas, solo con sesión.
-- ---------------------------------------------------------------------------------------------
revoke all on function privado.censo_personas(date, date, public.modulo, text) from public, anon, authenticated;

revoke all on function public.panel_censo(date, date, public.modulo, text) from public, anon;
revoke all on function public.panel_censo_personas(date, date, public.modulo, text, text, text, text, text,
  integer, integer) from public, anon;

grant execute on function public.panel_censo(date, date, public.modulo, text) to authenticated;
grant execute on function public.panel_censo_personas(date, date, public.modulo, text, text, text, text, text,
  integer, integer) to authenticated;
