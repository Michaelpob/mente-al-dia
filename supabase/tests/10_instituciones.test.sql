-- Aislamiento multiinstitucional (D-86/D-87): las pruebas 1, 2, 3, 5, 6, 7 y 10 del pedido.
-- Seis instituciones de prueba (y una inactiva), un administrador por institución y el general.
-- Corre en el proyecto real (D-72) con scripts/bd/codigos-de-prueba.sql: todo se deshace al final,
-- y los datos de prueba viven solo en instituciones de prueba.
begin;
create extension if not exists pgtap with schema extensions;
select plan(72);

-- ---------------------------------------------------------------------------------- datos base
insert into public.instituciones (id, nombre, slug, activa) values
  ('00000000-0000-0000-0000-0000000010e1', 'Prueba Uno', 'prueba-i1', true),
  ('00000000-0000-0000-0000-0000000010e2', 'Prueba Dos', 'prueba-i2', true),
  ('00000000-0000-0000-0000-0000000010e3', 'Prueba Tres', 'prueba-i3', true),
  ('00000000-0000-0000-0000-0000000010e4', 'Prueba Cuatro', 'prueba-i4', true),
  ('00000000-0000-0000-0000-0000000010e5', 'Prueba Cinco', 'prueba-i5', true),
  ('00000000-0000-0000-0000-0000000010e6', 'Prueba Seis', 'prueba-i6', true),
  ('00000000-0000-0000-0000-0000000010e7', 'Prueba Inactiva', 'prueba-inactiva', false);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000001000', 'general-instituciones@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001001', 'admin-i1@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001002', 'admin-i2@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001003', 'admin-i3@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001004', 'admin-i4@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001005', 'admin-i5@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001006', 'admin-i6@ejemplo.org'),
  ('00000000-0000-0000-0000-000000001007', 'admin-inactiva@ejemplo.org');

insert into public.perfiles (id, nombre, rol, activo, institucion_id) values
  ('00000000-0000-0000-0000-000000001000', 'General Prueba', 'superadministrador', true, null),
  ('00000000-0000-0000-0000-000000001001', 'Admin Uno', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e1'),
  ('00000000-0000-0000-0000-000000001002', 'Admin Dos', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e2'),
  ('00000000-0000-0000-0000-000000001003', 'Admin Tres', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e3'),
  ('00000000-0000-0000-0000-000000001004', 'Admin Cuatro', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e4'),
  ('00000000-0000-0000-0000-000000001005', 'Admin Cinco', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e5'),
  ('00000000-0000-0000-0000-000000001006', 'Admin Seis', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e6'),
  ('00000000-0000-0000-0000-000000001007', 'Admin Inactiva', 'administrador_institucional', true, '00000000-0000-0000-0000-0000000010e7');

create temporary table claims_inst (nombre text primary key, valor text);
grant select on claims_inst to anon, authenticated;
insert into claims_inst
select 'i' || n, json_build_object('sub', '00000000-0000-0000-0000-00000000100' || n,
                                   'role', 'authenticated', 'aal', 'aal2',
                                   'session_id', '00000000-0000-0000-0000-00000000100' || n)::text
from generate_series(1, 7) n;
insert into claims_inst values
  ('general', '{"sub":"00000000-0000-0000-0000-000000001000","role":"authenticated","aal":"aal2","session_id":"00000000-0000-0000-0000-000000001000"}'),
  ('i1_aal1', '{"sub":"00000000-0000-0000-0000-000000001001","role":"authenticated","aal":"aal1"}');

-- La institución k recibe k cuestionarios, por su enlace (?sede=prueba-ik), como el servidor.
create function pg_temp.registrar(p_sede text, p_n integer) returns void
language plpgsql as $$
begin
  for i in 1..p_n loop
    perform public.registrar_aplicacion(
      jsonb_build_object('modulo', 'adulto', 'nombre', 'Persona ' || i || ' de ' || p_sede,
                         'correo', 'p' || i || '.' || p_sede || '@ejemplo.org', 'telefono', '3000000000',
                         'lugarResidencia', 'Barrio ' || p_sede),
      '{"tratamiento_datos":"0.1-borrador","datos_sensibles":"0.1-borrador"}',
      '[{"areaId":"bienestar_emocional","valor":"no"}]',
      '{"resultadoGeneral":"desafios","indice":30,"prioridad":true,"rutaAtencionEspecial":true,"resultadoParcial":false,"reglasVersion":"0.1-provisional","instrumentoVersion":"1.0","niveles":{"bienestar_emocional":"requiere_atencion"}}',
      null,
      p_sede
    );
  end loop;
end
$$;
select pg_temp.registrar('prueba-i' || n, n) from generate_series(1, 6) n;

-- Un cuestionario de cada institución, para intentar abrirlos desde otra.
create temporary table de_prueba as
select i.slug, (select a.id from public.aplicaciones a where a.institucion_id = i.id limit 1) as aplicacion
from public.instituciones i where i.slug like 'prueba-i_';
grant select on de_prueba to anon, authenticated;
create temporary table hoy_inst as select (now() at time zone 'America/Bogota')::date as dia;
grant select on hoy_inst to anon, authenticated;

-- ---------------------------------------------------------------------- 4. inserción por enlace
select is(
  (select array_agg(n order by slug) from (
     select i.slug, count(a.id)::integer as n
     from public.instituciones i left join public.aplicaciones a on a.institucion_id = i.id
     where i.slug like 'prueba-i_' group by i.slug) x),
  array[1, 2, 3, 4, 5, 6],
  'Cada cuestionario queda en la institución de su enlace'
);
select is(
  (select count(*)::integer from public.aplicaciones a join public.participantes p on p.id = a.participante_id
   where p.institucion_id <> a.institucion_id),
  0, 'Cada participante está en la misma institución que su cuestionario'
);
select is((select count(*)::integer from public.aplicaciones where institucion_id is null), 0,
  'Ningún cuestionario queda sin institución');
select is(
  (select count(*)::integer from public.auditoria
   where accion = 'crear' and entidad = 'aplicaciones' and institucion_id = '00000000-0000-0000-0000-0000000010e3'),
  3, 'La auditoría de cada registro guarda su institución'
);
select throws_ok(
  $$select * from public.registrar_aplicacion('{"modulo":"adulto","nombre":"X"}',
      '{"tratamiento_datos":"v","datos_sensibles":"v"}', '[]', '{}', null, 'no-existe')$$,
  '22023', null, 'Una sede que no existe se rechaza'
);
select throws_ok(
  $$select * from public.registrar_aplicacion('{"modulo":"adulto","nombre":"X"}',
      '{"tratamiento_datos":"v","datos_sensibles":"v"}', '[]', '{}')$$,
  '22023', null, 'Sin sede (enlace general) no se registra nada'
);
select throws_ok(
  $$select * from public.registrar_aplicacion('{"modulo":"adulto","nombre":"X"}',
      '{"tratamiento_datos":"v","datos_sensibles":"v"}', '[]', '{}', null, 'prueba-inactiva')$$,
  '22023', null, 'Una institución inactiva no recibe cuestionarios'
);

-- ---------------------------------------------------------------- 3. relaciones y manipulación
select throws_ok(
  $$insert into public.aplicaciones (institucion_id, participante_id, modulo, respuestas, resultado,
      resultado_general, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version, instrumento_version)
    select '00000000-0000-0000-0000-0000000010e2', a.participante_id, 'adulto', '[]', '{}', 'favorable',
           false, false, false, '0.1-provisional', '1.0'
    from public.aplicaciones a where a.institucion_id = '00000000-0000-0000-0000-0000000010e1' limit 1$$,
  '23503', null, 'Una respuesta no puede apuntar a un participante de otra institución'
);
select throws_ok(
  $$update public.aplicaciones set institucion_id = '00000000-0000-0000-0000-0000000010e2'
    where institucion_id = '00000000-0000-0000-0000-0000000010e1'$$,
  '42501', null, 'Ni el dueño de la base cambia la institución de un cuestionario'
);
select throws_ok(
  $$insert into public.perfiles (id, nombre, rol) values
      ('00000000-0000-0000-0000-000000001006', 'Otro', 'administrador_institucional')$$,
  '23514', null, 'Un administrador institucional siempre tiene institución'
);

-- -------------------------------------------------------------------------------- 10. público
-- D-89: el equipo entra con el código del correo. Cada sesión simulada (session_id = su cuenta)
-- de las cuentas de prueba queda verificada; las sesiones sin session_id no lo están.
insert into privado.sesiones_verificadas (session_id, user_id, expira_en)
select u.id, u.id, now() + interval '1 day'
from auth.users u
where u.id::text like '00000000-0000-0000-0000-%'
on conflict (session_id) do nothing;

set local role anon;
select results_eq($$select nombre, slug from public.institucion_publica('prueba-i1')$$,
  $$values ('Prueba Uno'::text, 'prueba-i1'::text)$$, 'El enlace de una institución activa muestra su nombre');
select results_eq($$select count(*)::integer from public.institucion_publica('prueba-inactiva')$$,
  $$values (0)$$, 'El enlace de una institución inactiva no muestra nada');
select results_eq($$select count(*)::integer from public.institucion_publica(' PRUEBA-I2 ')$$,
  $$values (1)$$, 'El enlace no distingue mayúsculas ni espacios');
select throws_ok($$select * from public.instituciones$$, '42501', null, 'El público no lee la tabla de instituciones');
select throws_ok($$select * from public.registrar_aplicacion('{}', '{}', '[]', '{}', null, 'prueba-i1')$$,
  '42501', null, 'El navegador no registra cuestionarios directamente');
select lives_ok($$select public.registrar_visita('movil', 'prueba-i1')$$, 'Una visita por el enlace de una institución');
select lives_ok($$select public.registrar_visita('tableta', 'no-existe')$$, 'Una visita con un enlace desconocido no falla');
select throws_ok($$select public.panel_instituciones()$$, '42501', null, 'El público no ve las instituciones del panel');
reset role;

-- ------------------------------------------------------------- 1. y 7. cada uno, lo suyo
set local role authenticated;
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i1'), true);
select is((public.panel_registros() ->> 'total')::integer, 1, 'Institución 1: su administrador ve solo su cuestionario');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i2'), true);
select is((public.panel_registros() ->> 'total')::integer, 2, 'Institución 2: ve solo sus 2 cuestionarios');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i3'), true);
select is((public.panel_registros() ->> 'total')::integer, 3, 'Institución 3: ve solo sus 3 cuestionarios');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i4'), true);
select is((public.panel_registros() ->> 'total')::integer, 4, 'Institución 4: ve solo sus 4 cuestionarios');
select is((public.panel_tablero((select dia from hoy_inst) - 6, (select dia from hoy_inst)) ->> 'aplicaciones')::integer, 4,
  'Institución 4: el tablero cuenta lo mismo que hay en la base');
select is((public.panel_tablero((select dia from hoy_inst) - 6, (select dia from hoy_inst)) ->> 'prioritariosPendientes')::integer, 4,
  'Institución 4: los prioritarios pendientes son los suyos');
select is((public.panel_censo() ->> 'personas')::integer, 4, 'Institución 4: el censo cuenta a sus 4 personas');
select is(jsonb_array_length(public.panel_prioritarios()), 4, 'Institución 4: la bandeja de prioritarios es la suya');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i5'), true);
select is((public.panel_registros() ->> 'total')::integer, 5, 'Institución 5: ve solo sus 5 cuestionarios');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i6'), true);
select is((public.panel_registros() ->> 'total')::integer, 6, 'Institución 6: ve solo sus 6 cuestionarios');

-- ----------------------------------------------- 2. acceso cruzado: Colegio 1 contra Colegio 2
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i1'), true);
select is((select count(*)::integer from public.aplicaciones), 1, 'Por RLS, la tabla solo muestra su cuestionario');
select is((select count(*)::integer from public.aplicaciones where institucion_id = '00000000-0000-0000-0000-0000000010e2'), 0,
  'Por RLS, no ve ningún cuestionario de la institución 2');
select is((select count(*)::integer from public.notas_seguimiento), 0, 'No ve notas de otras instituciones');
select is((select array_agg(slug) from public.instituciones), array['prueba-i1'], 'Solo ve su institución');
select is((select count(*)::integer from public.perfiles), 1, 'No ve a los administradores de otras instituciones');
select is((select institucion_slug from public.mi_perfil()), 'prueba-i1', 'Su perfil dice su institución');
select is(jsonb_array_length(public.panel_instituciones()), 1, 'En las cifras de instituciones solo aparece la suya');
select throws_ok($$select public.panel_registros(p_institucion => '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir los registros de la institución 2: denegado');
select throws_ok($$select public.panel_tablero((select dia from hoy_inst), (select dia from hoy_inst), null, null, '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir el tablero de la institución 2: denegado');
select throws_ok($$select public.panel_censo(p_institucion => '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir el censo de la institución 2: denegado');
select throws_ok($$select public.panel_censo_personas(p_institucion => '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir la lista del censo de la institución 2: denegado');
select throws_ok($$select public.panel_censo_exportar('Motivo suficientemente largo', p_institucion => '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Descargar el censo de la institución 2: denegado');
select throws_ok($$select public.panel_prioritarios('00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir los prioritarios de la institución 2: denegado');
select throws_ok($$select public.panel_visitas((select dia from hoy_inst), (select dia from hoy_inst), '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir las visitas de la institución 2: denegado');
select throws_ok($$select * from public.reporte_agregado((select dia from hoy_inst), (select dia from hoy_inst), '00000000-0000-0000-0000-0000000010e2')$$,
  '42501', null, 'Pedir el reporte agregado de la institución 2: denegado');
select throws_ok($$select public.panel_detalle((select aplicacion from de_prueba where slug = 'prueba-i2'))$$,
  'P0002', null, 'La ficha de un cuestionario de la institución 2 no se abre (ni se revela que existe)');
select throws_ok($$select public.ver_datos_contacto((select aplicacion from de_prueba where slug = 'prueba-i2'))$$,
  'P0002', null, 'Los datos de contacto de la institución 2 no se ven');
select throws_ok($$select public.panel_registrar_impresion((select aplicacion from de_prueba where slug = 'prueba-i2'))$$,
  'P0002', null, 'Una ficha de la institución 2 no se imprime');
select is((public.panel_visitas((select dia from hoy_inst), (select dia from hoy_inst)) ->> 'total')::integer, 1,
  'Ve solo las visitas de su enlace');

-- ------------------------------------------------- 3. manipulación desde una sesión institucional
select throws_ok($$update public.aplicaciones set institucion_id = '00000000-0000-0000-0000-0000000010e2'$$,
  '42501', null, 'No cambia la institución de un cuestionario');
select throws_ok($$update public.perfiles set institucion_id = '00000000-0000-0000-0000-0000000010e2'
    where id = '00000000-0000-0000-0000-000000001001'$$,
  '42501', null, 'No cambia su propia institución');
select results_eq(
  $$with cambio as (
      update public.perfiles set rol = 'superadministrador'
      where id = '00000000-0000-0000-0000-000000001001' returning 1)
    select count(*)::integer from cambio$$,
  $$values (0)$$, 'No se da permisos superiores');
select throws_ok($$insert into public.perfiles (id, nombre, rol, institucion_id) values
    ('00000000-0000-0000-0000-000000001006', 'Otro', 'administrador_institucional', '00000000-0000-0000-0000-0000000010e1')$$,
  '42501', null, 'No crea administradores');
select throws_ok($$update public.instituciones set activa = false$$, '42501', null, 'No cambia su institución');
select throws_ok($$select public.panel_institucion_actualizar('00000000-0000-0000-0000-0000000010e1', 'Otro nombre', 'prueba-i1', true)$$,
  '42501', null, 'Tampoco con la función del general');
select throws_ok($$select public.panel_administradores()$$, '42501', null, 'No ve la lista de administradores');
select throws_ok($$select public.panel_administrador_actualizar('00000000-0000-0000-0000-000000001002', false)$$,
  '42501', null, 'No desactiva a otro administrador');
select throws_ok($$select public.panel_auditoria()$$, '42501', null, 'No lee la auditoría');
select throws_ok($$select public.panel_cuentas()$$, '42501', null, 'No ve las cuentas públicas');

-- Sin doble factor, o con la institución inactiva, no hay acceso.
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i1_aal1'), true);
select throws_ok($$select public.panel_registros()$$, '42501', null, 'Sin doble factor, nada');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i7'), true);
select throws_ok($$select public.panel_registros()$$, '42501', null,
  'El administrador de una institución inactiva no entra al panel');

-- ------------------------------------------------------------- 6. el administrador general
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'general'), true);
select is(
  (select array_agg((x ->> 'cuestionarios')::integer order by x ->> 'slug')
   from jsonb_array_elements(public.panel_instituciones()) x where x ->> 'slug' like 'prueba-i_'),
  array[1, 2, 3, 4, 5, 6], 'Ve las cifras de las seis instituciones');
select is((public.panel_registros(p_institucion => '00000000-0000-0000-0000-0000000010e3') ->> 'total')::integer, 3,
  'Filtra los registros de una institución');
select cmp_ok((public.panel_registros() ->> 'total')::integer, '>=', 21, 'Sin filtro ve el consolidado de todas');
select lives_ok($$select public.panel_detalle((select aplicacion from de_prueba where slug = 'prueba-i2'))$$,
  'Abre la ficha de cualquier institución');
select is(
  (select count(*)::integer from jsonb_array_elements(public.panel_administradores()) x
   where x -> 'institucion' ->> 'nombre' like 'Prueba %'),
  7, 'Ve a los administradores de todas las instituciones');
select is(
  (select (public.panel_auditoria(p_institucion => '00000000-0000-0000-0000-0000000010e3') ->> 'total')::integer),
  5, 'Filtra la auditoría por institución: la institución, su administrador y sus 3 cuestionarios');
select lives_ok(
  $$select public.panel_institucion_actualizar('00000000-0000-0000-0000-0000000010e6', 'Prueba Seis', 'prueba-i6', false)$$,
  'Desactiva una institución');
select results_eq($$select count(*)::integer from public.institucion_publica('prueba-i6')$$, $$values (0)$$,
  'Su enlace deja de funcionar');
select lives_ok($$select public.panel_administrador_actualizar('00000000-0000-0000-0000-000000001005', false)$$,
  'Desactiva a un administrador institucional');
select set_config('request.jwt.claims', (select valor from claims_inst where nombre = 'i5'), true);
select throws_ok($$select public.panel_registros()$$, '42501', null, 'El administrador desactivado ya no entra');
reset role;
select set_config('request.jwt.claims', '', true);

-- ------------------------------------------------------------------------- 5. invitaciones
set local role service_role;
select throws_ok(
  $$select public.crear_perfil_invitado('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000001006',
      'Otra', 'administrador_institucional', '00000000-0000-0000-0000-0000000010e1')$$,
  '42501', null, 'Un administrador institucional no invita a nadie');
select throws_ok(
  $$select public.crear_perfil_invitado('00000000-0000-0000-0000-000000001000', '00000000-0000-0000-0000-000000001006',
      'Otra', 'administrador_institucional', '00000000-0000-0000-0000-0000000010e7')$$,
  '22023', null, 'No se invita a una institución inactiva');
select throws_ok(
  $$select public.crear_perfil_invitado('00000000-0000-0000-0000-000000001000', '00000000-0000-0000-0000-000000001006',
      'Otra', 'profesional')$$,
  '22023', null, 'Los roles antiguos ya no se asignan');
reset role;

select * from finish();
rollback;
