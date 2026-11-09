-- Lista pública de instituciones (D-88): el enlace general deja elegir la institución.
-- Solo nombre y enlace de las activas. Corre en el proyecto real (D-72): todo se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into public.instituciones (id, nombre, slug, activa) values
  ('00000000-0000-0000-0000-0000000011e1', 'Prueba Lista Activa', 'prueba-lista-a', true),
  ('00000000-0000-0000-0000-0000000011e2', 'Prueba Lista Inactiva', 'prueba-lista-b', false);

select ok(has_function_privilege('anon', 'public.instituciones_publicas()', 'execute'),
  'El público puede pedir la lista');
select ok(has_function_privilege('authenticated', 'public.instituciones_publicas()', 'execute'),
  'Una sesión también puede pedirla');

set local role anon;
select results_eq(
  $$select nombre, slug from public.instituciones_publicas() where slug like 'prueba-lista-%'$$,
  $$values ('Prueba Lista Activa'::text, 'prueba-lista-a'::text)$$,
  'Trae las instituciones activas, con su nombre y su enlace');
select is_empty(
  $$select 1 from public.instituciones_publicas() where slug = 'prueba-lista-b'$$,
  'No trae las instituciones inactivas');
select results_eq(
  $$select array_agg(distinct k order by k) from (
      select jsonb_object_keys(to_jsonb(x)) as k from public.instituciones_publicas() x
    ) claves$$,
  $$values (array['nombre', 'slug']::text[])$$,
  'Solo devuelve el nombre y el enlace: ningún id ni dato interno');
reset role;
-- El público no lee la tabla; la cuenta de las activas se hace con el dueño.
select results_eq(
  $$select count(*)::integer from public.instituciones_publicas()$$,
  $$select count(*)::integer from public.instituciones where activa$$,
  'Trae todas las activas');

-- Desactivar una institución la saca de la lista en el acto.
update public.instituciones set activa = false where id = '00000000-0000-0000-0000-0000000011e1';
set local role anon;
select is_empty(
  $$select 1 from public.instituciones_publicas() where slug = 'prueba-lista-a'$$,
  'Al desactivarla, deja de aparecer');
reset role;

select * from finish();
rollback;
