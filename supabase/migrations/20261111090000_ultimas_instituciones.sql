-- Las dos últimas instituciones (pedido del equipo, 11 de noviembre de 2026): Alcaldía de Saldaña e
-- Institución Educativa Técnica Comercial Caldas de Guamo. Con ellas están las seis.
-- Las provisionales Colegio 1 (seis cuestionarios de antes de D-86) y Alcaldía 1 (un cuestionario
-- del 9 de noviembre) no se renombran, para no pasar sus datos a una institución real: quedan
-- inactivas. No aparecen en la lista pública ni reciben respuestas, y sus datos se conservan para el
-- administrador general. Cada cambio queda en la auditoría.
insert into public.instituciones (nombre, slug, activa) values
  ('Alcaldía de Saldaña', 'alcaldia-saldana', true),
  ('Institución Educativa Técnica Comercial Caldas (Guamo)', 'caldas-guamo', true)
on conflict (slug) do nothing;

update public.instituciones
set activa = false
where slug in ('colegio1', 'alcaldia1') and activa;
