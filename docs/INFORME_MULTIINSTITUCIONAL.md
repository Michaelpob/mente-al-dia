# Informe: Mente al Día multiinstitucional

8 de noviembre de 2026. Decisiones D-86 y D-87.

## Qué cambió

Mente al Día atiende ahora a **seis instituciones**. Cada una tiene su enlace y su administrador, y solo ve lo suyo. El administrador general ve todas juntas o una sola. La separación de los datos la garantiza la base de datos (políticas RLS y funciones del servidor), no la pantalla: aunque alguien manipulara el navegador, la base no le entregaría datos de otra institución.

Todo lo que ya hacía la plataforma sigue igual: el sitio informativo, los tres cuestionarios, los resultados, las cuentas públicas, el panel con tablero, registros, fichas, prioritarios, censo y su descarga en Excel.

## Las seis instituciones y sus enlaces

| Institución (nombre provisional) | Enlace para responder                                        |
| -------------------------------- | ------------------------------------------------------------ |
| Colegio 1                        | https://michaelpob.github.io/mente-al-dia/?sede=colegio1     |
| Colegio 2                        | https://michaelpob.github.io/mente-al-dia/?sede=colegio2     |
| Alcaldía 1                       | https://michaelpob.github.io/mente-al-dia/?sede=alcaldia1    |
| Alcaldía 2                       | https://michaelpob.github.io/mente-al-dia/?sede=alcaldia2    |
| Institución 5                    | https://michaelpob.github.io/mente-al-dia/?sede=institucion5 |
| Institución 6                    | https://michaelpob.github.io/mente-al-dia/?sede=institucion6 |

- El nombre, el enlace y el estado de cada institución se cambian en el panel, en **Instituciones**. Si se cambia el enlace, el anterior deja de funcionar.
- Los seis cuestionarios que había antes del cambio quedaron en **Colegio 1**.
- El enlace general (sin `?sede=`) sigue mostrando la información pública; para responder, pide el enlace de la institución.
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
- `invitar-usuario` solo la usa el general con doble factor. Valida en el servidor el rol y que la institución exista y esté activa. El rol y la institución se guardan en `perfiles`, nunca en datos que el usuario pueda editar.
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

Los dos entran con contraseña y verificación en dos pasos, como antes.

## Cuentas

- **Administrador general:** la cuenta de superadministrador que ya existía. No cambió.
- **Administradores institucionales:** todavía no hay. Se invitan desde **Usuarios** cuando estén listos sus correos y el correo propio de la plataforma (D-79). Cada persona define su contraseña y su verificación en dos pasos al abrir la invitación.
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

RESULTADOS_PENDIENTES

## Cómo publicar otra vez

1. Base de datos: `npx supabase@2.119.0 db push --dry-run` y luego `db push`.
2. Funciones: `npx supabase@2.119.0 functions deploy enviar-cuestionario --no-verify-jwt --use-api` y lo mismo con `invitar-usuario`.
3. Sitio: `corepack pnpm pages:preparar` y publicar `dist-pages` en la rama `gh-pages`.

El orden importa: primero la base, luego las funciones y al final el sitio. Las funciones del panel siguen sirviendo al panel anterior mientras tanto.

## Pendientes

- Activar el correo propio (D-79) para poder invitar a los administradores y recuperar contraseñas.
- Los nombres y correos de los seis administradores.
- Los nombres definitivos de las instituciones (se cambian en el panel).
- Repartir siempre el enlace de cada institución: con el enlace general no se puede responder.
