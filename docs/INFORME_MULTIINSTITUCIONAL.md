# Informe: Mente al Día multiinstitucional

8 de noviembre de 2026. Decisiones D-86 y D-87.

## Qué cambió

Mente al Día atiende ahora a **seis instituciones**. Cada una tiene su enlace y su administrador, y solo ve lo suyo. El administrador general ve todas juntas o una sola. La separación de los datos la garantiza la base de datos (políticas RLS y funciones del servidor), no la pantalla: aunque alguien manipulara el navegador, la base no le entregaría datos de otra institución.

Todo lo que ya hacía la plataforma sigue igual: el sitio informativo, los tres cuestionarios, los resultados, las cuentas públicas, el panel con tablero, registros, fichas, prioritarios, censo y su descarga en Excel.

## Las seis instituciones y sus enlaces

| Institución                                                   | Enlace para responder                                                |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| Alcaldía de San Luis                                          | https://michaelpob.github.io/mente-al-dia/?sede=alcaldia-sanluis     |
| Alcaldía Municipal de Coello                                  | https://michaelpob.github.io/mente-al-dia/?sede=alcaldia-coello      |
| Institución Educativa Sor Josefa del Castillo (Guamo)         | https://michaelpob.github.io/mente-al-dia/?sede=sorjosefa-guamo      |
| Institución Educativa Técnica General Roberto Leyva (Saldaña) | https://michaelpob.github.io/mente-al-dia/?sede=robertoleyva-saldana |
| Alcaldía de Saldaña                                           | https://michaelpob.github.io/mente-al-dia/?sede=alcaldia-saldana     |
| Institución Educativa Técnica Comercial Caldas (Guamo)        | https://michaelpob.github.io/mente-al-dia/?sede=caldas-guamo         |

Las cuatro primeras tienen su nombre desde el 9 de noviembre (D-90) y las dos últimas desde el 11 (D-91). Las provisionales Colegio 1 y Alcaldía 1 quedaron inactivas, con sus datos: sus enlaces ya no sirven para responder, y quien entra con ellos elige su institución de la lista. La Alcaldía de Coello tiene además su línea de apoyo emocional (318 783 4690), que ven quienes participan con ella.

- El nombre, el enlace y el estado de cada institución se cambian en el panel, en **Instituciones**. Si se cambia el enlace, el anterior deja de funcionar.
- Los seis cuestionarios que había antes del cambio quedaron en **Colegio 1**, hoy inactiva. Solo los ve el administrador general.
- Con el enlace general (sin `?sede=`), la persona elige su institución de una lista al empezar a responder (D-88). Antes de registrarse puede cambiarla; después, ya no.
- El enlace identifica, no autentica: solo dice a qué institución pertenecen las respuestas.

## Cómo se protege cada institución

**En la base de datos (Supabase):**

- Tabla nueva `instituciones` (nombre, enlace, activa), sin acceso directo desde el navegador.
- `institucion_id` obligatorio en `participantes` y `aplicaciones`, y también en `perfiles`, `visitas` y `auditoria`.
- Una llave foránea compuesta impide que un cuestionario apunte a un participante de otra institución.
- Nadie puede cambiar la institución de un cuestionario, ni siquiera el dueño de la base.
- Un rol nuevo, `administrador_institucional`, atado a una institución. Una restricción exige que ese rol tenga institución y que el general no la tenga.
- Las políticas RLS y **todas** las funciones del panel filtran por institución en el servidor:
  - El administrador institucional queda siempre en la suya. Si pide otra, la base responde «sin permiso» (42501).
  - Una ficha de otra institución responde como si no existiera (P0002): no revela que exista.
  - El general puede pedir una institución o todas.
- `registrar_aplicacion` recibe el enlace (`p_sede`), lo resuelve en el servidor y rechaza una institución inexistente o inactiva. El navegador nunca manda un identificador de institución.
- La auditoría guarda la institución de cada acción y sigue sin poder editarse ni borrarse.
- Una institución desactivada deja de recibir cuestionarios y su administrador no entra; sus datos se conservan.

**En el servidor (Edge Functions):**

- `enviar-cuestionario` exige el enlace de la institución con formato válido y responde 422 `institucion_invalida` si la base lo rechaza.
- `invitar-usuario` solo la usa el administrador general. Valida en el servidor el rol y que la institución exista y esté activa. El rol y la institución se guardan en `perfiles`, nunca en datos que el usuario pueda editar.
- La clave `service_role` sigue solo en Supabase: no está en el sitio ni en el repositorio.

**En el sitio:**

- El sitio lee `?sede=`, lo confirma con `institucion_publica` (que solo devuelve el nombre de una institución activa) y muestra «Participas con …».
- Al cerrar la sesión del panel, o si entra otra cuenta, se borran los datos del panel que había en memoria y el panel se vuelve a montar.

## Qué ve cada administrador

| Sección del panel  | Administrador institucional            | Administrador general                                                     |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------- |
| Tablero            | Su institución, con su enlace          | Todas o la institución que elija                                          |
| Registros y fichas | Su institución                         | Todas (con la columna «Institución») o una                                |
| Prioritarios       | Su institución                         | Todas o una                                                               |
| Censo y descarga   | Su institución, con motivo y auditoría | Todas o una, con motivo y auditoría                                       |
| Cuentas públicas   | No                                     | Sí                                                                        |
| Instituciones      | No                                     | Enlaces, actividad, comparación y edición                                 |
| Usuarios           | No                                     | Lista, invitación por correo, activar, desactivar, cambiar de institución |
| Auditoría          | No                                     | Por institución, fecha y acción                                           |

Los dos entran con su correo y su contraseña, sin aplicación de autenticación (D-89).

## Cuentas

- **Administrador general:** la cuenta de superadministrador que ya existía. No cambió.
- **Administradores institucionales:** uno por institución. Mientras no esté el correo propio de la plataforma (D-79), las cuentas se crean en Supabase y el rol y la institución se asignan en la base (D-91). Ya tienen cuenta San Luis, Coello, Sor Josefa del Castillo y Roberto Leyva; faltan la Alcaldía de Saldaña y la I. E. Caldas.
- Cada administrador entra con su correo y su contraseña (D-89). Recibe la contraseña en privado de quien creó la cuenta y la cambia en el panel con **Cambiar contraseña**.
- Este informe no contiene contraseñas ni correos.

## Base de datos

| Migración                                    | Qué hace                                                                                                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `20261108090000_rol_institucional.sql`       | Agrega el valor `administrador_institucional` al rol del panel.                                                                                                          |
| `20261108100000_instituciones.sql`           | Crea `instituciones` con las seis, agrega `institucion_id`, pasa los datos existentes a Colegio 1, llaves e índices.                                                     |
| `20261108110000_seguridad_instituciones.sql` | Ayudas de seguridad, políticas, `registrar_aplicacion` y `registrar_visita` con sede, funciones del panel con filtro por institución y las funciones nuevas del general. |

Funciones nuevas: `institucion_publica`, `panel_instituciones`, `panel_institucion_actualizar`, `panel_administradores`, `panel_administrador_actualizar` y `panel_auditoria`. Las del panel que ya existían aceptan un parámetro opcional `p_institucion`, que solo usa el general.

**Respaldo:** antes de migrar se guardó una copia de los datos, las funciones y las políticas en una carpeta local fuera del repositorio, porque contiene datos personales. No se publica.

## Archivos

- **Base de datos:** `supabase/migrations/20261108*.sql`; pruebas `supabase/tests/01` a `10` (la `10_instituciones` es nueva); `scripts/bd/codigos-de-prueba.sql`.
- **Edge Functions:** `supabase/functions/_compartido/esquemas.ts` y `http.ts`, `enviar-cuestionario/`, `invitar-usuario/` y la plantilla `supabase/templates/invitacion.html`.
- **Sitio público:** `src/features/instituciones/` (enlace, aviso y pantalla sin enlace), `src/features/participar/` (la sede en el estado y en el envío), `src/features/registro/RegistroPage.tsx`, `src/features/visitas/registrar-visita.ts`, `src/app/layouts/PublicLayout.tsx`.
- **Panel:** `src/features/panel/acceso/` (roles e institución en la sesión), `src/features/panel/instituciones/` (selector, Instituciones, Usuarios y Auditoría), `src/features/panel/estructura/` (menú por rol), `src/features/panel/datos/` (consultas con institución), tablero, registros, censo y prioritarios.
- **Textos:** `src/content/panel-instituciones.ts`, `src/content/panel.ts`, `src/content/participar.ts`, `src/content/textos-interfaz.ts`.
- **Pruebas de navegador:** `e2e/instituciones.spec.ts` (nueva), `e2e/participar.spec.ts` y `e2e/panel.spec.ts`.
- **Documentos:** `docs/DECISIONES.md` (D-86 y D-87), `docs/BASE_DE_DATOS.md`, `docs/PENDIENTES_VALIDACION.md` (F14) y este informe.

## Pruebas y resultados

Todas se ejecutaron antes de publicar (8 de noviembre de 2026; repetidas el 9 con la lista de instituciones, D-88). Ninguna dejó datos en la base real: las de la base corren en un bloque que siempre se deshace, y las de navegador simulan el servidor.

| Prueba                                                                                  | Resultado                                                                                 |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Formato, tipos y estilo (Prettier, TypeScript, ESLint)                                  | Sin errores                                                                               |
| Pruebas unitarias (Vitest)                                                              | 196 de 196                                                                                |
| Edge Functions (Deno)                                                                   | 27 de 27                                                                                  |
| Base de datos en el proyecto real, con las migraciones delante (pgTAP, todo se deshace) | 315 de 315 en 11 archivos                                                                 |
| Aislamiento entre instituciones (`10_instituciones`, dentro de las 315)                 | 72 de 72                                                                                  |
| Navegador en computador y teléfono (Playwright)                                         | 162 pasan, 0 fallan, 14 omitidas a propósito (anchos y menú que solo aplican a un tamaño) |

Lo que cubren las pruebas del pedido:

- **Pruebas 1, 2, 3 y 6 (aislamiento).** Seis instituciones de prueba con un administrador cada una. Cada uno ve exactamente sus cuestionarios, en el tablero, los registros, el censo, la descarga y la auditoría. Se le niega pedir otra institución, ver una ficha ajena (responde como si no existiera), ver su contacto o descargar su censo.
- **Prueba 5 (manipulación).** Se rechazan:
  - cambiar la institución de un cuestionario, incluso para el dueño de la base;
  - enlazar un cuestionario a un participante de otra institución;
  - un enlace falso o de una institución inactiva;
  - darse otro rol u otra institución.
- **Prueba 7 (general).** El administrador general ve el consolidado y cada institución por separado. Las cifras coinciden con las filas reales.
- **Pruebas 4 y 8 (enlaces).** Los seis enlaces, en computador y teléfono, muestran su institución y el envío lleva la institución correcta. Sin enlace, o con uno falso, el sitio no deja responder.
- **Prueba 9 (regresión).** Todo lo anterior sigue igual: registro, cuestionarios, resultados, cuentas, panel, censo y Excel.
- **Prueba 10 (institución desactivada).** Deja de recibir cuestionarios y su administrador no entra.

**Verificación en vivo, después de publicar (sin guardar nada):**

- `institucion_publica` responde el nombre de las seis instituciones y nada para un enlace falso.
- `instituciones_publicas` (D-88) responde las seis instituciones activas, solo con nombre y enlace. Sin enlace, o con uno falso, el registro muestra esa lista para elegir, en computador y teléfono.
- Las 12 funciones del panel probadas responden «sin permiso» (401, 42501) sin sesión.
- El envío del cuestionario rechaza:
  - el envío sin enlace (400);
  - un enlace mal escrito (400);
  - el de una institución que no existe (422 `institucion_invalida`).
- En los 124 archivos JavaScript publicados no hay ninguna clave secreta.
- Los seis enlaces en el sitio publicado, en computador y en teléfono:
  - muestran «Participas con …»;
  - abren el registro con sus tres grupos;
  - no desbordan la pantalla ni dan errores.
- Sin enlace o con uno falso, la persona elige su institución de la lista (D-88). Al elegir, el registro vuelve arriba con «Participas con …» y deja cambiarla antes de registrarse.
- En la base quedaron las seis instituciones activas. Los 6 cuestionarios y 6 participantes que había están en Colegio 1 y ninguno quedó sin institución. Las verificaciones no agregaron cuestionarios, participantes ni visitas.

## Cómo publicar otra vez

1. Base de datos: `npx supabase@2.119.0 db push --dry-run` y luego `db push`.
2. Funciones: `npx supabase@2.119.0 functions deploy enviar-cuestionario --no-verify-jwt --use-api` y lo mismo con `invitar-usuario`.
3. Sitio: `corepack pnpm pages:preparar` y publicar `dist-pages` en la rama `gh-pages`.

El orden importa: primero la base, luego las funciones y al final el sitio. Las funciones del panel siguen sirviendo al panel anterior mientras tanto.

## Pendientes

- Activar el correo propio (D-79) para recuperar contraseñas («¿Olvidaste tu contraseña?») e invitar desde **Usuarios**. Mientras tanto, las cuentas se crean en Supabase (D-91).
- Las cuentas de los administradores de la Alcaldía de Saldaña y de la I. E. Caldas.
- Qué hacer con los cuestionarios de Colegio 1 y Alcaldía 1: siguen guardados en esas instituciones inactivas.
- Conviene que cada institución reparta su propio enlace: con el enlace general la persona elige la institución de una lista y podría elegir una que no es la suya.
- Reenviar una invitación: hoy, si alguien perdió el correo de invitación, puede pedir un enlace nuevo con «¿Olvidaste tu contraseña?» en el ingreso (necesita el correo propio activo).
- El reporte nominal (`reporte_nominal`), que no usa el panel, sigue siendo solo del administrador general y abarca todas las instituciones.
