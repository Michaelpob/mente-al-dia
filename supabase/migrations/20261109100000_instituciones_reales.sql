-- Cuatro de las seis instituciones ya tienen nombre (pedido del equipo, 9 de noviembre de 2026).
-- Se usan las provisionales que no tienen cuestionarios: Colegio 1 (con los seis de antes de D-86)
-- y Alcaldía 1 (con un cuestionario del 9 de noviembre) siguen provisionales y con sus datos.
-- Cambian el nombre y el enlace (?sede=); los enlaces provisionales de estas cuatro dejan de
-- funcionar. Cada cambio queda en la auditoría.
do $$
declare
  v_cambios constant jsonb := '[
    {"antes": "institucion6", "slug": "alcaldia-sanluis",     "nombre": "Alcaldía de San Luis"},
    {"antes": "alcaldia2",    "slug": "alcaldia-coello",      "nombre": "Alcaldía Municipal de Coello"},
    {"antes": "colegio2",     "slug": "sorjosefa-guamo",      "nombre": "Institución Educativa Sor Josefa del Castillo (Guamo)"},
    {"antes": "institucion5", "slug": "robertoleyva-saldana", "nombre": "Institución Educativa Técnica General Roberto Leyva (Saldaña)"}
  ]';
  v_cambio jsonb;
begin
  for v_cambio in select * from jsonb_array_elements(v_cambios) loop
    if exists (
      select 1 from public.aplicaciones a
      join public.instituciones i on i.id = a.institucion_id
      where i.slug = v_cambio ->> 'antes'
    ) then
      raise exception 'La institución % ya tiene cuestionarios: no se renombra aquí.', v_cambio ->> 'antes';
    end if;
    update public.instituciones
    set nombre = v_cambio ->> 'nombre', slug = v_cambio ->> 'slug'
    where slug = v_cambio ->> 'antes';
  end loop;
end
$$;
