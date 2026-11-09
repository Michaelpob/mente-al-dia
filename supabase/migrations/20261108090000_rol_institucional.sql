-- Mente al Día · Rol de administrador institucional (D-86).
--
-- Va sola en su migración: PostgreSQL no deja usar un valor nuevo de un enum en la misma
-- transacción que lo crea. Las tablas, políticas y funciones que lo usan llegan en las migraciones
-- siguientes. Agregar el valor no cambia nada de lo que ya existe: hoy nadie tiene este rol.
alter type public.rol_panel add value if not exists 'administrador_institucional';
