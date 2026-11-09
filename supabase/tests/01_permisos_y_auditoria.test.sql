-- Permisos por rol, cálculo guardado por el servidor y auditoría (Fase 4).
-- Se ejecuta con `supabase test db` o, sin Docker, con `corepack pnpm test:bd`. Solo mira sus propios
-- datos, así que también corre en el proyecto real (D-72), con códigos de prueba para no gastar los reales.
begin;
create extension if not exists pgtap with schema extensions;
select plan(69);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000002', 'profesional@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000003', 'consulta@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000004', 'inactivo@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000005', 'sin-perfil@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000006', 'invitado@ejemplo.gov.co');

-- Institución de prueba (ninguna de las reales): los datos de esta prueba viven en ella.
insert into public.instituciones (id, nombre, slug) values
  ('00000000-0000-0000-0000-0000000001e1', 'Institución Pruebapermisos', 'prueba-permisos');

-- «prof» es un administrador institucional; «consulta», un rol antiguo que ya no da acceso.
insert into public.perfiles (id, nombre, rol, activo, institucion_id) values
  ('00000000-0000-0000-0000-000000000001', 'Superadministración', 'superadministrador', true, null),
  ('00000000-0000-0000-0000-000000000002', 'Administración Pruebapermisos', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000001e1'),
  ('00000000-0000-0000-0000-000000000003', 'Consulta Uno', 'consulta', true, null),
  ('00000000-0000-0000-0000-000000000004', 'Administración Inactiva', 'administrador_institucional', false, '00000000-0000-0000-0000-0000000001e1');

create temporary table claims (nombre text primary key, valor text);
grant select on claims to anon, authenticated, service_role;
insert into claims values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}'),
  ('prof', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal2"}'),
  ('prof_aal1', '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated","aal":"aal1"}'),
  ('consulta', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}'),
  ('inactivo', '{"sub":"00000000-0000-0000-0000-000000000004","role":"authenticated","aal":"aal2"}'),
  ('sin_perfil', '{"sub":"00000000-0000-0000-0000-000000000005","role":"authenticated","aal":"aal2"}');

-- ------------------------------------------------------------------------------ estructura
select is(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0::bigint,
  'RLS está activo en todas las tablas de public'
);
select is(
  (select count(*) from public.reglas_resultados where vigente),
  1::bigint,
  'Hay exactamente una versión de reglas vigente'
);

-- --------------------------------------------------------------- registro desde el servidor
set local role anon;
select throws_ok(
  $$select * from public.registrar_aplicacion('{}', '{}', '[]', '{}')$$,
  '42501', null, 'anon no puede registrar aplicaciones directamente'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims where nombre = 'prof'), true);
select throws_ok(
  $$select * from public.registrar_aplicacion('{}', '{}', '[]', '{}')$$,
  '42501', null, 'Un profesional tampoco puede registrar aplicaciones directamente'
);
reset role;
select set_config('request.jwt.claims', '', true);

set local role service_role;
create temporary table registradas as
select * from public.registrar_aplicacion(
  '{"modulo":"adulto","nombre":"Persona Prueba","correo":"persona@correo.co","telefono":"3000000000","lugarResidencia":"Centro"}',
  '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
  '[{"areaId":"bienestar_emocional","valor":"no"}]',
  '{"resultadoGeneral":"desafios","indice":30,"prioridad":true,"rutaAtencionEspecial":true,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}',
  null, 'prueba-permisos'
);
insert into registradas
select * from public.registrar_aplicacion(
  '{"modulo":"nino","nombre":"Niña Prueba","edad":9,"grado":"Cuarto","acudiente":{"nombre":"Acudiente","parentesco":"Madre","correo":"acudiente@correo.co","telefono":"3110000000","lugarResidencia":"Zona rural"}}',
  '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador","autorizacion_acudiente":"0.1-borrador"}',
  '[{"areaId":"bienestar_emocional","valor":"si"}]',
  '{"resultadoGeneral":"favorable","indice":95,"prioridad":false,"rutaAtencionEspecial":false,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}',
  null, 'prueba-permisos'
);
select throws_ok(
  $$select * from public.registrar_aplicacion(
    '{"modulo":"nino","nombre":"Sin Autorización","acudiente":{"nombre":"A"}}',
    '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
    '[]',
    '{"resultadoGeneral":"favorable","indice":95,"prioridad":false,"rutaAtencionEspecial":false,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}',
    null, 'prueba-permisos'
  )$$,
  '23514', null, 'Sin la autorización del adulto responsable no se registra una aplicación infantil'
);
reset role;
grant select on registradas to anon, authenticated, service_role;
-- Los reportes de esta prueba miran una semana del año 2000, donde no hay casos reales.
update public.aplicaciones set creado_en = '2000-01-05 12:00:00-05' where id in (select id from registradas);

select is((select count(*) from registradas), 2::bigint, 'El servidor registra las dos aplicaciones');
select matches((select min(codigo) from registradas), '^MD-[0-9]{4,}$', 'Cada aplicación recibe un código MD-0000');
select is(
  (select estado_seguimiento::text from public.aplicaciones where prioridad and id in (select id from registradas)),
  'pendiente',
  'Una aplicación prioritaria entra en seguimiento como «pendiente»'
);
select is(
  (select estado_seguimiento from public.aplicaciones where not prioridad and id in (select id from registradas)),
  null,
  'Una aplicación no prioritaria no entra en seguimiento'
);
select is(
  (select lugar_residencia from public.aplicaciones where modulo = 'nino' and id in (select id from registradas)),
  'Zona rural',
  'En el módulo infantil el lugar se toma del adulto responsable'
);
select is(
  (select count(*) from public.consentimientos
   where participante_id in (select participante_id from public.aplicaciones where id in (select id from registradas))),
  5::bigint,
  'Se guardan las autorizaciones de cada participante con su versión'
);
select is(
  (select count(*) from public.auditoria where accion = 'crear' and entidad = 'aplicaciones' and actor_rol = 'sistema'
     and entidad_id in (select codigo from registradas)),
  2::bigint,
  'Cada aplicación registrada queda en la auditoría como acción del sistema'
);
select is(
  (select count(*) from public.auditoria where detalle::text ilike '%persona@correo.co%' or detalle::text ilike '%Persona Prueba%'),
  0::bigint,
  'La auditoría no guarda nombres ni correos'
);

-- ----------------------------------------------------------------------------------- anon
set local role anon;
select throws_ok($$select * from public.participantes$$, '42501', null, 'anon no lee participantes');
select throws_ok($$select * from public.aplicaciones$$, '42501', null, 'anon no lee aplicaciones');
select throws_ok($$select * from public.auditoria$$, '42501', null, 'anon no lee la auditoría');
select throws_ok($$select * from public.perfiles$$, '42501', null, 'anon no lee perfiles');
select results_eq(
  $$select clave from public.configuracion order by clave$$,
  array['version_textos_legales'],
  'anon solo lee la configuración pública'
);
select throws_ok(
  $$select * from public.reporte_agregado(current_date - 30, current_date)$$,
  '42501', null, 'anon no genera reportes'
);
reset role;

-- --------------------------------------------------------- sesiones sin acceso al panel
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims where nombre = 'prof_aal1'), true);
select is((select count(*) from public.aplicaciones), 0::bigint, 'Sin doble factor (aal1) un profesional no ve aplicaciones');
select is(
  (select doble_factor from public.mi_perfil()),
  false,
  'mi_perfil indica que falta el doble factor'
);
select throws_ok(
  $$select public.ver_datos_contacto((select id from registradas limit 1))$$,
  '42501', null, 'Sin doble factor no se ven datos de contacto'
);

select set_config('request.jwt.claims', (select valor from claims where nombre = 'inactivo'), true);
select is((select count(*) from public.aplicaciones), 0::bigint, 'Una cuenta desactivada no ve aplicaciones');

select set_config('request.jwt.claims', (select valor from claims where nombre = 'sin_perfil'), true);
select is((select count(*) from public.aplicaciones), 0::bigint, 'Una cuenta sin perfil no ve aplicaciones');
select is((select count(*) from public.mi_perfil()), 0::bigint, 'Una cuenta sin perfil no tiene perfil');

-- -------------------------------------------------------------------------------- consulta
select set_config('request.jwt.claims', (select valor from claims where nombre = 'consulta'), true);
select is((select count(*) from public.aplicaciones), 0::bigint, 'El rol consulta no ve registros individuales');
select throws_ok(
  $$select * from public.reporte_agregado('2000-01-01', '2000-01-31')$$,
  '42501', null, 'El rol consulta ya no genera reportes: no tiene acceso al panel'
);
select throws_ok(
  $$select public.ver_datos_contacto((select id from registradas limit 1))$$,
  '42501', null, 'El rol consulta no ve datos de contacto'
);
select throws_ok(
  $$select * from public.reporte_nominal(current_date - 30, current_date, 'Motivo suficientemente largo')$$,
  '42501', null, 'El rol consulta no genera el reporte nominal'
);
select is((select count(*) from public.reglas_resultados), 0::bigint, 'El rol consulta ya no lee las reglas');

-- ----------------------------------------------------------------------------- profesional
select set_config('request.jwt.claims', (select valor from claims where nombre = 'prof'), true);
select is((select count(*) from public.aplicaciones where id in (select id from registradas)), 2::bigint, 'Un administrador institucional con doble factor ve las aplicaciones de su institución');
select throws_ok($$select * from public.participantes$$, '42501', null, 'Un profesional no lee participantes directamente');
select throws_ok($$select * from public.consentimientos$$, '42501', null, 'Un profesional no lee consentimientos directamente');
select is(
  public.ver_datos_contacto((select id from public.aplicaciones where modulo = 'adulto' and id in (select id from registradas)), 'Primer contacto') ->> 'correo',
  'persona@correo.co',
  'Un profesional ve los datos de contacto con ver_datos_contacto'
);
select is((select count(*) from public.auditoria), 0::bigint, 'Un profesional no lee la auditoría');
select is((select count(*) from public.perfiles where id::text like '00000000-0000-0000-0000-00000000000_'), 2::bigint,
  'Un administrador institucional solo ve al equipo de su institución');
-- Con solo 2 registros, todo queda como grupo pequeño (ver 02_reportes_y_conservacion).
select results_eq(
  $$select grupos_pequenos, total from public.reporte_agregado('2000-01-01', '2000-01-31')$$,
  $$values (true, null::bigint)$$,
  'Un administrador institucional ve el reporte agregado de su institución, sin detalle de los grupos pequeños'
);

update public.aplicaciones set estado_seguimiento = 'en_contacto' where prioridad and id in (select id from registradas);
select is(
  (select estado_seguimiento::text from public.aplicaciones where prioridad and id in (select id from registradas)),
  'en_contacto',
  'Un profesional cambia el estado del seguimiento'
);
select throws_ok(
  $$update public.aplicaciones set resultado_general = 'favorable'$$,
  '42501', null, 'Nadie del panel puede cambiar el resultado oficial'
);
select throws_ok(
  $$update public.aplicaciones set asignado_a = '00000000-0000-0000-0000-000000000003' where prioridad and id in (select id from registradas)$$,
  '23514', null, 'No se asigna un caso a una cuenta de consulta'
);
update public.aplicaciones set asignado_a = '00000000-0000-0000-0000-000000000002' where not prioridad and id in (select id from registradas);
select is(
  (select estado_seguimiento::text from public.aplicaciones where not prioridad and id in (select id from registradas)),
  'pendiente',
  'Asignar un caso sin seguimiento lo deja en «pendiente»'
);

insert into public.notas_seguimiento (aplicacion_id, texto)
select id, 'Se realizó el primer contacto telefónico.' from public.aplicaciones where prioridad and id in (select id from registradas);
select is(
  (select autor_id from public.notas_seguimiento where aplicacion_id in (select id from registradas)),
  '00000000-0000-0000-0000-000000000002'::uuid,
  'Las notas quedan a nombre de quien las escribe'
);
select throws_ok(
  $$insert into public.notas_seguimiento (aplicacion_id, texto, autor_id)
    select id, 'Suplantación', '00000000-0000-0000-0000-000000000001' from public.aplicaciones limit 1$$,
  '42501', null, 'No se puede escribir una nota a nombre de otra persona'
);
select throws_ok($$update public.notas_seguimiento set texto = 'Cambio'$$, '42501', null, 'Las notas no se editan');
select throws_ok($$delete from public.notas_seguimiento$$, '42501', null, 'Las notas no se borran');

-- Ni siquiera ve ese perfil (no es de su institución): el intento no actualiza ninguna fila.
select results_eq(
  $$with cambio as (
      update public.perfiles set rol = 'superadministrador'
      where id = '00000000-0000-0000-0000-000000000003' returning 1)
    select count(*)::integer from cambio$$,
  $$values (0)$$,
  'Un administrador institucional no cambia roles'
);
select throws_ok(
  $$select public.activar_reglas('0.1-provisional')$$,
  '42501', null, 'Un profesional no cambia las reglas vigentes'
);
select throws_ok(
  $$select * from public.reporte_nominal(current_date - 30, current_date, 'Motivo suficientemente largo')$$,
  '42501', null, 'Un profesional no genera el reporte nominal'
);

-- ----------------------------------------------------------------------- superadministrador
select set_config('request.jwt.claims', (select valor from claims where nombre = 'super'), true);
select cmp_ok((select count(*) from public.auditoria), '>', 0::bigint, 'El superadministrador lee la auditoría');
select throws_ok($$update public.auditoria set accion = 'otra'$$, '42501', null, 'Nadie del panel edita la auditoría');
select throws_ok($$delete from public.auditoria$$, '42501', null, 'Nadie del panel borra la auditoría');

update public.perfiles set rol = 'profesional' where id = '00000000-0000-0000-0000-000000000003';
select is(
  (select rol::text from public.perfiles where id = '00000000-0000-0000-0000-000000000003'),
  'profesional',
  'El superadministrador cambia roles'
);
select throws_ok(
  $$update public.perfiles set activo = false where id = '00000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'El superadministrador no puede desactivar su propia cuenta'
);

insert into public.reglas_resultados (version, reglas, nota_validacion)
select '0.2-prueba', jsonb_set(reglas, '{version}', '"0.2-prueba"'), 'Versión de prueba'
from public.reglas_resultados where version = '0.1-provisional';
select throws_ok(
  $$update public.reglas_resultados set reglas = '{"version":"0.2-prueba"}' where version = '0.2-prueba'$$,
  '42501', null, 'El contenido de una versión de reglas no se edita'
);
select public.activar_reglas('0.2-prueba');
select results_eq(
  $$select version from public.reglas_resultados where vigente$$,
  array['0.2-prueba'],
  'activar_reglas deja una sola versión vigente'
);

select throws_ok(
  $$select * from public.reporte_nominal(current_date - 30, current_date, 'corto')$$,
  '22023', null, 'El reporte nominal exige un motivo'
);
select is(
  (select count(*) from public.reporte_nominal('2000-01-01', '2000-01-31', 'Solicitud de la Secretaría de Salud')),
  2::bigint,
  'El superadministrador genera el reporte nominal'
);
reset role;
select set_config('request.jwt.claims', '', true);

-- ------------------------------------------------------------------- contenido de la auditoría
select is(
  (select count(*) from public.auditoria
   where accion = 'ver_datos_contacto' and actor_id = '00000000-0000-0000-0000-000000000002'
     and detalle ->> 'motivo' = 'Primer contacto'),
  1::bigint,
  'Ver datos de contacto queda en la auditoría con quién y por qué'
);
select is(
  (select detalle -> 'estado_seguimiento' ->> 'despues' from public.auditoria
   where entidad = 'aplicaciones' and accion = 'actualizar' and actor_id = '00000000-0000-0000-0000-000000000002'
   order by id limit 1),
  'en_contacto',
  'El cambio de estado queda en la auditoría con el valor anterior y el nuevo'
);
select is(
  (select count(*) from public.auditoria where entidad = 'notas_seguimiento' and detalle ? 'texto'),
  0::bigint,
  'La auditoría registra la nota sin copiar su texto'
);
select is(
  (select (detalle ->> 'registros')::int from public.auditoria
   where accion = 'reporte_nominal' and actor_id = '00000000-0000-0000-0000-000000000001'),
  2,
  'El reporte nominal queda en la auditoría con el número de registros'
);
select is(
  (select count(*) from public.auditoria where entidad = 'reglas_resultados' and actor_rol = 'superadministrador'
     and actor_id = '00000000-0000-0000-0000-000000000001'),
  3::bigint,
  'Crear y activar reglas queda en la auditoría'
);
select throws_ok($$update public.auditoria set accion = 'otra'$$, '42501', null, 'Ni el dueño de la base edita la auditoría');
select throws_ok($$truncate public.auditoria$$, '42501', null, 'Ni el dueño de la base vacía la auditoría');

-- --------------------------------------------------------------------------------- invitaciones
set local role service_role;
select throws_ok(
  $$select public.crear_perfil_invitado('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000006', 'Invitada', 'profesional')$$,
  '42501', null, 'Solo un superadministrador puede invitar'
);
select public.crear_perfil_invitado('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'Invitada', 'administrador_institucional', '00000000-0000-0000-0000-0000000001e1');
reset role;
select is(
  (select actor_id from public.auditoria where entidad = 'perfiles' and entidad_id = '00000000-0000-0000-0000-000000000006'),
  '00000000-0000-0000-0000-000000000001'::uuid,
  'La invitación queda en la auditoría a nombre de quien invitó'
);

-- ------------------------------------------------------------------------- tiempo de conservación
set local role service_role;
select is(public.purgar_datos_vencidos(), 0, 'Sin tiempo de conservación definido no se borra nada');
reset role;
update public.participantes set creado_en = now() - interval '2 years'
where modulo = 'adulto' and id in (select participante_id from public.aplicaciones where id in (select id from registradas));
update public.configuracion set valor = '12' where clave = 'retencion_meses';
set local role service_role;
select is(public.purgar_datos_vencidos(), 1, 'Se borran los datos que superan el tiempo de conservación');
reset role;
select is((select count(*) from public.aplicaciones where id in (select id from registradas)), 1::bigint, 'Con los datos personales se borra su aplicación');

select * from finish();
rollback;
