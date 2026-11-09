-- Visitas por tipo de dispositivo (D-80): el sitio público registra visitas sin sesión, nadie lee
-- la tabla directamente y solo el equipo con doble factor ve el conteo del periodo.
-- Se ejecuta con `supabase test db` o, sin Docker, con scripts/bd/probar-en-proyecto.mjs (D-72).
begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000401', 'super-visitas@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000402', 'cuenta-visitas@correo.co');
insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000401', 'Superadministración Visitas', 'superadministrador', true);

create temporary table claims_visitas (nombre text primary key, valor text);
grant select on claims_visitas to anon, authenticated;
insert into claims_visitas values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000401","role":"authenticated","aal":"aal2","session_id":"00000000-0000-0000-0000-000000000401"}'),
  ('super_aal1', '{"sub":"00000000-0000-0000-0000-000000000401","role":"authenticated","aal":"aal1"}'),
  ('cuenta', '{"sub":"00000000-0000-0000-0000-000000000402","role":"authenticated","aal":"aal1"}');

create temporary table hoy_visitas as select (now() at time zone 'America/Bogota')::date as dia;
grant select on hoy_visitas to anon, authenticated;

-- Línea base: lo que ya hubiera en la base (los últimos 7 días y los 7 anteriores).
-- D-89: el equipo entra con el código del correo. Cada sesión simulada (session_id = su cuenta)
-- de las cuentas de prueba queda verificada; las sesiones sin session_id no lo están.
insert into privado.sesiones_verificadas (session_id, user_id, expira_en)
select u.id, u.id, now() + interval '1 day'
from auth.users u
where u.id::text like '00000000-0000-0000-0000-%'
on conflict (session_id) do nothing;

select set_config('request.jwt.claims', (select valor from claims_visitas where nombre = 'super'), true);
create temporary table base_visitas as
select public.panel_visitas((select dia from hoy_visitas) - 6, (select dia from hoy_visitas)) as visitas;
grant select on base_visitas to anon, authenticated;
select set_config('request.jwt.claims', '', true);

-- Diferencia frente a la línea base de una cifra de panel_visitas (los últimos 7 días).
create function pg_temp.nuevas(p_ruta text[]) returns integer
language sql as $$
  select (public.panel_visitas((select dia from hoy_visitas) - 6, (select dia from hoy_visitas)) #>> p_ruta)::integer
       - ((select visitas from base_visitas) #>> p_ruta)::integer
$$;

-- ------------------------------------------------------------------------------- sitio público
set local role anon;
select lives_ok($$select public.registrar_visita('movil')$$, 'Sin sesión se registra una visita desde un móvil');
select lives_ok($$select public.registrar_visita('movil')$$, 'Cada visita cuenta');
select lives_ok($$select public.registrar_visita('tableta')$$, 'Se registra una visita desde una tableta');
select lives_ok($$select public.registrar_visita('escritorio')$$, 'Se registra una visita desde un computador');
select throws_ok($$select public.registrar_visita('reloj')$$, '22P02', null,
  'Un tipo de dispositivo que no existe no se acepta');
select throws_ok($$select * from public.visitas$$, '42501', null, 'Sin sesión no se leen las visitas');
select throws_ok($$insert into public.visitas (dispositivo) values ('movil')$$, '42501', null,
  'Sin sesión no se escribe en la tabla directamente');
select throws_ok(
  $$select public.panel_visitas((select dia from hoy_visitas), (select dia from hoy_visitas))$$,
  '42501', null, 'Sin sesión no se ve el conteo');
reset role;

-- Una visita de hace 10 días cae en el periodo anterior.
insert into public.visitas (dispositivo, creado_en) values ('escritorio', now() - interval '10 days');

-- --------------------------------------------------------------------------------- otras sesiones
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_visitas where nombre = 'cuenta'), true);
select throws_ok(
  $$select public.panel_visitas((select dia from hoy_visitas), (select dia from hoy_visitas))$$,
  '42501', null, 'Una cuenta pública no ve el conteo');
select throws_ok($$select * from public.visitas$$, '42501', null, 'Una cuenta pública no lee las visitas');
select set_config('request.jwt.claims', (select valor from claims_visitas where nombre = 'super_aal1'), true);
select throws_ok(
  $$select public.panel_visitas((select dia from hoy_visitas), (select dia from hoy_visitas))$$,
  '42501', null, 'Sin doble factor el equipo no ve el conteo');

-- -------------------------------------------------------------------------- panel (equipo, aal2)
select set_config('request.jwt.claims', (select valor from claims_visitas where nombre = 'super'), true);
select is(pg_temp.nuevas('{total}'), 4, 'El panel cuenta todas las visitas del periodo');
select is(
  jsonb_build_array(pg_temp.nuevas('{porDispositivo,movil}'), pg_temp.nuevas('{porDispositivo,tableta}'),
                    pg_temp.nuevas('{porDispositivo,escritorio}')),
  '[2, 1, 1]'::jsonb, 'El panel separa las visitas por móvil, tableta y computador');
select is(pg_temp.nuevas('{anterior}'), 1, 'La visita de hace 10 días cuenta en el periodo anterior');
select throws_ok(
  $$select public.panel_visitas((select dia from hoy_visitas), (select dia from hoy_visitas) - 1)$$,
  '22023', null, 'Un periodo al revés no es válido');

reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
