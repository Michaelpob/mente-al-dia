-- Mente al Día · Descarga del censo en Excel (D-84).
--
-- Es un reporte nominal: nombres y resultados de cada persona. Como `reporte_nominal`, solo lo genera
-- el superadministrador con doble factor, pide un motivo y queda en la auditoría con quién lo hizo,
-- los filtros, el motivo y cuántas personas salieron. No lleva datos de contacto: esos siguen en
-- `ver_datos_contacto`, persona por persona.
create function public.panel_censo_exportar(
  p_motivo text,
  p_desde date default null,
  p_hasta date default null,
  p_modulo public.modulo default null,
  p_lugar text default null
) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_personas jsonb;
  v_total integer;
begin
  if not privado.es_superadministrador() then
    raise exception 'Solo el superadministrador descarga el censo.' using errcode = 'insufficient_privilege';
  end if;
  if char_length(btrim(coalesce(p_motivo, ''))) < 10 then
    raise exception 'Indica el motivo de la descarga (al menos 10 caracteres).' using errcode = 'invalid_parameter_value';
  end if;
  if p_desde is not null and p_hasta is not null and p_hasta < p_desde then
    raise exception 'El periodo no es válido.' using errcode = 'invalid_parameter_value';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', c.id,
           'codigo', c.codigo,
           'creadoEn', c.creado_en,
           'nombre', c.nombre,
           'modulo', c.modulo,
           'edad', c.edad,
           'sexo', c.sexo,
           'grado', c.grado,
           'lugar', c.lugar,
           'resultadoGeneral', c.resultado_general,
           'prioridad', c.prioridad,
           'niveles', c.niveles,
           'cuestionarios', c.cuestionarios,
           'fortalezas', c.fortalezas,
           'porFortalecer', c.por_fortalecer,
           'falencias', c.falencias,
           'sinDato', c.sin_dato
         ) order by lower(c.nombre), c.creado_en desc, c.id), '[]'::jsonb),
         count(*)::integer
  into v_personas, v_total
  from privado.censo_personas(p_desde, p_hasta, p_modulo, p_lugar) c;

  perform privado.auditar('exportar_censo', 'aplicaciones', null, jsonb_build_object(
    'desde', p_desde,
    'hasta', p_hasta,
    'modulo', p_modulo,
    'lugar', nullif(btrim(p_lugar), ''),
    'motivo', btrim(p_motivo),
    'personas', v_total
  ));

  return jsonb_build_object(
    'generadoEn', now(),
    'generadoPor', (select p.nombre from public.perfiles p where p.id = auth.uid()),
    'resumen', public.panel_censo(p_desde, p_hasta, p_modulo, p_lugar),
    'personas', v_personas
  );
end
$$;

revoke all on function public.panel_censo_exportar(text, date, date, public.modulo, text) from public, anon;
grant execute on function public.panel_censo_exportar(text, date, date, public.modulo, text) to authenticated;
