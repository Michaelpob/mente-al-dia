-- Datos ficticios para probar el panel con volumen (Fase 8). SOLO PARA DESARROLLO Y PRUEBAS:
-- nunca en la base real. Crea 10.000 aplicaciones de personas inventadas en los últimos 180 días.
-- Los códigos son MD-F00001…: no usan la secuencia de los códigos reales.
-- Uso, después de las migraciones: psql "$BD_PRUEBAS_URL" -f scripts/bd/datos-ficticios.sql

create temporary table ficticias as
select g,
       gen_random_uuid() as participante,
       gen_random_uuid() as aplicacion,
       (case when g % 3 = 0 then 'nino' else 'adulto' end)::public.modulo as modulo,
       (array['Ana', 'Luis', 'María', 'Jorge', 'Camila', 'Andrés', 'Valentina', 'Santiago', 'Sofía', 'Mateo'])[1 + g % 10]
         || ' ' || (array['García', 'Rodríguez', 'Martínez', 'López', 'Gómez', 'Pérez', 'Díaz', 'Torres'])[1 + (g / 10) % 8]
         || ' ' || g as nombre,
       (array['Centro', 'Norte', 'Sur', 'Oriente', 'Occidente', 'Rural'])[1 + (g * 7) % 6] as lugar,
       now() - make_interval(days => (g * 13) % 180, hours => g % 24) as creado_en
from generate_series(1, 10000) g;

create temporary table niveles_ficticios as
select f.g,
       a.area,
       (array['adecuado', 'adecuado', 'por_fortalecer', 'requiere_atencion'])[1 + (f.g * 31 + a.i * 17) % 4] as nivel
from ficticias f
cross join unnest(array[
  'bienestar_emocional', 'sueno_descanso', 'energia_vitalidad', 'motivacion_interes', 'manejo_estres',
  'red_apoyo', 'relaciones_interpersonales', 'valoracion_respeto', 'concentracion', 'afrontamiento_dificultades',
  'regulacion_emocional', 'actividad_fisica_recreacion', 'equilibrio_responsabilidades_descanso', 'seguridad_entorno',
  'perspectiva_futuro', 'proposito_sentido_vida', 'afrontamiento_consumo_sustancias', 'busqueda_ayuda',
  'funcionamiento_cotidiano', 'bienestar_psicologico_general'
]) with ordinality as a(area, i);

insert into public.participantes (id, modulo, nombre, correo, telefono, lugar_residencia, edad, grado, acudiente)
select participante,
       modulo,
       nombre,
       case when modulo = 'adulto' then 'persona' || g || '@ejemplo.co' end,
       case when modulo = 'adulto' then '300' || lpad(g::text, 7, '0') end,
       lugar,
       case when modulo = 'nino' then 6 + g % 10 else 18 + g % 60 end,
       case when modulo = 'nino' then (1 + g % 10)::text || '°' end,
       case when modulo = 'nino' then jsonb_build_object(
         'nombre', 'Acudiente ' || g, 'parentesco', 'Madre', 'correo', 'acudiente' || g || '@ejemplo.co',
         'telefono', '310' || lpad(g::text, 7, '0'), 'lugarResidencia', lugar) end
from ficticias;

insert into public.aplicaciones (id, codigo, participante_id, modulo, edad, lugar_residencia, respuestas, resultado,
  resultado_general, indice, prioridad, ruta_atencion_especial, resultado_parcial, reglas_version,
  instrumento_version, estado_seguimiento, creado_en, actualizado_en)
select f.aplicacion,
       'MD-F' || lpad(f.g::text, 5, '0'),
       f.participante,
       f.modulo,
       case when f.modulo = 'nino' then 6 + f.g % 10 else 18 + f.g % 60 end,
       f.lugar,
       r.respuestas,
       jsonb_build_object(
         'niveles', r.niveles,
         'conteo', jsonb_build_object('adecuado', r.adecuado, 'porFortalecer', r.fortalecer,
                                      'requiereAtencion', r.atencion, 'sinDato', 0),
         'motivosPrioridad', case when r.prioridad then '["Bienestar emocional requiere atención"]'::jsonb
                                  else '[]'::jsonb end),
       (case when r.atencion >= 8 then 'desafios'
             when r.atencion + r.fortalecer >= 8 then 'por_fortalecer'
             else 'favorable' end)::public.resultado_general,
       greatest(0, 100 - 5 * r.atencion - 2 * r.fortalecer),
       r.prioridad,
       r.prioridad,
       false,
       (select version from public.reglas_resultados where vigente),
       '1.0',
       case when r.prioridad then 'pendiente'::public.estado_seguimiento end,
       f.creado_en,
       f.creado_en
from ficticias f
join (
  select g,
         jsonb_object_agg(area, nivel) as niveles,
         jsonb_agg(jsonb_build_object('areaId', area, 'valor',
           case nivel when 'adecuado' then 'si' when 'por_fortalecer' then 'a_veces' else 'no' end)) as respuestas,
         count(*) filter (where nivel = 'adecuado') as adecuado,
         count(*) filter (where nivel = 'por_fortalecer') as fortalecer,
         count(*) filter (where nivel = 'requiere_atencion') as atencion,
         bool_or(area = 'bienestar_emocional' and nivel = 'requiere_atencion') as prioridad
  from niveles_ficticios
  group by g
) r using (g);
