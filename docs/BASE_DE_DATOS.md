# Base de datos, autenticación y seguridad (Fase 4)

Mente al Día usa **Supabase**: PostgreSQL con permisos por fila (RLS), inicio de sesión con correo y contraseña (D-89) y funciones en el servidor (Edge Functions). Este documento explica qué hay, cómo se protege y cómo poner en marcha el proyecto.

## Qué hay

| Pieza                         | Dónde                                                                                                                                         | Qué hace                                                                                                                                                                                                                                                                                |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Esquema, permisos y auditoría | `supabase/migrations/20261026050000_fase4_base_datos.sql`                                                                                     | Tablas, roles, políticas RLS, funciones de consulta auditadas, reglas 0.1-provisional y parámetros iniciales.                                                                                                                                                                           |
| Cálculo oficial               | `supabase/functions/enviar-cuestionario/`                                                                                                     | Recibe registro, autorizaciones y respuestas; calcula con el motor y las reglas vigentes de la base de datos; guarda todo en una transacción.                                                                                                                                           |
| Invitaciones                  | `supabase/functions/invitar-usuario/`                                                                                                         | El administrador general invita por correo a otro general o al administrador de una institución activa (D-86).                                                                                                                                                                          |
| Motor en el servidor          | `supabase/functions/_compartido/generado/`                                                                                                    | Copia exacta de `src/lib/motor-resultados` y `src/content/v1`, generada con `corepack pnpm funciones:sincronizar`. No se edita a mano.                                                                                                                                                  |
| Ingreso al panel              | `src/features/panel/acceso/`                                                                                                                  | `/panel/ingresar` (correo y contraseña, D-89), `/panel/definir-contrasena` (invitaciones y recuperación) y la protección de las rutas del panel.                                                                                                                                        |
| Consultas del panel (Fase 8)  | `supabase/migrations/20261027120000_panel_fase8.sql`                                                                                          | Tablero, registros (búsqueda, filtros y páginas en el servidor), ficha con historial, prioritarios y registro de impresión. Contacto enmascarado (D-68).                                                                                                                                |
| Censo del panel (D-83)        | `supabase/migrations/20261105120000_censo_del_panel.sql`                                                                                      | Censo: cada persona una vez, con su cuestionario más reciente; fortalezas y falencias por área y la lista de personas con filtros (`panel_censo`, `panel_censo_personas`).                                                                                                              |
| Descarga del censo (D-84)     | `supabase/migrations/20261105150000_descargar_censo.sql`                                                                                      | Excel del censo: con motivo y auditoría, cada administrador solo de su institución (D-86), sin contacto (`panel_censo_exportar`).                                                                                                                                                       |
| Lista pública (D-88)          | `supabase/migrations/20261109090000_instituciones_publicas.sql`                                                                               | `instituciones_publicas`: nombre y enlace de las instituciones activas, para elegir con cuál responder.                                                                                                                                                                                 |
| Instituciones (D-86)          | `supabase/migrations/20261108090000_rol_institucional.sql`, `20261108100000_instituciones.sql` y `20261108110000_seguridad_instituciones.sql` | Las seis instituciones, `institucion_id` en participantes, aplicaciones, perfiles, visitas y auditoría, el rol `administrador_institucional` y el filtro por institución en todas las funciones del panel.                                                                              |
| Pruebas de la base de datos   | `supabase/tests/`                                                                                                                             | Comprobaciones pgTAP de permisos, auditoría, reportes, envíos y consultas del panel (`04_panel`, 40) el censo (`08_censo`, 30), su descarga (`09_descargar_censo`, 14) el aislamiento entre instituciones (`10_instituciones`, 72) y la lista pública (`11_instituciones_publicas`, 7). |
| Pruebas de las funciones      | `supabase/functions/*/manejador.test.ts`                                                                                                      | 27 pruebas con Deno.                                                                                                                                                                                                                                                                    |

## Roles

| Rol                                            | Qué puede hacer                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **superadministrador** (administrador general) | Ve todas las instituciones juntas o una sola. Además gestiona las instituciones, invita y desactiva administradores, crea y activa versiones de reglas, edita la configuración, genera el reporte nominal (con motivo), ve las cuentas públicas y lee la auditoría.              |
| **administrador_institucional** (D-86)         | Lo mismo que el general, pero solo con los datos de su institución: tablero, registros, fichas (y el contacto, que queda en la auditoría), prioritarios, seguimiento, censo y su descarga. No ve otras instituciones, las cuentas públicas, los administradores ni la auditoría. |
| **profesional** y **consulta**                 | Roles antiguos, sin usuarios. Desde D-86 ya no entran al panel ni leen datos.                                                                                                                                                                                                    |

Se entra con el **correo y la contraseña** de la cuenta (D-89); ya no se pide doble factor. Una cuenta desactivada pierde el acceso en la siguiente consulta, aunque tenga la sesión abierta. Un administrador institucional también lo pierde si su institución se desactiva.

## Cómo se protegen los datos

- **Cada institución, aparte (D-86).** `participantes` y `aplicaciones` tienen `institucion_id` obligatorio, que sale del enlace (`?sede=`) y lo resuelve `registrar_aplicacion` en el servidor: el navegador nunca manda un identificador de institución. Una llave foránea compuesta impide que una respuesta apunte a un participante de otra institución, y nadie puede cambiar la institución de un cuestionario, ni siquiera el dueño de la base. Las políticas y todas las funciones del panel filtran con `privado.institucion_de_consulta`: el administrador institucional queda siempre en la suya (si pide otra, «sin permiso», 42501) y una ficha de otra institución responde como si no existiera (P0002). La clave de una persona (historial y censo) incluye la institución. La auditoría guarda la institución de cada acción.
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

## Cuentas públicas (D-77)

Cualquier persona mayor de edad puede crear su cuenta desde «Crear una cuenta» para guardar su progreso. No es un rol del panel: los roles siguen en `perfiles` y solo se asignan por invitación.

- **Contraseñas solo en Supabase Auth.** Las tablas guardan el nombre, el usuario y el correo, nunca la contraseña.
- **`cuentas`.** El perfil se crea con la cuenta (disparador `crear_cuenta_publica` sobre `auth.users`, solo si el alta viene de «Crear una cuenta»). La base vuelve a exigir la mayoría de edad y la autorización de datos y guarda la versión de los textos legales aceptados. El usuario es único y va en minúsculas. Cada cuenta lee solo su perfil y solo puede cambiar su nombre.
- **`progreso`.** Una fila por cuenta y actividad: `cuestionario` (el cuestionario en curso, después de la autorización) y `resultado:<código>` (cada cuestionario terminado). Cada cuenta lee, crea, cambia y borra solo lo suyo; `guardar_progreso` escribe siempre a nombre de la sesión. La tabla admite otras actividades con el mismo formato.
- **Panel.** `panel_cuentas_resumen` y `panel_cuentas` (administrador general) muestran las cuentas registradas, su último ingreso, su actividad y su avance, con el correo enmascarado; nunca el contenido guardado del progreso.
- **Auth.** `enable_signup = true` permite crear cuentas. Sin un SMTP propio, el correo de Supabase solo llega a los miembros de la organización: por eso la confirmación por correo está apagada y la recuperación de contraseña de las cuentas públicas no llega hasta conectar un SMTP (pendiente F12-01).
- **`usuario_disponible`.** Responde solo sí o no a si un usuario está libre; se puede usar sin sesión.

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
   - Contraseñas de 12 caracteres o más, con minúsculas, mayúsculas y números. Sin aplicación de autenticación (D-89).
   - _Emails_: para producción, configurar un SMTP propio (D-79). El de Supabase solo envía a los miembros de la organización en Supabase, con un límite muy bajo de correos por hora.
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
   select id, 'Nombre Apellido', 'superadministrador' from auth.users where email = 'correo@ejemplo.org';
   ```
   La invitación del panel de Supabase lleva a la dirección del sitio, y la plataforma la pasa a `/panel/definir-contrasena`. Allí la persona define su contraseña y después entra con ella. Las demás cuentas las invita desde el panel (Fase 9) o con la función `invitar-usuario`.
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
| `corepack pnpm test:funciones` | Que las copias del motor estén al día, el tipado de las funciones y sus 27 pruebas (Deno se instala con las dependencias).    |
| `corepack pnpm test`           | Incluye que las reglas iniciales de la migración sean idénticas a `src/content/v1/reglas.ts`.                                 |

`test:bd` no necesita Docker: carga una simulación mínima de Supabase (`scripts/bd/simulacion-supabase.sql`) en cualquier PostgreSQL 15 o superior con pgTAP, por ejemplo:

```sh
BD_PRUEBAS_URL=postgres://postgres@localhost:5432/postgres corepack pnpm test:bd
```

La base `mente_al_dia_pruebas` se borra y se vuelve a crear en cada ejecución.

Sin PostgreSQL local, una migración nueva y sus pruebas se pueden correr en el proyecto enlazado sin dejar rastro (D-72): `node scripts/bd/probar-en-proyecto.mjs supabase/migrations/<nueva>.sql supabase/tests/<prueba>.sql`. Todo va en un bloque que termina con un error a propósito y se deshace; solo vuelve la salida TAP. Las pruebas que guardan aplicaciones (`01`, `02`, `03` y `10`) llevan antes `scripts/bd/codigos-de-prueba.sql`, que les da códigos MD-900001… de una secuencia temporal para no gastar los números de los casos reales; todas miran solo sus propios datos, así que corren con la base real. Por ejemplo: `node scripts/bd/probar-en-proyecto.mjs scripts/bd/codigos-de-prueba.sql supabase/tests/01_permisos_y_auditoria.test.sql`. Para medir con volumen, se agrega `scripts/bd/datos-ficticios.sql` (10.000 aplicaciones inventadas, solo desarrollo) en la misma llamada.

## Al cambiar el motor o el contenido

Cada cambio en `src/lib/motor-resultados` o en `src/content/v1` necesita `corepack pnpm funciones:sincronizar`. `test:funciones` falla si se olvida. Si cambian las reglas, no se edita la migración: se crea una versión nueva en `reglas_resultados` y se activa.
