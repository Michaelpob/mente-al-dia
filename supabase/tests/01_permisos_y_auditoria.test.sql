-- Permisos por rol, cálculo guardado por el servidor y auditoría (Fase 4).
-- Se ejecuta con `supabase test db` o, sin Docker, con `corepack pnpm test:bd`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(68);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000002', 'profesional@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000003', 'consulta@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000004', 'inactivo@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000005', 'sin-perfil@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000006', 'invitado@ejemplo.gov.co');

insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000001', 'Superadministración', 'superadministrador', true),
  ('00000000-0000-0000-0000-000000000002', 'Profesional Uno', 'profesional', true),
  ('00000000-0000-0000-0000-000000000003', 'Consulta Uno', 'consulta', true),
  ('00000000-0000-0000-0000-000000000004', 'Profesional Inactivo', 'profesional', false);

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
  '{"resultadoGeneral":"desafios","indice":30,"prioridad":true,"rutaAtencionEspecial":true,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}'
);
insert into registradas
select * from public.registrar_aplicacion(
  '{"modulo":"nino","nombre":"Niña Prueba","edad":9,"grado":"Cuarto","acudiente":{"nombre":"Acudiente","parentesco":"Madre","correo":"acudiente@correo.co","telefono":"3110000000","lugarResidencia":"Zona rural"}}',
  '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador","autorizacion_acudiente":"0.1-borrador"}',
  '[{"areaId":"bienestar_emocional","valor":"si"}]',
  '{"resultadoGeneral":"favorable","indice":95,"prioridad":false,"rutaAtencionEspecial":false,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}'
);
select throws_ok(
  $$select * from public.registrar_aplicacion(
    '{"modulo":"nino","nombre":"Sin Autorización","acudiente":{"nombre":"A"}}',
    '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
    '[]',
    '{"resultadoGeneral":"favorable","indice":95,"prioridad":false,"rutaAtencionEspecial":false,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}'
  )$$,
  '23514', null, 'Sin la autorización del adulto responsable no se registra una aplicación infantil'
);
reset role;
grant select on registradas to anon, authenticated, service_role;

select is((select count(*) from registradas), 2::bigint, 'El servidor registra las dos aplicaciones');
select matches((select min(codigo) from registradas), '^MD-[0-9]{4,}$', 'Cada aplicación recibe un código MD-0000');
select is(
  (select estado_seguimiento::text from public.aplicaciones where prioridad),
  'pendiente',
  'Una aplicación prioritaria entra en seguimiento como «pendiente»'
);
select is(
  (select estado_seguimiento from public.aplicaciones where not prioridad),
  null,
  'Una aplicación no prioritaria no entra en seguimiento'
);
select is(
  (select lugar_residencia from public.aplicaciones where modulo = 'nino'),
  'Zona rural',
  'En el módulo infantil el lugar se toma del adulto responsable'
);
select is(
  (select count(*) from public.consentimientos),
  5::bigint,
  'Se guardan las autorizaciones de cada participante con su versión'
);
select is(
  (select count(*) from public.auditoria where accion = 'crear' and entidad = 'aplicaciones' and actor_rol = 'sistema'),
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
select is(
  (select sum(total) from public.reporte_agregado(current_date - 30, current_date)),
  2::numeric,
  'El rol consulta ve el reporte agregado'
);
select throws_ok(
  $$select public.ver_datos_contacto((select id from registradas limit 1))$$,
  '42501', null, 'El rol consulta no ve datos de contacto'
);
select throws_ok(
  $$select * from public.reporte_nominal(current_date - 30, current_date, 'Motivo suficientemente largo')$$,
  '42501', null, 'El rol consulta no genera el reporte nominal'
);
select is((select count(*) from public.reglas_resultados), 1::bigint, 'El rol consulta lee las reglas');

-- ----------------------------------------------------------------------------- profesional
select set_config('request.jwt.claims', (select valor from claims where nombre = 'prof'), true);
select is((select count(*) from public.aplicaciones), 2::bigint, 'Un profesional con doble factor ve las aplicaciones');
select throws_ok($$select * from public.participantes$$, '42501', null, 'Un profesional no lee participantes directamente');
select throws_ok($$select * from public.consentimientos$$, '42501', null, 'Un profesional no lee consentimientos directamente');
select is(
  public.ver_datos_contacto((select id from public.aplicaciones where modulo = 'adulto'), 'Primer contacto') ->> 'correo',
  'persona@correo.co',
  'Un profesional ve los datos de contacto con ver_datos_contacto'
);
select is((select count(*) from public.auditoria), 0::bigint, 'Un profesional no lee la auditoría');
select is((select count(*) from public.perfiles), 4::bigint, 'Un profesional ve los nombres del equipo');

update public.aplicaciones set estado_seguimiento = 'en_contacto' where prioridad;
select is(
  (select estado_seguimiento::text from public.aplicaciones where prioridad),
  'en_contacto',
  'Un profesional cambia el estado del seguimiento'
);
select throws_ok(
  $$update public.aplicaciones set resultado_general = 'favorable'$$,
  '42501', null, 'Nadie del panel puede cambiar el resultado oficial'
);
select throws_ok(
  $$update public.aplicaciones set asignado_a = '00000000-0000-0000-0000-000000000003' where prioridad$$,
  '23514', null, 'No se asigna un caso a una cuenta de consulta'
);
update public.aplicaciones set asignado_a = '00000000-0000-0000-0000-000000000002' where not prioridad;
select is(
  (select estado_seguimiento::text from public.aplicaciones where not prioridad),
  'pendiente',
  'Asignar un caso sin seguimiento lo deja en «pendiente»'
);

insert into public.notas_seguimiento (aplicacion_id, texto)
select id, 'Se realizó el primer contacto telefónico.' from public.aplicaciones where prioridad;
select is(
  (select autor_id from public.notas_seguimiento),
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

update public.perfiles set rol = 'superadministrador' where id = '00000000-0000-0000-0000-000000000003';
select is(
  (select rol::text from public.perfiles where id = '00000000-0000-0000-0000-000000000003'),
  'consulta',
  'Un profesional no cambia roles'
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
  (select count(*) from public.reporte_nominal(current_date - 30, current_date, 'Solicitud de la Secretaría de Salud')),
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
  (select (detalle ->> 'registros')::int from public.auditoria where accion = 'reporte_nominal'),
  2,
  'El reporte nominal queda en la auditoría con el número de registros'
);
select is(
  (select count(*) from public.auditoria where entidad = 'reglas_resultados' and actor_rol = 'superadministrador'),
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
select public.crear_perfil_invitado('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'Invitada', 'profesional');
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
update public.participantes set creado_en = now() - interval '2 years' where modulo = 'adulto';
update public.configuracion set valor = '12' where clave = 'retencion_meses';
set local role service_role;
select is(public.purgar_datos_vencidos(), 1, 'Se borran los datos que superan el tiempo de conservación');
reset role;
select is((select count(*) from public.aplicaciones), 1::bigint, 'Con los datos personales se borra su aplicación');

select * from finish();
rollback;
