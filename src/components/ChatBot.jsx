import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatBot.css';

const BOT_IMG = 'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-03-12_01-43-49-485.png';

const FLOWS = {

  // ── Bienvenida General ──────────────────────────────────────────────────────
  welcome: {
    text: '¡Hola! Soy el asistente de HCE.\n\n¿En qué puedo ayudarte?',
    buttons: [
      { label: '¿Qué es HCE?',            next: 'que_es_hce' },
      { label: 'Ver programas',            next: 'programas' },
      { label: 'Webinars gratuitos',       next: 'webinars' },
      { label: '¿Qué es el Portal HCE?',  next: 'info_portal' },
      { label: 'Experiencias abiertas',    next: 'disponibles' },
      { label: 'Hablar con un asesor',     next: 'contacto' },
    ],
  },

  info_portal: {
    text: 'El **Portal Académico HCE** es nuestra plataforma digital de educación continua:\n\n**¿Para qué sirve?**\nPara tomar cursos especializados en cuidados críticos, resolver sus evaluaciones (se aprueba con 80%) y descargar los certificados oficiales.\n\nTambién es donde te registras a los **webinars gratuitos**: ahí recibes tu enlace de Zoom y, al terminar la sesión, se desbloquea tu constancia de asistencia.\n\n**¿Cómo accedo?**\nCon la opción de "Acceso Alumnos". Si es tu primera vez, puedes crear tu cuenta ahí mismo.',
    buttons: [
      { label: 'Ingresar al Portal',      action: 'login' },
      { label: 'Webinars gratuitos',      next: 'webinars' },
      { label: 'Volver',                 next: 'home_portal' },
    ],
  },

  // ── Bienvenida Estudiante ───────────────────────────────────────────────────
  welcome_student: {
    text: "¡Hola! Soy tu asistente de HCE.\n\nVeo que estás en el portal de estudiantes. ¿En qué puedo apoyarte hoy?",
    buttons: [
      { label: "¿Cómo tomo mis cursos?", next: "estudiante_clases" },
      { label: "¿Cómo obtengo certificados?", next: "estudiante_certificados" },
      { label: "Tareas", next: "estudiante_tareas" },
      { label: "Puntos e insignias", next: "estudiante_logros" },
      { label: "Webinars y constancias", next: "estudiante_webinars" },
      { label: "Problemas con un video", next: "estudiante_video_problemas" },
      { label: "Otros temas (General)", next: "welcome" },
    ],
  },

  // ── Bienvenida Administrador ────────────────────────────────────────────────
  welcome_admin: {
    text: "¡Hola! Soy tu asistente de control HCE.\n\nVeo que estás en el portal de administración. ¿En qué proceso de gestión puedo apoyarte hoy?",
    buttons: [
      { label: "Crear un curso y sus lecciones", next: "admin_gestion_cursos" },
      { label: "Revisar tareas", next: "admin_tareas" },
      { label: "Grupos e inscripción masiva", next: "admin_grupos" },
      { label: "Métricas de cursos", next: "admin_metricas" },
      { label: "Gestionar Webinars", next: "admin_webinars" },
      { label: "Matricular alumnos", next: "admin_matricula" },
      { label: "Seguridad y accesos", next: "admin_seguridad" },
      { label: "Otros temas (General)", next: "welcome" },
    ],
  },

  // ── FLUJOS ESTUDIANTE ───────────────────────────────────────────────────────
  estudiante_clases: {
    text: "Así funcionan los cursos del portal:\n\n1. En **Explorar Cursos** eliges uno. Si es **gratis**, te inscribes con un clic; si es **de pago**, pagas con tarjeta y queda en tu portal al confirmarse.\n2. Cada curso tiene **lecciones**: videos, documentos PDF, lecturas o tareas. En el aula, a la derecha, ves el temario con tu avance.\n3. Los videos cuentan como vistos al llegar al **90%**; los PDF y lecturas los marcas tú como completados.\n4. Al completar las lecciones obligatorias se abre el **examen final**.\n\nTu avance se guarda solo y lo ves igual desde la computadora o el celular.",
    buttons: [
      { label: "¿Cómo obtengo certificados?", next: "estudiante_certificados" },
      { label: "¿Cuánto duran?", next: "estudiante_duracion" },
      { label: "Tareas", next: "estudiante_tareas" },
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  estudiante_certificados: {
    text: "Depende de si es un **curso** o un **webinar**:\n\n**Cursos.** Al aprobar el examen final (normalmente con **80%**) se genera tu certificado con tu nombre y folio, y te queda en la pestaña **Certificados**.\n\n**Webinars.** La constancia se desbloquea al terminar la sesión, sin examen, y también aparece en **Certificados**.",
    buttons: [
      { label: "¿Tienen vigencia?", next: "estudiante_certificados_vigencia" },
      { label: "Constancia de webinar", next: "estudiante_webinar_constancia" },
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  estudiante_certificados_vigencia: {
    text: "Casi todos los certificados son **permanentes**. Algunos cursos tienen **vigencia** (por ejemplo, 12 meses): en la pestaña Certificados, la columna **Vigencia** te dice hasta cuándo vale el tuyo.\n\nTe avisamos por correo **30 días antes** de que venza. Para recertificarte pulsas **\"Recertificarme\"** y vuelves a presentar el examen.\n\nAparte, el **archivo** se queda en el portal 30 días después de emitido: descárgalo y guárdalo.",
    buttons: [
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  // ── Webinars (estudiante) ───────────────────────────────────────────────────
  estudiante_webinars: {
    text: 'Los webinars de HCE son **gratuitos** y todo se maneja desde aquí, en la pestaña **Webinars** de tu menú:\n\n1. Abre la tarjeta del webinar y pulsa **"Registrar mi asistencia"**.\n2. Zoom te manda a tu correo tu **enlace personal** de entrada. También te queda a la mano en el botón "Entrar al Zoom" de esa misma tarjeta.\n3. Conéctate el día de la sesión con ese enlace.\n4. Al terminar, en la misma tarjeta se desbloquea tu constancia.\n\nUsa siempre tu enlace, no el de un compañero: es lo que nos permite acreditarte la asistencia a ti.',
    buttons: [
      { label: 'Ir a mis webinars',        action: 'portal_webinars' },
      { label: '¿Cómo bajo mi constancia?', next: 'estudiante_webinar_constancia' },
      { label: 'Volver a estudiante',      next: 'welcome_student' },
    ],
  },

  estudiante_webinar_constancia: {
    text: 'En la pestaña **Webinars**, dentro de la tarjeta de la sesión, pulsa **"Desbloquear constancia"**.\n\nLo que pasa después es automático: consultamos el reporte de Zoom y, si apareces con los minutos requeridos, **tu constancia se descarga sola**, con tu nombre y su folio. No tienes que escribir nada ni pedírnosla.\n\nSolo si Zoom no te reconoce —suele pasar cuando entraste con otro correo o desde el equipo de alguien más— te pediremos el **código que el ponente dijo al cerrar la clase**.\n\nY si no alcanzaste a conectarte, espera: liberamos la grabación más adelante.',
    buttons: [
      { label: 'Ir a mis webinars',        action: 'portal_webinars' },
      { label: 'Volver a estudiante',      next: 'welcome_student' },
    ],
  },

  estudiante_tareas: {
    text: "Algunas lecciones son **tareas**: lees las instrucciones y entregas tu respuesta escrita, un archivo, o ambos.\n\nAl entregarla, la lección cuenta como completada. Un profesor la revisa:\n\n**Aprobada** — listo.\n**Por corregir** — verás su comentario en la misma lección y podrás volver a entregarla. Mientras tanto, esa lección queda pendiente.",
    buttons: [
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  estudiante_logros: {
    text: "En tu **Dashboard** ves tus puntos, tus insignias y la tabla de posiciones.\n\n**Cómo se ganan puntos:**\nLección completada: +10\nDía de estudio: +5\nWebinar al que asististe: +15\nExamen aprobado al primer intento: +20\nCurso certificado: +50\n\nEn la tabla solo aparece tu nombre y la inicial de tu apellido. Si prefieres no aparecer, usa **\"Ocultarme de la tabla\"**.",
    buttons: [
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  estudiante_video_problemas: {
    text: "Si un video no carga o se traba:\n\n1. Revisa tu conexión y recarga la página.\n2. Si ves un aviso de error, usa el enlace **\"Abrir directamente en YouTube\"** que aparece en el reproductor.\n3. El reproductor no deja **adelantar** más allá de lo que ya viste: es para que el avance cuente. Puedes regresar y volver a ver lo que quieras.\n\nSi sigue fallando, escríbenos y lo revisamos.",
    buttons: [
      { label: "Hablar con un asesor", next: "contacto" },
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  estudiante_duracion: {
    text: "La duración depende de cada curso. En el aula, el temario de la derecha muestra cuánto dura cada lección y tu avance total del curso.",
    buttons: [
      { label: "Volver a estudiante", next: "welcome_student" },
    ],
  },

  // ── FLUJOS ADMINISTRADOR ────────────────────────────────────────────────────
  admin_gestion_cursos: {
    text: "En **Gestión de Cursos**:\n\n1. **Datos del curso:** título, descripción, portada y categoría.\n2. **Acceso:** Gratis (el alumno se inscribe solo) o De pago, con su precio. Los cursos de pago piden una **portada propia**: la miniatura de YouTube deja ver el video sin pagar.\n3. **Vigencia del certificado** (opcional): meses que vale. Vacío = no vence.\n4. **Examen final:** las preguntas y la calificación mínima.\n\nAl **publicar** el curso aparece abajo la tarjeta **Lecciones del curso**: ahí agregas videos, PDF, lecturas y tareas, y las ordenas con las flechas.",
    buttons: [
      { label: "¿Qué tipo de lección uso?", next: "admin_lecciones" },
      { label: "Volver a admin", next: "welcome_admin" },
    ],
  },

  admin_lecciones: {
    text: "**Video** — pega el enlace de YouTube. Súbelo como \"no listado\": solo lo ven los inscritos. Cuenta como visto al 90%.\n\n**Documento PDF** — sube el archivo. Queda privado, con enlaces que caducan en una hora.\n\n**Lectura** — escribe el texto. Admite formato sencillo: títulos con #, viñetas con guion, negritas con doble asterisco y enlaces.\n\n**Tarea** — escribe las instrucciones. El alumno entrega texto o archivo y tú la revisas en **Tareas**.\n\nCada lección puede ser **obligatoria** (necesaria para el examen) u opcional.",
    buttons: [
      { label: "Revisar tareas", next: "admin_tareas" },
      { label: "Volver a admin", next: "welcome_admin" },
    ],
  },

  admin_tareas: {
    text: "En la pestaña **Tareas** están las entregas de los alumnos. El número rojo del menú son las pendientes.\n\nAbre una entrega para leerla o ver su archivo, y elige:\n\n**Aprobar** — la lección queda completa.\n**Pedir corrección** — escribe qué tiene que corregir (es obligatorio). El alumno lo ve en su lección y esa lección se reabre hasta que vuelva a entregar.",
    buttons: [
      { label: "Volver a admin", next: "welcome_admin" },
    ],
  },

  admin_grupos: {
    text: "En la pestaña **Grupos**:\n\n**Grupos** — reúne alumnos (un hospital, una generación) y asígnales cursos. Todos los miembros quedan inscritos, y quien entre después al grupo también. Puedes agregar miembros buscándolos o **pegando una lista de correos** de Excel.\n\n**Inscripción masiva** — pega correos, elige un curso y quedan inscritos sin crear un grupo. Si alguien no tiene cuenta, te lo listamos para invitarlo.\n\nQuitar un curso de un grupo **no** le quita el acceso a nadie: las bajas se hacen alumno por alumno.",
    buttons: [
      { label: "Métricas por grupo", next: "admin_metricas" },
      { label: "Volver a admin", next: "welcome_admin" },
    ],
  },

  admin_metricas: {
    text: "En **Métricas** ves, por periodo y opcionalmente por **grupo**:\n\n**Todos los cursos** — visitas, alumnos activos, tiempo de estudio, certificados e ingresos.\n\n**Al abrir un curso** — en qué lección se atora la gente, en qué minuto abandonan cada video, desde qué dispositivo entran, las calificaciones del examen y la tabla de alumnos con el historial de cada visita.\n\nTodo se exporta a Excel.",
    buttons: [
      { label: "Reportes en Excel y PDF", next: "admin_reportes" },
      { label: "Volver a admin", next: "welcome_admin" },
    ],
  },

  admin_webinars: {
    text: 'En la pestaña **Webinars**, con "+ Crear Webinar" o el lápiz para editar.\n\n**Lo de siempre:** título, fecha y horario en texto, imagen (URL o "Subir Archivo", máx. 2 MB) y el enlace de la reunión. Las **fechas de inicio y fin** marcan el webinar como 🔴 EN VIVO solo en ese rango. La casilla **Activo** lo hace visible en la web.\n\n**Si además quieres registro, asistencia y constancia**, palomea **"Registro por el portal"**. Ahí el botón de la landing deja de mandar al enlace externo y lleva al portal.',
    buttons: [
      { label: 'Configurar Zoom',          next: 'admin_webinar_zoom' },
      { label: 'Configurar la constancia', next: 'admin_webinar_constancia' },
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  admin_webinar_zoom: {
    text: '**Antes, en Zoom.** Programa el seminario y deja activado **"Requerir registro"**. Sin eso Zoom rechaza las altas y todos acaban con el enlace genérico, sin asistencia verificable.\n\n**Después, en el panel** (paso 1 del formulario):\n\n1. **Enlace o ID:** pega la URL completa del seminario; el ID se extrae solo.\n2. **Tipo:** "Seminario web" si lo diste como webinar; "Reunión normal" si fue una reunión.\n3. **Minutos mínimos:** cuántos minutos hay que haber estado para acreditar. En 0 basta con aparecer en el reporte.\n\nEl **correo de confirmación** (paso 2) sale solo: la lista de Brevo ya viene puesta y la plantilla inserta el enlace personal de cada quien.',
    buttons: [
      { label: 'Configurar la constancia', next: 'admin_webinar_constancia' },
      { label: 'Ver asistencia',           next: 'admin_webinar_asistencia' },
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  admin_webinar_constancia: {
    text: 'En el paso 3 del formulario decides **quién puede descargarla**:\n\n**Nadie todavía** — el alumno la ve bloqueada. Déjalo así hasta que termine la sesión.\n**Solo quien asistió** — Zoom confirma solo; a quien no aparezca se le pide el código. Es el que usarás al cerrar la clase.\n**Todo el que se registró** — abierta para todos, útil al liberar la grabación.\n\nEl **código** es el que dice el ponente al despedirse, y solo entra en juego cuando Zoom no reconoce a la persona.\n\nLa **plantilla** puedes pegarla como URL o subirla (máx. 5 MB). Debajo aparece la imagen real: haz clic encima para colocar el nombre y ajusta el tamaño con el deslizador.',
    buttons: [
      { label: 'Ver asistencia',           next: 'admin_webinar_asistencia' },
      { label: 'Volver a Webinars',        next: 'admin_webinars' },
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  admin_webinar_asistencia: {
    text: 'En la fila del webinar, el icono de **personas** abre el listado: quién se registró, quién asistió, cuántos minutos estuvo, cómo se verificó y quién ya descargó su constancia.\n\nAhí mismo tienes dos botones:\n\n**Sincronizar con Zoom** — vuelve a pedir el reporte de asistencia. Ojo: Zoom tarda unos minutos en generarlo después de que cierras la sesión, así que si lo pides de inmediato te dirá que aún no hay datos. Espera y vuelve a darle.\n\n**Exportar** — baja el listado en CSV para abrirlo en Excel.\n\nAunque no toques nada, la asistencia también se consulta sola cuando un alumno intenta desbloquear su constancia.',
    buttons: [
      { label: 'Volver a Webinars',        next: 'admin_webinars' },
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  admin_matricula: {
    text: "Para dar acceso a un alumno a mano (becas, casos especiales):\n\n1. Ve a **Alumnos** y abre su expediente.\n2. En **Cursos inscritos** ves sus cursos y de dónde viene su acceso (pagó, gratis, grupo, beca).\n3. Elige un curso y pulsa **Inscribir alumno**. Funciona aunque el curso sea de pago.\n4. Con el botón de la papelera le quitas el acceso.\n\nPara inscribir a muchos de golpe usa **Grupos**.",
    buttons: [
      { label: "Grupos e inscripción masiva", next: "admin_grupos" },
      { label: "Bloquear alumnos", next: "admin_bloquear" },
      { label: "Volver a admin", next: "welcome_admin" },
    ],
  },

  admin_bloquear: {
    text: 'Si necesitas suspender temporalmente el acceso de un usuario:\n\n1. Ve a la sección **Alumnos**.\n2. Ubica al estudiante y haz clic en el candado de la columna de acciones.\n3. Confirma la acción. El alumno cambiará a estado "Bloqueado" y no podrá ingresar a su portal.',
    buttons: [
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  admin_reportes: {
    text: 'En la sección **Reportes** puedes obtener las métricas y exportaciones:\n\n1. **EXCEL:** Descarga una base de datos en formato CSV con el listado de alumnos, su profesión, hospital, cursos inscritos y fecha de registro.\n2. **PDF:** Genera y abre un reporte ejecutivo imprimible con los KPIs de finalización, retención de cursos y certificados emitidos.\n\nLos registrados de cada webinar se exportan aparte, desde la propia pestaña de Webinars.',
    buttons: [
      { label: 'Ver asistencia',           next: 'admin_webinar_asistencia' },
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  admin_seguridad: {
    text: 'En la sección de **Administradores** puedes crear cuentas para otros colaboradores del portal.\n\nRecuerda asignar contraseñas seguras. Solo los administradores tienen permiso para editar la base de datos de Supabase y dar de alta cursos o preguntas.',
    buttons: [
      { label: 'Volver a admin',           next: 'welcome_admin' },
    ],
  },

  // ── Experiencias abiertas ────────────────────────────────────────────────────
  disponibles: {
    text: 'Esto es lo que está abierto ahora mismo:\n\n**Paris International Diploma in ECMO** — Step 1 y 2\nCertificación internacional presencial, con el Hospital Pitié-Salpêtrière de París.\nInicio: **28 de octubre de 2026** · Sede: **INER, Ciudad de México**\n\n**Solo Step 1 (Teórico)**\nLa parte teórica del diploma, por separado.\n**28 y 29 de octubre**, 100% presencial.\n\n**ECMO Sim** — simulador virtual, disponible todo el año.\n\n**Webinars gratuitos** — sesiones en vivo con expertos.\n\nECMO Nursing Care está agotado; la 3.ª edición se anuncia pronto.',
    buttons: [
      { label: 'Diploma completo',       next: 'paris' },
      { label: 'Solo Step 1',            next: 'step1' },
      { label: 'Webinars gratuitos',     next: 'webinars' },
      { label: 'Hablar con un asesor',   next: 'contacto' },
      { label: 'Inicio',                 next: 'home_portal' },
    ],
  },

  // ── Qué es HCE ──────────────────────────────────────────────────────────────
  que_es_hce: {
    text: 'HCE (Healthcare Training Experience) es una institución educativa especializada en el entrenamiento de alta complejidad para el manejo del paciente crítico cardiovascular.\n\nNo somos una universidad convencional. Fusionamos simulación clínica, tecnología y experiencia internacional para preparar a los mejores profesionales de Latinoamérica.\n\nMás de **2,000 alumnos** formados en más de **15 países**.',
    buttons: [
      { label: '¿Quién la fundó?',   next: 'fundadora' },
      { label: 'Ver programas',      next: 'programas' },
      { label: 'Inicio',             next: 'home_portal' },
    ],
  },

  // ── Fundadora ────────────────────────────────────────────────────────────────
  fundadora: {
    text: 'HCE fue fundada en 2024 por la **Dra. Jenifer Trejo Guerra**, Médico con entrenamiento especializado en ECMO y tecnologías avanzadas de soporte circulatorio.\n\nCuenta con más de 5 años de experiencia como especialista clínico y formadora en Latinoamérica, con certificaciones internacionales por ELSO y formación en el Hôpital Pitié-Salpêtrière de París.',
    buttons: [
      { label: 'Ver programas',   next: 'programas' },
      { label: 'Inicio',          next: 'home_portal' },
    ],
  },

  // ── Programas ────────────────────────────────────────────────────────────────
  programas: {
    text: 'HCE ofrece estas experiencias de formación:\n\n**Diploma Paris ECMO** — Certificación internacional presencial. Inscripciones abiertas, inicia el 28 de octubre.\n\n**Solo Step 1** — La parte teórica del diploma, por separado. 28 y 29 de octubre.\n\n**ECMO Sim** — Simulador clínico virtual, 100% online, todo el año.\n\n**ECMO Nursing Care** — Formación para enfermería en UCI. Agotado; 3.ª edición próximamente.\n\n**Webinars gratuitos** — Sesiones en vivo con expertos, con constancia de asistencia.\n\n¿Sobre cuál te gustaría saber más?',
    buttons: [
      { label: 'Diploma Paris ECMO',   next: 'paris' },
      { label: 'Solo Step 1',          next: 'step1' },
      { label: 'ECMO Sim',             next: 'ecmo_sim' },
      { label: 'ECMO Nursing Care',    next: 'nursing' },
      { label: 'Webinars gratuitos',   next: 'webinars' },
      { label: 'Inicio',               next: 'home_portal' },
    ],
  },

  // ── Paris ────────────────────────────────────────────────────────────────────
  paris: {
    text: '**Paris International Diploma in ECMO**\n\nEl programa de formación en ECMO más completo de Latinoamérica, desarrollado en colaboración con el Hospital Pitié-Salpêtrière de París — centro de referencia mundial.\n\nAbarca desde los fundamentos del circuito hasta el manejo clínico avanzado: destete, anticoagulación, ventilación en paciente crítico, manejo de complicaciones y casos clínicos reales.\n\nLa inscripción cubre el **Step 1 y el Step 2**.\n\nInicio: **28 de octubre de 2026**\nSede: **INER, Ciudad de México**\n\nCupo limitado.',
    buttons: [
      { label: 'Ver temario completo',  next: 'temario' },
      { label: 'Quiénes lo imparten',   next: 'instructores' },
      { label: 'Quiero inscribirme',    next: 'inscripcion_paris' },
      { label: 'Solo quiero el Step 1', next: 'step1' },
      { label: 'Inicio',                next: 'home_portal' },
    ],
  },

  // ── Step 1 ───────────────────────────────────────────────────────────────────
  step1: {
    text: '**Step 1 Teórico — por separado**\n\nEs la fase teórica del Paris International Diploma in ECMO, abierta como inscripción independiente para quien no quiere llevar el diploma completo.\n\n**28 y 29 de octubre**, 100% presencial en el INER, Ciudad de México.\n\nSi después decides continuar, el Step 2 es la fase práctica del mismo programa.',
    buttons: [
      { label: 'Inscribirme al Step 1',  action: 'step1_buy' },
      { label: 'Ver el diploma completo', next: 'paris' },
      { label: 'Hablar con un asesor',   next: 'contacto' },
      { label: 'Inicio',                 next: 'home_portal' },
    ],
  },

  // ── Temario ──────────────────────────────────────────────────────────────────
  temario: {
    text: 'El programa cubre **23 temas** en **5 módulos**:\n\n**Fundamentos** — Circuito ECMO, canulación V-V, transferencia de gases, anticoagulación\n\n**Indicaciones** — Shock cardiogénico, SDRA, embolia pulmonar, E-RCP, shock séptico, vía aérea crítica\n\n**Manejo Clínico Avanzado** — Ventilación mecánica en ECMO, manejo de hipoxemia, decúbito prono, destete V-A y V-V, farmacocinética\n\n**Complicaciones** — Neurológicas, edema pulmonar V-A, infecciones\n\n**Práctica Clínica** — Implementación de programa ECMO, cuidados de enfermería, casos clínicos',
    buttons: [
      { label: 'Quiénes lo imparten',  next: 'instructores' },
      { label: 'Quiero inscribirme',   next: 'inscripcion_paris' },
      { label: 'Volver',               next: 'paris' },
    ],
  },

  // ── Instructores ─────────────────────────────────────────────────────────────
  instructores: {
    text: 'El programa es impartido por referentes mundiales en ECMO:\n\n**Prof. Alain Combes** — Director del Programa. Hosp. Pitié-Salpêtrière, Francia\n\n**Prof. Matthieu Schmidt** — Presidente Científico. Hosp. Pitié-Salpêtrière, Francia\n\n**Enf. Hugo Guillou** — CEO Pratico Santé, Francia\n\n**Enf. Emric Besnard** — Presidente Pratico Santé, Francia\n\nHCE también cuenta con docentes nacionales e internacionales especializados.',
    buttons: [
      { label: 'Quiero inscribirme',  next: 'inscripcion_paris' },
      { label: 'Volver a Paris',      next: 'paris' },
      { label: 'Inicio',              next: 'home_portal' },
    ],
  },

  // ── Inscripción Paris ────────────────────────────────────────────────────────
  inscripcion_paris: {
    text: 'Puedes completar tu inscripción directamente en nuestro sitio web.\n\nSi tienes dudas sobre perfiles, complementos o formas de pago, un asesor puede orientarte sin compromiso.',
    buttons: [
      { label: 'Ir a inscripción',       action: 'inscribirse' },
      { label: 'Hablar con un asesor',   next: 'contacto' },
      { label: 'Inicio',                 next: 'home_portal' },
    ],
  },

  // ── ECMO Sim ─────────────────────────────────────────────────────────────────
  ecmo_sim: {
    text: '**ECMO Sim** — Simulador clínico virtual para profesionales de la salud.\n\nRecrea una UCI real en 3D: interactúas con ventiladores mecánicos, consolas ECMO y constantes vitales que reaccionan en tiempo real a cada decisión. Aprende a manejar escenarios críticos sin riesgo para el paciente.\n\n100% online, accede desde tu computadora.\n\n**4 meses — $250 USD**\n**12 meses — $700 USD**\n\nAcceso ilimitado a todos los escenarios durante tu suscripción.',
    buttons: [
      { label: 'Acceder al simulador',   action: 'ecmo_sim_buy' },
      { label: 'Ver otros programas',    next: 'programas' },
      { label: 'Inicio',                 next: 'home_portal' },
    ],
  },

  // ── Nursing Care ─────────────────────────────────────────────────────────────
  nursing: {
    text: '**ECMO Nursing Care Course**\n\nFormación especializada para enfermeros/as y profesionales de cuidados intensivos. Cubre los protocolos, monitoreo y cuidados específicos del paciente bajo soporte ECMO desde la perspectiva de enfermería en UCI.\n\nLa 2.ª edición está **agotada**. La **3.ª edición** se anunciará próximamente.\n\nSi quieres que te avisemos en cuanto abran las inscripciones, escríbenos y te apartamos el aviso.',
    buttons: [
      { label: 'Ver el curso',           action: 'nursing_page' },
      { label: 'Avísenme de la 3.ª ed.', next: 'contacto' },
      { label: 'Ver otros programas',    next: 'programas' },
      { label: 'Inicio',                 next: 'home_portal' },
    ],
  },

  // ── Webinars (público) ───────────────────────────────────────────────────────
  webinars: {
    text: 'Los **webinars de HCE son gratuitos**: sesiones en vivo por Zoom con especialistas nacionales e internacionales en cuidados críticos y ECMO.\n\nAl terminar cada sesión recibes una **constancia de asistencia** con tu nombre y folio, que descargas tú mismo desde el portal.\n\n**Cómo funciona:**\n1. Te registras en el Portal HCE (crear cuenta es gratis).\n2. Zoom te manda tu enlace personal por correo.\n3. Te conectas el día de la sesión.\n4. Al cerrar, se desbloquea tu constancia.\n\nSi no alcanzas a conectarte, liberamos la grabación más adelante.',
    buttons: [
      { label: 'Ver webinars abiertos',  action: 'webinars_landing' },
      { label: 'Ingresar al Portal',     action: 'login' },
      { label: 'Ver programas',          next: 'programas' },
      { label: 'Inicio',                 next: 'home_portal' },
    ],
  },

  // ── Contacto ─────────────────────────────────────────────────────────────────
  contacto: {
    text: 'Un asesor de HCE puede orientarte sobre programas, fechas, proceso de inscripción o cualquier duda.\n\n¿Cómo prefieres que te contactemos?',
    buttons: [
      { label: 'WhatsApp',            action: 'whatsapp' },
      { label: 'Correo electrónico',  action: 'email' },
      { label: 'Inicio',              next: 'home_portal' },
    ],
  },

};

function parseBold(line) {
  const parts = line.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  );
}

function BubbleText({ text }) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        <p key={i} style={{ margin: '0 0 3px' }}>
          {line ? parseBold(line) : <br />}
        </p>
      ))}
    </>
  );
}

export default function ChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [showTooltip, setShowTooltip] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Tooltip pulse cycle when chat is closed
  useEffect(() => {
    if (isOpen) return;
    const timers = [];
    const cycle = (delay) => {
      timers.push(setTimeout(() => setShowTooltip(true), delay));
      timers.push(setTimeout(() => setShowTooltip(false), delay + 4000));
    };
    cycle(2500);
    const interval = setInterval(() => {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 4000);
    }, 12000);
    return () => { timers.forEach(clearTimeout); clearInterval(interval); };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const addBotMessage = (flowKey, delay = 500) => {
    const flow = FLOWS[flowKey];
    if (!flow) return;
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMessages(prev => [
        ...prev,
        { id: Date.now(), type: 'bot', text: flow.text, buttons: flow.buttons },
      ]);
    }, delay);
  };

  const open = () => {
    setIsOpen(true);
    setShowTooltip(false);
    if (!hasOpened) {
      setHasOpened(true);
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        addBotMessage('welcome_admin', 600);
      } else if (path.startsWith('/dashboard') || path.startsWith('/classroom')) {
        addBotMessage('welcome_student', 600);
      } else {
        addBotMessage('welcome', 600);
      }
    }
  };

  const handleButton = (btn) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now(), type: 'user', text: btn.label },
    ]);
    if (btn.action === 'inscribirse') {
      navigate('/inscripciones-diploma-paris-ecmo');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'login') {
      navigate('/login');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'ecmo_sim_buy') {
      navigate('/simulador-ecmo-sim');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'step1_buy') {
      navigate('/inscripciones-step1');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'nursing_page') {
      navigate('/ecmo-nursing-care');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'portal_webinars') {
      navigate('/dashboard?tab=webinars');
      setIsOpen(false);
      return;
    }
    if (btn.action === 'webinars_landing') {
      // La rejilla de webinars vive en la portada. Si ya estamos ahí basta
      // con desplazarse; si no, primero hay que navegar y esperar al render.
      const irAlBloque = () => document.getElementById('webinars-grid')?.scrollIntoView({ behavior: 'smooth' });
      if (window.location.pathname === '/') {
        irAlBloque();
      } else {
        navigate('/');
        setTimeout(irAlBloque, 400);
      }
      setIsOpen(false);
      return;
    }
    if (btn.action === 'whatsapp') {
      window.open('https://wa.me/525659271906', '_blank');
      return;
    }
    if (btn.action === 'email') {
      window.open('mailto:info@healthcareexp.com', '_blank');
      return;
    }
    
    // Resolve welcome redirection dynamically based on route
    if (btn.next === 'home_portal') {
      const path = window.location.pathname;
      if (path.startsWith('/admin')) {
        addBotMessage('welcome_admin');
        return;
      } else if (path.startsWith('/dashboard') || path.startsWith('/classroom')) {
        addBotMessage('welcome_student');
        return;
      } else {
        addBotMessage('welcome');
        return;
      }
    }

    if (btn.next) addBotMessage(btn.next);
  };

  return (
    <div className="hce-chat-widget">
      {/* Tooltip */}
      <div className={`hce-chat-tooltip ${showTooltip && !isOpen ? 'hce-chat-tooltip--visible' : ''}`}>
        ¿Necesitas ayuda?
      </div>

      {/* Chat window */}
      <div className={`hce-chat-window ${isOpen ? 'hce-chat-window--open' : ''}`}>
        <div className="hce-chat-header">
          <img src={BOT_IMG} alt="bot" className="hce-chat-header-img" />
          <div className="hce-chat-header-info">
            <span className="hce-chat-header-name">Asistente HCE</span>
            <span className="hce-chat-header-status">
              <span className="hce-status-dot" /> En línea
            </span>
          </div>
          <button className="hce-chat-close" onClick={() => setIsOpen(false)} aria-label="Cerrar">✕</button>
        </div>

        <div className="hce-chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`hce-msg hce-msg--${msg.type}`}>
              {msg.type === 'bot' && (
                <img src={BOT_IMG} alt="" className="hce-msg-avatar" />
              )}
              <div className="hce-msg-content">
                <div className="hce-msg-bubble">
                  <BubbleText text={msg.text} />
                </div>
                {msg.buttons && (
                  <div className="hce-msg-buttons">
                    {msg.buttons.map((btn, i) => (
                      <button key={i} className="hce-quick-btn" onClick={() => handleButton(btn)}>
                        {btn.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {typing && (
            <div className="hce-msg hce-msg--bot">
              <img src={BOT_IMG} alt="" className="hce-msg-avatar" />
              <div className="hce-msg-content">
                <div className="hce-msg-bubble hce-typing">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating button */}
      <button
        className={`hce-chat-fab ${isOpen ? 'hce-chat-fab--open' : ''}`}
        onClick={() => (isOpen ? setIsOpen(false) : open())}
        aria-label="Abrir asistente HCE"
      >
        <span className="hce-wave hce-wave--1" />
        <span className="hce-wave hce-wave--2" />
        <span className="hce-wave hce-wave--3" />
        <img src={BOT_IMG} alt="Asistente HCE" className="hce-fab-img" />
        <span className="hce-fab-close-icon">✕</span>
      </button>
    </div>
  );
}
