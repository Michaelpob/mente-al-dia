-- Censo del panel (D-83): permisos, una persona por clave y módulo con su cuestionario más reciente,
-- fortalezas y falencias, composición y la lista con filtros. Los datos de prueba llevan código propio
-- (MD-C…) y un lugar propio: se separan de los reales con el filtro de lugar y no gastan la secuencia
-- de códigos (D-72).
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000301', 'super-censo@ejemplo.org'),
  ('00000000-0000-0000-0000-000000000303', 'consulta-censo@ejemplo.org');

insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000301', 'Superadministración Censo', 'superadministrador', true),
  ('00000000-0000-0000-0000-000000000303', 'Consulta Censo', 'consulta', true);

-- Institución de prueba (ninguna de las reales): los datos de esta prueba viven en ella.
insert into public.instituciones (id, nombre, slug) values
  ('00000000-0000-0000-0000-0000000008e1', 'Institución Pruebacenso', 'prueba-censo');

create temporary table claims_censo (nombre text primary key, valor text);
grant select on claims_censo to anon, authenticated;
insert into claims_censo values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated","aal":"aal2","session_id":"00000000-0000-0000-0000-000000000301"}'),
  ('super_aal1', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated","aal":"aal1"}'),
  ('consulta', '{"sub":"00000000-0000-0000-0000-000000000303","role":"authenticated","aal":"aal2","session_id":"00000000-0000-0000-0000-000000000303"}');

create temporary table hoy_censo as select (now() at time zone 'America/Bogota')::date as dia;
grant select on hoy_censo to anon, authenticated;

-- Ana respondió dos veces (hace 20 días y hoy): cuenta una vez, con el de hoy. Beto, una niña y un
-- adolescente respondieron hoy. Todos viven en «Barrio Pruebacenso».
insert into public.participantes (institucion_id, id, modulo, nombre, correo, lugar_residencia) values
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000003a1', 'adulto', 'Ana Pruebacenso', 'ana.censo@correo.co', 'Barrio Pruebacenso'),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000003a2', 'adulto', 'Ana Pruebacenso', 'ana.censo@correo.co', 'Barrio Pruebacenso'),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000003b1', 'adulto', 'Beto Pruebacenso', 'beto.censo@correo.co', 'Barrio Pruebacenso');
insert into public.participantes (institucion_id, id, modulo, nombre, lugar_residencia, edad, grado, sexo, acudiente) values
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000003c1', 'nino', 'Niña Pruebacenso', 'Barrio Pruebacenso', 9, 'Cuarto', 'Mujer',
   '{"nombre":"Acudiente Pruebacenso","correo":"acudiente.censo@correo.co"}'),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000003d1', 'adolescente', 'Adolescente Pruebacenso', 'Barrio Pruebacenso', 15, 'Décimo', null,
   '{"nombre":"Acudiente Dos Pruebacenso","correo":"acudiente2.censo@correo.co"}');

insert into public.aplicaciones (institucion_id, id, codigo, participante_id, modulo, edad, lugar_residencia, respuestas, resultado,
  resultado_general, indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
  instrumento_version, estado_seguimiento, creado_en, actualizado_en) values
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000004a1', 'MD-C001', '00000000-0000-0000-0000-0000000003a1', 'adulto', null, 'Barrio Pruebacenso', '[]',
   '{"niveles":{"bienestar_emocional":"requiere_atencion","sueno_descanso":"requiere_atencion","red_apoyo":"adecuado"}}',
   'desafios', 30, true, true, false, '0.1-provisional', '1.0', 'pendiente',
   now() - interval '20 days', now() - interval '20 days'),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000004a2', 'MD-C002', '00000000-0000-0000-0000-0000000003a2', 'adulto', null, 'Barrio Pruebacenso', '[]',
   '{"niveles":{"bienestar_emocional":"requiere_atencion","sueno_descanso":"por_fortalecer","red_apoyo":"adecuado","manejo_estres":"adecuado"}}',
   'por_fortalecer', 60, false, false, false, '0.1-provisional', '1.0', null, now(), now()),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000004b1', 'MD-C003', '00000000-0000-0000-0000-0000000003b1', 'adulto', null, 'Barrio Pruebacenso', '[]',
   '{"niveles":{"bienestar_emocional":"adecuado","sueno_descanso":"adecuado","red_apoyo":"adecuado"}}',
   'favorable', 95, false, false, false, '0.1-provisional', '1.0', null, now(), now()),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000004c1', 'MD-C004', '00000000-0000-0000-0000-0000000003c1', 'nino', 9, 'Barrio Pruebacenso', '[]',
   '{"niveles":{"bienestar_emocional":"adecuado","sueno_descanso":"requiere_atencion","red_apoyo":"sin_dato"}}',
   'por_fortalecer', 70, false, false, false, '0.1-provisional', '1.0', null, now(), now()),
  ('00000000-0000-0000-0000-0000000008e1', '00000000-0000-0000-0000-0000000004d1', 'MD-C005', '00000000-0000-0000-0000-0000000003d1', 'adolescente', 15, 'Barrio Pruebacenso', '[]',
   '{"niveles":{"bienestar_emocional":"requiere_atencion","sueno_descanso":"requiere_atencion","red_apoyo":"por_fortalecer"}}',
   'desafios', 25, true, true, false, '0.1-provisional', '1.0', 'pendiente', now(), now());

-- ---------------------------------------------------------------------------------- permisos
-- D-89: el equipo entra con el código del correo. Cada sesión simulada (session_id = su cuenta)
-- de las cuentas de prueba queda verificada; las sesiones sin session_id no lo están.
insert into privado.sesiones_verificadas (session_id, user_id, expira_en)
select u.id, u.id, now() + interval '1 day'
from auth.users u
where u.id::text like '00000000-0000-0000-0000-%'
on conflict (session_id) do nothing;

set local role anon;
select throws_ok($$select public.panel_censo()$$, '42501', null, 'Sin sesión no se puede leer el censo');
select throws_ok($$select public.panel_censo_personas()$$, '42501', null,
  'Sin sesión no se puede leer la lista del censo');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_censo where nombre = 'consulta'), true);
select throws_ok($$select public.panel_censo()$$, '42501', null, 'El rol consulta no ve el censo');
select set_config('request.jwt.claims', (select valor from claims_censo where nombre = 'super_aal1'), true);
select throws_ok($$select public.panel_censo_personas()$$, '42501', null, 'Sin doble factor no se ve la lista');
select set_config('request.jwt.claims', (select valor from claims_censo where nombre = 'super'), true);
select throws_ok($$select * from privado.censo_personas(null, null, null, null, null)$$, '42501', null,
  'La ayuda del censo no se puede llamar desde fuera');

-- ---------------------------------------------------------------------------------- resumen
select is((public.panel_censo(p_lugar => 'Barrio Pruebacenso') ->> 'personas')::integer, 4,
  'Cuenta cada persona una vez, aunque haya respondido dos veces');
select is((public.panel_censo(p_lugar => 'Barrio Pruebacenso') ->> 'cuestionarios')::integer, 5,
  'Y cuenta todos sus cuestionarios');
select is((public.panel_censo(p_lugar => 'Barrio Pruebacenso') ->> 'conPrioridad')::integer, 1,
  'La prioridad sale del cuestionario más reciente de cada persona');
select is((public.panel_censo(p_lugar => 'Barrio Pruebacenso') ->> 'conFalencias')::integer, 3,
  'Cuenta las personas con al menos una falencia');
select is(public.panel_censo(p_lugar => 'Barrio Pruebacenso') -> 'porModulo',
  '{"adulto":2,"nino":1,"adolescente":1}'::jsonb, 'Reparte las personas por módulo');
select is((select (h ->> 'n')::integer from jsonb_array_elements(public.panel_censo(p_lugar => 'Barrio Pruebacenso') -> 'areas') h
           where h ->> 'area' = 'bienestar_emocional' and h ->> 'nivel' = 'requiere_atencion'), 2,
  'Las áreas cuentan solo el cuestionario más reciente de cada persona');
select is(public.panel_censo(p_lugar => 'Barrio Pruebacenso') -> 'porEdad',
  '[{"edad":9,"n":1},{"edad":15,"n":1}]'::jsonb, 'Reparte por edad a quienes la dieron');
select is((select (s ->> 'n')::integer from jsonb_array_elements(public.panel_censo(p_lugar => 'Barrio Pruebacenso') -> 'porSexo') s
           where s ->> 'sexo' = 'Mujer'), 1, 'Reparte por sexo a niñas, niños y adolescentes');
select is(public.panel_censo(p_lugar => ' barrio pruebacenso ') -> 'lugares',
  '[{"lugar":"Barrio Pruebacenso","n":4}]'::jsonb, 'Filtra por lugar sin importar mayúsculas ni espacios');
select is((public.panel_censo((select dia from hoy_censo) - 30, (select dia from hoy_censo) - 15, null,
                              'Barrio Pruebacenso') ->> 'personas')::integer, 1,
  'Con un periodo, cuenta solo los cuestionarios de esas fechas');
select throws_ok($$select public.panel_censo((select dia from hoy_censo), (select dia from hoy_censo) - 1)$$,
  '22023', null, 'Rechaza un periodo al revés');

-- ---------------------------------------------------------------------------------- lista
select is((public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso') ->> 'total')::integer, 4,
  'La lista tiene una fila por persona');
select is(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso') -> 'filas' -> 0 ->> 'nombre',
  'Adolescente Pruebacenso', 'Por defecto, primero quien tiene más falencias');
select is(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso') -> 'filas' -> 1 ->> 'nombre',
  'Ana Pruebacenso', 'Con las mismas falencias, primero quien tiene más áreas por fortalecer');
select is((select f ->> 'codigo' from jsonb_array_elements(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso') -> 'filas') f
           where f ->> 'nombre' = 'Ana Pruebacenso'), 'MD-C002', 'Cada persona va con su cuestionario más reciente');
select is((select array[(f ->> 'cuestionarios')::integer, (f ->> 'fortalezas')::integer, (f ->> 'porFortalecer')::integer,
                        (f ->> 'falencias')::integer, (f ->> 'sinDato')::integer]
           from jsonb_array_elements(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso') -> 'filas') f
           where f ->> 'nombre' = 'Ana Pruebacenso'), array[2, 2, 1, 1, 0],
  'Cuenta sus cuestionarios, fortalezas, áreas por fortalecer, falencias y áreas sin dato');
select is((public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso', p_area => 'sueno_descanso',
                                       p_nivel => 'requiere_atencion') ->> 'total')::integer, 2,
  'Filtra por una falencia en un área');
select is((public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso', p_busqueda => 'beto') ->> 'total')::integer, 1,
  'Busca por nombre');
select is(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso', p_orden => 'nombre') -> 'filas' -> 0 ->> 'nombre',
  'Adolescente Pruebacenso', 'Ordena por nombre');
select is(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso', p_orden => 'fortalezas') -> 'filas' -> 0 ->> 'nombre',
  'Beto Pruebacenso', 'Ordena por fortalezas');
select is(public.panel_censo_personas(p_lugar => 'Barrio Pruebacenso', p_tamano => 10, p_pagina => 2) -> 'filas',
  '[]'::jsonb, 'Una página fuera del total viene vacía');
select is((public.panel_censo_personas((select dia from hoy_censo) - 30, (select dia from hoy_censo) - 15, null,
                                       'Barrio Pruebacenso') -> 'filas' -> 0 ->> 'falencias')::integer, 2,
  'Con un periodo, la persona va con su cuestionario de esas fechas');
select throws_ok($$select public.panel_censo_personas(p_orden => 'edad')$$, '22023', null, 'Rechaza un orden desconocido');
select throws_ok($$select public.panel_censo_personas(p_area => 'red_apoyo', p_nivel => 'malo')$$, '22023', null,
  'Rechaza un nivel desconocido');
select lives_ok($$select public.panel_censo_personas(p_busqueda => '%%')$$, 'Los comodines de la búsqueda no rompen la lista');
reset role;
select set_config('request.jwt.claims', '', true);

select * from finish();
rollback;
