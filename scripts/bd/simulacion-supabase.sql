-- Simulación mínima de Supabase para probar las migraciones en un PostgreSQL común (sin Docker).
-- Reproduce lo que las migraciones y las pruebas usan de Supabase:
--   - los roles anon, authenticated y service_role (este último salta RLS);
--   - el esquema auth con auth.users, auth.uid() y auth.jwt(), que leen los claims del JWT
--     desde request.jwt.claims, igual que PostgREST;
--   - los privilegios por defecto de Supabase: todo lo que se crea en public queda abierto a
--     anon y authenticated, y la protección depende de RLS y de los REVOKE de las migraciones.
-- Solo se usa en scripts/probar-bd.mjs. En Supabase real (supabase test db) no se carga.

-- Como en Supabase, las extensiones viven en el esquema «extensions», que está en el search_path.
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);

create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

grant execute on function auth.jwt() to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;
do $$
begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end
$$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
