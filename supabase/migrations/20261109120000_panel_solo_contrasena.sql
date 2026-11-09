-- D-89: al panel se entra solo con el correo y la contraseña (decisión del equipo, 9 de noviembre
-- de 2026). Ya no se exige el segundo factor (nivel aal2 de una aplicación de autenticación).
-- Sigue igual todo lo demás: perfil activo, rol de administración, institución activa para el
-- administrador institucional, el aislamiento entre instituciones, el cierre por inactividad del
-- panel (D-74) y la auditoría.
create or replace function privado.rol_actual() returns public.rol_panel
language sql stable security definer set search_path = '' as $$
  select p.rol
  from public.perfiles p
  left join public.instituciones i on i.id = p.institucion_id
  where p.id = auth.uid()
    and p.activo
    and (p.rol = 'superadministrador' or (p.rol = 'administrador_institucional' and i.activa))
$$;
