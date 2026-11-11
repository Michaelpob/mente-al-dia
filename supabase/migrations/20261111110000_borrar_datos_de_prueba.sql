-- D-92: se borran los datos de antes del lanzamiento, por pedido del equipo (11 de noviembre de
-- 2026), para empezar en limpio con las seis instituciones:
--   - los cuestionarios de las instituciones provisionales Colegio 1 (seis, de antes de D-86) y
--     Alcaldía 1 (uno, del 9 de noviembre), con sus participantes, sus autorizaciones y sus notas,
--     y las dos instituciones, que ya estaban inactivas (D-91);
--   - las visitas anónimas registradas hasta este borrado, todas de las pruebas;
--   - las cuentas públicas del sitio creadas antes del lanzamiento, con su progreso. Las cuentas
--     del panel (las que tienen perfil) no se tocan.
-- No se puede deshacer. La auditoría no se borra (es inmutable): por cada parte queda un registro
-- con los totales borrados, sin datos personales, y el trigger de instituciones registra su
-- eliminación. Los códigos de los cuestionarios no se reinician, porque la auditoría nombra los
-- borrados por su código.
do $$
declare
  v_inst record;
  v_aplicaciones integer;
  v_consentimientos integer;
  v_notas integer;
  v_participantes integer;
  v_visitas integer;
  v_cuentas integer;
  v_progreso integer;
begin
  if exists (select 1 from public.instituciones where slug in ('colegio1', 'alcaldia1') and activa) then
    raise exception 'Colegio 1 o Alcaldía 1 sigue activa: no se borra nada.';
  end if;
  if exists (
    select 1
    from public.perfiles p
    join public.instituciones i on i.id = p.institucion_id
    where i.slug in ('colegio1', 'alcaldia1')
  ) then
    raise exception 'Colegio 1 o Alcaldía 1 tiene administradores: no se borra nada.';
  end if;

  for v_inst in
    select id, nombre, slug from public.instituciones where slug in ('colegio1', 'alcaldia1') order by slug
  loop
    select count(*) into v_aplicaciones from public.aplicaciones where institucion_id = v_inst.id;
    select count(*) into v_consentimientos
    from public.consentimientos c
    join public.participantes p on p.id = c.participante_id
    where p.institucion_id = v_inst.id;
    select count(*) into v_notas
    from public.notas_seguimiento n
    join public.aplicaciones a on a.id = n.aplicacion_id
    where a.institucion_id = v_inst.id;

    -- Los cuestionarios, las autorizaciones y las notas se van con su participante (on delete cascade).
    delete from public.participantes where institucion_id = v_inst.id;
    get diagnostics v_participantes = row_count;
    delete from public.visitas where institucion_id = v_inst.id;

    perform privado.auditar(
      'eliminar',
      'aplicaciones',
      null,
      jsonb_build_object(
        'motivo', 'Datos de prueba de una institución provisional, borrados por pedido del equipo (D-92)',
        'institucion', v_inst.nombre,
        'slug', v_inst.slug,
        'aplicaciones', v_aplicaciones,
        'participantes', v_participantes,
        'consentimientos', v_consentimientos,
        'notas', v_notas
      ),
      v_inst.id
    );

    delete from public.instituciones where id = v_inst.id;
  end loop;

  -- Las visitas anónimas registradas hasta ahora, todas de las pruebas: las estadísticas arrancan
  -- de cero.
  delete from public.visitas where creado_en <= now();
  get diagnostics v_visitas = row_count;
  perform privado.auditar(
    'eliminar',
    'visitas',
    null,
    jsonb_build_object(
      'motivo', 'Visitas anónimas de las pruebas, de antes del lanzamiento (D-92)',
      'visitas', v_visitas
    )
  );

  -- Las cuentas públicas creadas antes del lanzamiento, sin perfil del panel. Su fila de cuentas y
  -- su progreso se van con el usuario (on delete cascade).
  create temporary table borrar_cuentas on commit drop as
  select u.id
  from auth.users u
  where u.created_at < '2026-11-11 00:00:00-05'
    and exists (select 1 from public.cuentas c where c.id = u.id)
    and not exists (select 1 from public.perfiles p where p.id = u.id);
  select count(*) into v_progreso from public.progreso where cuenta_id in (select id from borrar_cuentas);
  delete from auth.users where id in (select id from borrar_cuentas);
  get diagnostics v_cuentas = row_count;
  perform privado.auditar(
    'eliminar',
    'cuentas',
    null,
    jsonb_build_object(
      'motivo', 'Cuentas públicas creadas en las pruebas, de antes del lanzamiento (D-92)',
      'cuentas', v_cuentas,
      'progreso', v_progreso
    )
  );
end
$$;
