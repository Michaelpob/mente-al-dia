-- Mente al Día · Instituciones (D-86): seis espacios independientes dentro de la misma plataforma.
--
-- Fase 2 de la ampliación multiinstitucional: la tabla de instituciones y la institución de cada
-- participante, aplicación, perfil, visita y entrada de auditoría, con relaciones que impiden
-- cruces. No borra nada: los cuestionarios que ya había pasan a «Colegio 1» (decisión del equipo).
-- La seguridad (políticas y funciones) llega en la migración siguiente; las dos se aplican juntas.

-- ---------------------------------------------------------------------------------------------
-- Instituciones
-- ---------------------------------------------------------------------------------------------
create table public.instituciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 2 and 120),
  slug text not null check (slug ~ '^[a-z0-9-]{3,40}$'),
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create unique index instituciones_slug on public.instituciones (slug);
comment on table public.instituciones is
  'Instituciones (D-86): cada una es un espacio independiente. Su slug va en el enlace (?sede=slug): identifica, no autentica.';

-- Cerrada desde el principio: sus políticas llegan en la migración siguiente.
alter table public.instituciones enable row level security;
revoke all on public.instituciones from public, anon, authenticated;

create trigger instituciones_actualizado_en before update on public.instituciones
  for each row execute function privado.tocar_actualizado_en();
create trigger instituciones_auditar after insert or update or delete on public.instituciones
  for each row execute function privado.auditar_cambio('slug');

-- Nombres provisionales: el administrador general los cambia desde el panel.
insert into public.instituciones (nombre, slug) values
  ('Colegio 1', 'colegio1'),
  ('Colegio 2', 'colegio2'),
  ('Alcaldía 1', 'alcaldia1'),
  ('Alcaldía 2', 'alcaldia2'),
  ('Institución 5', 'institucion5'),
  ('Institución 6', 'institucion6');

-- ---------------------------------------------------------------------------------------------
-- La institución de cada participante y de cada aplicación
-- ---------------------------------------------------------------------------------------------
alter table public.participantes add column institucion_id uuid references public.instituciones (id);
alter table public.aplicaciones add column institucion_id uuid references public.instituciones (id);

-- Lo que ya había pasa a Colegio 1, sin tocar «actualizado_en»: los días sin gestión de los
-- prioritarios siguen contando desde su último cambio real. El cambio queda en la auditoría.
alter table public.aplicaciones disable trigger aplicaciones_actualizado_en;
update public.participantes
set institucion_id = (select i.id from public.instituciones i where i.slug = 'colegio1')
where institucion_id is null;
update public.aplicaciones
set institucion_id = (select i.id from public.instituciones i where i.slug = 'colegio1')
where institucion_id is null;
alter table public.aplicaciones enable trigger aplicaciones_actualizado_en;

alter table public.participantes alter column institucion_id set not null;
alter table public.aplicaciones alter column institucion_id set not null;

-- Una aplicación solo puede ser de un participante de su misma institución: la llave compuesta
-- impide que una respuesta quede ligada a una persona de otra institución.
alter table public.participantes
  add constraint participantes_id_institucion unique (id, institucion_id);
alter table public.aplicaciones
  add constraint aplicaciones_participante_misma_institucion
  foreign key (participante_id, institucion_id)
  references public.participantes (id, institucion_id) on delete cascade;

create index participantes_institucion on public.participantes (institucion_id);
create index aplicaciones_institucion on public.aplicaciones (institucion_id, creado_en desc);

-- ---------------------------------------------------------------------------------------------
-- Perfiles, visitas y auditoría
-- ---------------------------------------------------------------------------------------------

-- El administrador institucional tiene su institución; el general (superadministrador), ninguna.
alter table public.perfiles add column institucion_id uuid references public.instituciones (id);
alter table public.perfiles add constraint perfiles_institucion_segun_rol
  check ((rol = 'administrador_institucional') = (institucion_id is not null));
create index perfiles_institucion on public.perfiles (institucion_id);

-- La institución del enlace por el que se entró al sitio (ninguna con el enlace general).
alter table public.visitas add column institucion_id uuid references public.instituciones (id);
create index visitas_institucion on public.visitas (institucion_id, creado_en);

-- A qué institución corresponde cada entrada de la auditoría. Sin llave foránea, como el resto de
-- la tabla, para que sobreviva a cualquier borrado. Las entradas anteriores quedan sin institución:
-- la auditoría no se modifica.
alter table public.auditoria add column institucion_id uuid;
create index auditoria_institucion on public.auditoria (institucion_id, ocurrido_en desc);
