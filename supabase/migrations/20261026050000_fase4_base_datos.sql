-- Mente al Día · Fase 4: base de datos, permisos por rol y registro de auditoría.
--
-- Principios (ver docs/DECISIONES.md, D-29 a D-37):
--   - Nadie lee ni escribe directamente los datos personales: participantes y consentimientos no
--     tienen permisos para anon ni authenticated. Se consultan con funciones que dejan auditoría.
--   - Las aplicaciones solo las crea el servidor (Edge Function «enviar-cuestionario», con la
--     service role), que calcula el resultado oficial con el motor y las reglas vigentes.
--   - El panel exige una cuenta activa con perfil y doble factor (aal2) en cada consulta.
--   - Todo cambio relevante queda en public.auditoria, que no se puede editar ni borrar.
--
-- Supabase abre por defecto todo lo del esquema public a anon y authenticated; por eso aquí se
-- revoca todo y se concede solo lo necesario, además de activar RLS en cada tabla.

-- ---------------------------------------------------------------------------------------------
-- Esquema privado: funciones auxiliares que la API (PostgREST) no expone.
-- ---------------------------------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;

-- ---------------------------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------------------------
create type public.rol_panel as enum ('superadministrador', 'profesional', 'consulta');
create type public.modulo as enum ('nino', 'adolescente', 'adulto');
create type public.resultado_general as enum ('favorable', 'por_fortalecer', 'desafios', 'insuficiente');
create type public.estado_seguimiento as enum ('pendiente', 'en_contacto', 'orientado', 'remitido', 'cerrado');
create type public.tipo_consentimiento as enum ('tratamiento_datos', 'datos_sensibles', 'autorizacion_acudiente');

-- ---------------------------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------------------------

-- Personas del equipo con acceso al panel. Las cuentas se crean por invitación (D-31).
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  rol public.rol_panel not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.perfiles is 'Equipo del panel. Rol: superadministrador, profesional o consulta.';

-- Datos personales de quien responde (y del adulto responsable en el módulo infantil).
create table public.participantes (
  id uuid primary key default gen_random_uuid(),
  modulo public.modulo not null,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  correo text check (char_length(correo) <= 254),
  telefono text check (char_length(telefono) <= 30),
  lugar_residencia text check (char_length(lugar_residencia) <= 120),
  edad smallint check (edad between 5 and 120),
  grado text check (char_length(grado) <= 40),
  sexo text check (char_length(sexo) <= 40),
  acudiente jsonb check (acudiente is null or jsonb_typeof(acudiente) = 'object'),
  creado_en timestamptz not null default now(),
  constraint participantes_nino_con_acudiente check (modulo <> 'nino' or acudiente is not null)
);
comment on table public.participantes is
  'DATOS PERSONALES. Sin permisos directos: se leen con ver_datos_contacto o reporte_nominal, que dejan auditoría.';

create table public.consentimientos (
  id bigint generated always as identity primary key,
  participante_id uuid not null references public.participantes (id) on delete cascade,
  tipo public.tipo_consentimiento not null,
  version_texto text not null,
  aceptado_en timestamptz not null default now(),
  unique (participante_id, tipo)
);

-- Reglas de resultados con versión (Anexo G). Una sola vigente; las versiones no se editan.
create table public.reglas_resultados (
  version text primary key,
  reglas jsonb not null check (jsonb_typeof(reglas) = 'object'),
  vigente boolean not null default false,
  nota_validacion text,
  creado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  constraint reglas_resultados_version_coincide check (reglas ->> 'version' = version)
);
create unique index reglas_resultados_una_vigente on public.reglas_resultados (vigente) where vigente;

-- Parámetros editables desde el panel (Fase 9). «publica» = la puede leer el sitio sin sesión.
create table public.configuracion (
  clave text primary key check (clave ~ '^[a-z][a-z0-9_]*$'),
  valor jsonb not null,
  publica boolean not null default false,
  descripcion text,
  actualizado_por uuid default auth.uid() references public.perfiles (id) on delete set null,
  actualizado_en timestamptz not null default now()
);

create sequence public.aplicaciones_codigo_seq;

create function privado.siguiente_codigo() returns text
language sql volatile security definer set search_path = '' as $$
  select 'MD-' || lpad(n::text, greatest(4, char_length(n::text)), '0')
  from (select nextval('public.aplicaciones_codigo_seq') as n) s
$$;

-- Cada cuestionario respondido. No guarda nombre ni contacto: solo el código, el módulo, la edad,
-- el lugar de residencia y el resultado oficial calculado en el servidor.
create table public.aplicaciones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default privado.siguiente_codigo(),
  participante_id uuid not null references public.participantes (id) on delete cascade,
  modulo public.modulo not null,
  edad smallint,
  lugar_residencia text,
  respuestas jsonb not null check (jsonb_typeof(respuestas) = 'array'),
  resultado jsonb not null check (jsonb_typeof(resultado) = 'object'),
  resultado_general public.resultado_general not null,
  indice smallint check (indice between 0 and 100),
  prioridad boolean not null,
  ruta_atencion_especial boolean not null,
  resultado_parcial boolean not null,
  reglas_version text not null references public.reglas_resultados (version),
  instrumento_version text not null,
  estado_seguimiento public.estado_seguimiento,
  asignado_a uuid references public.perfiles (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index aplicaciones_creado_en on public.aplicaciones (creado_en desc);
create index aplicaciones_prioridad on public.aplicaciones (creado_en desc) where prioridad;
create index aplicaciones_participante on public.aplicaciones (participante_id);
create index aplicaciones_asignado on public.aplicaciones (asignado_a);

-- Notas del seguimiento: no se editan ni se borran.
create table public.notas_seguimiento (
  id bigint generated always as identity primary key,
  aplicacion_id uuid not null references public.aplicaciones (id) on delete cascade,
  autor_id uuid default auth.uid() references public.perfiles (id) on delete set null,
  texto text not null check (char_length(btrim(texto)) between 1 and 4000),
  creado_en timestamptz not null default now()
);
create index notas_seguimiento_aplicacion on public.notas_seguimiento (aplicacion_id, creado_en);

-- Registro de auditoría de solo lectura. Sin llaves foráneas: debe sobrevivir a los borrados.
-- El detalle nunca guarda nombres, correos ni teléfonos.
create table public.auditoria (
  id bigint generated always as identity primary key,
  ocurrido_en timestamptz not null default now(),
  actor_id uuid,
  actor_rol text,
  accion text not null,
  entidad text not null,
  entidad_id text,
  detalle jsonb not null default '{}'::jsonb
);
create index auditoria_ocurrido_en on public.auditoria (ocurrido_en desc);
create index auditoria_entidad on public.auditoria (entidad, entidad_id);

-- ---------------------------------------------------------------------------------------------
-- Funciones auxiliares (privado)
-- ---------------------------------------------------------------------------------------------

-- Rol de quien consulta, solo si su perfil está activo y la sesión tiene doble factor (aal2).
-- Si no se cumple, devuelve null y todas las políticas niegan el acceso.
create function privado.rol_actual() returns public.rol_panel
language sql stable security definer set search_path = '' as $$
  select p.rol
  from public.perfiles p
  where p.id = auth.uid()
    and p.activo
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

create function privado.es_equipo() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(privado.rol_actual() in ('superadministrador', 'profesional'), false)
$$;

create function privado.es_superadministrador() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(privado.rol_actual() = 'superadministrador', false)
$$;

-- Actor de la acción: la persona de la sesión o, en procesos del servidor, la indicada en
-- la variable de transacción mad.actor_id (por ejemplo, quien envió una invitación).
create function privado.actor_actual() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(auth.uid(), nullif(current_setting('mad.actor_id', true), '')::uuid)
$$;

create function privado.auditar(
  p_accion text,
  p_entidad text,
  p_entidad_id text,
  p_detalle jsonb default '{}'::jsonb
) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_actor uuid := privado.actor_actual();
begin
  insert into public.auditoria (actor_id, actor_rol, accion, entidad, entidad_id, detalle)
  values (
    v_actor,
    coalesce((select p.rol::text from public.perfiles p where p.id = v_actor), case when v_actor is null then 'sistema' end),
    p_accion,
    p_entidad,
    p_entidad_id,
    coalesce(p_detalle, '{}'::jsonb)
  );
end
$$;

-- Disparador genérico. TG_ARGV[0] = columna que identifica la fila; el resto, columnas que no
-- se copian al detalle (por ejemplo, el texto de una nota).
create function privado.auditar_cambio() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_excluidas text[] := coalesce(TG_ARGV[1:TG_NARGS - 1], '{}') || array['actualizado_en'];
  v_antes jsonb;
  v_despues jsonb;
  v_detalle jsonb := '{}'::jsonb;
  v_clave text;
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

  perform privado.auditar(
    case TG_OP when 'INSERT' then 'crear' when 'UPDATE' then 'actualizar' else 'eliminar' end,
    TG_TABLE_NAME,
    coalesce(v_despues, v_antes) ->> TG_ARGV[0],
    v_detalle
  );
  return null;
end
$$;

create function privado.auditoria_inmutable() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'El registro de auditoría es de solo lectura.' using errcode = 'insufficient_privilege';
end
$$;

create function privado.tocar_actualizado_en() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado_en := now();
  return new;
end
$$;

-- Reglas de negocio de las actualizaciones que el panel puede hacer directamente.
create function privado.validar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.id = auth.uid() and (new.rol is distinct from old.rol or new.activo is distinct from old.activo) then
    raise exception 'No puedes cambiar tu propio rol ni desactivar tu propia cuenta.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$$;

create function privado.validar_aplicacion() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.asignado_a is not null and new.asignado_a is distinct from old.asignado_a and not exists (
    select 1 from public.perfiles p
    where p.id = new.asignado_a and p.activo and p.rol in ('superadministrador', 'profesional')
  ) then
    raise exception 'Solo se puede asignar a un profesional activo.' using errcode = 'check_violation';
  end if;
  if new.asignado_a is not null and new.estado_seguimiento is null then
    new.estado_seguimiento := 'pendiente';
  end if;
  return new;
end
$$;

create function privado.validar_reglas() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.version is distinct from old.version or new.reglas is distinct from old.reglas then
    raise exception 'Las reglas de una versión no se modifican: crea una versión nueva.'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------------------------
-- Disparadores
-- ---------------------------------------------------------------------------------------------
create trigger auditoria_sin_cambios before update or delete on public.auditoria
  for each row execute function privado.auditoria_inmutable();
create trigger auditoria_sin_truncate before truncate on public.auditoria
  for each statement execute function privado.auditoria_inmutable();

create trigger perfiles_actualizado_en before update on public.perfiles
  for each row execute function privado.tocar_actualizado_en();
create trigger perfiles_validar before update on public.perfiles
  for each row execute function privado.validar_perfil();
create trigger perfiles_auditar after insert or update or delete on public.perfiles
  for each row execute function privado.auditar_cambio('id');

create trigger aplicaciones_actualizado_en before update on public.aplicaciones
  for each row execute function privado.tocar_actualizado_en();
create trigger aplicaciones_validar before update on public.aplicaciones
  for each row execute function privado.validar_aplicacion();
create trigger aplicaciones_auditar after update on public.aplicaciones
  for each row execute function privado.auditar_cambio('codigo', 'respuestas', 'resultado');

create trigger notas_auditar after insert on public.notas_seguimiento
  for each row execute function privado.auditar_cambio('aplicacion_id', 'texto');

create trigger reglas_validar before update on public.reglas_resultados
  for each row execute function privado.validar_reglas();
create trigger reglas_auditar after insert or update or delete on public.reglas_resultados
  for each row execute function privado.auditar_cambio('version');

create trigger configuracion_actualizado_en before update on public.configuracion
  for each row execute function privado.tocar_actualizado_en();
create trigger configuracion_auditar after insert or update or delete on public.configuracion
  for each row execute function privado.auditar_cambio('clave');

-- ---------------------------------------------------------------------------------------------
-- Permisos y RLS
-- ---------------------------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema privado from public, anon, authenticated;

alter table public.perfiles enable row level security;
alter table public.participantes enable row level security;
alter table public.consentimientos enable row level security;
alter table public.reglas_resultados enable row level security;
alter table public.configuracion enable row level security;
alter table public.aplicaciones enable row level security;
alter table public.notas_seguimiento enable row level security;
alter table public.auditoria enable row level security;

-- Las políticas llaman a estas funciones con el rol de quien consulta.
grant execute on function privado.rol_actual() to authenticated;
grant execute on function privado.es_equipo() to authenticated;
grant execute on function privado.es_superadministrador() to authenticated;

-- perfiles: cada quien ve el suyo; el equipo ve los nombres de sus colegas (asignaciones, notas).
grant select on public.perfiles to authenticated;
grant update (nombre, rol, activo) on public.perfiles to authenticated;
create policy perfiles_leer on public.perfiles for select to authenticated
  using (id = auth.uid() or privado.es_equipo());
create policy perfiles_editar on public.perfiles for update to authenticated
  using (privado.es_superadministrador())
  with check (privado.es_superadministrador());

-- participantes y consentimientos: sin permisos ni políticas para anon y authenticated.

-- reglas_resultados: las lee todo el panel; el superadministrador crea versiones y las anota.
grant select on public.reglas_resultados to authenticated;
grant insert (version, reglas, nota_validacion) on public.reglas_resultados to authenticated;
grant update (nota_validacion) on public.reglas_resultados to authenticated;
create policy reglas_leer on public.reglas_resultados for select to authenticated
  using (privado.rol_actual() is not null);
create policy reglas_crear on public.reglas_resultados for insert to authenticated
  with check (privado.es_superadministrador() and not vigente);
create policy reglas_anotar on public.reglas_resultados for update to authenticated
  using (privado.es_superadministrador())
  with check (privado.es_superadministrador());

-- configuracion: lo público lo lee cualquiera; el resto, el panel; solo el superadministrador edita.
grant select on public.configuracion to anon, authenticated;
grant insert (clave, valor, publica, descripcion), update (valor, publica, descripcion), delete
  on public.configuracion to authenticated;
create policy configuracion_leer_publica on public.configuracion for select to anon, authenticated
  using (publica);
create policy configuracion_leer_panel on public.configuracion for select to authenticated
  using (privado.rol_actual() is not null);
create policy configuracion_crear on public.configuracion for insert to authenticated
  with check (privado.es_superadministrador());
create policy configuracion_editar on public.configuracion for update to authenticated
  using (privado.es_superadministrador())
  with check (privado.es_superadministrador());
create policy configuracion_borrar on public.configuracion for delete to authenticated
  using (privado.es_superadministrador());

-- aplicaciones: superadministrador y profesionales; solo cambian estado y asignación.
-- El rol «consulta» no ve registros: usa reporte_agregado.
grant select on public.aplicaciones to authenticated;
grant update (estado_seguimiento, asignado_a) on public.aplicaciones to authenticated;
create policy aplicaciones_leer on public.aplicaciones for select to authenticated
  using (privado.es_equipo());
create policy aplicaciones_seguimiento on public.aplicaciones for update to authenticated
  using (privado.es_equipo())
  with check (privado.es_equipo());

-- notas_seguimiento: el equipo las lee y agrega a su nombre; nadie las edita ni las borra.
grant select on public.notas_seguimiento to authenticated;
grant insert (aplicacion_id, texto) on public.notas_seguimiento to authenticated;
create policy notas_leer on public.notas_seguimiento for select to authenticated
  using (privado.es_equipo());
create policy notas_crear on public.notas_seguimiento for insert to authenticated
  with check (privado.es_equipo() and autor_id = auth.uid());

-- auditoria: solo lectura, solo el superadministrador.
grant select on public.auditoria to authenticated;
create policy auditoria_leer on public.auditoria for select to authenticated
  using (privado.es_superadministrador());

-- ---------------------------------------------------------------------------------------------
-- Funciones de la API (public). Todas con search_path vacío y permisos explícitos.
-- ---------------------------------------------------------------------------------------------

-- Perfil de la sesión, aunque todavía no tenga doble factor (el panel lo usa para guiar el ingreso).
create function public.mi_perfil()
returns table (id uuid, nombre text, rol public.rol_panel, activo boolean, doble_factor boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.nombre, p.rol, p.activo, coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
  from public.perfiles p
  where p.id = auth.uid()
$$;

-- Datos de contacto de una aplicación. Cada consulta queda en la auditoría.
create function public.ver_datos_contacto(p_aplicacion uuid, p_motivo text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
  v_datos jsonb;
begin
  if not privado.es_equipo() then
    raise exception 'No tienes permiso para ver datos de contacto.' using errcode = 'insufficient_privilege';
  end if;

  select a.codigo,
         jsonb_build_object(
           'nombre', pa.nombre,
           'correo', pa.correo,
           'telefono', pa.telefono,
           'lugarResidencia', pa.lugar_residencia,
           'grado', pa.grado,
           'sexo', pa.sexo,
           'acudiente', pa.acudiente
         )
    into v_codigo, v_datos
  from public.aplicaciones a
  join public.participantes pa on pa.id = a.participante_id
  where a.id = p_aplicacion;

  if v_codigo is null then
    raise exception 'La aplicación no existe.' using errcode = 'no_data_found';
  end if;

  perform privado.auditar('ver_datos_contacto', 'aplicaciones', v_codigo,
    jsonb_strip_nulls(jsonb_build_object('motivo', nullif(btrim(p_motivo), ''))));
  return v_datos;
end
$$;

-- Reporte agregado sin datos personales, por semana, módulo, lugar y resultado.
create function public.reporte_agregado(p_desde date, p_hasta date)
returns table (
  semana date,
  modulo public.modulo,
  lugar_residencia text,
  resultado_general public.resultado_general,
  prioridad boolean,
  total bigint
)
language plpgsql volatile security definer set search_path = '' as $$
begin
  if privado.rol_actual() is null then
    raise exception 'No tienes permiso para ver reportes.' using errcode = 'insufficient_privilege';
  end if;
  if p_desde is null or p_hasta is null or p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  perform privado.auditar('reporte_agregado', 'aplicaciones', null,
    jsonb_build_object('desde', p_desde, 'hasta', p_hasta));

  return query
    select date_trunc('week', a.creado_en)::date, a.modulo, a.lugar_residencia,
           a.resultado_general, a.prioridad, count(*)
    from public.aplicaciones a
    where a.creado_en >= p_desde and a.creado_en < p_hasta + 1
    group by 1, 2, 3, 4, 5
    order by 1, 2, 3, 4, 5;
end
$$;

-- Reporte nominal (con datos personales): solo el superadministrador, con motivo, y auditado.
create function public.reporte_nominal(p_desde date, p_hasta date, p_motivo text)
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
  where a.creado_en >= p_desde and a.creado_en < p_hasta + 1;

  perform privado.auditar('reporte_nominal', 'aplicaciones', null,
    jsonb_build_object('desde', p_desde, 'hasta', p_hasta, 'motivo', btrim(p_motivo), 'registros', v_total));

  return query
    select a.codigo, a.creado_en, a.modulo, pa.nombre, pa.correo, pa.telefono, pa.lugar_residencia,
           a.resultado_general, a.prioridad, a.estado_seguimiento
    from public.aplicaciones a
    join public.participantes pa on pa.id = a.participante_id
    where a.creado_en >= p_desde and a.creado_en < p_hasta + 1
    order by a.creado_en;
end
$$;

-- Cambia la versión vigente de las reglas (la Edge Function calcula siempre con la vigente).
create function public.activar_reglas(p_version text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not privado.es_superadministrador() then
    raise exception 'Solo el superadministrador cambia las reglas vigentes.' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from public.reglas_resultados r where r.version = p_version) then
    raise exception 'La versión de reglas no existe.' using errcode = 'no_data_found';
  end if;
  update public.reglas_resultados set vigente = false where vigente and version <> p_version;
  update public.reglas_resultados set vigente = true where version = p_version and not vigente;
end
$$;

-- Guarda una aplicación completa en una sola transacción. Solo la llama la Edge Function
-- «enviar-cuestionario» (service role) después de calcular el resultado oficial.
create function public.registrar_aplicacion(
  p_participante jsonb,
  p_consentimientos jsonb,
  p_respuestas jsonb,
  p_resultado jsonb
) returns table (id uuid, codigo text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_modulo public.modulo := (p_participante ->> 'modulo')::public.modulo;
  v_participante uuid;
  v_aplicacion uuid;
  v_codigo text;
  v_tipo public.tipo_consentimiento;
  v_requeridos public.tipo_consentimiento[] := array['tratamiento_datos', 'datos_sensibles'];
  v_prioridad boolean := (p_resultado ->> 'prioridad')::boolean;
begin
  if v_modulo = 'nino' then
    v_requeridos := v_requeridos || 'autorizacion_acudiente'::public.tipo_consentimiento;
  end if;
  foreach v_tipo in array v_requeridos loop
    if coalesce(jsonb_typeof(p_consentimientos -> v_tipo::text), '') <> 'string' then
      raise exception 'Falta la autorización «%».', v_tipo using errcode = 'check_violation';
    end if;
  end loop;

  insert into public.participantes (modulo, nombre, correo, telefono, lugar_residencia, edad, grado, sexo, acudiente)
  values (
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
    participante_id, modulo, edad, lugar_residencia, respuestas, resultado, resultado_general,
    indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
    instrumento_version, estado_seguimiento
  )
  values (
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
    case when v_prioridad then 'pendiente'::public.estado_seguimiento end
  )
  returning aplicaciones.id, aplicaciones.codigo into v_aplicacion, v_codigo;

  perform privado.auditar('crear', 'aplicaciones', v_codigo, jsonb_build_object(
    'modulo', v_modulo,
    'resultadoGeneral', p_resultado ->> 'resultadoGeneral',
    'prioridad', v_prioridad,
    'reglasVersion', p_resultado ->> 'reglasVersion'
  ));

  return query select v_aplicacion, v_codigo;
end
$$;

-- Crea el perfil de una persona invitada. Solo la llama la Edge Function «invitar-usuario».
create function public.crear_perfil_invitado(
  p_actor uuid,
  p_id uuid,
  p_nombre text,
  p_rol public.rol_panel
) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.perfiles p
    where p.id = p_actor and p.activo and p.rol = 'superadministrador'
  ) then
    raise exception 'Solo un superadministrador activo puede invitar.' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('mad.actor_id', p_actor::text, true);
  insert into public.perfiles (id, nombre, rol) values (p_id, btrim(p_nombre), p_rol);
end
$$;

-- Borra los datos de quienes superaron el tiempo de conservación (parámetro retencion_meses).
-- Mientras la oficina jurídica no lo defina (pendiente 12) el valor es null y no borra nada.
-- Se programa con pg_cron en la Fase 11.
create function public.purgar_datos_vencidos() returns integer
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_meses integer;
  v_borrados integer;
begin
  select (c.valor #>> '{}')::integer into v_meses
  from public.configuracion c where c.clave = 'retencion_meses';
  if v_meses is null then
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

revoke all on function public.mi_perfil() from public, anon;
revoke all on function public.ver_datos_contacto(uuid, text) from public, anon;
revoke all on function public.reporte_agregado(date, date) from public, anon;
revoke all on function public.reporte_nominal(date, date, text) from public, anon;
revoke all on function public.activar_reglas(text) from public, anon;
revoke all on function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.crear_perfil_invitado(uuid, uuid, text, public.rol_panel) from public, anon, authenticated;
revoke all on function public.purgar_datos_vencidos() from public, anon, authenticated;

grant execute on function public.mi_perfil() to authenticated;
grant execute on function public.ver_datos_contacto(uuid, text) to authenticated;
grant execute on function public.reporte_agregado(date, date) to authenticated;
grant execute on function public.reporte_nominal(date, date, text) to authenticated;
grant execute on function public.activar_reglas(text) to authenticated;
grant execute on function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb) to service_role;
grant execute on function public.crear_perfil_invitado(uuid, uuid, text, public.rol_panel) to service_role;
grant execute on function public.purgar_datos_vencidos() to service_role;

-- ---------------------------------------------------------------------------------------------
-- Datos iniciales
-- ---------------------------------------------------------------------------------------------

-- Reglas 0.1-provisional (Anexo G), idénticas a src/content/v1/reglas.ts. La prueba
-- src/content/v1/reglas-bd.test.ts verifica que coincidan.
insert into public.reglas_resultados (version, reglas, vigente, nota_validacion, creado_por)
values (
  '0.1-provisional',
  $json${
    "version": "0.1-provisional",
    "puntos": { "si": 2, "a_veces": 1, "no": 0 },
    "umbralFavorable": 80,
    "umbralDesafios": 50,
    "minRespondidas": 10,
    "minRespondidasCompleto": 14,
    "ajusteAtencionNoFavorable": 3,
    "ajusteAtencionDesafios": 6,
    "areasSensibles": [
      "valoracion_respeto",
      "regulacion_emocional",
      "seguridad_entorno",
      "afrontamiento_consumo_sustancias"
    ],
    "prioridadPorDesafios": true
  }$json$::jsonb,
  true,
  'PROVISIONAL: pendiente de validación por el equipo profesional (pendiente 1).',
  null
);

insert into public.configuracion (clave, valor, publica, descripcion, actualizado_por)
values
  ('retencion_meses', 'null'::jsonb, false,
   'Meses que se conservan los datos personales. Pendiente de la oficina jurídica (pendiente 12).', null),
  ('version_textos_legales', '"0.1-borrador"'::jsonb, true,
   'Versión de la política y de las autorizaciones que acepta quien responde (pendiente 11).', null);
