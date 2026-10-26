-- Mente al Día · Fase 6: envío del cuestionario sin duplicados (ver D-50).
--
-- El navegador genera una clave de envío (uuid) al empezar el registro. Si la conexión falla
-- después de guardar y la persona vuelve a enviar, llega la misma clave: se devuelve el código
-- de la aplicación ya guardada, sin crear otra ni otra copia de los datos personales.

alter table public.aplicaciones add column clave_envio uuid;
-- Índice único: admite varias filas sin clave (null), pero nunca dos con la misma.
create unique index aplicaciones_clave_envio on public.aplicaciones (clave_envio);

drop function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb);

-- Igual que en la Fase 4, más p_clave_envio. Solo la llama la Edge Function «enviar-cuestionario».
create function public.registrar_aplicacion(
  p_participante jsonb,
  p_consentimientos jsonb,
  p_respuestas jsonb,
  p_resultado jsonb,
  p_clave_envio uuid default null
) returns table (id uuid, codigo text)
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_modulo public.modulo := (p_participante ->> 'modulo')::public.modulo;
  v_participante uuid;
  v_aplicacion uuid;
  v_codigo text;
  v_tipo public.tipo_consentimiento;
  v_requeridos public.tipo_consentimiento[] := array['tratamiento_datos', 'datos_sensibles'];
  v_prioridad boolean := (p_resultado ->> 'prioridad')::boolean;
begin
  -- Reintento de un envío ya guardado: el mismo código, sin guardar nada más.
  if p_clave_envio is not null then
    return query
      select a.id, a.codigo from public.aplicaciones a where a.clave_envio = p_clave_envio;
    if found then
      return;
    end if;
  end if;

  if v_modulo = 'nino' then
    v_requeridos := v_requeridos || 'autorizacion_acudiente'::public.tipo_consentimiento;
  end if;
  foreach v_tipo in array v_requeridos loop
    if coalesce(jsonb_typeof(p_consentimientos -> v_tipo::text), '') <> 'string' then
      raise exception 'Falta la autorización «%».', v_tipo using errcode = 'check_violation';
    end if;
  end loop;

  insert into public.participantes (modulo, nombre, correo, telefono, lugar_residencia, edad, grado, sexo, acudiente)
  values (
    v_modulo,
    p_participante ->> 'nombre',
    p_participante ->> 'correo',
    p_participante ->> 'telefono',
    p_participante ->> 'lugarResidencia',
    (p_participante ->> 'edad')::smallint,
    p_participante ->> 'grado',
    p_participante ->> 'sexo',
    p_participante -> 'acudiente'
  )
  returning participantes.id into v_participante;

  insert into public.consentimientos (participante_id, tipo, version_texto)
  select v_participante, t, p_consentimientos ->> t::text
  from unnest(v_requeridos) as t;

  insert into public.aplicaciones (
    participante_id, modulo, edad, lugar_residencia, respuestas, resultado, resultado_general,
    indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
    instrumento_version, estado_seguimiento, clave_envio
  )
  values (
    v_participante,
    v_modulo,
    (p_participante ->> 'edad')::smallint,
    coalesce(p_participante ->> 'lugarResidencia', p_participante -> 'acudiente' ->> 'lugarResidencia'),
    p_respuestas,
    p_resultado,
    (p_resultado ->> 'resultadoGeneral')::public.resultado_general,
    (p_resultado ->> 'indice')::smallint,
    v_prioridad,
    (p_resultado ->> 'rutaAtencionEspecial')::boolean,
    (p_resultado ->> 'resultadoParcial')::boolean,
    p_resultado ->> 'reglasVersion',
    p_resultado ->> 'instrumentoVersion',
    case when v_prioridad then 'pendiente'::public.estado_seguimiento end,
    p_clave_envio
  )
  returning aplicaciones.id, aplicaciones.codigo into v_aplicacion, v_codigo;

  perform privado.auditar('crear', 'aplicaciones', v_codigo, jsonb_build_object(
    'modulo', v_modulo,
    'resultadoGeneral', p_resultado ->> 'resultadoGeneral',
    'prioridad', v_prioridad,
    'reglasVersion', p_resultado ->> 'reglasVersion'
  ));

  return query select v_aplicacion, v_codigo;
exception
  -- Dos envíos con la misma clave al mismo tiempo: el segundo devuelve el del primero.
  when unique_violation then
    if p_clave_envio is null then
      raise;
    end if;
    return query
      select a.id, a.codigo from public.aplicaciones a where a.clave_envio = p_clave_envio;
end
$$;

revoke all on function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb, uuid)
  from public, anon, authenticated;
grant execute on function public.registrar_aplicacion(jsonb, jsonb, jsonb, jsonb, uuid) to service_role;
