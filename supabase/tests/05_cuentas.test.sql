-- Cuentas públicas (D-77): alta con el perfil, usuario único, cada cuenta ve solo lo suyo, una
-- cuenta pública no entra al panel ni se da permisos, y el panel ve la actividad sin el contenido.
-- Se ejecuta con `supabase test db` o, sin Docker, con scripts/bd/probar-en-proyecto.mjs (D-72).
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000301', 'super-cuentas@ejemplo.gov.co');
insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000301', 'Superadministración Cuentas', 'superadministrador', true);

create temporary table claims_cuentas (nombre text primary key, valor text);
grant select on claims_cuentas to anon, authenticated;
insert into claims_cuentas values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated","aal":"aal2"}'),
  ('ana', '{"sub":"00000000-0000-0000-0000-000000000311","role":"authenticated","aal":"aal1"}'),
  ('beto', '{"sub":"00000000-0000-0000-0000-000000000312","role":"authenticated","aal":"aal1"}');

-- Línea base: lo que ya hubiera en la base. Las cuentas comparan contra ella.
select set_config('request.jwt.claims', (select valor from claims_cuentas where nombre = 'super'), true);
create temporary table base_cuentas as select public.panel_cuentas_resumen() as resumen;
grant select on base_cuentas to anon, authenticated;
select set_config('request.jwt.claims', '', true);

-- Dos cuentas creadas desde «Crear cuenta» y una invitación del equipo (sin tipo).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000311', 'ana.cuenta@correo.co',
   '{"tipo":"cuenta","nombre":"  Ana Cuenta ","usuario":"Ana.Cuenta","mayor_de_edad":true,"autoriza_datos":true}'),
  ('00000000-0000-0000-0000-000000000312', 'beto.cuenta@correo.co',
   '{"tipo":"cuenta","nombre":"Beto Cuenta","usuario":"beto_cuenta","mayor_de_edad":true,"autoriza_datos":true}'),
  ('00000000-0000-0000-0000-000000000313', 'invitado-cuentas@ejemplo.gov.co', '{"nombre":"Invitado"}');

-- ------------------------------------------------------------------------------------------ alta
select is((select usuario from public.cuentas where id = '00000000-0000-0000-0000-000000000311'),
  'ana.cuenta', 'El alta crea el perfil con el usuario en minúsculas');
select is((select nombre from public.cuentas where id = '00000000-0000-0000-0000-000000000311'),
  'Ana Cuenta', 'El nombre se guarda sin espacios de sobra');
select is((select autorizacion_version from public.cuentas where id = '00000000-0000-0000-0000-000000000311'),
  (select valor #>> '{}' from public.configuracion where clave = 'version_textos_legales'),
  'Guarda la versión de los textos legales que se aceptaron');
select is((select count(*)::integer from public.cuentas where id = '00000000-0000-0000-0000-000000000313'),
  0, 'Una invitación del equipo no crea una cuenta pública');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000314',
    'sin-autorizar@correo.co', '{"tipo":"cuenta","nombre":"Sin Autorizar","usuario":"sin.autorizar","mayor_de_edad":true}')$$,
  '23514', null, 'Sin autorizar el tratamiento de datos la cuenta no se crea');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000315',
    'menor@correo.co', '{"tipo":"cuenta","nombre":"Menor Edad","usuario":"menor.edad","autoriza_datos":true}')$$,
  '23514', null, 'Sin confirmar la mayoría de edad la cuenta no se crea');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000316',
    'otra.ana@correo.co', '{"tipo":"cuenta","nombre":"Otra Ana","usuario":"ANA.cuenta","mayor_de_edad":true,"autoriza_datos":true}')$$,
  '23505', null, 'El usuario es único sin importar mayúsculas');
select throws_ok(
  $$insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000317',
    'invalido@correo.co', '{"tipo":"cuenta","nombre":"Usuario Invalido","usuario":"1-mal","mayor_de_edad":true,"autoriza_datos":true}')$$,
  '23514', null, 'Un usuario mal escrito no se acepta');

select is(public.usuario_disponible('ana.cuenta'), false, 'Un usuario tomado no está disponible');
select is(public.usuario_disponible('ANA.CUENTA'), false, 'Tampoco con otras mayúsculas');
select is(public.usuario_disponible('nuevo_usuario'), true, 'Un usuario libre y bien escrito está disponible');
select is(public.usuario_disponible('ab'), false, 'Un usuario de menos de 3 caracteres no está disponible');

-- ------------------------------------------------------------------------------------------ anon
set local role anon;
select is(public.usuario_disponible('libre.de.verdad'), true, 'Sin sesión se puede preguntar si un usuario está libre');
select throws_ok($$select * from public.cuentas$$, '42501', null, 'Sin sesión no se leen las cuentas');
select throws_ok($$select * from public.progreso$$, '42501', null, 'Sin sesión no se lee el progreso');
reset role;

-- --------------------------------------------------------------------------------- cuenta de Ana
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_cuentas where nombre = 'ana'), true);
select is((select count(*)::integer from public.cuentas), 1, 'Cada cuenta ve solo su perfil');
select lives_ok(
  $$insert into public.progreso (cuenta_id, actividad, avance, estado)
    values ('00000000-0000-0000-0000-000000000311', 'cuestionario', 40, '{"indice":8}')$$,
  'Una cuenta guarda su propio progreso');
select throws_ok(
  $$insert into public.progreso (cuenta_id, actividad, avance)
    values ('00000000-0000-0000-0000-000000000312', 'cuestionario', 90)$$,
  '42501', null, 'Una cuenta no puede guardar progreso a nombre de otra');
select lives_ok($$update public.cuentas set nombre = 'Ana María Cuenta'$$, 'Una cuenta cambia su nombre');
select throws_ok($$update public.cuentas set usuario = 'otro.usuario'$$, '42501', null,
  'Una cuenta no cambia su usuario por su cuenta');
select throws_ok(
  $$insert into public.perfiles (id, nombre, rol)
    values ('00000000-0000-0000-0000-000000000311', 'Ana', 'superadministrador')$$,
  '42501', null, 'Una cuenta pública no puede darse un rol del panel');
select is((select count(*)::integer from public.mi_perfil()), 0, 'Una cuenta pública no tiene perfil del equipo');
select throws_ok($$select public.panel_cuentas()$$, '42501', null, 'Una cuenta pública no ve el panel de cuentas');
select throws_ok($$select public.panel_registros()$$, '42501', null, 'Una cuenta pública no ve los registros');

-- -------------------------------------------------------------------------------- cuenta de Beto
select set_config('request.jwt.claims', (select valor from claims_cuentas where nombre = 'beto'), true);
insert into public.progreso (cuenta_id, actividad, avance, completado, estado)
values ('00000000-0000-0000-0000-000000000312', 'resultado:MD-T900', 100, true, '{"enviado":{}}');
select is((select string_agg(actividad, ',') from public.progreso), 'resultado:MD-T900',
  'Una cuenta ve solo su propio progreso');
-- Beto intenta cambiar y borrar el progreso de Ana: las políticas no le muestran esas filas.
update public.progreso set avance = 100 where cuenta_id = '00000000-0000-0000-0000-000000000311';
delete from public.progreso where cuenta_id = '00000000-0000-0000-0000-000000000311';
select set_config('request.jwt.claims', (select valor from claims_cuentas where nombre = 'ana'), true);
select is((select avance::integer from public.progreso where actividad = 'cuestionario'), 40,
  'Otra cuenta no pudo cambiar este progreso');
select is((select count(*)::integer from public.progreso), 1, 'Otra cuenta no pudo borrar este progreso');

-- -------------------------------------------------------------------------- panel (equipo, aal2)
select set_config('request.jwt.claims', (select valor from claims_cuentas where nombre = 'super'), true);
select is((public.panel_cuentas_resumen() ->> 'total')::integer
          - ((select resumen from base_cuentas) ->> 'total')::integer,
  2, 'El panel cuenta las cuentas registradas');
select is(public.panel_cuentas('ana.cuenta') -> 'filas' -> 0 ->> 'correo', 'an***@correo.co',
  'El panel ve el correo enmascarado');
select is((public.panel_cuentas('ana.cuenta') -> 'filas' -> 0 -> 'actividades' -> 0 ->> 'avance')::integer, 40,
  'El panel ve el avance de cada actividad');
select ok(not (public.panel_cuentas('ana.cuenta') -> 'filas' -> 0 -> 'actividades' -> 0 ? 'estado'),
  'El panel no ve el contenido guardado del progreso');

-- ------------------------------------------------------------- guardar el progreso de la sesión
select set_config('request.jwt.claims', (select valor from claims_cuentas where nombre = 'ana'), true);
select lives_ok($$select public.guardar_progreso('cuestionario', 55, false, '{"indice":11}')$$,
  'Guardar de nuevo la misma actividad la actualiza');
select is((select avance::integer from public.progreso where actividad = 'cuestionario'), 55,
  'El progreso guardado queda en la cuenta de la sesión');
reset role;
set local role anon;
select throws_ok($$select public.guardar_progreso('cuestionario', 10, false, '{}')$$, '42501', null,
  'Sin sesión no se guarda progreso');

reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
