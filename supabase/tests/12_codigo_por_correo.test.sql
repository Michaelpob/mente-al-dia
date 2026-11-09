-- Código por correo (D-89): el panel exige una sesión que pasó el código que llega al correo.
-- Corre en el proyecto real (D-72): todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into public.instituciones (id, nombre, slug, activa) values
  ('00000000-0000-0000-0000-0000000012e1', 'Prueba Código', 'prueba-codigo', true);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001200', 'general-codigo@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001201', 'institucional-codigo@ejemplo.org');
insert into public.perfiles (id, nombre, rol, activo, institucion_id) values
  ('00000000-0000-0000-0000-000000001200', 'General Código', 'superadministrador', true, null),
  ('00000000-0000-0000-0000-000000001201', 'Institucional Código', 'administrador_institucional', true,
   '00000000-0000-0000-0000-0000000012e1');

create temporary table claims_codigo (nombre text primary key, valor text);
grant select on claims_codigo to anon, authenticated, service_role;
insert into claims_codigo values
  ('verificada', '{"sub":"00000000-0000-0000-0000-000000001200","role":"authenticated","aal":"aal1","session_id":"00000000-0000-0000-0000-0000000012a1"}'),
  ('otra_sesion', '{"sub":"00000000-0000-0000-0000-000000001200","role":"authenticated","aal":"aal1","session_id":"00000000-0000-0000-0000-0000000012a2"}'),
  ('solo_totp', '{"sub":"00000000-0000-0000-0000-000000001200","role":"authenticated","aal":"aal2","session_id":"00000000-0000-0000-0000-0000000012a3"}'),
  ('sesion_ajena', '{"sub":"00000000-0000-0000-0000-000000001201","role":"authenticated","aal":"aal2","session_id":"00000000-0000-0000-0000-0000000012a1"}');

-- ------------------------------------------------------------------------------ permisos
select ok(not has_function_privilege('authenticated', 'public.registrar_verificacion_correo(uuid, uuid)', 'execute'),
  'Una sesión no puede marcarse verificada a sí misma');
select ok(not has_function_privilege('anon', 'public.registrar_verificacion_correo(uuid, uuid)', 'execute'),
  'El público tampoco');
select ok(not has_function_privilege('authenticated', 'public.registrar_fallo_codigo(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.intentos_codigo_restantes(uuid)', 'execute')
      and not has_function_privilege('authenticated', 'public.sesion_verificada_de(uuid, uuid)', 'execute'),
  'Los intentos y la consulta de sesiones son solo del servidor');
select ok(has_function_privilege('service_role', 'public.registrar_verificacion_correo(uuid, uuid)', 'execute'),
  'La Edge Function (clave del servidor) sí marca la sesión');

-- ------------------------------------------------------------------------------ sin código
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_codigo where nombre = 'solo_totp'), true);
select is((select doble_factor from public.mi_perfil()), false, 'Con la aplicación de autenticación (aal2) ya no basta');
select throws_ok($$select public.panel_tablero(current_date, current_date)$$, '42501', null,
  'Sin el código del correo no se ve el tablero');
reset role;

-- ------------------------------------------------------------------------------ con código
set local role service_role;
select ok(public.registrar_verificacion_correo('00000000-0000-0000-0000-000000001200', '00000000-0000-0000-0000-0000000012a1') > now() + interval '11 hours',
  'El código marca la sesión por 12 horas');
select ok(public.sesion_verificada_de('00000000-0000-0000-0000-000000001200', '00000000-0000-0000-0000-0000000012a1'),
  'La sesión queda verificada');
select ok(not public.sesion_verificada_de('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-0000000012a1'),
  'Solo para su propia cuenta');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_codigo where nombre = 'verificada'), true);
select is((select doble_factor from public.mi_perfil()), true, 'Con el código, la sesión cuenta como verificada');
select lives_ok($$select public.panel_tablero(current_date, current_date)$$, 'Y entra al tablero');
select isnt((select x ->> 'ultimoIngreso' from jsonb_array_elements(public.panel_administradores()) x
             where x ->> 'id' = '00000000-0000-0000-0000-000000001200'), null,
  'Usuarios muestra cuándo entró con el código');

select set_config('request.jwt.claims', (select valor from claims_codigo where nombre = 'otra_sesion'), true);
select throws_ok($$select public.panel_tablero(current_date, current_date)$$, '42501', null,
  'Otra sesión de la misma cuenta necesita su propio código');

select set_config('request.jwt.claims', (select valor from claims_codigo where nombre = 'sesion_ajena'), true);
select is((select doble_factor from public.mi_perfil()), false, 'La sesión verificada de otra cuenta no sirve');
reset role;
select set_config('request.jwt.claims', '', true);

-- ------------------------------------------------------------------------------ vencimiento
update privado.sesiones_verificadas set expira_en = now() - interval '1 minute'
where session_id = '00000000-0000-0000-0000-0000000012a1';
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_codigo where nombre = 'verificada'), true);
select throws_ok($$select public.panel_tablero(current_date, current_date)$$, '42501', null,
  'A las 12 horas hay que pedir otro código');
reset role;
select set_config('request.jwt.claims', '', true);

-- ------------------------------------------------------------------------------ intentos
set local role service_role;
select is(public.intentos_codigo_restantes('00000000-0000-0000-0000-000000001201'), 5, 'Cinco intentos para el código');
select is(public.registrar_fallo_codigo('00000000-0000-0000-0000-000000001201'), 4, 'Un código equivocado gasta un intento');
select public.registrar_fallo_codigo('00000000-0000-0000-0000-000000001201') from generate_series(1, 4);
select is(public.intentos_codigo_restantes('00000000-0000-0000-0000-000000001201'), 0,
  'Con cinco equivocados, no quedan intentos');
select lives_ok(
  $$select public.registrar_verificacion_correo('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-0000000012a4')$$,
  'Al acertar con un código nuevo, entra');
select is(public.intentos_codigo_restantes('00000000-0000-0000-0000-000000001201'), 5, 'Y los intentos vuelven a cinco');
reset role;

-- ------------------------------------------------------------------------------ auditoría
select results_eq(
  $$select actor_id::text, institucion_id::text from public.auditoria
    where accion = 'ingresar_panel' and entidad_id = '00000000-0000-0000-0000-000000001201'$$,
  $$values ('00000000-0000-0000-0000-000000001201', '00000000-0000-0000-0000-0000000012e1')$$,
  'Cada ingreso queda en la auditoría, a nombre de quien entró y con su institución');

select * from finish();
rollback;
