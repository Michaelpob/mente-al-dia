-- Cuestionario de adolescentes (D-81): como menor de edad, exige el adulto responsable y su
-- autorización. Solo prueba los caminos que no guardan una aplicación, para no gastar números de
-- la secuencia de códigos reales al correr en el proyecto (D-72).
begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

-- Institución de prueba (ninguna de las reales): el enlace ?sede=prueba-adolescentes.
insert into public.instituciones (nombre, slug) values ('Institución Pruebaadolescentes', 'prueba-adolescentes');

select throws_ok(
  $$select * from public.registrar_aplicacion(
      '{"modulo":"adolescente","nombre":"Adolescente Prueba","edad":15,"grado":"Noveno","acudiente":{"nombre":"Acudiente Prueba"}}',
      '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
      '[]', '{}', null, 'prueba-adolescentes')$$,
  '23514', 'Falta la autorización «autorizacion_acudiente».',
  'Un adolescente necesita la autorización del adulto responsable');

select throws_ok(
  $$insert into public.participantes (institucion_id, modulo, nombre, edad, grado)
    values ((select id from public.instituciones where slug = 'prueba-adolescentes'), 'adolescente', 'Sin Acudiente', 15, 'Noveno')$$,
  '23514', null, 'Un adolescente siempre queda con su adulto responsable');

select lives_ok(
  $$insert into public.participantes (institucion_id, modulo, nombre, edad, grado, acudiente)
    values ((select id from public.instituciones where slug = 'prueba-adolescentes'), 'adolescente', 'Con Acudiente', 15, 'Noveno', '{"nombre":"Acudiente Prueba"}')$$,
  'Un adolescente con su adulto responsable se guarda');

select throws_ok(
  $$select * from public.registrar_aplicacion(
      '{"modulo":"nino","nombre":"Niña Prueba","edad":9,"grado":"Cuarto","acudiente":{"nombre":"Acudiente Prueba"}}',
      '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
      '[]', '{}', null, 'prueba-adolescentes')$$,
  '23514', 'Falta la autorización «autorizacion_acudiente».',
  'El módulo infantil sigue exigiendo la autorización del adulto responsable');

select * from finish();
rollback;
