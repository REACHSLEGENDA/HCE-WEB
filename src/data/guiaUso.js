/* ---------------------------------------------------------------------------
 * Contenido de la Guía de uso del portal (admin y alumno).
 *
 * Los nombres de botones, pestañas y menús están copiados de la interfaz real.
 * Si cambias el texto de un botón en la pantalla, cámbialo también aquí: una
 * guía que dice "toca Crear curso" cuando el botón dice otra cosa es peor que
 * no tener guía.
 *
 * `ir` es la pestaña del portal a la que lleva el botón "Ir a …" de cada guía.
 * ------------------------------------------------------------------------ */

export const GUIA_ADMIN = [
  {
    grupo: 'Cursos',
    guias: [
      {
        id: 'crear-curso',
        titulo: 'Crear y publicar un curso',
        resumen: 'De la idea al curso visible en el catálogo.',
        ir: { tab: 'courses', texto: 'Ir a Cursos' },
        pasos: [
          'En el menú entra a **Cursos** y toca **Crear curso**.',
          'En la pestaña **Información** escribe el título, la duración y una descripción breve, y sube la portada.',
          'En **Precio y acceso** elige si es gratis o de pago y pon el precio.',
          'Toca **Guardar borrador**. Hasta que guardes, las pestañas Lecciones, Reglas, Biblioteca y Alumnos aparecen deshabilitadas.',
          'Agrega el contenido en **Lecciones** (lo explica la siguiente guía).',
          'Abre **Revisión antes de publicar** (a la derecha; en el celular, arriba): te dice qué le falta. Cuando todos los puntos esenciales tengan ✓, toca **Activar curso**.',
        ],
        nota: 'Mientras el curso esté en **Borrador**, los alumnos no lo ven. Puedes revisarlo como alumno con **Ver aula**.',
      },
      {
        id: 'lecciones',
        titulo: 'Agregar lecciones y cambiar su orden',
        resumen: 'Videos, documentos, exámenes y sesiones en vivo.',
        ir: { tab: 'courses', texto: 'Ir a Cursos' },
        pasos: [
          'Abre el curso y entra a la pestaña **Lecciones**.',
          'Toca **Agregar lección** y elige el tipo: Video, Documento PDF, Lectura, Tarea, Página web, Examen, Encuesta, Sesión en vivo o Sección.',
          'Usa las **Secciones** para agrupar, por ejemplo "Módulo I". Se pliegan y despliegan con la flecha.',
          'Para cambiar el orden, arrastra la lección desde el asa ⠿. Si mueves una sección, se van con ella todas sus lecciones.',
          'Las lecciones con la etiqueta **Sin contenido** todavía no tienen nada que el alumno pueda ver: ábrelas y complétalas.',
        ],
        nota: 'Con el teclado también se puede ordenar: enfoca el asa, presiona Espacio, mueve con las flechas y presiona Espacio para soltar.',
      },
      {
        id: 'certificados',
        titulo: 'Constancias y certificados',
        resumen: 'Cómo se emiten y dónde se configuran.',
        ir: { tab: 'certificates', texto: 'Ir a Certificados' },
        pasos: [
          'En el curso, la pestaña **Certificado** define la plantilla y dónde se escribe el nombre del alumno.',
          'En **Reglas** decides cómo se termina el curso: con examen final o completando las lecciones.',
          'Cuando el alumno cumple la regla, la constancia se emite sola, con folio.',
          'En **Certificados** del menú ves las emitidas y quiénes están por terminar.',
        ],
      },
    ],
  },
  {
    grupo: 'Alumnos',
    guias: [
      {
        id: 'activar-cuentas',
        titulo: 'Activar la cuenta de un alumno nuevo',
        resumen: 'Quien se registra espera tu aprobación.',
        ir: { tab: 'students', texto: 'Ir a Alumnos' },
        pasos: [
          'En **Dashboard**, la tarjeta **Cuentas por activar** muestra cuántas están esperando. Toca **Revisar cuentas**.',
          'Revisa los datos del alumno. Si aplica, elige su **Grupo** y los cursos adicionales.',
          'Toca **Activar cuenta**. Si no corresponde, **Rechazar cuenta**.',
        ],
        nota: 'Mientras su cuenta esté en revisión, el alumno puede entrar pero ve sus cursos cerrados.',
      },
      {
        id: 'inscribir-a-mano',
        titulo: 'Inscribir a un alumno a mano',
        resumen: 'Para becas, transferencias o casos especiales.',
        ir: { tab: 'courses', texto: 'Ir a Cursos' },
        pasos: [
          'Abre el curso y entra a la pestaña **Alumnos**.',
          'Toca **Inscribir a un alumno**, búscalo por nombre o correo y confírmalo.',
          'Desde ahí mismo ves el avance de cada inscrito y si ya tiene su constancia.',
        ],
      },
      {
        id: 'grupos',
        titulo: 'Grupos por generación',
        resumen: 'Abrir un curso a toda una generación en la misma fecha.',
        ir: { tab: 'grupos', texto: 'Ir a Grupos' },
        pasos: [
          'Entra a **Grupos**, escribe el nombre (por ejemplo "INER — Residentes 2026") y toca **Crear grupo**.',
          'Asigna los cursos del grupo y la fecha en que **Inicia** cada uno.',
          'Agrega a los alumnos uno por uno, o pega una columna de correos en **Inscripción masiva** y toca **Agregar correos**.',
        ],
        nota: 'Si un curso tiene acceso "por grupo", quien paga aparta su lugar y el curso se le abre el día de inicio de su grupo.',
      },
      {
        id: 'tareas',
        titulo: 'Revisar tareas',
        resumen: 'Calificar lo que entregan los alumnos.',
        ir: { tab: 'tareas', texto: 'Ir a Tareas' },
        pasos: [
          'Entra a **Tareas**. Arriba filtras por **Por revisar**, **Por corregir**, **Aprobada** o **Todas**.',
          'Abre una entrega, revisa el archivo o el texto y escribe un **Comentario para el alumno**.',
          'Márcala como aprobada o pídele que la corrija. El alumno ve tu comentario en su aula.',
        ],
      },
    ],
  },
  {
    grupo: 'Día a día',
    guias: [
      {
        id: 'pendientes',
        titulo: 'Qué revisar cada mañana',
        resumen: 'El Dashboard te dice qué necesita tu atención.',
        ir: { tab: 'dashboard', texto: 'Ir al Dashboard' },
        pasos: [
          'Abre **Dashboard**: la sección **Pendientes de hoy** junta cuentas por activar, tareas por revisar, solicitudes, clases en vivo de la semana y cursos en borrador.',
          'Cada tarjeta tiene un botón que te lleva directo a resolverlo.',
          'Los números rojos del menú lateral marcan dónde hay algo pendiente.',
        ],
      },
      {
        id: 'vista-alumno',
        titulo: 'Ver el portal como lo ve un alumno',
        resumen: 'Para revisar antes de publicar.',
        pasos: [
          'Arriba a la derecha toca **Vista de alumno**.',
          'Dentro de un curso, el botón **Ver aula** abre el aula tal como la verá el alumno.',
        ],
      },
      {
        id: 'mensajes',
        titulo: 'Mandar mensajes y avisos',
        resumen: 'Comunicarte con alumnos o con un curso completo.',
        ir: { tab: 'mensajes', texto: 'Ir a Mensajes' },
        pasos: [
          'Entra a **Mensajes** para escribirle a un alumno o publicar un comunicado para un curso.',
          'En **Notificaciones** configuras los correos automáticos, como recordatorios de clase.',
        ],
      },
    ],
  },
];

export const GUIA_ALUMNO = [
  {
    grupo: 'Para empezar',
    guias: [
      {
        id: 'instalar-app',
        titulo: 'Instalar la app en tu celular',
        resumen: 'Entra a tus clases con un toque, sin buscar la página.',
        pasos: [
          '**Android:** al entrar al portal aparece el aviso "Lleva el portal en tu celular". Toca **Instalar**.',
          '**iPhone:** abre el portal en **Safari**, toca el botón Compartir y luego **Añadir a pantalla de inicio**.',
          'Listo: el portal queda en tu pantalla de inicio como cualquier otra app.',
        ],
        nota: 'En iPhone solo funciona desde Safari, no desde Chrome.',
      },
      {
        id: 'entrar-curso',
        titulo: 'Entrar a tu curso y avanzar',
        resumen: 'Dónde está tu curso y cómo pasar de una lección a otra.',
        ir: { tab: 'courses', texto: 'Ir a Mis cursos' },
        pasos: [
          'En **Inicio** verás tu curso con el botón **Continuar** (o **Comenzar** si es la primera vez).',
          'Dentro del aula, cambia de lección con **Anterior** y **Siguiente**, o con las flechas ← → de tu teclado.',
          'El temario muestra en qué lección vas y cuáles ya completaste. En el celular se abre con el botón **Lecciones**.',
        ],
      },
    ],
  },
  {
    grupo: 'Durante el curso',
    guias: [
      {
        id: 'examen',
        titulo: 'Presentar un examen',
        resumen: 'Una pregunta a la vez y revisión antes de enviar.',
        pasos: [
          'Toca **Comenzar examen**. Verás una pregunta por pantalla y tu avance arriba.',
          'Al terminar llegas a **Revisa antes de enviar**: ahí puedes volver a cualquier pregunta.',
          'Cuando estés listo, toca **Enviar examen**.',
        ],
        nota: 'Si sales o se cierra la página, tus respuestas se guardan en este dispositivo y puedes seguir donde te quedaste.',
      },
      {
        id: 'clases-en-vivo',
        titulo: 'Entrar a una clase en vivo',
        resumen: 'Clases por Zoom con asistencia automática.',
        ir: { tab: 'calendario', texto: 'Ir al Calendario' },
        pasos: [
          'Tus próximas clases aparecen en **Inicio** y en **Calendario**.',
          'Antes de la clase toca **Registrarme a la sesión**.',
          'A la hora de la clase toca **Unirse a la clase**. Tu asistencia se registra sola.',
        ],
      },
      {
        id: 'constancia',
        titulo: 'Descargar tu constancia',
        resumen: 'Cuando terminas el curso.',
        ir: { tab: 'certificates', texto: 'Ir a Certificados' },
        pasos: [
          'Termina las lecciones obligatorias o aprueba el examen final, según tu curso.',
          'Entra a **Certificados** y toca **Descargar**.',
          'Tu constancia lleva un folio único y queda guardada en tu perfil.',
        ],
      },
    ],
  },
  {
    grupo: 'Tu cuenta',
    guias: [
      {
        id: 'mensajes',
        titulo: 'Mensajes y avisos',
        resumen: 'Lo que te escriben tus docentes y HCE.',
        ir: { tab: 'mensajes', texto: 'Ir a Mensajes' },
        pasos: [
          'Entra a **Mensajes**. El número junto al menú indica cuántos no has leído.',
          'Los avisos importantes del curso también aparecen en tu **Inicio**.',
        ],
      },
      {
        id: 'tema',
        titulo: 'Tus datos y el tema claro u oscuro',
        resumen: 'Actualizar tu información y cómo se ve el portal.',
        ir: { tab: 'settings', texto: 'Ir a Configuración' },
        pasos: [
          'En **Mi perfil** actualizas tu nombre, foto y datos de contacto.',
          'En **Configuración** eliges el tema **Claro**, **Oscuro** o **Sistema**.',
        ],
      },
    ],
  },
];

export const CORREO_AYUDA = 'info@healthcareexp.com';
