-- Solo para correr las pruebas en el proyecto real (D-72): las aplicaciones de prueba reciben
-- códigos de una secuencia temporal (MD-900001…), así no se gastan los números de los casos reales.
-- Va en el mismo bloque que la prueba, que termina con un error a propósito: todo se deshace.
create temporary sequence codigos_prueba start 900001;
create or replace function privado.siguiente_codigo() returns text
language sql volatile security definer set search_path = '' as $$
  select 'MD-' || lpad(n::text, greatest(4, char_length(n::text)), '0')
  from (select nextval('pg_temp.codigos_prueba') as n) s
$$;
