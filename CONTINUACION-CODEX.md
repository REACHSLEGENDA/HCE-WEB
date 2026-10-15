# Instrucciones para continuar (Codex u otro asistente)

Fecha: 13 de octubre de 2026. Proyecto: portal HCE (React 19 + Vite, Supabase, Netlify).
Este documento deja todo para terminar la **mejora de interfaz de la escuela** que
estaba en curso. Léelo completo antes de tocar código.

## 1. Qué pidió el dueño

> "Que la interfaz de la escuela sea mejor, no todo en una sola pantalla, súper
> interactiva y fácil de usar para administradores y alumnos."

## 2. ACTUALIZACIÓN 14 de octubre

### 14 oct, continuación de Codex tras el límite de Claude: Alumni Pass

**Publicación autorizada por Christian:** publicar todos los cambios y ocultar
temporalmente el botón Alumni Pass de París para probar por enlace directo.
El enlace `/alumni-pass-step1` se conserva y la página sigue marcada noindex.
El botón se retiró del JSX público; sus estilos se conservan para restaurarlo.
Previo a subir: lint/build correctos, 16 regresiones Alumni, 12 de servidor y
9 de borradores aprobadas. No se hicieron compras ni solicitudes reales de prueba.

**Supabase aplicado y verificado el 14 de octubre de 2026:** por autorización
directa de Christian se ejecutó todo `supabase/alumni-pass.sql` en el proyecto
`webinars` de `hce` (`mxpxvtklkyvonbhqjdmq`, main/PRODUCTION). El editor confirmó
`Success. No rows returned`. Verificación posterior de solo lectura: 41 columnas,
RLS activo, dos políticas de revisión, bucket `alumni-diplomas` privado, cuatro
índices y ambas funciones de reserva/liberación existentes y ejecutables solo
por `service_role` (sin EXECUTE para anon/authenticated). El servidor tiene
SELECT/INSERT/UPDATE en `form_submissions`. Se conservaron los 63 formularios;
Alumni sigue con cero solicitudes, pagos y archivos. No se enviaron solicitudes,
correos ni cobros de prueba. La web y las funciones Netlify siguen sin publicar.
Consulta de migración: https://supabase.com/dashboard/project/mxpxvtklkyvonbhqjdmq/sql/82f88900-a2b7-4b82-901c-4cb82e86e52c
Consulta de verificación: https://supabase.com/dashboard/project/mxpxvtklkyvonbhqjdmq/sql/1dfcd417-668a-4fed-9a2f-254ae03828df

Ampliación posterior solicitada por Christian: solicitudes también en **Ventas →
Formularios** (`form_submissions`, filtro `xdeapenv`), Formspree
`https://formspree.io/f/xdeapenv` y contacto de Brevo desde la solicitud. El diploma
permanece privado y no se envían enlaces personales de pago al registro externo.
Los dos paneles muestran estados y reintentan solo lo pendiente. Un envío de
Formspree con recepción incierta exige revisar su buzón antes del reintento manual;
no se repite automáticamente. El alta en la lista que envía el pase sigue ocurriendo
solo después del pago. Requiere nuevamente el SQL actualizado para las columnas de
seguimiento y la referencia de formulario generada por el servidor. Pruebas de
servidor ahora 16 casos; UI 11 casos, incluido el panel general de Formularios.
No se han enviado datos reales al endpoint.

Estado más reciente: **solicitud → revisión → enlace personal → pago → pase**.
Claude alcanzó a guardar formulario, servidor, panel, SQL e invitación antes de
agotar el límite. Codex terminó y pulió los pendientes, sin commit/push:

- Confirmación compartida `_alumni-pass.js` desde regreso de Checkout y webhook
  firmado. Verifica sesión asociada, importe y moneda; conserva folio y reintenta
  Brevo si hubo un fallo después de registrar el pago.
- Reserva de cupos mediante funciones SQL exclusivas del servidor; Checkout con
  clave de idempotencia, reutilización del cobro abierto y cierre del anterior
  al cambiar opciones o rechazar. Total USD coincide con las líneas de Stripe.
- El panel distingue aprobación y envío real del enlace. Muestra envío pendiente,
  permite copiar/reintentar y usa un formulario de rechazo con motivo y Cancelar.
- Solicitud con clave para reintentos sin duplicados; controles bloqueados al
  enviar, errores accesibles y estados visibles de correo pendiente.
- Correo de confirmación corregido en fuente y HTML exportado de `cnadot-email`:
  el diploma ya fue validado antes del pago. El ajuste previo de los tres botones
  de París se conserva.
- QA repetible: `npm run check:alumni` (12 casos de servidor),
  `scripts/verificar-alumni-sql.mjs` (migración idempotente, cupo y permisos),
  `scripts/verificar-alumni-ui.mjs` (formulario/pago/panel con red simulada,
  375/1280 px y panel claro/oscuro). Los arneses temporales se eliminan al terminar.

La lista Alumni Pass Step 1 (#20), confirmada en captura de Christian, quedó
definida en `LISTS.ALUMNI_PASS` dentro de `_brevo.js`, igual que las demás.
Ya no se requiere `BREVO_LISTA_ALUMNI_PASS` en Netlify. La prueba de confirmación
usa la constante real, sin esa variable, y comprueba el destino #20 tras el pago.

**Antes de activar:** SQL actualizado ya aplicado en Supabase; falta
reemplazar el HTML de confirmación ya
configurado y revisar endpoint/eventos/secretos de Stripe en ambas cuentas.
Instrucciones completas en `marketing/alumni-pass/LEEME.md`. No se han hecho pagos
ni envíos reales. Las secciones históricas de abajo conservan
el contexto de la sesión anterior y no sustituyen este estado.

Los tres frentes (A, B y C) se terminaron y se publicaron en el commit `a8b4e9f`
("portal más ordenado, editor de cursos por pestañas y guía de uso"), que ya está en
producción. Verificado el 14 oct: lint limpio, build OK, `check:lms` 12/12,
`scripts/verificar-borradores.mjs` 5/5, pruebas SQL 25/25, sin arneses sueltos.
Lo que sigue es la **revisión en uso real** (montar Dashboard, Classroom y AdminDashboard
con datos de prueba y recorrer todo a 375/1280 px, claro y oscuro) y corregir lo que
salga. Las secciones 3 y 4 quedan como referencia de lo que se pidió.

### Coordinación Claude ↔ Codex (14 oct, respuesta a la consulta de Codex)
- **Claude no está editando nada en este momento.** Todo lo de abajo está terminado,
  probado (lint, build, check:lms, borradores) y **sin commit**, esperando el "súbelo".
- **No tocar sin avisar** (cambios sin commit de Claude): public/robots.txt, src/App.jsx,
  src/components/{CalendarioAlumno.css, ChatBot.css, ChatBot.jsx, EvaluacionLeccion.jsx,
  InicioAlumno.css, InicioAlumno.jsx}, src/components/admin/{AdminLms.css,
  ChecklistPublicar.jsx, EditorEvaluacion.jsx, PanelLateral.jsx, ReglasCurso.jsx,
  AlumniPassAdmin.jsx}, src/components/paris/ParisNewDesign.jsx, src/data/guiaUso.js,
  src/lib/{evaluaciones.js, inicioAlumno.js}, src/pages/{AdminDashboard.css,
  AdminDashboard.jsx, Classroom.css, Classroom.jsx, Dashboard.jsx, AlumniPass.jsx,
  AlumniPass.css}, netlify/functions/alumni-pass.js, supabase/alumni-pass.sql, marketing/.
- **Tarea que Codex puede tomar sin pisar nada:** la revisión del proyecto **apen web**
  (`C:\Users\Christian Gonzalez\Desktop\apen web`, Next.js, repo aparte). Christian pidió:
  diseño, que compile sin errores (build, lint, tipos), que las páginas funcionen (recorrer
  y buscar errores/enlaces rotos), celular a 375 px y SEO (hay un `seo-aeo-audit-apen.md`
  en esa carpeta). Reportar hallazgos a Christian antes de cambiar cosas grandes; no hacer
  commit/push sin su "súbelo".
- **Si Codex quiere algo de HCE:** el pago del Alumni Pass solo se puede probar ya
  publicado, y producción usa llaves reales de Stripe (las tarjetas de prueba no
  funcionan ahí): cualquier compra de prueba la decide y la hace Christian.

### 14 oct (tarde): revisión hecha + Alumni Pass (SIN publicar)
- Dos revisores probaron alumno y admin con arnés: sin CRÍTICOS/ALTOS; se corrigieron
  los medios/bajos (Inicio esperando a reglas/certificados/aperturas, ?leccion, barra del
  examen, guía, filtros, contraste, robot del chat tapando "Guardar", "Revisión antes de
  publicar", recarga del checklist, reordenar preguntas con RLS, etc.).
- NUEVO Alumni Pass (Step 1 Refresher, 28-29 oct): `src/pages/AlumniPass.jsx/.css`
  (ruta `/alumni-pass-step1`, noindex), `netlify/functions/alumni-pass.js` (precios:
  presencial 7000, virtual 4000, grabaciones +1299; cupo presencial 30; diploma antes de
  pagar a bucket privado), `src/components/admin/AlumniPassAdmin.jsx` (Ventas → Alumni
  Pass), botón dorado en la portada de París, `supabase/alumni-pass.sql`.
  Correos en el proyecto cnadot-email (`hce-alumni-pass-invitacion`, `-confirmacion`) y
  piezas en `marketing/alumni-pass/`.
- Para publicar: 1) correr `supabase/alumni-pass.sql`; 2) en Brevo crear atributos
  ALUMNI_MODALIDAD, ALUMNI_GRABACIONES, ALUMNI_FOLIO (Text) y la lista "Alumni Pass
  Step 1" con flujo → correo de confirmación; 3) lista #20 definida ahora en
  `LISTS.ALUMNI_PASS` (sin variable adicional); 4) commit + push con el "súbelo" del dueño.

## 2.1 Estado al dejarlo (13 oct, ya superado)

- Producción está estable. Último commit publicado: `1748fb9` (y antes `db517b4`).
- La continuación quedó **terminada y verificada el 13 de octubre de 2026**.
  Los cambios siguen **SIN commit/push**; todavía no se publicaron en producción.
  Los tres frentes se revisaron juntos y se corrigieron los fallos encontrados.
- Se instaló `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (package.json).
- Se eliminaron los siguientes archivos temporales de prueba después de verificar:
  `arnes-*.html`, `arnes-*.vite.config.js`, `harness-*.html`, `src/arnes-*/`,
  `src/harness*`, cualquier `*.html` de prueba en la raíz.

## 3. Reglas (obligatorias)

1. Español de México en toda la interfaz. Todo debe verse bien a **375 px** (celular,
   es PWA) y en escritorio, en **tema claro y oscuro**
   (`.admin-layout[data-theme="dark"]` en el panel; `.crm-layout[data-theme="dark"]` en el alumno).
2. **No cambiar lógica de negocio**: cobros (`netlify/functions/_promos.js`,
   `create-*-checkout.js`), permisos/RLS, funciones de Netlify, contratos de props.
3. Nada de éxitos falsos ni cargas infinitas: errores visibles con "Reintentar".
4. **Error que ya tumbó el aula en producción**: usar una `const` antes de declararla en
   el cuerpo del render (TDZ). Hooks siempre antes de cualquier `return` temprano.
5. Al editar con scripts: en `String.replace` el texto `$$` se convierte en `$`
   (rompió un SQL). Usa `split/join` o edición directa.
6. Solo hacer `git commit`/`push` cuando el dueño lo pida.
7. Verificación mínima antes de entregar:
   ```
   npm run lint        # sin errores
   npm run build       # incluye la revisión de códigos de descuento
   npm run check:lms   # 12 pruebas de servidor
   npm run check:ui    # 9 regresiones de borradores
   ```
   Y prueba visual con un arnés temporal (página con datos falsos y `fetch` simulado de
   `/rest/v1/<tabla>`), a 375 y 1280 px, claro y oscuro. Borra el arnés al terminar.

## 4. Trabajo por terminar (tres frentes)

Guía de diseño completa: principios = una cosa a la vez (pestañas/pasos), saber qué
falta y qué sigue (checklists, contadores, estados vacíos con acción), validación al
escribir, "Cambios sin guardar" + confirmación al salir, consistencia con las clases
existentes (`.settings-card`, `.btn-crm-action`, `.crm-input-group`, variables
`--primary-cyan`, `--text-dark`, `--text-muted`, `--border-color`, `--bg-main`), iconos
de `lucide-react`, accesibilidad (role="tablist"/"tab", aria-selected, foco visible).

### A. Panel del administrador — ✅ TERMINADO (13 oct), falta solo la revisión final
Hecho y probado con arnés (build OK): editor por pestañas (`EditorCursoPestanas.jsx`,
`editorCurso.js`), `ChecklistPublicar.jsx`, `PendientesHoy.jsx`, lista de cursos con
buscador/filtros/tarjetas, menú agrupado con insignias. Nota: `handleSaveCourse` ahora
devuelve `true` y al actualizar ya NO cierra el editor (se queda en la pestaña con
"Guardado"). `.admin-layout` usa `overflow-x: clip` para que funcione `position: sticky`.
No se probó contra Supabase real. Lo de abajo queda como referencia de lo que se pidió.

Archivos: `src/pages/AdminDashboard.jsx` y `.css`
Nuevos (pueden existir a medias): `src/components/admin/EditorCursoPestanas.jsx`,
`ChecklistPublicar.jsx`, quizá `PendientesHoy.jsx`.
1. **Editor de curso por pestañas**: Información · Precio y acceso · Certificado ·
   Examen final · Lecciones · Reglas · Biblioteca · Alumnos. Encabezado con nombre,
   estado (Borrador/Activo), "Ver aula", "Cerrar". Barra fija "Guardar cambios" para las
   pestañas de formulario, con "Cambios sin guardar" y aviso al salir. Validación por
   campo; al guardar con errores, saltar a la pestaña y enfocar el campo (sin `required`
   ocultos que bloqueen el envío en silencio). Curso nuevo: Lecciones/Reglas/Biblioteca/
   Alumnos deshabilitadas con "Guarda el curso primero". Recordar la última pestaña.
2. **Listo para publicar**: checklist (descripción y portada; precio si es de pago; al
   menos una lección con contenido; examen final con preguntas o regla de finalización;
   plantilla de certificado; si `curso_reglas.modo_acceso = 'grupo'`, al menos un grupo
   en `grupo_cursos`). Cada punto lleva a su pestaña. Botón "Activar curso" (usa el
   `handleToggleCourseStatus` existente).
3. Lista de cursos con buscador, filtros (Activos/Borradores, Gratis/De pago) y tarjetas
   en móvil; mantener acciones (Editar, Métricas, Ver aula, Clonar, Eliminar).
4. Menú lateral agrupado (Escuela · Personas · Comunicación · Reportes · Ventas ·
   Sistema) con insignias de pendientes (cuentas por activar, solicitudes, tareas por
   revisar) por `count` con `head: true`, que fallen en silencio.
5. Inicio: "Pendientes de hoy" (cuentas por activar, tareas por revisar, solicitudes,
   sesiones en vivo de los próximos 7 días, cursos en borrador) con acceso directo.

### B. Contenido de los cursos — ✅ terminado y verificado (13 oct)
`EditorLecciones.jsx`, `EditorEvaluacion.jsx`, `ReglasCurso.jsx`, `BibliotecaCurso.jsx`,
`InscritosCurso.jsx`, `AsistenciaSesion.jsx`, `AdminLms.css`, `src/lib/videos.js`.
**No cambiar sus props públicas** (AdminDashboard los usa). `src/lib/lecciones.js` lo
usa el aula del alumno: solo agregar exportaciones.
1. Reordenar lecciones **arrastrando** con @dnd-kit (asa, teclado y táctil), mínimo de
   escrituras, revertir y avisar si falla. Secciones como encabezados plegables.
2. "Agregar lección" con tarjetas de tipo (icono + para qué sirve) y "Copiar de otro curso".
3. Editar lección en **panel lateral/modal** (pantalla completa en móvil), con aviso de
   cambios sin guardar y Esc para cerrar.
4. Validación en vivo del enlace de video con `detectarVideo` ("Vimeo detectado ✓",
   "YouTube detectado ✓", o "Este enlace no se puede reproducir…"); miniatura de
   YouTube (`img.youtube.com/vi/ID/hqdefault.jpg`); aviso si una página web no es https.
5. Estado por lección: "Sin contenido" (ámbar), obligatoria/opcional, icono de tipo.
6. Reglas en tarjetas plegables con resumen arriba ("Visible en catálogo · Cupo 30 ·
   Acceso por grupo · Termina con examen final").
7. Biblioteca: subir arrastrando archivos a una zona, con progreso y errores.
8. Evaluaciones: preguntas reordenables, marcar la correcta con un clic, vista previa
   "como la ve el alumno".

### C. Portal del alumno — ✅ terminado y verificado (13 oct)
`src/pages/Dashboard.jsx/.css`, `src/pages/Classroom.jsx/.css`,
`src/components/EvaluacionLeccion`, `SesionEnVivo`, `CalendarioAlumno`, `Mensajes`,
`Comunicados`, `LogrosAlumno`, `CambioVista`. Nuevos (pueden existir a medias):
`src/components/InicioAlumno.jsx/.css`, `NavegacionMovil.jsx/.css`.
No romper: cuentas en revisión (cursos cerrados), cursos "por grupo" ("Lugar apartado /
Abre el …", `cargarMiApertura`), certificados por servidor (`src/lib/certificados.js`),
regreso de Stripe (`curso_pago=ok&session_id`), bienvenida desde `portal_config`.
1. Inicio "Mi aprendizaje": "Continuar donde te quedaste", próximas clases en vivo (7
   días), pendientes (tareas/exámenes), avisos y mis cursos con progreso.
2. Barra inferior fija en celular (Inicio, Mis cursos, Catálogo, Calendario, Mensajes
   con no leídos) y "Más"; menú lateral agrupado en escritorio.
3. Aula: barra de avance del curso, "Anterior"/"Siguiente lección" y atajos ←/→, temario
   con secciones plegables y la lección actual resaltada, cajón deslizable en móvil,
   aviso "¡Lección completada!", celebración al terminar el curso con botón al
   certificado, modo enfoque.
4. Catálogo con buscador y filtros, y estados claros (Inscrito, En revisión, Lugar
   apartado, Cupo lleno, Requiere solicitud).
5. Exámenes de una pregunta a la vez, con progreso y revisión antes de enviar.

## 5. Cierre

1. `npm run lint`, `npm run build`, `npm run check:lms` en verde.
2. Prueba visual de: lista y editor de cursos (cada pestaña), arrastrar lecciones,
   inicio del alumno, aula (anterior/siguiente, temario móvil) y un examen.
3. Borrar arneses temporales.
4. Avisar al dueño qué quedó y esperar su "súbelo" para hacer commit y push a `main`
   (Netlify publica solo).

## 6. Pendientes fuera de la interfaz (no urgentes)

- Stripe: webhook `https://healthcareexp.com/.netlify/functions/stripe-webhook` en las 2
  cuentas (eventos `checkout.session.completed`, `checkout.session.async_payment_succeeded`)
  y secretos en Netlify `STRIPE_WEBHOOK_SECRET` (pesos) y `STRIPE_WEBHOOK_SECRET_2`
  (dólares). Los consigue Jen.
- La página de París (`src/components/paris/ParisNewDesign.jsx`) aún dice que los
  enfermeros suman ECMO Nursing "con un 20% de descuento"; preguntar si se quita (los
  descuentos están desactivados).
- Descuento por nivel de la gamificación del portal: sigue activo; se apaga en
  Configuración → Gamificación si el dueño lo pide.
- Step 1 a $7,000 vence solo el 15 de octubre de 2026 (vuelve a $10,000).

## 7. Resultado de la continuación (13 de octubre de 2026)

- Se revisaron las ocho pestañas del editor, lista y filtros de cursos,
  guardado con cambios pendientes, contenido por panel lateral, reglas plegables,
  biblioteca y vista previa de evaluaciones.
- Se verificaron arrastre con teclado y ratón, escrituras parciales fallidas con
  restauración del orden y recuperación de subidas sin duplicar archivos.
- Se verificaron inicio del alumno, navegación móvil, foco dentro de los cajones,
  Anterior/Siguiente y atajos del aula. Las cuentas en revisión conservan sus
  cursos cerrados y los cursos por grupo siguen mostrando su apertura.
- Se completó el tema oscuro del aula, incluidos evaluaciones, tareas y sesiones.
  Tanto los exámenes de lección como el examen final muestran una pregunta por
  pantalla y permiten revisar antes de enviar. La vista previa del administrador
  también usa pasos. El servidor sigue recibiendo los mismos identificadores y
  respuestas que antes; no se cambió la forma de calificar.
- Se corrigieron cargas infinitas, errores de consultas ocultos y falta de
  reintento en lecciones, reglas y evaluaciones. Los datos que no se pudieron
  consultar ya no se presentan como resultados confirmados o pendientes vacíos.
- Los cuadros de confirmación, paneles y menús móviles administran y devuelven
  el foco, admiten Escape y evitan que Tab se salga mientras están abiertos.
- Pruebas con datos simulados: 375 y 1280 px, claro y oscuro, ocho pestañas,
  evaluaciones de lección/final, reintentos, registro de archivos y navegación.
  También orientación horizontal, texto aumentado y movimiento reducido.
  Sin errores de renderizado ni desbordamiento horizontal en esas pruebas.
- Verificación final después de eliminar los arneses: `npm run lint` sin
  errores ni advertencias, `npm run build` correcto (incluye comprobación de
  descuentos), `npm run check:lms` con las 12 pruebas aprobadas y `git diff
  --check` sin problemas. La compilación conserva los avisos existentes sobre
  Browserslist y tamaño de paquetes.
- No se modificaron funciones de Netlify, SQL/RLS, cobros ni códigos de descuento.
  No se hicieron pagos, envíos ni escrituras contra Supabase real.

Los arneses se eliminaron al cerrar la verificación. Queda publicar cuando el
dueño indique «súbelo» y comprobar los servicios reales después del despliegue.
Los pendientes externos de la sección 6 conservan su estado.

## 8. Mejoras adicionales autorizadas (13 de octubre de 2026)

- Las evaluaciones de lección guardan un borrador por usuario, lección y vista
  (alumno o administrador) en este navegador. Al volver o recargar se pueden
  reanudar con sus respuestas, orden de preguntas y paso de revisión.
- Un cambio en preguntas, opciones, configuración, tipo de evaluación o número
  de intentos invalida el borrador. Se elimina después de una respuesta aceptada
  por el servidor o cuando el alumno confirma que quiere descartarlo.
- Si el navegador no permite guardar, se muestra el error y se confirma la
  salida desde los controles del aula. La recarga/cierre avisa también cuando
  hay respuestas sin guardar o un envío en curso.
- Durante el envío se bloquean preguntas, revisión y salida del aula. Una guarda
  inmediata evita envíos duplicados. Los fallos conservan respuestas y borrador
  para reintentar; el examen final también bloquea controles durante la calificación.
- El panel carga alumnos y webinars en paralelo con los cursos. Las categorías
  esperan solo a los cursos para conservar sus conteos correctos.
- `npm run check:ui` prueba 9 regresiones: aislamiento por usuario/vista,
  recuperación de respuestas y orden, invalidez tras cambios o nuevos intentos,
  respuestas fuera de rango y manejo de almacenamiento bloqueado.
- QA en Chrome con datos simulados a 375 y 1280 px, claro y oscuro: cambiar de
  lección y recargar sin perder respuestas, envío demorado/fallido, reintento,
  controles y salida bloqueados, eliminación del borrador al aceptar el envío,
  examen modificado y cursos disponibles mientras alumnos sigue cargando.
  Sin errores de renderizado ni desbordamiento horizontal en esas pruebas.

Se eliminaron nuevamente los archivos temporales de QA. Las modificaciones
siguen locales y pendientes de autorización para commit/push y publicación.
Verificación final: lint y compilación correctos, las 12 pruebas de servidor y
las 9 de borradores aprobadas, y revisión de espacios de Git sin errores.
