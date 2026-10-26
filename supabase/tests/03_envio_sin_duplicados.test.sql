-- Envío del cuestionario sin duplicados con la clave de envío (D-50).
-- Se ejecuta con `supabase test db` o, sin Docker, con `corepack pnpm test:bd`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

create temporary table envio (participante jsonb, consentimientos jsonb, respuestas jsonb, resultado jsonb);
grant select on envio to service_role;
insert into envio values (
  '{"modulo":"adulto","nombre":"Persona Prueba","correo":"persona@correo.co","telefono":"3000000000","lugarResidencia":"Centro"}',
  '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
  '[{"areaId":"bienestar_emocional","valor":"si"}]',
  '{"resultadoGeneral":"favorable","indice":95,"prioridad":false,"rutaAtencionEspecial":false,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0"}'
);

set local role service_role;
create temporary table primero as
select r.* from envio e,
  public.registrar_aplicacion(e.participante, e.consentimientos, e.respuestas, e.resultado,
    '11111111-1111-1111-1111-111111111111') r;
create temporary table reintento as
select r.* from envio e,
  public.registrar_aplicacion(e.participante, e.consentimientos, e.respuestas, e.resultado,
    '11111111-1111-1111-1111-111111111111') r;
create temporary table otra as
select r.* from envio e,
  public.registrar_aplicacion(e.participante, e.consentimientos, e.respuestas, e.resultado,
    '22222222-2222-2222-2222-222222222222') r;
-- Sin clave (como en la Fase 4): cada llamada guarda una aplicación nueva.
create temporary table sin_clave as
select r.* from envio e,
  public.registrar_aplicacion(e.participante, e.consentimientos, e.respuestas, e.resultado) r
union all
select r.* from envio e,
  public.registrar_aplicacion(e.participante, e.consentimientos, e.respuestas, e.resultado) r;
reset role;

select is(
  (select codigo from reintento),
  (select codigo from primero),
  'Un reintento con la misma clave recibe el mismo código'
);
select is(
  (select id from reintento),
  (select id from primero),
  'Un reintento con la misma clave recibe la misma aplicación'
);
select is(
  (select count(*) from public.aplicaciones where clave_envio = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'El reintento no guarda otra aplicación'
);
select is(
  (select count(*) from public.participantes),
  4::bigint,
  'El reintento no guarda otra copia de los datos personales (4 aplicaciones, 4 participantes)'
);
select is(
  (select count(*) from public.auditoria where accion = 'crear' and entidad = 'aplicaciones'),
  4::bigint,
  'El reintento no deja otra entrada de «crear» en la auditoría'
);
select isnt(
  (select codigo from otra),
  (select codigo from primero),
  'Otra clave es otro envío, con otro código'
);
select is(
  (select count(distinct codigo) from sin_clave),
  2::bigint,
  'Sin clave de envío, cada llamada guarda una aplicación'
);

set local role authenticated;
select throws_ok(
  $$select * from public.registrar_aplicacion('{}', '{}', '[]', '{}', '11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'Desde el navegador no se puede registrar ni consultar por clave'
);
reset role;

select * from finish();
rollback;
