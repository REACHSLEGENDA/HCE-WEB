# Pendientes del portal HCE — instrucciones para el siguiente Claude (27 nov 2026)

Léelo completo antes de empezar. Contexto general y reglas: `CONTINUACION-CODEX.md` (secciones 20 a 23).

## Reglas del proyecto (obligatorias)
- Español de México en todo el texto del sitio. Sin emojis en mensajes para la Dra. Jenifer Trejo ("Jen").
- Cada pantalla debe verse bien en celular (375 px): es una PWA.
- Paso a paso; no cambies lo que ya funciona.
- **Commit y push SOLO cuando Christian lo pida con "sube" o "súbelo".** Nunca por tu cuenta.
- Antes de subir: `npm run verificar` (lint + pruebas + checks + build) debe pasar.
- Llaves y secretos solo en variables de entorno de Netlify. Nunca en archivos ni en el chat.
- Stripe está en modo real (live). No hagas compras de prueba; las decide y las hace Christian.
- No inicies sesión en el portal ni crees cuentas en producción.
- Actualiza `CONTINUACION-CODEX.md` al terminar cada bloque, porque Codex también trabaja en este repo.
- Herramientas: el heredoc de Bash se come las diagonales invertidas. Para regex usa la herramienta Edit o
  scripts escritos con Write. Respeta CRLF/LF de cada archivo.

## 1. Estado al dejarlo
Todo lo de la sección 23 de `CONTINUACION-CODEX.md` está hecho y verificado localmente (145 pruebas y build),
**sin commit ni push**. Incluye además:
- `netlify/functions/_pagos.js`: OXXO y SPEI se intentan por separado. Está listo, falta subirlo.
- Correos más rápidos:
  - `notificaciones-programadas` ahora corre cada 10 minutos. Antes era cada hora; el recordatorio de
    sesión quedó en la ventana de 45 a 75 minutos.
  - `cobros-seguimiento` corre cada 15 minutos.
  - Una inscripción por lista de hasta 10 correos avisa al momento.

Para subir, cuando Christian diga "sube":
1. `git add` con los archivos de código, `supabase/*.sql` nuevos, `supabase/plantillas-correo/`, `tests/`,
   `CONTINUACION-CODEX.md` y este archivo.
2. **NO subas** los videos MP4 ni `entregables/bolivia/videos/fuente` (son pesados). Pregunta antes si
   `entregables/` va al repo o a `.gitignore`.
3. Haz commit y push a `main`.
4. Comprueba que se publicó: busca un texto nuevo en el bundle de producción, como se hizo antes con
   curl a `https://healthcareexp.com/assets/...`.

## 2. SQL que Christian debe correr en Supabase
Proyecto mxpxvtklkyvonbhqjdmq -> SQL Editor -> pegar el archivo completo -> Run. Todos son idempotentes.
1. `supabase/evaluaciones-mejoras.sql`: emparejar, respuestas en orden aleatorio y qué ve el alumno al terminar.
2. `supabase/curso-avance.sql`: regla "Orden de las lecciones" (libre o en orden).
3. `supabase/correo-inscripcion.sql`: texto nuevo del correo de inscripción.
4. Plantilla de correo de Supabase Auth (no es SQL): pegar `supabase/plantillas-correo/restablecer-contrasena.html`
   en Authentication -> Email Templates -> Reset Password. Así se quitan los `**` alrededor de
   "Healthcare Training Experience".

Ya corridos: `leccion-repaso-fuentes.sql`, `mover-comentarios-in-situ.sql` y el update de los 4 testimonios.

## 3. Pendientes que puede hacer otro Claude (en orden de prioridad)

> **Avance 27 nov (mañana), ver sección 24 de CONTINUACION-CODEX.md:** 3.1 hecho (SMTP ya estaba; plantilla
> confirmar-cuenta.html creada, falta que Christian la pegue). 3.4: "Ocultar calificación" en Dashboard y aviso de
> sesiones en vivo, hechos; falta el bloqueo real de "En orden". 3.5: lada por país, país normalizado y "Correo sin
> confirmar" en Alumnos, hechos. 3.6: videos corregidos y exportados a MP4.

### 3.1 Correos de Supabase (confirmación y contraseña): posible retraso grave
- **Problema:** los correos de confirmación de cuenta y de contraseña los manda Supabase Auth. Con el servidor de
  correo que trae Supabase por defecto, el límite es de pocos correos por hora y llegan tarde o a spam. Para
  los alumnos de Bolivia eso bloquea el primer acceso.
- **Qué hacer:** pedirle a Christian que revise en Supabase -> Authentication -> Emails -> SMTP Settings si hay un
  SMTP propio. Lo recomendado es el de Brevo: host smtp-relay.brevo.com, puerto 587, usuario y llave SMTP de
  Brevo, remitente academia@healthcareexp.com. Las credenciales las pone él; tú no las pidas en el chat. Luego,
  en Authentication -> Rate Limits, subir el límite de correos por hora.
- Revisar que las plantillas Confirm signup y Magic Link estén en español con el mismo diseño que
  `supabase/plantillas-correo/restablecer-contrasena.html`. Haz una plantilla
  `supabase/plantillas-correo/confirmar-cuenta.html` con `{{ .ConfirmationURL }}`.

### 3.2 OXXO y SPEI en el cobro de Nursing
- Subir `_pagos.js` (el que intenta los métodos por separado).
- Luego crear una sesión de prueba **sin correo y sin pagar**:
  `curl -X POST https://healthcareexp.com/.netlify/functions/create-nursing-checkout -H "Content-Type: application/json" -H "Origin: https://healthcareexp.com" -d '{"perfil":"enfermero","extras":[],"moneda":"mxn","email":""}'`
  Abre la URL en el navegador y mira qué métodos aparecen.
- Si solo aparece Tarjeta, Christian debe activar en Stripe, en la cuenta de pesos, Settings -> Payment methods:
  **OXXO** y **Bank transfers (SPEI, México)**.
- Cuando OXXO o SPEI aparezcan, cambia la respuesta de pago en `src/data/nursing.js` (la pregunta
  "¿Puedo pagar en dólares…?") y `public/llms.txt` para que digan que en pesos se puede pagar con tarjeta,
  efectivo en OXXO o transferencia SPEI.
- Opcional: llevar OXXO y SPEI a los otros cobros en pesos (`create-checkout.js`, `create-step1-checkout.js`,
  `create-sim-checkout.js`, `curso-inscripcion.js`). Antes revisa que su página de éxito y su seguimiento
  manejen el pago pendiente igual que Nursing (ver `pago-estado.js`, `nursing-register.js` y
  `cobros-seguimiento.js`). **Pregunta antes de hacerlo.**

### 3.3 Revisar en el navegador las funciones nuevas (necesita la sesión de admin de Christian)
- No se pudieron ver con sesión real, solo con pruebas:
  - El editor de exámenes: reglas "Al terminar el examen, el alumno ve", "+ Emparejar" e "Importar desde Excel".
  - El examen del alumno con emparejar y opciones revueltas.
  - La tarjeta "Avance" en Reglas.
  - Los candados del aula en modo "En orden".
  - El botón "Activar curso" del editor.
- Pídele a Christian que inicie sesión él mismo en el navegador integrado y revisa cada pantalla a 1280 y a 375 px.
- **Importar desde Excel:** pedirle a Jen un archivo exportado de TalentLMS ("Exportar en Excel" del reporte del
  test) y probarlo con `src/lib/importarPreguntas.js`. TalentLMS no exporta las preguntas como tales, solo el
  reporte, así que el formato es una suposición. Ajusta el lector con el archivo real y agrega una prueba con él.

### 3.4 Huecos conocidos (seguridad o consistencia)
- **"En orden" solo bloquea en el navegador.** La base deja leer el contenido de cualquier lección a quien está
  inscrito. Para bloquearlo de verdad haría falta una política o función en Supabase que revise
  `curso_reglas.orden_avance` y `leccion_progreso` antes de entregar `leccion_contenido`. Es delicado: diséñalo,
  pruébalo y pregunta antes.
- **"Ocultar calificación" es solo visual.** `src/pages/Dashboard.jsx` (pestaña de calificaciones, línea ~852)
  sigue mostrando el porcentaje. Hay que respetar `mostrar_calificacion` ahí también (leer `evaluacion_config`).
- **Sesiones en vivo obligatorias en un curso "En orden"** bloquean lo que sigue hasta que se registra la
  asistencia. Dile a Jen que las ponga como opcionales o acláralo en la ayuda de la regla.

### 3.5 Registro para alumnos de otros países (Bolivia)
- En `src/pages/Login.jsx`, el teléfono empieza en +52 y dice "10 dígitos", y País tiene "México" de ejemplo.
  Mejor: preseleccionar la lada con el país detectado (ya existe `netlify/functions/geo.js` y el hook
  `useMonedaSugerida`) y que la validación de dígitos dependa de la lada.
- País es texto libre: "Bolivia", "bolivia", "BOLIVIA" salen separados en el filtro de Alumnos. Normalizar al
  guardar o convertir el campo en una lista.
- El panel no muestra si el alumno ya confirmó su correo. Se puede mostrar con `auth.users.email_confirmed_at`
  desde una función con service role (`cuenta-admin.js`).

### 3.6 Correo y videos para Bolivia (`entregables/bolivia/`)
- `correo-acceso-portal.html` se pega en Brevo (editor de código HTML). Antes de mandarlo, el curso
  "Entrenamiento Introductorio en ECMO" (id 3) debe estar **Activo**.
- **Decisión de Jen:** ese curso tiene "Solicitud de inscripción" encendida. Si solo entran los que ella inscribe,
  quitar el párrafo del plan B ("Solicitar inscripción") del correo y desmarcar "Mostrar en el catálogo".
- Videos: `entregables/bolivia/videos/`. Los hizo un agente con HyperFrames; revisa que existan y se vean bien.
- `guia-jen-dar-de-alta-y-asignar.md`: menciona que el botón "Activar curso" del editor todavía no está
  publicado. Cuando se suba, actualiza esa línea.

### 3.7 Decisiones pendientes de Jen y Christian (no programar sin respuesta)
- Fecha de fin del precio Buen Fin de Nursing (interruptor `BUEN_FIN` en `InscripcionesNursing.jsx` y
  `create-nursing-checkout.js`).
- Pausar o no la automatización de Brevo "carrito abandonado Nursing". Hoy hay dos avisos: el de Brevo (lista
  `CARRITO_NURSING`) y el del sitio (`cobros-seguimiento`). Recomendado: dejar uno solo.
- Rotar la llave de Brevo que termina en "ut8D".
- Mandar el sitemap en Google Search Console (lo hace Jen).
- La etiqueta `tag: 'nursing2026'` del registro de Nursing ya debería ser 2027 (`InscripcionesNursing.jsx`,
  `RegistrationForm`). Confirmar con Christian si los reportes dependen de ella antes de cambiarla.

## 4. Cómo comprobar los tiempos de los correos (después de subir)
- **Inscribir a 1 alumno de prueba** (solo una cuenta que Christian indique) en un curso **activo**: el correo
  debe llegar en menos de 1 minuto.
- **Lista de más de 10 correos:** llegan en máximo 10 minutos.
- **Recibo de pago:** máximo 15 minutos.
- Las automatizaciones de Brevo (bienvenida de listas) tienen sus propios tiempos, configurados en Brevo ->
  Automations. Revisa que no tengan "esperar X horas" donde no haga falta (el carrito abandonado sí debe esperar).
