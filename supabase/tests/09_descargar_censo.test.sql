-- Descarga del censo (D-84): solo el superadministrador con doble factor, con motivo, sin contacto y
-- con auditoría. Los datos de prueba llevan código propio (MD-E…) y un lugar propio (D-72).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000501', 'super-descarga@ejemplo.org'),
  ('00000000-0000-0000-0000-000000000502', 'profesional-descarga@ejemplo.org');

insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000501', 'Superadministración Descarga', 'superadministrador', true),
  ('00000000-0000-0000-0000-000000000502', 'Profesional Descarga', 'profesional', true);

-- Institución de prueba (ninguna de las reales): los datos de esta prueba viven en ella.
insert into public.instituciones (id, nombre, slug) values
  ('00000000-0000-0000-0000-0000000009e1', 'Institución Pruebadescarga', 'prueba-descarga');

create temporary table claims_descarga (nombre text primary key, valor text);
grant select on claims_descarga to anon, authenticated;
insert into claims_descarga values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000501","role":"authenticated","aal":"aal2"}'),
  ('super_aal1', '{"sub":"00000000-0000-0000-0000-000000000501","role":"authenticated","aal":"aal1"}'),
  ('prof', '{"sub":"00000000-0000-0000-0000-000000000502","role":"authenticated","aal":"aal2"}');

-- Bruno respondió dos veces; Carla y una niña, una vez. Todos viven en «Barrio Pruebadescarga».
insert into public.participantes (institucion_id, id, modulo, nombre, correo, telefono, lugar_residencia) values
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000005a1', 'adulto', 'Bruno Pruebadescarga', 'bruno.descarga@correo.co', '3001112233', 'Barrio Pruebadescarga'),
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000005a2', 'adulto', 'Bruno Pruebadescarga', 'bruno.descarga@correo.co', '3001112233', 'Barrio Pruebadescarga'),
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000005b1', 'adulto', 'Carla Pruebadescarga', 'carla.descarga@correo.co', '3004445566', 'Barrio Pruebadescarga');
insert into public.participantes (institucion_id, id, modulo, nombre, lugar_residencia, edad, grado, sexo, acudiente) values
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000005c1', 'nino', 'Ana Pruebadescarga', 'Barrio Pruebadescarga', 8, 'Tercero', 'Mujer',
   '{"nombre":"Acudiente Pruebadescarga","correo":"acudiente.descarga@correo.co","telefono":"3007778899"}');

insert into public.aplicaciones (institucion_id, id, codigo, participante_id, modulo, edad, lugar_residencia, respuestas, resultado,
  resultado_general, indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
  instrumento_version, estado_seguimiento, creado_en, actualizado_en) values
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000006a1', 'MD-E001', '00000000-0000-0000-0000-0000000005a1', 'adulto', null, 'Barrio Pruebadescarga', '[]',
   '{"niveles":{"bienestar_emocional":"requiere_atencion","sueno_descanso":"requiere_atencion"}}',
   'desafios', 20, true, true, false, '0.1-provisional', '1.0', 'pendiente',
   now() - interval '10 days', now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000006a2', 'MD-E002', '00000000-0000-0000-0000-0000000005a2', 'adulto', null, 'Barrio Pruebadescarga', '[]',
   '{"niveles":{"bienestar_emocional":"adecuado","sueno_descanso":"por_fortalecer"}}',
   'por_fortalecer', 70, false, false, false, '0.1-provisional', '1.0', null, now(), now()),
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000006b1', 'MD-E003', '00000000-0000-0000-0000-0000000005b1', 'adulto', null, 'Barrio Pruebadescarga', '[]',
   '{"niveles":{"bienestar_emocional":"adecuado","sueno_descanso":"adecuado"}}',
   'favorable', 95, false, false, false, '0.1-provisional', '1.0', null, now(), now()),
  ('00000000-0000-0000-0000-0000000009e1', '00000000-0000-0000-0000-0000000006c1', 'MD-E004', '00000000-0000-0000-0000-0000000005c1', 'nino', 8, 'Barrio Pruebadescarga', '[]',
   '{"niveles":{"bienestar_emocional":"requiere_atencion","sueno_descanso":"adecuado"}}',
   'por_fortalecer', 60, false, false, false, '0.1-provisional', '1.0', null, now(), now());

-- ---------------------------------------------------------------------------------- permisos
set local role anon;
select throws_ok($$select public.panel_censo_exportar('Censo mensual del barrio')$$, '42501', null,
  'Sin sesión no se descarga el censo');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_descarga where nombre = 'prof'), true);
select throws_ok($$select public.panel_censo_exportar('Censo mensual del barrio')$$, '42501', null,
  'Un profesional no descarga el censo: es un reporte nominal');
select set_config('request.jwt.claims', (select valor from claims_descarga where nombre = 'super_aal1'), true);
select throws_ok($$select public.panel_censo_exportar('Censo mensual del barrio')$$, '42501', null,
  'Sin doble factor no se descarga el censo');
select set_config('request.jwt.claims', (select valor from claims_descarga where nombre = 'super'), true);
select throws_ok($$select public.panel_censo_exportar(null)$$, '22023', null, 'Pide un motivo');
select throws_ok($$select public.panel_censo_exportar('  censo   ')$$, '22023', null,
  'Un motivo de menos de 10 caracteres no basta');
select throws_ok($$select public.panel_censo_exportar('Censo mensual del barrio', current_date, current_date - 1)$$,
  '22023', null, 'Rechaza un periodo al revés');
reset role;

-- Una sola descarga válida, guardada para revisarla (la función solo mira la sesión, no el rol).
create temporary table descarga as
select public.panel_censo_exportar('Censo mensual del barrio', p_lugar => 'Barrio Pruebadescarga') as datos;
select set_config('request.jwt.claims', '', true);

-- ---------------------------------------------------------------------------------- contenido
select is((select jsonb_array_length(datos -> 'personas') from descarga), 3,
  'Trae a cada persona una vez');
select is((select (datos -> 'resumen' ->> 'personas')::integer from descarga), 3,
  'Trae también el resumen del censo con los mismos filtros');
select is((select array_agg(p ->> 'nombre' order by n) from descarga, jsonb_array_elements(datos -> 'personas') with ordinality as x(p, n)),
  array['Ana Pruebadescarga', 'Bruno Pruebadescarga', 'Carla Pruebadescarga'], 'Ordena a las personas por nombre');
select is((select p ->> 'codigo' from descarga, jsonb_array_elements(datos -> 'personas') p
           where p ->> 'nombre' = 'Bruno Pruebadescarga'), 'MD-E002', 'Cada persona va con su cuestionario más reciente');
select is((select array[(p ->> 'cuestionarios')::integer, (p ->> 'fortalezas')::integer, (p ->> 'falencias')::integer]
           from descarga, jsonb_array_elements(datos -> 'personas') p where p ->> 'nombre' = 'Bruno Pruebadescarga'),
  array[2, 1, 0], 'Con sus cuestionarios, fortalezas y falencias');
select is((select count(*)::integer from descarga, jsonb_array_elements(datos -> 'personas') p
           where p ?| array['correo', 'telefono', 'acudiente']), 0, 'No lleva datos de contacto');
select is((select datos ->> 'generadoPor' from descarga), 'Superadministración Descarga', 'Dice quién la generó');

-- ---------------------------------------------------------------------------------- auditoría
select is((select count(*)::integer from public.auditoria a
           where a.accion = 'exportar_censo'
             and a.actor_id = '00000000-0000-0000-0000-000000000501'
             and a.detalle ->> 'motivo' = 'Censo mensual del barrio'
             and (a.detalle ->> 'personas')::integer = 3
             and a.detalle ->> 'lugar' = 'Barrio Pruebadescarga'), 1,
  'Cada descarga queda en la auditoría con el motivo, el filtro y cuántas personas salieron; las rechazadas no');

select * from finish();
rollback;
