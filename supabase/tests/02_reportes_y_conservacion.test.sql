-- Tiempo de conservación, hora de Colombia y grupos pequeños en los reportes (D-47 a D-49).
-- Se ejecuta con `supabase test db` o, sin Docker, con `corepack pnpm test:bd`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'super@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000003', 'consulta@ejemplo.gov.co');

insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000001', 'Superadministración', 'superadministrador', true),
  ('00000000-0000-0000-0000-000000000003', 'Consulta Uno', 'consulta', true);

create temporary table claims (nombre text primary key, valor text);
grant select on claims to anon, authenticated, service_role;
insert into claims values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","aal":"aal2"}'),
  ('consulta', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated","aal":"aal2"}');

-- p_n aplicaciones de adultos en el mismo grupo, respondidas en el instante p_creado.
create function pg_temp.crear(
  p_n integer,
  p_creado timestamptz,
  p_lugar text,
  p_resultado public.resultado_general default 'favorable',
  p_prioridad boolean default false
) returns void
language plpgsql as $$
declare
  v_participante uuid;
begin
  for i in 1..p_n loop
    insert into public.participantes (modulo, nombre, lugar_residencia, creado_en)
    values ('adulto', 'Persona ' || i, p_lugar, p_creado)
    returning id into v_participante;
    insert into public.aplicaciones (
      participante_id, modulo, lugar_residencia, respuestas, resultado, resultado_general,
      prioridad, ruta_atencion_especial, resultado_parcial, reglas_version, instrumento_version,
      creado_en
    )
    values (
      v_participante, 'adulto', p_lugar, '[]', '{}', p_resultado,
      p_prioridad, false, false, '0.1-provisional', '1.0',
      p_creado
    );
  end loop;
end
$$;

-- ------------------------------------------------------------------------- tiempo de conservación
select throws_ok(
  $$update public.configuracion set valor = '0' where clave = 'retencion_meses'$$,
  '23514', null, 'No se acepta conservar los datos 0 meses (borraría todo)'
);
select throws_ok(
  $$update public.configuracion set valor = '-3' where clave = 'retencion_meses'$$,
  '23514', null, 'No se acepta un tiempo de conservación negativo'
);
select throws_ok(
  $$update public.configuracion set valor = '1.5' where clave = 'retencion_meses'$$,
  '23514', null, 'El tiempo de conservación es un número entero de meses'
);
select throws_ok(
  $$update public.configuracion set valor = '"doce"' where clave = 'retencion_meses'$$,
  '23514', null, 'El tiempo de conservación debe ser un número'
);
select lives_ok(
  $$update public.configuracion set valor = '12' where clave = 'retencion_meses'$$,
  'Se acepta un tiempo de conservación de 12 meses'
);
select lives_ok(
  $$update public.configuracion set valor = 'null' where clave = 'retencion_meses'$$,
  'Se puede dejar el tiempo de conservación sin definir'
);

insert into public.participantes (modulo, nombre, creado_en) values
  ('adulto', 'Registro antiguo', now() - interval '2 months'),
  ('adulto', 'Registro reciente', now());
update public.configuracion set valor = '1' where clave = 'retencion_meses';
set local role service_role;
select is(public.purgar_datos_vencidos(), 1, 'Con 1 mes se borra solo lo que tiene más de un mes');
reset role;

-- ------------------------------------------------------------------------- tamaño mínimo de grupo
select throws_ok(
  $$update public.configuracion set valor = '4' where clave = 'reporte_minimo_grupo'$$,
  '23514', null, 'El tamaño mínimo de grupo no baja de 5'
);
select throws_ok(
  $$update public.configuracion set valor = 'null' where clave = 'reporte_minimo_grupo'$$,
  '23514', null, 'El tamaño mínimo de grupo no se puede dejar vacío'
);
select is(privado.minimo_grupo(), 5, 'El tamaño mínimo de grupo empieza en 5');

-- ------------------------------------------------------------------------- datos de los reportes
-- Domingo 4 de octubre de 2026, 10 p. m. en Colombia (lunes 5, 3 a. m. en UTC).
select pg_temp.crear(5, '2026-10-05 03:00:00+00', 'Centro');
-- Semana del 12 de octubre: un grupo de 6 y dos grupos pequeños (3 y 1) que suman 4.
select pg_temp.crear(6, '2026-10-13 15:00:00-05', 'Centro');
select pg_temp.crear(3, '2026-10-14 15:00:00-05', 'Vereda Alta');
select pg_temp.crear(1, '2026-10-15 15:00:00-05', 'Vereda Baja', 'desafios', true);
-- Semana del 19 de octubre: dos grupos pequeños (4 y 3) que suman 7.
select pg_temp.crear(4, '2026-10-20 15:00:00-05', 'Norte');
select pg_temp.crear(3, '2026-10-21 15:00:00-05', 'Sur');

-- ------------------------------------------------------------------------- reporte agregado
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims where nombre = 'consulta'), true);

select results_eq(
  $$select semana, grupos_pequenos, total from public.reporte_agregado('2026-09-28', '2026-10-04')$$,
  $$values ('2026-09-28'::date, false, 5::bigint)$$,
  'Una respuesta del domingo a las 10 p. m. (hora de Colombia) cuenta en esa semana'
);
select is_empty(
  $$select * from public.reporte_agregado('2026-10-05', '2026-10-11')$$,
  'Esa respuesta no pasa a la semana siguiente por la hora UTC'
);
select results_eq(
  $$select semana, lugar_residencia, grupos_pequenos, total
    from public.reporte_agregado('2026-10-12', '2026-10-18')$$,
  $$values ('2026-10-12'::date, 'Centro'::text, false, 6::bigint),
           ('2026-10-12'::date, null::text, true, null::bigint)$$,
  'Los grupos de menos de 5 se suman sin detalle; si la suma no llega a 5, el total se oculta'
);
select results_eq(
  $$select grupos_pequenos, total from public.reporte_agregado('2026-10-19', '2026-10-25')$$,
  $$values (true, 7::bigint)$$,
  'Si los grupos pequeños suman 5 o más, se muestra la suma, sin detalle'
);
select is(
  (select count(*) from public.reporte_agregado('2026-09-01', '2026-10-31')
   where lugar_residencia in ('Vereda Alta', 'Vereda Baja', 'Norte', 'Sur')),
  0::bigint,
  'Los lugares de los grupos pequeños no aparecen en el reporte'
);
select results_eq(
  $$select * from public.reporte_agregado('2026-10-14', '2026-10-14')$$,
  $$select * from public.reporte_agregado('2026-10-12', '2026-10-18')$$,
  'Un periodo que corta la semana se amplía a la semana completa'
);
reset role;

select is(
  (select count(*) from public.auditoria
   where accion = 'reporte_agregado'
     and detalle ->> 'desde' = '2026-10-12' and detalle ->> 'hasta' = '2026-10-18'
     and (detalle ->> 'minimoGrupo')::integer = 5),
  3::bigint,
  'La auditoría guarda el periodo ampliado y el tamaño mínimo de grupo'
);

set local role anon;
select throws_ok(
  $$select * from public.reporte_agregado('2026-10-12', '2026-10-18')$$,
  '42501', null, 'anon sigue sin poder generar reportes'
);
reset role;

-- ------------------------------------------------------------------------- reporte nominal
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims where nombre = 'super'), true);
select is(
  (select count(*) from public.reporte_nominal('2026-10-04', '2026-10-04', 'Revisión de la hora local')),
  5::bigint,
  'El reporte nominal del domingo incluye las respuestas de las 10 p. m. en Colombia'
);
select is(
  (select count(*) from public.reporte_nominal('2026-10-05', '2026-10-05', 'Revisión de la hora local')),
  0::bigint,
  'El reporte nominal del lunes no las incluye'
);
reset role;

-- ------------------------------------------------------------------------- mínimo mayor
update public.configuracion set valor = '10' where clave = 'reporte_minimo_grupo';
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims where nombre = 'consulta'), true);
select results_eq(
  $$select grupos_pequenos, total from public.reporte_agregado('2026-10-12', '2026-10-18')$$,
  $$values (true, 10::bigint)$$,
  'Con un mínimo de 10, el grupo de 6 también se suma sin detalle'
);
reset role;

delete from public.configuracion where clave = 'reporte_minimo_grupo';
select is(privado.minimo_grupo(), 5, 'Sin el parámetro, el tamaño mínimo de grupo sigue siendo 5');

select * from finish();
rollback;
