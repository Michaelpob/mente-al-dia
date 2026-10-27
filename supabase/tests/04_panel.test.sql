-- Consultas del panel de la Fase 8: permisos, tablero, registros, ficha, prioritarios (D-68).
-- Se ejecuta con `supabase test db` o, sin Docker, con `corepack pnpm test:bd`.
-- Los datos de prueba llevan código propio (MD-T…): no usan la secuencia de códigos reales.
begin;
create extension if not exists pgtap with schema extensions;
select plan(40);

-- ---------------------------------------------------------------------------------- datos base
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'super-panel@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000102', 'profesional-panel@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000103', 'consulta-panel@ejemplo.gov.co'),
  ('00000000-0000-0000-0000-000000000104', 'sin-perfil-panel@ejemplo.gov.co');

insert into public.perfiles (id, nombre, rol, activo) values
  ('00000000-0000-0000-0000-000000000101', 'Superadministración Panel', 'superadministrador', true),
  ('00000000-0000-0000-0000-000000000102', 'Profesional Panel', 'profesional', true),
  ('00000000-0000-0000-0000-000000000103', 'Consulta Panel', 'consulta', true);

create temporary table claims_panel (nombre text primary key, valor text);
grant select on claims_panel to anon, authenticated;
insert into claims_panel values
  ('super', '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated","aal":"aal2"}'),
  ('prof', '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated","aal":"aal2"}'),
  ('prof_aal1', '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated","aal":"aal1"}'),
  ('consulta', '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated","aal":"aal2"}'),
  ('sin_perfil', '{"sub":"00000000-0000-0000-0000-000000000104","role":"authenticated","aal":"aal2"}');

-- Hoy en Colombia: el tablero cuenta los días en esa hora.
create temporary table hoy_panel as select (now() at time zone 'America/Bogota')::date as dia;
grant select on hoy_panel to anon, authenticated;

-- Línea base: lo que ya hubiera (cero en la base de pruebas). Las cuentas comparan contra ella.
select set_config('request.jwt.claims', (select valor from claims_panel where nombre = 'super'), true);
create temporary table base_panel as
select public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) as tablero,
       (public.panel_registros() ->> 'total')::integer as registros,
       jsonb_array_length(public.panel_prioritarios()) as prioritarios;
grant select on base_panel to anon, authenticated;
select set_config('request.jwt.claims', '', true);

-- Ana respondió dos veces (hace 10 días y hoy); cada aplicación guarda su copia de los datos.
-- Una niña respondió hoy con su acudiente.
insert into public.participantes (id, modulo, nombre, correo, telefono, lugar_residencia, edad) values
  ('00000000-0000-0000-0000-0000000001a1', 'adulto', 'Ana Pruebapanel', 'ana@correo.co', '300 999 0189', 'Centro Pruebapanel', 30),
  ('00000000-0000-0000-0000-0000000001a2', 'adulto', 'Ana Pruebapanel', 'ana@correo.co', '300 999 0189', 'Centro Pruebapanel', 30);
insert into public.participantes (id, modulo, nombre, lugar_residencia, edad, grado, acudiente) values
  ('00000000-0000-0000-0000-0000000001b1', 'nino', 'Niña Pruebapanel', 'Norte Pruebapanel', 9, 'Cuarto',
   '{"nombre":"Acudiente Pruebapanel","parentesco":"Madre","correo":"acudiente.pruebapanel@correo.co","telefono":"3109876543","lugarResidencia":"Norte Pruebapanel"}');
insert into public.consentimientos (participante_id, tipo, version_texto) values
  ('00000000-0000-0000-0000-0000000001a2', 'tratamiento_datos', '0.1-borrador'),
  ('00000000-0000-0000-0000-0000000001a2', 'datos_sensibles', '0.1-borrador');

insert into public.aplicaciones (id, codigo, participante_id, modulo, edad, lugar_residencia, respuestas, resultado,
  resultado_general, indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
  instrumento_version, estado_seguimiento, creado_en, actualizado_en) values
  ('00000000-0000-0000-0000-0000000002a1', 'MD-T001', '00000000-0000-0000-0000-0000000001a1', 'adulto', 30, 'Centro Pruebapanel',
   '[{"areaId":"bienestar_emocional","valor":"no"}]',
   '{"niveles":{"bienestar_emocional":"requiere_atencion","relaciones":"por_fortalecer"},"conteo":{"adecuado":0,"porFortalecer":1,"requiereAtencion":1,"sinDato":0},"motivosPrioridad":["Bienestar emocional requiere atención"]}',
   'desafios', 30, true, true, false, '0.1-provisional', '1.0', 'pendiente',
   now() - interval '10 days', now() - interval '10 days'),
  ('00000000-0000-0000-0000-0000000002a2', 'MD-T002', '00000000-0000-0000-0000-0000000001a2', 'adulto', 30, 'Centro Pruebapanel',
   '[{"areaId":"bienestar_emocional","valor":"a_veces"}]',
   '{"niveles":{"bienestar_emocional":"por_fortalecer","relaciones":"adecuado"},"conteo":{"adecuado":1,"porFortalecer":1,"requiereAtencion":0,"sinDato":0},"motivosPrioridad":[]}',
   'por_fortalecer', 60, false, false, false, '0.1-provisional', '1.0', null, now(), now()),
  ('00000000-0000-0000-0000-0000000002b1', 'MD-T003', '00000000-0000-0000-0000-0000000001b1', 'nino', 9, 'Norte Pruebapanel',
   '[{"areaId":"bienestar_emocional","valor":"si"}]',
   '{"niveles":{"bienestar_emocional":"adecuado"},"conteo":{"adecuado":1,"porFortalecer":0,"requiereAtencion":0,"sinDato":0},"motivosPrioridad":[]}',
   'favorable', 95, false, false, false, '0.1-provisional', '1.0', null, now(), now());

-- ---------------------------------------------------------------------------------- permisos
set local role anon;
select throws_ok(
  $$select public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel))$$,
  '42501', null, 'Sin sesión no se puede leer el tablero'
);
select throws_ok(
  $$select public.panel_registros()$$,
  '42501', null, 'Sin sesión no se pueden leer los registros'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_panel where nombre = 'sin_perfil'), true);
select throws_ok($$select public.panel_registros()$$, '42501', null, 'Una cuenta sin perfil no ve los registros');
select set_config('request.jwt.claims', (select valor from claims_panel where nombre = 'consulta'), true);
select throws_ok($$select public.panel_registros()$$, '42501', null, 'El rol consulta no ve los registros');
select throws_ok($$select public.panel_prioritarios()$$, '42501', null, 'El rol consulta no ve los prioritarios');
select set_config('request.jwt.claims', (select valor from claims_panel where nombre = 'prof_aal1'), true);
select throws_ok($$select public.panel_detalle('00000000-0000-0000-0000-0000000002a1')$$, '42501', null,
  'Sin doble factor no se ve la ficha');
select throws_ok($$select privado.enmascarar_correo('ana@correo.co')$$, '42501', null,
  'Las ayudas de privado no se pueden llamar desde fuera');
select set_config('request.jwt.claims', (select valor from claims_panel where nombre = 'prof'), true);
select lives_ok($$select public.panel_registros()$$, 'El rol profesional con doble factor ve los registros');

-- ---------------------------------------------------------------------------------- tablero
select set_config('request.jwt.claims', (select valor from claims_panel where nombre = 'super'), true);
select is((public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) ->> 'aplicaciones')::integer - (select (tablero ->> 'aplicaciones')::integer from base_panel), 2, 'El tablero cuenta las aplicaciones de los últimos 7 días');
select is((public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) ->> 'aplicacionesAnterior')::integer - (select (tablero ->> 'aplicacionesAnterior')::integer from base_panel), 1, 'Y las de los 7 días anteriores');
select is((public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) ->> 'personas')::integer - (select (tablero ->> 'personas')::integer from base_panel), 2, 'Cuenta personas distintas');
select is((public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) ->> 'prioritariosPendientes')::integer - (select (tablero ->> 'prioritariosPendientes')::integer from base_panel), 1,
  'Los prioritarios pendientes no dependen de la fecha');
select is(array[(public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) -> 'resultados' ->> 'favorable')::integer - coalesce((select (tablero -> 'resultados' ->> 'favorable')::integer from base_panel), 0),
                (public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) -> 'resultados' ->> 'por_fortalecer')::integer - coalesce((select (tablero -> 'resultados' ->> 'por_fortalecer')::integer from base_panel), 0)],
  array[1, 1],
  'Reparte el resultado general del periodo');
select is((select sum((s ->> 'aplicaciones')::integer)::integer from jsonb_array_elements(public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) -> 'porSemana') s)
           - (select coalesce(sum((s ->> 'aplicaciones')::integer), 0)::integer from base_panel, jsonb_array_elements(tablero -> 'porSemana') s), 2,
  'Las semanas suman las aplicaciones del periodo');
select is((select (h ->> 'n')::integer from jsonb_array_elements(public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) -> 'mapaCalor') h
           where h ->> 'area' = 'bienestar_emocional' and h ->> 'nivel' = 'adecuado')
           - coalesce((select (h ->> 'n')::integer from base_panel, jsonb_array_elements(tablero -> 'mapaCalor') h
                       where h ->> 'area' = 'bienestar_emocional' and h ->> 'nivel' = 'adecuado'), 0), 1,
  'El mapa de calor cuenta personas por área y nivel');
select is((select count(*)::integer from jsonb_array_elements_text(public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel)) -> 'opcionesLugar') l
           where l in ('Centro Pruebapanel', 'Norte Pruebapanel')), 2, 'Ofrece los lugares de las aplicaciones como opciones');
select is((public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel), 'adulto', 'Centro Pruebapanel') ->> 'aplicaciones')::integer, 1,
  'Filtra por módulo');
select is((public.panel_tablero((select dia from hoy_panel) - 6, (select dia from hoy_panel), null, ' centro pruebapanel ') ->> 'aplicaciones')::integer, 1,
  'Filtra por lugar sin importar mayúsculas ni espacios');
select throws_ok($$select public.panel_tablero((select dia from hoy_panel), (select dia from hoy_panel) - 1)$$,
  '22023', null, 'Rechaza un periodo al revés');

-- ---------------------------------------------------------------------------------- registros
select is((public.panel_registros() ->> 'total')::integer - (select registros from base_panel), 3, 'Sin filtros lista todas las aplicaciones');
select is((public.panel_registros('ana pruebapanel') ->> 'total')::integer, 2, 'Busca por nombre');
select is((public.panel_registros('9990189') ->> 'total')::integer, 2, 'Busca por los dígitos del teléfono');
select is((public.panel_registros('acudiente.pruebapanel') ->> 'total')::integer, 1, 'Busca por el correo del acudiente');
select is((public.panel_registros('%%') ->> 'total')::integer, 0, 'Los comodines de la búsqueda no se interpretan');
select is((public.panel_registros('MD-T002') -> 'filas' -> 0 ->> 'correo'), 'an***@correo.co', 'El correo va enmascarado');
select is((public.panel_registros('MD-T002') -> 'filas' -> 0 ->> 'telefono'), '*** *** **89', 'El teléfono va enmascarado');
select is((public.panel_registros('MD-T', p_orden => 'nombre', p_descendente => false) -> 'filas' -> 0 ->> 'nombre'), 'Ana Pruebapanel',
  'Ordena por nombre');
select is((public.panel_registros('MD-T', p_tamano => 10, p_pagina => 2) -> 'filas'), '[]'::jsonb,
  'Una página fuera del total viene vacía');
select is((public.panel_registros('MD-T', p_area => 'bienestar_emocional', p_nivel => 'requiere_atencion') -> 'filas' -> 0 ->> 'codigo'),
  'MD-T001', 'Filtra por área y nivel');
select is((public.panel_registros('MD-T', p_prioridad => true, p_estado => 'pendiente') ->> 'total')::integer, 1,
  'Filtra por prioridad y estado');
select throws_ok($$select public.panel_registros(p_orden => 'correo')$$, '22023', null, 'Rechaza un orden que no existe');

-- ---------------------------------------------------------------------------------- ficha
select is((public.panel_detalle('00000000-0000-0000-0000-0000000002a2') ->> 'nombre'), 'Ana Pruebapanel', 'La ficha trae el nombre');
select is(jsonb_array_length(public.panel_detalle('00000000-0000-0000-0000-0000000002a2') -> 'historial'), 2,
  'El historial reúne las aplicaciones de la misma persona');
select is(jsonb_array_length(public.panel_detalle('00000000-0000-0000-0000-0000000002a2') -> 'autorizaciones'), 2,
  'La ficha trae las autorizaciones');
select is((public.panel_detalle('00000000-0000-0000-0000-0000000002b1') ->> 'correo'), 'ac***@correo.co',
  'En el módulo infantil enmascara el correo del acudiente');
select throws_ok($$select public.panel_detalle('00000000-0000-0000-0000-00000000ffff')$$, 'P0002', null,
  'Una aplicación que no existe da error');

-- ---------------------------------------------------------------------------------- prioritarios e impresión
select is(jsonb_array_length(public.panel_prioritarios()) - (select prioritarios from base_panel), 1, 'Lista solo los prioritarios pendientes');
select is((select (p ->> 'diasSinGestion')::integer from jsonb_array_elements(public.panel_prioritarios()) p where p ->> 'codigo' = 'MD-T001'), 10, 'Cuenta los días sin gestión');
select lives_ok($$select public.panel_registrar_impresion('00000000-0000-0000-0000-0000000002a1')$$,
  'El equipo puede registrar la impresión de una ficha');
reset role;
select set_config('request.jwt.claims', '', true);

select is(
  (select count(*)::integer from public.auditoria
   where accion = 'imprimir_ficha' and entidad_id = 'MD-T001'
     and actor_id = '00000000-0000-0000-0000-000000000101'),
  1, 'Imprimir la ficha queda en la auditoría con quién lo hizo'
);

select * from finish();
rollback;
