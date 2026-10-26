# Base de datos, autenticación y seguridad (Fase 4)

Mente al Día usa **Supabase**: PostgreSQL con permisos por fila (RLS), inicio de sesión con doble factor y funciones en el servidor (Edge Functions). Este documento explica qué hay, cómo se protege y cómo poner en marcha el proyecto.

## Qué hay

| Pieza                         | Dónde                                                     | Qué hace                                                                                                                                                      |
| ----------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esquema, permisos y auditoría | `supabase/migrations/20261026050000_fase4_base_datos.sql` | Tablas, roles, políticas RLS, funciones de consulta auditadas, reglas 0.1-provisional y parámetros iniciales.                                                 |
| Cálculo oficial               | `supabase/functions/enviar-cuestionario/`                 | Recibe registro, autorizaciones y respuestas; calcula con el motor y las reglas vigentes de la base de datos; guarda todo en una transacción.                 |
| Invitaciones                  | `supabase/functions/invitar-usuario/`                     | El superadministrador (con doble factor) invita por correo y elige el rol.                                                                                    |
| Motor en el servidor          | `supabase/functions/_compartido/generado/`                | Copia exacta de `src/lib/motor-resultados` y `src/content/v1`, generada con `corepack pnpm funciones:sincronizar`. No se edita a mano.                        |
| Ingreso al panel              | `src/features/panel/acceso/`                              | `/panel/ingresar` (contraseña + verificación en dos pasos), `/panel/definir-contrasena` (invitaciones y recuperación) y la protección de las rutas del panel. |
| Pruebas de la base de datos   | `supabase/tests/`                                         | 68 comprobaciones pgTAP de permisos y auditoría.                                                                                                              |
| Pruebas de las funciones      | `supabase/functions/*/manejador.test.ts`                  | 18 pruebas con Deno.                                                                                                                                          |

## Roles

| Rol                    | Qué puede hacer                                                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **superadministrador** | Todo lo del profesional; además invita y desactiva cuentas, cambia roles, crea y activa versiones de reglas, edita la configuración, genera el reporte nominal (con motivo) y lee la auditoría. |
| **profesional**        | Ve las aplicaciones (sin datos de contacto), consulta los datos de contacto de un caso (queda en la auditoría), cambia el estado y la asignación del seguimiento y agrega notas.                |
| **consulta**           | Solo el reporte agregado, sin datos personales, y las reglas vigentes.                                                                                                                          |

Ninguno de los tres entra sin **doble factor**: las políticas exigen que la sesión tenga nivel `aal2`. Una cuenta desactivada pierde el acceso en la siguiente consulta, aunque tenga la sesión abierta.

## Cómo se protegen los datos

- **Datos personales aparte.** Nombre, correo, teléfono y datos del adulto responsable están en `participantes`, que no tiene permisos para nadie del navegador. Se leen solo con `ver_datos_contacto` (un caso) o `reporte_nominal` (superadministrador, con motivo); las dos dejan registro en la auditoría.
- **Resultado calculado en el servidor.** El navegador envía solo respuestas. La función calcula con las reglas vigentes guardadas en la base de datos y rechaza cualquier campo de más, como un «resultado» enviado por el navegador. A quien responde no se le devuelven el índice numérico ni los motivos de prioridad.
- **Nadie cambia el resultado.** El panel solo puede actualizar `estado_seguimiento` y `asignado_a`; el resto de columnas no tiene permiso de escritura.
- **Notas inmutables.** Las notas de seguimiento se agregan a nombre de quien las escribe y no se editan ni se borran.
- **Auditoría de solo lectura.** `auditoria` registra quién, cuándo y qué: aplicaciones registradas, consultas de datos de contacto, cambios de estado y asignación, notas, reportes, invitaciones, cambios de rol, reglas y configuración. No guarda nombres, correos ni teléfonos, ni el texto de las notas. Un disparador impide editarla, borrarla o vaciarla, incluso al dueño de la base de datos.
- **Reglas con versión.** Una versión de reglas no se modifica: se crea otra y se activa con `activar_reglas`. Cada aplicación guarda la versión con la que se calculó.
- **Tiempo de conservación.** `purgar_datos_vencidos()` borra los datos personales que superen `retencion_meses`. Mientras la oficina jurídica no lo defina (pendiente 12) el valor es `null` y no borra nada. Solo admite un número entero de meses, mínimo 1: con 0 se borraría todo. Se programará con pg_cron en la Fase 11.
- **Reportes en hora de Colombia.** Los días y las semanas de `reporte_agregado` y `reporte_nominal` se cuentan en hora de Colombia (`America/Bogota`), no en UTC.
- **Grupos pequeños ocultos.** `reporte_agregado` no muestra grupos de menos de `reporte_minimo_grupo` personas (mínimo y valor inicial: 5): se suman en una fila por semana con `grupos_pequenos = true`, sin módulo, lugar ni resultado, y si esa suma tampoco llega al mínimo su total es `null`. El periodo pedido se amplía a semanas completas (de lunes a domingo), para que no se pueda restar un reporte de otro y aislar a una persona.

## Poner en marcha el proyecto

Lo que tiene que hacer una persona con acceso a Supabase (una sola vez):

1. **Crear el proyecto** en [supabase.com](https://supabase.com) con una cuenta de la Alcaldía. La región queda pendiente de la Oficina TIC (pendiente 16); mientras tanto se sugiere la más cercana a Colombia (São Paulo, `sa-east-1`).
2. **Instalar la CLI** y enlazar el repositorio:
   ```sh
   npx supabase@2.119.0 login
   npx supabase@2.119.0 link --project-ref <ref-del-proyecto>
   ```
3. **Aplicar las migraciones**: `npx supabase@2.119.0 db push`.
4. **Configurar Auth** en el panel de Supabase (Authentication):
   - _Sign In / Providers_: desactivar «Allow new users to sign up» (las cuentas son por invitación) y dejar activo Email.
   - _Multi-Factor_: activar TOTP (inscripción y verificación).
   - _URL Configuration_: Site URL = dirección pública del sitio; en Redirect URLs agregar `<sitio>/panel/definir-contrasena`.
   - _Passwords_: mínimo 12 caracteres, con minúsculas, mayúsculas y números.
   - _Emails_: para producción, configurar un SMTP propio de la Alcaldía (el de Supabase tiene un límite muy bajo de correos por hora).
5. **Publicar las funciones** y sus variables:
   ```sh
   npx supabase@2.119.0 secrets set ORIGENES_PERMITIDOS=https://<sitio> SITIO_URL=https://<sitio>
   npx supabase@2.119.0 functions deploy enviar-cuestionario --no-verify-jwt
   npx supabase@2.119.0 functions deploy invitar-usuario --no-verify-jwt
   ```
   `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las pone Supabase automáticamente. La service role key **nunca** va en el sitio ni en el repositorio.
6. **Crear el primer superadministrador.** En _Authentication → Users_, «Invite user» con su correo. Luego, en el _SQL Editor_:
   ```sql
   insert into public.perfiles (id, nombre, rol)
   select id, 'Nombre Apellido', 'superadministrador' from auth.users where email = 'correo@alcaldia.gov.co';
   ```
   Al abrir la invitación define su contraseña y activa la verificación en dos pasos. Las demás cuentas las invita desde el panel (Fase 9) o con la función `invitar-usuario`.
7. **Conectar el sitio.** En `.env.local` (y en el alojamiento):
   ```sh
   VITE_SUPABASE_URL=https://<ref-del-proyecto>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   Se toman de _Project Settings → API Keys_. Sin estas variables el panel muestra su página provisional.

## Pruebas

| Comando                        | Qué prueba                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `corepack pnpm test:bd`        | Migración + 68 comprobaciones de permisos y auditoría en un PostgreSQL local con pgTAP. Necesita `BD_PRUEBAS_URL` (ver abajo). |
| `npx supabase@2.119.0 test db` | Las mismas pruebas en el entorno local completo de Supabase (necesita Docker).                                                 |
| `corepack pnpm test:funciones` | Que las copias del motor estén al día, el tipado de las funciones y sus 18 pruebas (Deno se instala con las dependencias).     |
| `corepack pnpm test`           | Incluye que las reglas iniciales de la migración sean idénticas a `src/content/v1/reglas.ts`.                                  |

`test:bd` no necesita Docker: carga una simulación mínima de Supabase (`scripts/bd/simulacion-supabase.sql`) en cualquier PostgreSQL 15 o superior con pgTAP, por ejemplo:

```sh
BD_PRUEBAS_URL=postgres://postgres@localhost:5432/postgres corepack pnpm test:bd
```

La base `mente_al_dia_pruebas` se borra y se vuelve a crear en cada ejecución.

## Al cambiar el motor o el contenido

Cada cambio en `src/lib/motor-resultados` o en `src/content/v1` necesita `corepack pnpm funciones:sincronizar` (y `demo:sincronizar` para la demostración). `test:funciones` falla si se olvida. Si cambian las reglas, no se edita la migración: se crea una versión nueva en `reglas_resultados` y se activa.
