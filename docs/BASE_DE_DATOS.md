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
| Consultas del panel (Fase 8)  | `supabase/migrations/20261027120000_panel_fase8.sql`      | Tablero, registros (búsqueda, filtros y páginas en el servidor), ficha con historial, prioritarios y registro de impresión. Contacto enmascarado (D-68).      |
| Pruebas de la base de datos   | `supabase/tests/`                                         | Comprobaciones pgTAP de permisos, auditoría, reportes, envíos y consultas del panel (`04_panel`, 40).                                                         |
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
- **Envío sin duplicados.** El navegador manda una clave de envío (`claveEnvio`, uuid) que se guarda en `aplicaciones.clave_envio`. Si la conexión falla y la persona vuelve a enviar, `registrar_aplicacion` devuelve el código ya guardado, sin otra aplicación ni otra copia de los datos personales.
- **Reglas con versión.** Una versión de reglas no se modifica: se crea otra y se activa con `activar_reglas`. Cada aplicación guarda la versión con la que se calculó.
- **Tiempo de conservación.** `purgar_datos_vencidos()` borra los datos personales que superen `retencion_meses`. Mientras la oficina jurídica no lo defina (pendiente 12) el valor es `null` y no borra nada. Solo admite un número entero de meses, mínimo 1: con 0 se borraría todo. Se programará con pg_cron en la Fase 11.
- **Reportes en hora de Colombia.** Los días y las semanas de `reporte_agregado` y `reporte_nominal` se cuentan en hora de Colombia (`America/Bogota`), no en UTC.
- **Grupos pequeños ocultos.** `reporte_agregado` no muestra grupos de menos de `reporte_minimo_grupo` personas (mínimo y valor inicial: 5): se suman en una fila por semana con `grupos_pequenos = true`, sin módulo, lugar ni resultado, y si esa suma tampoco llega al mínimo su total es `null`. El periodo pedido se amplía a semanas completas (de lunes a domingo), para que no se pueda restar un reporte de otro y aislar a una persona.

## Poner en marcha el proyecto

El proyecto en la nube ya existe: `mente-al-dia` (ref `lpcfrtlfiljgwxarpslf`, São Paulo, `sa-east-1`), conectado a la plataforma publicada (D-67). La región definitiva queda pendiente de la Oficina TIC (pendiente 16). Para repetir la puesta en marcha en otro proyecto, o actualizar este:

1. **Enlazar el repositorio** con la CLI (en PowerShell, `npx.cmd` en lugar de `npx`):
   ```sh
   npx supabase@2.119.0 login
   npx supabase@2.119.0 link --project-ref lpcfrtlfiljgwxarpslf
   ```
2. **Aplicar las migraciones**: `npx supabase@2.119.0 db push`. Si el proyecto se creó sin «exponer tablas nuevas automáticamente», `service_role` no recibe permisos por defecto: la migración `20261027100000` le da la lectura que necesitan las funciones.
3. **Configurar Auth y la API** desde `supabase/config.toml`: `npx supabase@2.119.0 config diff` muestra los cambios y `config push` los aplica. `[remotes.produccion]` cambia las direcciones (Site URL y Redirect URLs) por las del sitio publicado; para otro proyecto se agrega otro bloque `[remotes.…]` con su ref. Queda así:
   - Nadie puede crear su propia cuenta (`[auth] enable_signup = false`), pero el proveedor Email está activo (`[auth.email] enable_signup = true`); con `false` nadie podría ingresar.
   - Contraseñas de 12 caracteres o más, con minúsculas, mayúsculas y números. Doble factor TOTP activo.
   - _Emails_: para producción, configurar un SMTP propio de la Alcaldía. El de Supabase solo envía a los miembros de la organización en Supabase, con un límite muy bajo de correos por hora.
4. **Publicar las funciones** y sus variables:
   ```sh
   npx supabase@2.119.0 secrets set ORIGENES_PERMITIDOS=https://michaelpob.github.io SITIO_URL=https://michaelpob.github.io/mente-al-dia
   npx supabase@2.119.0 functions deploy enviar-cuestionario --no-verify-jwt --use-api
   npx supabase@2.119.0 functions deploy invitar-usuario --no-verify-jwt --use-api
   ```
   `--use-api` empaqueta en Supabase, sin Docker. `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` las pone Supabase automáticamente. La service role key **nunca** va en el sitio ni en el repositorio.
5. **Crear el primer superadministrador.** En _Authentication → Users_, «Invite user» con su correo. Luego, con `npx supabase@2.119.0 db query --linked "…"` o en el _SQL Editor_:
   ```sql
   insert into public.perfiles (id, nombre, rol)
   select id, 'Nombre Apellido', 'superadministrador' from auth.users where email = 'correo@alcaldia.gov.co';
   ```
   La invitación del panel de Supabase lleva a la dirección del sitio, y la plataforma la pasa a `/panel/definir-contrasena`. Allí la persona define su contraseña y activa la verificación en dos pasos. Las demás cuentas las invita desde el panel (Fase 9) o con la función `invitar-usuario`.
6. **Conectar el sitio.** `.env.production` (en el repositorio, D-67) tiene los dos valores públicos de _Project Settings → API Keys_:
   ```sh
   VITE_SUPABASE_URL=https://lpcfrtlfiljgwxarpslf.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   `pnpm build` y `pnpm pages:preparar` los usan. En desarrollo van en `.env.local`; sin ellos, el panel muestra su página provisional.

## Pruebas

| Comando                        | Qué prueba                                                                                                                    |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm test:bd`        | Migraciones + comprobaciones de permisos y auditoría en un PostgreSQL local con pgTAP. Necesita `BD_PRUEBAS_URL` (ver abajo). |
| `npx supabase@2.119.0 test db` | Las mismas pruebas en el entorno local completo de Supabase (necesita Docker).                                                |
| `corepack pnpm test:funciones` | Que las copias del motor estén al día, el tipado de las funciones y sus 18 pruebas (Deno se instala con las dependencias).    |
| `corepack pnpm test`           | Incluye que las reglas iniciales de la migración sean idénticas a `src/content/v1/reglas.ts`.                                 |

`test:bd` no necesita Docker: carga una simulación mínima de Supabase (`scripts/bd/simulacion-supabase.sql`) en cualquier PostgreSQL 15 o superior con pgTAP, por ejemplo:

```sh
BD_PRUEBAS_URL=postgres://postgres@localhost:5432/postgres corepack pnpm test:bd
```

La base `mente_al_dia_pruebas` se borra y se vuelve a crear en cada ejecución.

Sin PostgreSQL local, una migración nueva y sus pruebas se pueden correr en el proyecto enlazado sin dejar rastro (D-72): `node scripts/bd/probar-en-proyecto.mjs supabase/migrations/<nueva>.sql supabase/tests/<prueba>.sql`. Todo va en un bloque que termina con un error a propósito y se deshace; solo vuelve la salida TAP. Para medir con volumen, se agrega `scripts/bd/datos-ficticios.sql` (10.000 aplicaciones inventadas, solo desarrollo) en la misma llamada.

## Al cambiar el motor o el contenido

Cada cambio en `src/lib/motor-resultados` o en `src/content/v1` necesita `corepack pnpm funciones:sincronizar`. `test:funciones` falla si se olvida. Si cambian las reglas, no se edita la migración: se crea una versión nueva en `reglas_resultados` y se activa.
