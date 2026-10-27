-- Mente al Día · Proyecto en la nube: lectura para las Edge Functions (ver D-67).
--
-- «enviar-cuestionario» lee las reglas vigentes y la versión de los textos legales, e
-- «invitar-usuario» lee el perfil de quien invita, con la service role. Si el proyecto de Supabase
-- se crea sin «exponer tablas nuevas automáticamente», service_role no recibe permisos por defecto
-- sobre las tablas nuevas: se dan aquí, explícitos y solo de lectura. Lo que las funciones escriben
-- pasa por registrar_aplicacion y crear_perfil_invitado (security definer), que ya tienen su permiso.

grant select on public.reglas_resultados to service_role;
grant select on public.configuracion to service_role;
grant select on public.perfiles to service_role;
