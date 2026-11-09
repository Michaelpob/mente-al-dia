-- Mente al Día · Seguridad multiinstitucional (D-87): cada institución es un espacio aislado.
--
-- Fase 3 de la ampliación: la base de datos decide qué ve cada sesión, no el sitio. Un
-- administrador institucional solo ve su institución; el superadministrador (administrador
-- general) las ve todas. Cubre las políticas de las tablas, todas las consultas del panel, el
-- registro de los cuestionarios (la institución sale del enlace y se resuelve aquí: el navegador
-- nunca envía su id), las visitas, las invitaciones y la auditoría.

-- =============================================================================================
-- Ayudas (privado). Nadie de fuera las llama; las que usan las políticas se dan a authenticated.
-- =============================================================================================

-- Rol de la sesión: el de un perfil activo con doble factor. Un administrador institucional solo
-- cuenta si su institución está activa. Los roles antiguos «profesional» y «consulta» (sin
-- usuarios) ya no dan acceso: así ningún rol del equipo queda con acceso global por accidente.
create or replace function privado.rol_actual() returns public.rol_panel
language sql stable security definer set search_path = '' as $$
  select p.rol
  from public.perfiles p
  left join public.instituciones i on i.id = p.institucion_id
  where p.id = auth.uid()
    and p.activo
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and (p.rol = 'superadministrador' or (p.rol = 'administrador_institucional' and i.activa))
$$;

create or replace function privado.es_equipo() returns boolean
language sql stable security definer set search_path = '' as $$
  select privado.rol_actual() is not null
$$;

-- La institución de la sesión: solo la de un administrador institucional válido (null si no).
create function privado.institucion_actual() returns uuid
language sql stable security definer set search_path = '' as $$
  select p.institucion_id
  from public.perfiles p
  where p.id = auth.uid() and privado.rol_actual() = 'administrador_institucional'
$$;

-- ¿Puede la sesión ver datos de esta institución? El general, todas; el institucional, la suya.
create function privado.puede_ver_institucion(p_institucion uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(
    privado.es_superadministrador()
      or (p_institucion is not null and p_institucion = privado.institucion_actual()),
    false
  )
$$;

-- La institución que puede consultar una función del panel. El institucional queda siempre en la
-- suya: pedir otra es un acceso denegado. El general elige una, o null para todas.
create function privado.institucion_de_consulta(p_institucion uuid) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare
  v_propia uuid;
begin
  perform privado.exigir_equipo();
  if privado.es_superadministrador() then
    return p_institucion;
  end if;
  v_propia := privado.institucion_actual();
  if v_propia is null or (p_institucion is not null and p_institucion <> v_propia) then
    raise exception 'No tienes permiso para ver otra institución.' using errcode = 'insufficient_privilege';
  end if;
  return v_propia;
end
$$;

create function privado.exigir_superadministrador() returns void
language plpgsql stable set search_path = '' as $$
begin
  if not privado.es_superadministrador() then
    raise exception 'Solo el administrador general puede hacer esto.' using errcode = 'insufficient_privilege';
  end if;
end
$$;

-- Una persona: el mismo nombre con el mismo correo (o el del adulto responsable) dentro de la misma
-- institución. Quien responde en dos instituciones cuenta en cada una por separado.
create function privado.clave_persona(p_institucion uuid, p_nombre text, p_correo text, p_acudiente jsonb)
returns text
language sql immutable set search_path = '' as $$
  select p_institucion::text || '|' || lower(btrim(p_nombre)) || '|'
         || lower(btrim(coalesce(p_correo, p_acudiente ->> 'correo', '')))
$$;
drop function privado.clave_persona(text, text, jsonb);

-- Auditoría con la institución a la que corresponde la acción: la que se indica o, si no, la de
-- quien la hace (un administrador institucional).
drop function privado.auditar(text, text, text, jsonb);
create function privado.auditar(
  p_accion text,
  p_entidad text,
  p_entidad_id text,
  p_detalle jsonb default '{}'::jsonb,
  p_institucion uuid default null
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid := privado.actor_actual();
begin
  insert into public.auditoria (actor_id, actor_rol, accion, entidad, entidad_id, detalle, institucion_id)
  values (
    v_actor,
    coalesce((select p.rol::text from public.perfiles p where p.id = v_actor), case when v_actor is null then 'sistema' end),
    p_accion,
    p_entidad,
    p_entidad_id,
    coalesce(p_detalle, '{}'::jsonb),
    coalesce(p_institucion, privado.institucion_actual())
  );
end
$$;

-- Igual que antes, más la institución de la fila (o la propia, en la tabla de instituciones).
create or replace function privado.auditar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_excluidas text[] := coalesce(TG_ARGV[1:TG_NARGS - 1], '{}') || array['actualizado_en'];
  v_antes jsonb;
  v_despues jsonb;
  v_detalle jsonb := '{}'::jsonb;
  v_clave text;
  v_institucion uuid;
begin
  if TG_OP in ('UPDATE', 'DELETE') then
    v_antes := to_jsonb(old);
  end if;
  if TG_OP in ('INSERT', 'UPDATE') then
    v_despues := to_jsonb(new);
  end if;

  if TG_OP = 'UPDATE' then
    for v_clave in select jsonb_object_keys(v_despues - v_excluidas) loop
      if v_despues -> v_clave is distinct from v_antes -> v_clave then
        v_detalle := v_detalle || jsonb_build_object(
          v_clave, jsonb_build_object('antes', v_antes -> v_clave, 'despues', v_despues -> v_clave)
        );
      end if;
    end loop;
    if v_detalle = '{}'::jsonb then
      return null;
    end if;
  elsif TG_OP = 'INSERT' then
    v_detalle := v_despues - v_excluidas;
  else
    v_detalle := v_antes - v_excluidas;
  end if;

  v_institucion := nullif(
    coalesce(v_despues, v_antes) ->> (case when TG_TABLE_NAME = 'instituciones' then 'id' else 'institucion_id' end),
    ''
  )::uuid;

  perform privado.auditar(
    case TG_OP when 'INSERT' then 'crear' when 'UPDATE' then 'actualizar' else 'eliminar' end,
    TG_TABLE_NAME,
    coalesce(v_despues, v_antes) ->> TG_ARGV[0],
    v_detalle,
    v_institucion
  );
  return null;
end
$$;

-- Un caso solo se asigna a un administrador activo de su institución (o al general), y la
-- institución de un cuestionario no cambia nunca, ni siquiera desde la base.
create or replace function privado.validar_aplicacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.institucion_id is distinct from old.institucion_id then
    raise exception 'La institución de un cuestionario no se cambia.' using errcode = 'insufficient_privilege';
  end if;
  if new.asignado_a is not null and new.asignado_a is distinct from old.asignado_a and not exists (
    select 1 from public.perfiles p
    where p.id = new.asignado_a
      and p.activo
      and (p.rol = 'superadministrador'
           or (p.rol = 'administrador_institucional' and p.institucion_id = new.institucion_id))
  ) then
    raise exception 'Solo se puede asignar a un administrador de la misma institución.' using errcode = 'check_violation';
  end if;
  if new.asignado_a is not null and new.estado_seguimiento is null then
    new.estado_seguimiento := 'pendiente';
  end if;
  return new;
end
$$;

-- =============================================================================================
-- Políticas de las tablas
-- =============================================================================================

-- aplicaciones: cada sesión, solo las de su institución (el general, todas). Desde el navegador
-- solo se cambian estado y asignación: institucion_id no tiene permiso de UPDATE.
alter policy aplicaciones_leer on public.aplicaciones
  using (privado.puede_ver_institucion(institucion_id));
alter policy aplicaciones_seguimiento on public.aplicaciones
  using (privado.puede_ver_institucion(institucion_id))
  with check (privado.puede_ver_institucion(institucion_id));

-- notas_seguimiento: las de los cuestionarios de su institución.
alter policy notas_leer on public.notas_seguimiento
  using (exists (
    select 1 from public.aplicaciones a
    where a.id = aplicacion_id and privado.puede_ver_institucion(a.institucion_id)
  ));
alter policy notas_crear on public.notas_seguimiento
  with check (
    autor_id = auth.uid()
    and exists (
      select 1 from public.aplicaciones a
      where a.id = aplicacion_id and privado.puede_ver_institucion(a.institucion_id)
    )
  );

-- perfiles: el propio; el general, todos; el institucional, solo los de su institución. Editar
-- sigue siendo solo del general (perfiles_editar).
alter policy perfiles_leer on public.perfiles
  using (
    id = auth.uid()
    or privado.es_superadministrador()
    or (institucion_id is not null and institucion_id = privado.institucion_actual())
  );

-- instituciones: el general las ve todas; el institucional, solo la suya. Nadie las edita
-- directamente: el general usa panel_institucion_actualizar.
grant select on public.instituciones to authenticated;
create policy instituciones_leer on public.instituciones for select to authenticated
  using (privado.es_superadministrador() or id = privado.institucion_actual());

-- =============================================================================================
-- Sesión del panel y sitio público
-- =============================================================================================

-- Perfil de la sesión, ahora con su institución (el panel muestra su nombre).
drop function public.mi_perfil();
create function public.mi_perfil()
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
  select p.id, p.nombre, p.rol, p.activo, coalesce(auth.jwt() ->> 'aal', '') = 'aal2',
         i.id, i.nombre, i.slug, i.activa
  from public.perfiles p
  left join public.instituciones i on i.id = p.institucion_id
  where p.id = auth.uid()
$$;

-- El sitio público confirma la institución de un enlace: solo el nombre de una institución activa.
-- No expone ids ni la lista de instituciones.
create function public.institucion_publica(p_slug text)
returns table (nombre text, slug text)
language sql stable security definer set search_path = '' as $$
  select i.nombre, i.slug
  from public.instituciones i
  where i.slug = lower(btrim(p_slug)) and i.activa
$$;

-- Visitas: la institución sale del enlace y se resuelve aquí (una desconocida queda sin institución).
drop function public.registrar_visita(public.tipo_dispositivo);
create function public.registrar_visita(p_dispositivo public.tipo_dispositivo, p_sede text default null)
returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.visitas (dispositivo, institucion_id)
  values (
    p_dispositivo,
    (select i.id from public.instituciones i where i.slug = lower(btrim(p_sede)) and i.activa)
  )
$$;

-- =============================================================================================
-- Registro del cuestionario (solo la Edge Function, con la llave del servidor)
-- =============================================================================================
drop function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb, uuid);
create function public.registrar_aplicacion(
  p_participante jsonb,
  p_consentimientos jsonb,
  p_respuestas jsonb,
  p_resultado jsonb,
  p_clave_envio uuid default null,
  p_sede text default null
) returns table (id uuid, codigo text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_modulo public.modulo := (p_participante ->> 'modulo')::public.modulo;
  v_institucion uuid;
  v_participante uuid;
  v_aplicacion uuid;
  v_codigo text;
  v_tipo public.tipo_consentimiento;
  v_requeridos public.tipo_consentimiento[] := array['tratamiento_datos', 'datos_sensibles'];
  v_prioridad boolean := (p_resultado ->> 'prioridad')::boolean;
begin
  -- Reintento de un envío ya guardado: el mismo código, sin guardar nada más.
  if p_clave_envio is not null then
    return query
      select a.id, a.codigo from public.aplicaciones a where a.clave_envio = p_clave_envio;
    if found then
      return;
    end if;
  end if;

  -- La institución sale del enlace (?sede=slug) y se resuelve aquí: debe existir y estar activa.
  select i.id into v_institucion
  from public.instituciones i
  where i.slug = lower(btrim(p_sede)) and i.activa;
  if v_institucion is null then
    raise exception 'La institución del enlace no existe o no está activa.' using errcode = 'invalid_parameter_value';
  end if;

  if v_modulo in ('nino', 'adolescente') then
    v_requeridos := v_requeridos || 'autorizacion_acudiente'::public.tipo_consentimiento;
  end if;
  foreach v_tipo in array v_requeridos loop
    if coalesce(jsonb_typeof(p_consentimientos -> v_tipo::text), '') <> 'string' then
      raise exception 'Falta la autorización «%».', v_tipo using errcode = 'check_violation';
    end if;
  end loop;

  insert into public.participantes (
    institucion_id, modulo, nombre, correo, telefono, lugar_residencia, edad, grado, sexo, acudiente
  )
  values (
    v_institucion,
    v_modulo,
    p_participante ->> 'nombre',
    p_participante ->> 'correo',
    p_participante ->> 'telefono',
    p_participante ->> 'lugarResidencia',
    (p_participante ->> 'edad')::smallint,
    p_participante ->> 'grado',
    p_participante ->> 'sexo',
    p_participante -> 'acudiente'
  )
  returning participantes.id into v_participante;

  insert into public.consentimientos (participante_id, tipo, version_texto)
  select v_participante, t, p_consentimientos ->> t::text
  from unnest(v_requeridos) as t;

  insert into public.aplicaciones (
    institucion_id, participante_id, modulo, edad, lugar_residencia, respuestas, resultado,
    resultado_general, indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
    instrumento_version, estado_seguimiento, clave_envio
  )
  values (
    v_institucion,
    v_participante,
    v_modulo,
    (p_participante ->> 'edad')::smallint,
    coalesce(p_participante ->> 'lugarResidencia', p_participante -> 'acudiente' ->> 'lugarResidencia'),
    p_respuestas,
    p_resultado,
    (p_resultado ->> 'resultadoGeneral')::public.resultado_general,
    (p_resultado ->> 'indice')::smallint,
    v_prioridad,
    (p_resultado ->> 'rutaAtencionEspecial')::boolean,
    (p_resultado ->> 'resultadoParcial')::boolean,
    p_resultado ->> 'reglasVersion',
    p_resultado ->> 'instrumentoVersion',
    case when v_prioridad then 'pendiente'::public.estado_seguimiento end,
    p_clave_envio
  )
  returning aplicaciones.id, aplicaciones.codigo into v_aplicacion, v_codigo;

  perform privado.auditar('crear', 'aplicaciones', v_codigo, jsonb_build_object(
    'modulo', v_modulo,
    'resultadoGeneral', p_resultado ->> 'resultadoGeneral',
    'prioridad', v_prioridad,
    'reglasVersion', p_resultado ->> 'reglasVersion'
  ), v_institucion);

  return query select v_aplicacion, v_codigo;
exception
  -- Dos envíos con la misma clave al mismo tiempo: el segundo devuelve el del primero.
  when unique_violation then
    if p_clave_envio is null then
      raise;
    end if;
    return query
      select a.id, a.codigo from public.aplicaciones a where a.clave_envio = p_clave_envio;
end
$$;

-- =============================================================================================
-- Invitaciones (solo la Edge Function «invitar-usuario», a nombre del general)
-- =============================================================================================
drop function public.crear_perfil_invitado(uuid, uuid, text, public.rol_panel);
create function public.crear_perfil_invitado(
  p_actor uuid,
  p_id uuid,
  p_nombre text,
  p_rol public.rol_panel,
  p_institucion uuid default null
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.perfiles p
    where p.id = p_actor and p.activo and p.rol = 'superadministrador'
  ) then
    raise exception 'Solo el administrador general puede invitar.' using errcode = 'insufficient_privilege';
  end if;
  if p_rol not in ('superadministrador', 'administrador_institucional') then
    raise exception 'Ese rol ya no se usa en el panel.' using errcode = 'invalid_parameter_value';
  end if;
  if p_rol = 'administrador_institucional' and not exists (
    select 1 from public.instituciones i where i.id = p_institucion and i.activa
  ) then
    raise exception 'La institución no existe o no está activa.' using errcode = 'invalid_parameter_value';
  end if;
  perform set_config('mad.actor_id', p_actor::text, true);
  insert into public.perfiles (id, nombre, rol, institucion_id)
  values (
    p_id,
    btrim(p_nombre),
    p_rol,
    case when p_rol = 'administrador_institucional' then p_institucion end
  );
end
$$;

-- =============================================================================================
-- Consultas del panel: siempre dentro de la institución que la sesión puede ver
-- =============================================================================================

-- Tablero.
drop function public.panel_tablero(date, date, public.modulo, text);
create function public.panel_tablero(
  p_desde date,
  p_hasta date,
  p_modulo public.modulo default null,
  p_lugar text default null,
  p_institucion uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_inicio_anterior timestamptz;
  v_lugar text := nullif(lower(btrim(p_lugar)), '');
  v_tablero jsonb;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
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
           privado.clave_persona(a.institucion_id, pa.nombre, pa.correo, pa.acudiente) as persona,
           (a.creado_en at time zone privado.zona_horaria())::date as dia
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    where (v_institucion is null or a.institucion_id = v_institucion)
      and (p_modulo is null or a.modulo = p_modulo)
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
               and (v_institucion is null or a.institucion_id = v_institucion)
             group by lower(btrim(a.lugar_residencia))) o)
  ) into v_tablero;

  return v_tablero;
end
$$;

-- Registros.
drop function public.panel_registros(text, date, date, public.modulo, text, public.resultado_general,
  text, text, boolean, public.estado_seguimiento, text, boolean, integer, integer);
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
  p_tamano integer default 25,
  p_institucion uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_texto text;
  v_digitos text := regexp_replace(left(coalesce(p_busqueda, ''), 120), '\D', '', 'g');
  v_lugar text := nullif(lower(btrim(p_lugar)), '');
  v_tamano integer := least(greatest(coalesce(p_tamano, 25), 10), 100);
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_orden text := coalesce(p_orden, 'fecha');
  v_desc boolean := coalesce(p_descendente, true);
  v_registros jsonb;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
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
           a.prioridad, a.estado_seguimiento, pf.nombre as asignado, pa.nombre, i.nombre as institucion,
           coalesce(pa.correo, pa.acudiente ->> 'correo') as correo,
           coalesce(pa.telefono, pa.acudiente ->> 'telefono') as telefono
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    join public.instituciones i on i.id = a.institucion_id
    left join public.perfiles pf on pf.id = a.asignado_a
    where (v_institucion is null or a.institucion_id = v_institucion)
      and (p_desde is null or a.creado_en >= privado.inicio_dia(p_desde))
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
               'institucion', institucion,
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

-- Ficha. Un cuestionario de otra institución se responde igual que uno que no existe: no se
-- revela nada de él.
drop function public.panel_detalle(uuid);
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
    'institucion', jsonb_build_object('id', i.id, 'nombre', i.nombre),
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
        and h.institucion_id = a.institucion_id
        and privado.clave_persona(h.institucion_id, hp.nombre, hp.correo, hp.acudiente)
            = privado.clave_persona(a.institucion_id, pa.nombre, pa.correo, pa.acudiente)
    )
  )
  into v_ficha
  from public.aplicaciones a
  join public.participantes pa on pa.id = a.participante_id
  join public.instituciones i on i.id = a.institucion_id
  left join public.perfiles pf on pf.id = a.asignado_a
  where a.id = p_aplicacion
    and privado.puede_ver_institucion(a.institucion_id);

  if v_ficha is null then
    raise exception 'La aplicación no existe.' using errcode = 'no_data_found';
  end if;
  return v_ficha;
end
$$;

-- Prioritarios pendientes de la institución (o de todas, para el general).
drop function public.panel_prioritarios();
create function public.panel_prioritarios(p_institucion uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id,
             'codigo', a.codigo,
             'creadoEn', a.creado_en,
             'nombre', pa.nombre,
             'modulo', a.modulo,
             'lugar', a.lugar_residencia,
             'institucion', i.nombre,
             'resultadoGeneral', a.resultado_general,
             'motivos', coalesce(a.resultado -> 'motivosPrioridad', '[]'::jsonb),
             'asignado', pf.nombre,
             'diasSinGestion', floor(extract(epoch from now() - a.actualizado_en) / 86400)::integer
           ) order by a.creado_en, a.id)
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    join public.instituciones i on i.id = a.institucion_id
    left join public.perfiles pf on pf.id = a.asignado_a
    where a.prioridad and a.estado_seguimiento = 'pendiente'
      and (v_institucion is null or a.institucion_id = v_institucion)
  ), '[]'::jsonb);
end
$$;

-- Imprimir una ficha queda en la auditoría, como ver los datos de contacto.
create or replace function public.panel_registrar_impresion(p_aplicacion uuid)
returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
  v_institucion uuid;
begin
  perform privado.exigir_equipo();
  select a.codigo, a.institucion_id into v_codigo, v_institucion
  from public.aplicaciones a
  where a.id = p_aplicacion and privado.puede_ver_institucion(a.institucion_id);
  if v_codigo is null then
    raise exception 'La aplicación no existe.' using errcode = 'no_data_found';
  end if;
  perform privado.auditar('imprimir_ficha', 'aplicaciones', v_codigo, '{}'::jsonb, v_institucion);
end
$$;

-- Datos de contacto completos: solo de su institución, y cada consulta queda en la auditoría.
create or replace function public.ver_datos_contacto(p_aplicacion uuid, p_motivo text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
  v_institucion uuid;
  v_datos jsonb;
begin
  if not privado.es_equipo() then
    raise exception 'No tienes permiso para ver datos de contacto.' using errcode = 'insufficient_privilege';
  end if;

  select a.codigo,
         a.institucion_id,
         jsonb_build_object(
           'nombre', pa.nombre,
           'correo', pa.correo,
           'telefono', pa.telefono,
           'lugarResidencia', pa.lugar_residencia,
           'grado', pa.grado,
           'sexo', pa.sexo,
           'acudiente', pa.acudiente
         )
    into v_codigo, v_institucion, v_datos
  from public.aplicaciones a
  join public.participantes pa on pa.id = a.participante_id
  where a.id = p_aplicacion
    and privado.puede_ver_institucion(a.institucion_id);

  if v_codigo is null then
    raise exception 'La aplicación no existe.' using errcode = 'no_data_found';
  end if;

  perform privado.auditar('ver_datos_contacto', 'aplicaciones', v_codigo,
    jsonb_strip_nulls(jsonb_build_object('motivo', nullif(btrim(p_motivo), ''))), v_institucion);
  return v_datos;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Censo (D-83/D-84), por institución
-- ---------------------------------------------------------------------------------------------
drop function public.panel_censo(date, date, public.modulo, text);
drop function public.panel_censo_personas(date, date, public.modulo, text, text, text, text, text, integer, integer);
drop function public.panel_censo_exportar(text, date, date, public.modulo, text);
drop function privado.censo_personas(date, date, public.modulo, text);

create function privado.censo_personas(
  p_desde date,
  p_hasta date,
  p_modulo public.modulo,
  p_lugar text,
  p_institucion uuid
) returns table (
  id uuid,
  codigo text,
  creado_en timestamptz,
  modulo public.modulo,
  institucion text,
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
    select a.id, a.codigo, a.creado_en, a.modulo, i.nombre as institucion, pa.nombre,
           coalesce(a.edad, pa.edad) as edad,
           nullif(btrim(pa.sexo), '') as sexo,
           nullif(btrim(pa.grado), '') as grado,
           nullif(btrim(a.lugar_residencia), '') as lugar,
           a.resultado_general, a.prioridad,
           coalesce(a.resultado -> 'niveles', '{}'::jsonb) as niveles,
           privado.clave_persona(a.institucion_id, pa.nombre, pa.correo, pa.acudiente) as persona
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    join public.instituciones i on i.id = a.institucion_id
    where (p_institucion is null or a.institucion_id = p_institucion)
      and (p_desde is null or a.creado_en >= privado.inicio_dia(p_desde))
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
  select u.id, u.codigo, u.creado_en, u.modulo, u.institucion, u.nombre, u.edad, u.sexo, u.grado,
         u.lugar, u.resultado_general, u.prioridad, u.niveles, u.cuestionarios,
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

create function public.panel_censo(
  p_desde date default null,
  p_hasta date default null,
  p_modulo public.modulo default null,
  p_lugar text default null,
  p_institucion uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_censo jsonb;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  with personas as (
    select * from privado.censo_personas(p_desde, p_hasta, p_modulo, p_lugar, v_institucion)
  )
  select jsonb_build_object(
    'personas', (select count(*) from personas),
    'cuestionarios', (select coalesce(sum(p.cuestionarios), 0) from personas p),
    'conPrioridad', (select count(*) from personas p where p.prioridad),
    'conFalencias', (select count(*) from personas p where p.falencias > 0),
    'porModulo',
      (select coalesce(jsonb_object_agg(m.modulo, m.n), '{}'::jsonb)
       from (select p.modulo, count(*) as n from personas p group by 1) m),
    'porInstitucion',
      (select coalesce(jsonb_agg(jsonb_build_object('institucion', x.institucion, 'n', x.n)
                                 order by x.n desc, x.institucion), '[]'::jsonb)
       from (select p.institucion, count(*) as n from personas p group by 1) x),
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
  p_tamano integer default 25,
  p_institucion uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_texto text;
  v_orden text := coalesce(p_orden, 'falencias');
  v_tamano integer := least(greatest(coalesce(p_tamano, 25), 10), 100);
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_lista jsonb;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
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
    from privado.censo_personas(p_desde, p_hasta, p_modulo, p_lugar, v_institucion) c
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
               'institucion', x.institucion,
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

-- Descarga del censo (D-84): reporte nominal con motivo y auditoría, sin contacto. Ahora también
-- la hace el administrador institucional, solo de su institución.
create function public.panel_censo_exportar(
  p_motivo text,
  p_desde date default null,
  p_hasta date default null,
  p_modulo public.modulo default null,
  p_lugar text default null,
  p_institucion uuid default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_personas jsonb;
  v_total integer;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
  if char_length(btrim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Indica el motivo de la descarga (al menos 10 caracteres).' using errcode = 'invalid_parameter_value';
  end if;
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'codigo', c.codigo,
           'creadoEn', c.creado_en,
           'nombre', c.nombre,
           'modulo', c.modulo,
           'institucion', c.institucion,
           'edad', c.edad,
           'sexo', c.sexo,
           'grado', c.grado,
           'lugar', c.lugar,
           'resultadoGeneral', c.resultado_general,
           'prioridad', c.prioridad,
           'niveles', c.niveles,
           'cuestionarios', c.cuestionarios,
           'fortalezas', c.fortalezas,
           'porFortalecer', c.por_fortalecer,
           'falencias', c.falencias,
           'sinDato', c.sin_dato
         ) order by lower(c.nombre), c.creado_en desc, c.id), '[]'::jsonb),
         count(*)::integer
  into v_personas, v_total
  from privado.censo_personas(p_desde, p_hasta, p_modulo, p_lugar, v_institucion) c;

  perform privado.auditar('exportar_censo', 'aplicaciones', null, jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'modulo', p_modulo,
    'lugar', nullif(btrim(p_lugar), ''),
    'motivo', btrim(p_motivo),
    'personas', v_total
  ), v_institucion);

  return jsonb_build_object(
    'generadoEn', now(),
    'generadoPor', (select p.nombre from public.perfiles p where p.id = auth.uid()),
    'institucion', (select i.nombre from public.instituciones i where i.id = v_institucion),
    'resumen', public.panel_censo(p_desde, p_hasta, p_modulo, p_lugar, v_institucion),
    'personas', v_personas
  );
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Visitas, reporte agregado y cuentas públicas
-- ---------------------------------------------------------------------------------------------
drop function public.panel_visitas(date, date);
create function public.panel_visitas(p_desde date, p_hasta date, p_institucion uuid default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_inicio timestamptz;
  v_fin timestamptz;
  v_inicio_anterior timestamptz;
  v_visitas jsonb;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
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
  where v.creado_en >= v_inicio_anterior and v.creado_en < v_fin
    and (v_institucion is null or v.institucion_id = v_institucion);

  return v_visitas;
end
$$;

drop function public.reporte_agregado(date, date);
create function public.reporte_agregado(p_desde date, p_hasta date, p_institucion uuid default null)
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
  v_institucion uuid;
  v_minimo integer := privado.minimo_grupo();
  v_desde date;
  v_hasta date;
begin
  v_institucion := privado.institucion_de_consulta(p_institucion);
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  -- De lunes a domingo.
  v_desde := p_desde - (extract(isodow from p_desde)::integer - 1);
  v_hasta := p_hasta + (7 - extract(isodow from p_hasta)::integer);

  perform privado.auditar('reporte_agregado', 'aplicaciones', null,
    jsonb_build_object('desde', v_desde, 'hasta', v_hasta, 'minimoGrupo', v_minimo), v_institucion);

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
        and (v_institucion is null or a.institucion_id = v_institucion)
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

-- Cuentas públicas: son de las personas, no de una institución. Solo las ve el general.
create or replace function public.panel_cuentas_resumen()
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_zona text := privado.zona_horaria();
  v_lunes date := date_trunc('week', (now() at time zone privado.zona_horaria()))::date;
  v_resultado jsonb;
begin
  perform privado.exigir_superadministrador();
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

create or replace function public.panel_cuentas(
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
  perform privado.exigir_superadministrador();
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

-- =============================================================================================
-- Administración general: instituciones, administradores y auditoría
-- =============================================================================================

-- Las instituciones con sus cifras. El general las ve todas; el institucional, solo la suya.
create function public.panel_instituciones(p_desde date default null, p_hasta date default null)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_institucion uuid;
  v_inicio timestamptz := case when p_desde is null then null else privado.inicio_dia(p_desde) end;
  v_fin timestamptz := case when p_hasta is null then null else privado.inicio_dia(p_hasta + 1) end;
begin
  v_institucion := privado.institucion_de_consulta(null);
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', i.id,
             'nombre', i.nombre,
             'slug', i.slug,
             'activa', i.activa,
             'creadoEn', i.creado_en,
             'cuestionarios', (
               select count(*) from public.aplicaciones a
               where a.institucion_id = i.id
                 and (v_inicio is null or a.creado_en >= v_inicio)
                 and (v_fin is null or a.creado_en < v_fin)
             ),
             'personas', (
               select count(distinct privado.clave_persona(a.institucion_id, pa.nombre, pa.correo, pa.acudiente))
               from public.aplicaciones a
               join public.participantes pa on pa.id = a.participante_id
               where a.institucion_id = i.id
                 and (v_inicio is null or a.creado_en >= v_inicio)
                 and (v_fin is null or a.creado_en < v_fin)
             ),
             'prioritariosPendientes', (
               select count(*) from public.aplicaciones a
               where a.institucion_id = i.id and a.prioridad and a.estado_seguimiento = 'pendiente'
             ),
             'ultimoCuestionario', (
               select max(a.creado_en) from public.aplicaciones a where a.institucion_id = i.id
             ),
             'visitas', (
               select count(*) from public.visitas v
               where v.institucion_id = i.id
                 and (v_inicio is null or v.creado_en >= v_inicio)
                 and (v_fin is null or v.creado_en < v_fin)
             ),
             'administradores', (
               select count(*) from public.perfiles p
               where p.institucion_id = i.id and p.activo
             )
           ) order by i.creado_en, i.slug)
    from public.instituciones i
    where v_institucion is null or i.id = v_institucion
  ), '[]'::jsonb);
end
$$;

-- El general cambia el nombre, el enlace (slug) o el estado de una institución. Queda en la
-- auditoría (disparador de la tabla).
create function public.panel_institucion_actualizar(
  p_id uuid,
  p_nombre text,
  p_slug text,
  p_activa boolean
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_fila public.instituciones;
begin
  perform privado.exigir_superadministrador();
  if char_length(btrim(coalesce(p_nombre, ''))) not between 2 and 120 then
    raise exception 'El nombre debe tener entre 2 y 120 caracteres.' using errcode = 'invalid_parameter_value';
  end if;
  if coalesce(lower(btrim(p_slug)), '') !~ '^[a-z0-9-]{3,40}$' then
    raise exception 'El enlace solo admite minúsculas, números y guiones (3 a 40).' using errcode = 'invalid_parameter_value';
  end if;
  if p_activa is null then
    raise exception 'Indica si la institución queda activa.' using errcode = 'invalid_parameter_value';
  end if;

  update public.instituciones
  set nombre = btrim(p_nombre), slug = lower(btrim(p_slug)), activa = p_activa
  where id = p_id
  returning * into v_fila;
  if v_fila.id is null then
    raise exception 'La institución no existe.' using errcode = 'no_data_found';
  end if;

  return jsonb_build_object('id', v_fila.id, 'nombre', v_fila.nombre, 'slug', v_fila.slug, 'activa', v_fila.activa);
exception
  when unique_violation then
    raise exception 'Ya hay otra institución con ese enlace.' using errcode = 'unique_violation';
end
$$;

-- Administradores del panel: el general y los institucionales, con su estado de ingreso.
create function public.panel_administradores()
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
             'ultimoIngreso', u.last_sign_in_at,
             'dobleFactor', exists (
               select 1 from auth.mfa_factors f where f.user_id = p.id and f.status = 'verified'
             )
           ) order by (p.rol = 'superadministrador') desc, i.creado_en nulls first, p.nombre)
    from public.perfiles p
    join auth.users u on u.id = p.id
    left join public.instituciones i on i.id = p.institucion_id
    where p.rol in ('superadministrador', 'administrador_institucional')
  ), '[]'::jsonb);
end
$$;

-- El general activa o desactiva a un administrador institucional, o lo pasa a otra institución.
create function public.panel_administrador_actualizar(
  p_id uuid,
  p_activo boolean,
  p_institucion uuid default null
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_rol public.rol_panel;
begin
  perform privado.exigir_superadministrador();
  if p_id = auth.uid() then
    raise exception 'No puedes cambiar tu propia cuenta.' using errcode = 'insufficient_privilege';
  end if;
  select p.rol into v_rol from public.perfiles p where p.id = p_id;
  if v_rol is null then
    raise exception 'Ese administrador no existe.' using errcode = 'no_data_found';
  end if;
  if v_rol <> 'administrador_institucional' then
    raise exception 'Solo se cambian administradores institucionales.' using errcode = 'invalid_parameter_value';
  end if;
  if p_activo is null
     or not exists (select 1 from public.instituciones i where i.id = coalesce(p_institucion, (
       select p.institucion_id from public.perfiles p where p.id = p_id))) then
    raise exception 'Revisa el estado y la institución.' using errcode = 'invalid_parameter_value';
  end if;

  update public.perfiles
  set activo = p_activo,
      institucion_id = coalesce(p_institucion, institucion_id)
  where id = p_id;
end
$$;

-- Auditoría para el general, con filtros por institución, fecha y acción.
create function public.panel_auditoria(
  p_institucion uuid default null,
  p_desde date default null,
  p_hasta date default null,
  p_accion text default null,
  p_pagina integer default 1,
  p_tamano integer default 50
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tamano integer := least(greatest(coalesce(p_tamano, 50), 10), 200);
  v_pagina integer := greatest(coalesce(p_pagina, 1), 1);
  v_resultado jsonb;
begin
  perform privado.exigir_superadministrador();
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  with filtradas as (
    select a.*, count(*) over () as total
    from public.auditoria a
    where (p_institucion is null or a.institucion_id = p_institucion)
      and (p_desde is null or a.ocurrido_en >= privado.inicio_dia(p_desde))
      and (p_hasta is null or a.ocurrido_en < privado.inicio_dia(p_hasta + 1))
      and (nullif(btrim(p_accion), '') is null or a.accion = btrim(p_accion))
    order by a.ocurrido_en desc, a.id desc
    limit v_tamano offset (v_pagina - 1) * v_tamano
  )
  select jsonb_build_object(
    'total', coalesce((select max(f.total) from filtradas f), 0),
    'pagina', v_pagina,
    'tamano', v_tamano,
    'acciones', (select coalesce(jsonb_agg(distinct x.accion), '[]'::jsonb) from public.auditoria x),
    'filas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id,
               'ocurridoEn', f.ocurrido_en,
               'actor', pf.nombre,
               'actorRol', f.actor_rol,
               'accion', f.accion,
               'entidad', f.entidad,
               'entidadId', f.entidad_id,
               'institucion', i.nombre,
               'detalle', f.detalle
             ) order by f.ocurrido_en desc, f.id desc)
      from filtradas f
      left join public.perfiles pf on pf.id = f.actor_id
      left join public.instituciones i on i.id = f.institucion_id
    ), '[]'::jsonb)
  ) into v_resultado;

  return v_resultado;
end
$$;

-- =============================================================================================
-- Permisos: nada nuevo queda abierto por defecto
-- =============================================================================================
revoke all on function privado.institucion_actual() from public, anon, authenticated;
revoke all on function privado.puede_ver_institucion(uuid) from public, anon, authenticated;
revoke all on function privado.institucion_de_consulta(uuid) from public, anon, authenticated;
revoke all on function privado.exigir_superadministrador() from public, anon, authenticated;
revoke all on function privado.clave_persona(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function privado.auditar(text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function privado.censo_personas(date, date, public.modulo, text, uuid) from public, anon, authenticated;
-- Las políticas las llaman con el rol de quien consulta.
grant execute on function privado.institucion_actual() to authenticated;
grant execute on function privado.puede_ver_institucion(uuid) to authenticated;

revoke all on function public.mi_perfil() from public, anon;
grant execute on function public.mi_perfil() to authenticated;

revoke all on function public.institucion_publica(text) from public;
grant execute on function public.institucion_publica(text) to anon, authenticated;

revoke all on function public.registrar_visita(public.tipo_dispositivo, text) from public;
grant execute on function public.registrar_visita(public.tipo_dispositivo, text) to anon, authenticated;

revoke all on function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb, uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb, uuid, text) to service_role;

revoke all on function public.crear_perfil_invitado(uuid, uuid, text, public.rol_panel, uuid) from public, anon, authenticated;
grant execute on function public.crear_perfil_invitado(uuid, uuid, text, public.rol_panel, uuid) to service_role;

revoke all on function public.panel_tablero(date, date, public.modulo, text, uuid) from public, anon;
revoke all on function public.panel_registros(text, date, date, public.modulo, text, public.resultado_general,
  text, text, boolean, public.estado_seguimiento, text, boolean, integer, integer, uuid) from public, anon;
revoke all on function public.panel_detalle(uuid) from public, anon;
revoke all on function public.panel_prioritarios(uuid) from public, anon;
revoke all on function public.panel_censo(date, date, public.modulo, text, uuid) from public, anon;
revoke all on function public.panel_censo_personas(date, date, public.modulo, text, text, text, text, text,
  integer, integer, uuid) from public, anon;
revoke all on function public.panel_censo_exportar(text, date, date, public.modulo, text, uuid) from public, anon;
revoke all on function public.panel_visitas(date, date, uuid) from public, anon;
revoke all on function public.reporte_agregado(date, date, uuid) from public, anon;
revoke all on function public.panel_instituciones(date, date) from public, anon;
revoke all on function public.panel_institucion_actualizar(uuid, text, text, boolean) from public, anon;
revoke all on function public.panel_administradores() from public, anon;
revoke all on function public.panel_administrador_actualizar(uuid, boolean, uuid) from public, anon;
revoke all on function public.panel_auditoria(uuid, date, date, text, integer, integer) from public, anon;

grant execute on function public.panel_tablero(date, date, public.modulo, text, uuid) to authenticated;
grant execute on function public.panel_registros(text, date, date, public.modulo, text, public.resultado_general,
  text, text, boolean, public.estado_seguimiento, text, boolean, integer, integer, uuid) to authenticated;
grant execute on function public.panel_detalle(uuid) to authenticated;
grant execute on function public.panel_prioritarios(uuid) to authenticated;
grant execute on function public.panel_censo(date, date, public.modulo, text, uuid) to authenticated;
grant execute on function public.panel_censo_personas(date, date, public.modulo, text, text, text, text, text,
  integer, integer, uuid) to authenticated;
grant execute on function public.panel_censo_exportar(text, date, date, public.modulo, text, uuid) to authenticated;
grant execute on function public.panel_visitas(date, date, uuid) to authenticated;
grant execute on function public.reporte_agregado(date, date, uuid) to authenticated;
grant execute on function public.panel_instituciones(date, date) to authenticated;
grant execute on function public.panel_institucion_actualizar(uuid, text, text, boolean) to authenticated;
grant execute on function public.panel_administradores() to authenticated;
grant execute on function public.panel_administrador_actualizar(uuid, boolean, uuid) to authenticated;
grant execute on function public.panel_auditoria(uuid, date, date, text, integer, integer) to authenticated;
