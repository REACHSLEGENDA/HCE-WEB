/* ---------------------------------------------------------------------------
 * Base de conocimiento del asistente.
 *
 * Junta tres fuentes en una sola lista de "entradas" con la misma forma:
 *   1. La Guía de uso (guiaUso.js), para no escribir dos veces lo mismo.
 *   2. Preguntas frecuentes y solución de problemas (abajo).
 *   3. Los flujos con botones (asistenteFlujos.js), para que también se
 *      encuentren escribiendo.
 *
 * Forma de una entrada:
 *   {
 *     id, tipo: 'guia' | 'faq' | 'problema' | 'flujo',
 *     roles: ['alumno' | 'admin' | 'publico'],   // quién puede verla
 *     pantallas: ['admin:courses', 'alumno:certificates', 'aula', 'acceso', 'publico'],
 *     titulo, claves: [frases como las escribiría la gente],
 *     texto?, pasos?: [..], casos?: [{ si, entonces }], nota?,
 *     ir?: { zona: 'admin' | 'alumno', tab, texto } | { ruta, texto },
 *     flujo?: clave de FLUJOS con más detalle,
 *     relacionados?: [ids],
 *   }
 *
 * Esta misma forma es la que recibiría una IA como "fuentes" (ver
 * asistenteMotor.js): si se conecta una, no hay que rehacer nada de aquí.
 *
 * Los nombres de botones y pestañas están copiados de la interfaz. Si cambias
 * el texto de un botón en la pantalla, cámbialo también aquí.
 * ------------------------------------------------------------------------ */

import { GUIA_ADMIN, GUIA_ALUMNO } from './guiaUso.js';
import { FLUJOS } from './asistenteFlujos.js';

const irAdmin = (tab, texto) => ({ zona: 'admin', tab, texto });
const irAlumno = (tab, texto) => ({ zona: 'alumno', tab, texto });

/* ── 1. Guía de uso ─────────────────────────────────────────────────────── */

// Lo que la guía no dice pero ayuda a encontrarla: frases de búsqueda y en qué
// pantallas sale.
const EXTRAS_GUIA = {
  'admin:crear-curso': { claves: ['crear curso', 'nuevo curso', 'publicar curso', 'hacer un curso', 'dar de alta un curso'], pantallas: ['admin:courses'] },
  'admin:lecciones': { claves: ['agregar leccion', 'subir video', 'subir pdf', 'ordenar lecciones', 'modulos', 'secciones', 'temario'], pantallas: ['admin:courses'] },
  'admin:certificados': { claves: ['plantilla del certificado', 'constancia', 'emitir certificado', 'diploma'], pantallas: ['admin:certificates', 'admin:courses'] },
  'admin:activar-cuentas': { claves: ['aprobar cuenta', 'activar cuenta', 'cuenta por activar', 'dar acceso', 'alumno nuevo', 'registro nuevo', 'autorizar alumno'], pantallas: ['admin:students', 'admin:dashboard'] },
  'admin:inscribir-a-mano': { claves: ['inscribir alumno', 'matricular', 'beca', 'dar curso gratis', 'agregar alumno a curso'], pantallas: ['admin:courses', 'admin:students'] },
  'admin:grupos': { claves: ['crear grupo', 'generacion', 'inscripcion masiva', 'pegar correos', 'lista de excel'], pantallas: ['admin:grupos'] },
  'admin:tareas': { claves: ['revisar tareas', 'calificar tarea', 'entregas', 'aprobar tarea', 'pedir correccion'], pantallas: ['admin:tareas'] },
  'admin:pendientes': { claves: ['que hago hoy', 'pendientes', 'que revisar', 'numeros rojos'], pantallas: ['admin:dashboard'] },
  'admin:vista-alumno': { claves: ['ver como alumno', 'vista de alumno', 'probar curso', 'ver aula'], pantallas: ['admin:courses', 'admin:dashboard'] },
  'admin:mensajes': { claves: ['mandar mensaje', 'escribir a alumnos', 'aviso', 'comunicado'], pantallas: ['admin:mensajes'] },
  'alumno:instalar-app': { claves: ['instalar app', 'aplicacion', 'pantalla de inicio', 'iphone', 'android', 'celular'], pantallas: ['alumno:settings'] },
  'alumno:entrar-curso': { claves: ['donde esta mi curso', 'empezar curso', 'continuar curso', 'siguiente leccion', 'como avanzo'], pantallas: ['alumno:dashboard', 'alumno:courses', 'aula'] },
  'alumno:examen': { claves: ['presentar examen', 'hacer examen', 'evaluacion', 'enviar examen', 'calificacion minima'], pantallas: ['aula', 'alumno:calificaciones'] },
  'alumno:clases-en-vivo': { claves: ['clase en vivo', 'zoom', 'sesion en vivo', 'unirse a la clase', 'registrarme a la sesion'], pantallas: ['alumno:calendario', 'alumno:dashboard', 'aula'] },
  'alumno:constancia': { claves: ['descargar certificado', 'bajar constancia', 'mi diploma', 'imprimir certificado'], pantallas: ['alumno:certificates'] },
  'alumno:mensajes': { claves: ['mensajes', 'avisos', 'escribir a hce', 'leer mensajes'], pantallas: ['alumno:mensajes'] },
  'alumno:tema': { claves: ['modo oscuro', 'tema oscuro', 'tema claro', 'cambiar colores', 'cambiar foto'], pantallas: ['alumno:settings', 'alumno:profile'] },
};

function entradasDeGuia(guia, rol) {
  const zona = rol;
  return guia.flatMap(({ grupo, guias }) => guias.map((g) => {
    const extra = EXTRAS_GUIA[`${rol}:${g.id}`] || {};
    return {
      id: `guia-${rol}-${g.id}`,
      tipo: 'guia',
      roles: [rol],
      pantallas: extra.pantallas || (g.ir ? [`${zona}:${g.ir.tab}`] : []),
      titulo: g.titulo,
      claves: [g.resumen, grupo, ...(extra.claves || [])],
      texto: g.resumen,
      pasos: g.pasos,
      nota: g.nota,
      ir: g.ir ? { zona, tab: g.ir.tab, texto: g.ir.texto } : undefined,
    };
  }));
}

/* ── 2. Alumno: problemas y preguntas frecuentes ───────────────────────── */

const ALUMNO = [
  {
    id: 'p-no-entro-curso',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['alumno:courses', 'alumno:dashboard', 'aula'],
    titulo: 'No puedo entrar a mi curso',
    claves: ['no puedo entrar a mi curso', 'no me deja entrar', 'curso cerrado', 'curso bloqueado', 'no abre el curso', 'curso en revision', 'lugar apartado', 'acceso vencido', 'se me acabo el acceso', 'no tengo acceso'],
    texto: 'Al abrir el curso aparece un aviso que dice por qué. Busca cuál es el tuyo:',
    casos: [
      { si: '"Tu acceso está en revisión"', entonces: 'Tu cuenta es nueva: un administrador la revisa, te asigna tu grupo y abre el curso. Te avisamos por correo; mientras, puedes tocar **Verificar de nuevo**.' },
      { si: '"Tu lugar está apartado"', entonces: 'El curso se toma con tu grupo y se abre el día que inicia (la fecha aparece en el aviso). Ese día te llega un correo.' },
      { si: '"Tu acceso a este curso terminó"', entonces: 'Se acabaron los días de acceso del curso. Toca **Escríbenos por WhatsApp** en ese aviso y lo revisamos contigo.' },
      { si: '"Solicitud enviada"', entonces: 'El curso pide aprobación. Te avisamos cuando la aprueben.' },
      { si: '"No pudimos verificar tu inscripción"', entonces: 'Revisa tu conexión y toca **Reintentar**.' },
      { si: 'Te pide comprar o inscribirte', entonces: 'Todavía no estás inscrito. Si ya pagaste, revisa "Pagué y no aparece mi curso".' },
    ],
    ir: irAlumno('courses', 'Ir a Mis cursos'),
    relacionados: ['p-pague-sin-curso'],
  },
  {
    id: 'p-pague-sin-curso',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['alumno:courses', 'alumno:dashboard', 'alumno:explore'],
    titulo: 'Pagué y no aparece mi curso',
    claves: ['pague y no aparece mi curso', 'ya pague', 'pague y no veo el curso', 'compre un curso y no sale', 'cobro sin curso', 'me cobraron', 'no se activo mi compra'],
    pasos: [
      'Si al volver del pago ves el aviso con **Reintentar confirmación**, tócalo: vuelve a consultar tu pago.',
      'Espera un par de minutos y abre **Mis cursos**: la inscripción se confirma sola aunque hayas cerrado la página del pago.',
      'Revisa que entraste con el **mismo correo** con el que pagaste.',
      'Si el curso aparece como **En revisión** o **Lugar apartado**, el pago sí entró: el curso se abre cuando activen tu cuenta o inicie tu grupo.',
    ],
    nota: 'Si a los 15 minutos sigue sin aparecer, escríbenos con la fecha y hora del pago. Nunca mandes los datos de tu tarjeta.',
    ir: irAlumno('courses', 'Ir a Mis cursos'),
  },
  {
    id: 'p-sin-certificado',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['alumno:certificates', 'aula'],
    titulo: 'No veo mi certificado',
    claves: ['no veo mi certificado', 'no aparece mi constancia', 'donde esta mi constancia', 'donde esta mi diploma', 'no me dieron certificado', 'termine y no tengo certificado'],
    pasos: [
      'Revisa que cumpliste la regla del curso: aprobar el **examen final** (normalmente con 80%) o completar las lecciones obligatorias.',
      'Si tu curso se termina por lecciones, en el aula toca **Obtener mi certificado**.',
      'Entra a **Certificados** del menú: arriba están los de cursos y abajo las **Constancias de webinars**.',
      'Las constancias de webinar se desbloquean en **Webinars**, dentro de la tarjeta de la sesión.',
    ],
    ir: irAlumno('certificates', 'Ir a Certificados'),
    relacionados: ['p-constancia-webinar'],
  },
  {
    id: 'p-correo-no-llega',
    tipo: 'problema',
    roles: ['alumno', 'publico'],
    pantallas: ['acceso', 'alumno:mensajes', 'alumno:webinars', 'alumno:profile'],
    titulo: 'No me llega el correo',
    claves: ['no me llega el correo', 'no recibi el correo', 'no llega el email', 'no me llego el enlace', 'correo de confirmacion', 'no llega el link de zoom'],
    pasos: [
      'Revisa las carpetas de **spam**, **no deseado** y **promociones**.',
      'Busca correos de **healthcareexp.com** (y de **Zoom** si es un webinar).',
      'Confirma que tu correo está bien escrito en **Mi perfil**.',
      'Si era para restablecer tu contraseña, espera unos minutos y vuelve a pedirlo desde **¿Olvidaste tu contraseña?**',
    ],
    nota: 'Los avisos importantes también aparecen en tu portal, en **Inicio** y en **Mensajes**.',
    ir: irAlumno('profile', 'Ir a Mi perfil'),
  },
  {
    id: 'p-video-no-carga',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['aula'],
    titulo: 'El video no carga',
    claves: ['el video no carga', 'no se ve el video', 'video trabado', 'no reproduce', 'pantalla negra', 'no puedo adelantar el video', 'youtube no carga'],
    pasos: [
      'Revisa tu conexión y recarga la página.',
      'Si ves un aviso de error, usa **Abrir directamente en YouTube** que aparece en el reproductor.',
      'Prueba en otro navegador o desactiva el bloqueador de anuncios para esta página.',
      'El reproductor no deja **adelantar** más allá de lo que ya viste: es para que el avance cuente. Puedes regresar cuando quieras.',
    ],
    flujo: 'estudiante_video_problemas',
  },
  {
    id: 'p-olvide-contrasena',
    tipo: 'problema',
    roles: ['alumno', 'publico'],
    pantallas: ['acceso'],
    titulo: 'Olvidé mi contraseña',
    claves: ['olvide mi contrasena', 'no recuerdo mi clave', 'cambiar contrasena', 'restablecer password', 'no puedo iniciar sesion', 'contrasena incorrecta'],
    pasos: [
      'En **Acceso alumnos** toca **¿Olvidaste tu contraseña?**',
      'Escribe tu correo y toca **Recuperar Contraseña**.',
      'Abre el enlace que te llega por correo y escribe tu contraseña nueva.',
    ],
    nota: 'Si no te llega, revisa spam y espera unos minutos antes de pedirlo otra vez.',
    ir: { ruta: '/login', texto: 'Ir a Acceso alumnos' },
  },
  {
    id: 'f-crear-cuenta',
    tipo: 'faq',
    roles: ['publico', 'alumno'],
    pantallas: ['acceso', 'publico'],
    titulo: 'Crear mi cuenta del portal',
    claves: ['crear cuenta', 'registrarme', 'hacer una cuenta', 'nuevo usuario', 'darme de alta'],
    pasos: [
      'Entra a **Acceso alumnos** y toca la pestaña **Registrarse**.',
      'Llena tus datos y toca **Crear Cuenta**.',
      'Ya puedes entrar, explorar e inscribirte. Tus cursos se abren cuando un administrador revisa tu cuenta.',
    ],
    ir: { ruta: '/login', texto: 'Ir a Acceso alumnos' },
  },
  {
    id: 'p-avance-no-cuenta',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['aula', 'alumno:courses'],
    titulo: 'Mi avance no se guarda',
    claves: ['mi avance no se guarda', 'no se marca la leccion', 'leccion no se completa', 'progreso en cero', 'no avanza el porcentaje'],
    pasos: [
      'Los **videos** cuentan como vistos al llegar al **90%**.',
      'Los **PDF, lecturas y páginas** se marcan con **Marcar como completada**.',
      'Las **tareas** cuentan al entregarlas; si te piden corregir, la lección vuelve a quedar pendiente.',
      'Recarga la página: el avance se guarda en tu cuenta, no en el dispositivo.',
    ],
  },
  {
    id: 'p-sin-intentos',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['aula', 'alumno:calificaciones'],
    titulo: 'Se me acabaron los intentos del examen',
    claves: ['se me acabaron los intentos', 'repetir examen', 'reprobe el examen', 'otra oportunidad examen', 'no puedo volver a hacer el examen'],
    texto: 'Cada examen tiene un número de intentos. Cuando se acaban, solo un administrador puede reiniciarlo.',
    pasos: [
      'Revisa tu calificación en **Mis calificaciones**.',
      'Escríbenos (botón de abajo) con el nombre del curso y del examen para que lo revisen.',
    ],
    ir: irAlumno('calificaciones', 'Ir a Mis calificaciones'),
  },
  {
    id: 'p-zoom-no-entro',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['alumno:calendario', 'aula'],
    titulo: 'No puedo entrar a la clase en vivo',
    claves: ['no puedo entrar a la clase en vivo', 'boton unirse no funciona', 'zoom no abre', 'no aparece el enlace de zoom', 'clase en vivo desactivada'],
    pasos: [
      'Primero tienes que tocar **Registrarme a la sesión** en la lección.',
      'El botón **Unirse a la clase** se activa **15 minutos antes**.',
      'Entra siempre con tu enlace (es personal): así se registra tu asistencia.',
      'Si la hora no cuadra, revisa tu **Zona horaria** en Configuración.',
    ],
    flujo: 'estudiante_sesiones',
    ir: irAlumno('calendario', 'Ir al Calendario'),
  },
  {
    id: 'p-constancia-webinar',
    tipo: 'problema',
    roles: ['alumno'],
    pantallas: ['alumno:webinars', 'alumno:certificates'],
    titulo: 'No puedo bajar mi constancia de webinar',
    claves: ['constancia de webinar', 'no puedo bajar la constancia', 'desbloquear constancia', 'codigo del ponente', 'asisti al webinar'],
    pasos: [
      'En **Webinars**, abre la tarjeta de la sesión y toca **Desbloquear constancia**.',
      'Si Zoom te reconoce, se descarga sola.',
      'Si te pide un **código**, es el que dijo el ponente al cerrar (pasa cuando entraste con otro correo).',
      'Si dice que aún no está disponible, el equipo la libera al terminar la sesión.',
    ],
    flujo: 'estudiante_webinar_constancia',
    ir: irAlumno('webinars', 'Ir a Webinars'),
  },
  {
    id: 'f-webinar-registro',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:webinars'],
    titulo: 'Registrarme a un webinar',
    claves: ['registrarme a un webinar', 'webinar gratis', 'asistir a webinar', 'enlace del webinar'],
    pasos: [
      'En **Webinars**, abre la tarjeta y toca **Registrar mi asistencia**.',
      'Zoom te manda tu enlace personal por correo; también queda en **Entrar al Zoom**.',
      'Al terminar, en la misma tarjeta se desbloquea tu constancia.',
    ],
    flujo: 'estudiante_webinars',
    ir: irAlumno('webinars', 'Ir a Webinars'),
  },
  {
    id: 'f-tarea-corregir',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['aula', 'alumno:calificaciones'],
    titulo: 'Me pidieron corregir una tarea',
    claves: ['corregir tarea', 'tarea por corregir', 'volver a entregar tarea', 'comentario del profesor', 'entregar tarea'],
    pasos: [
      'Abre el curso y entra a la lección de la tarea.',
      'Lee el comentario del profesor que aparece ahí mismo.',
      'Corrige y vuelve a entregar. Mientras tanto la lección queda pendiente.',
    ],
    flujo: 'estudiante_tareas',
  },
  {
    id: 'f-recertificar',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:certificates'],
    titulo: 'Mi certificado venció: recertificarme',
    claves: ['certificado vencido', 'vigencia del certificado', 'recertificarme', 'renovar certificado', 'certificado expiro'],
    pasos: [
      'En **Certificados**, la columna **Vigencia** dice hasta cuándo vale cada uno.',
      'Te avisamos por correo 30 días antes de que venza.',
      'Toca **Recertificarme** y vuelve a presentar el examen.',
    ],
    flujo: 'estudiante_certificados_vigencia',
    ir: irAlumno('certificates', 'Ir a Certificados'),
  },
  {
    id: 'f-zona-horaria',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:settings', 'alumno:calendario'],
    titulo: 'Las horas no coinciden con mi país',
    claves: ['zona horaria', 'hora equivocada', 'horario de mi pais', 'cambiar hora'],
    pasos: [
      'Entra a **Configuración**.',
      'En **Zona horaria** elige la tuya. Calendario, clases y webinars se muestran en esa hora.',
    ],
    ir: irAlumno('settings', 'Ir a Configuración'),
  },
  {
    id: 'f-calificaciones',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:calificaciones'],
    titulo: 'Ver mis calificaciones',
    claves: ['mis calificaciones', 'cuanto saque', 'resultado del examen', 'notas', 'puntaje'],
    pasos: [
      'Entra a **Mis calificaciones**: ahí están tus exámenes y tareas de cada curso.',
      'Dentro del aula también ves tu calificación al terminar cada examen.',
    ],
    ir: irAlumno('calificaciones', 'Ir a Mis calificaciones'),
  },
  {
    id: 'f-inscribirme-curso',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:explore'],
    titulo: 'Inscribirme a otro curso',
    claves: ['inscribirme a un curso', 'comprar curso', 'catalogo', 'cursos disponibles', 'tomar otro curso'],
    pasos: [
      'Entra a **Catálogo** y abre el curso que te interese.',
      'Si es gratis toca **Inscribirme gratis**; si es de pago, **Comprar curso** y paga con tarjeta.',
      'Si dice **Solicitar inscripción**, un administrador la aprueba y te avisamos.',
    ],
    ir: irAlumno('explore', 'Ir al Catálogo'),
  },
  {
    id: 'f-mis-datos',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:profile'],
    titulo: 'Cambiar mis datos o mi nombre',
    claves: ['cambiar mi nombre', 'mis datos', 'actualizar perfil', 'nombre en el certificado', 'cambiar telefono', 'foto de perfil'],
    pasos: [
      'Entra a **Mi perfil**.',
      'Corrige tus datos y guarda. Tu nombre es el que aparece en los certificados nuevos.',
    ],
    nota: 'Si un certificado ya emitido salió con un error en tu nombre, escríbenos.',
    ir: irAlumno('profile', 'Ir a Mi perfil'),
  },
  {
    id: 'f-factura',
    tipo: 'faq',
    roles: ['alumno', 'publico'],
    pantallas: ['alumno:profile', 'alumno:explore', 'publico'],
    titulo: 'Necesito factura',
    claves: ['factura', 'facturar', 'cfdi', 'rfc', 'comprobante fiscal'],
    pasos: [
      'Llena el formulario de **Facturación** con los datos de tu pago y tus datos fiscales.',
      'El equipo te manda la factura por correo.',
    ],
    ir: { ruta: '/facturacion', texto: 'Abrir Facturación' },
  },
  {
    id: 'f-logros',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['alumno:dashboard'],
    titulo: 'Puntos, niveles e insignias',
    claves: ['puntos', 'niveles', 'insignias', 'tabla de posiciones', 'ranking', 'ocultarme de la tabla', 'recompensas'],
    texto: 'En **Inicio** ves tus puntos, tu nivel y tus insignias. Ganas puntos al completar lecciones, aprobar exámenes, entregar tareas y asistir a sesiones.',
    flujo: 'estudiante_logros',
    ir: irAlumno('dashboard', 'Ir a Inicio'),
  },
  {
    id: 'f-biblioteca',
    tipo: 'faq',
    roles: ['alumno'],
    pantallas: ['aula'],
    titulo: 'Archivos del curso (Biblioteca)',
    claves: ['biblioteca', 'archivos del curso', 'descargar material', 'presentaciones', 'material de apoyo'],
    pasos: [
      'En el aula toca **Biblioteca**: ahí están los archivos del curso.',
      'Cada clase muestra abajo sus propios archivos.',
    ],
  },
  {
    id: 'f-portal-que-es',
    tipo: 'faq',
    roles: ['publico', 'alumno'],
    pantallas: ['acceso', 'publico'],
    titulo: '¿Qué es el Portal HCE?',
    claves: ['que es el portal', 'para que sirve el portal', 'portal academico', 'acceso alumnos'],
    texto: 'Es donde tomas tus cursos, presentas exámenes, te registras a webinars gratuitos y descargas tus certificados.',
    flujo: 'info_portal',
  },
];

/* ── 3. Administrador: problemas y preguntas frecuentes ─────────────────── */

const ADMIN = [
  {
    id: 'a-alumno-no-ve-curso',
    tipo: 'problema',
    roles: ['admin'],
    pantallas: ['admin:students', 'admin:grupos', 'admin:dashboard', 'admin:courses'],
    titulo: 'Un alumno no ve su curso',
    claves: ['alumno no ve su curso', 'alumno no puede entrar', 'no le aparece el curso', 'curso cerrado para el alumno', 'alumno sin acceso', 'pago y no tiene curso'],
    texto: 'Abre su expediente en **Alumnos** y revisa, en este orden:',
    casos: [
      { si: 'Su cuenta está en **Cuentas por activar**', entonces: 'Toca **Dar acceso**, elige su grupo y **Activar cuenta**.' },
      { si: 'El curso está en **Borrador** o inactivo', entonces: 'Actívalo desde **Cursos** (Revisión antes de publicar → **Activar curso**).' },
      { si: 'El curso es por grupo', entonces: 'En **Grupos**, revisa que el alumno esté en el grupo y la fecha **Inicia** del curso. Antes de esa fecha ve "Lugar apartado".' },
      { si: 'No aparece en **Cursos inscritos**', entonces: 'Inscríbelo con **Inscribir alumno**. Si dice que pagó, confirma que se registró con el mismo correo del pago.' },
      { si: 'Tiene una solicitud pendiente', entonces: 'Apruébala en la sección de solicitudes de **Alumnos**.' },
      { si: 'Su acceso venció', entonces: 'Revisa los **días de acceso** en las Reglas del curso.' },
      { si: 'La cuenta tiene el candado cerrado', entonces: 'Está bloqueada: reactívala con el mismo botón.' },
    ],
    ir: irAdmin('students', 'Ir a Alumnos'),
  },
  {
    id: 'a-fecha-inicio-grupo',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:grupos'],
    titulo: 'Poner fecha de inicio a un grupo',
    claves: ['fecha de inicio', 'cuando abre el curso', 'fecha del grupo', 'abrir curso en una fecha', 'programar apertura', 'inicia'],
    pasos: [
      'Entra a **Grupos** y toca **Abrir** en el grupo.',
      'En la lista de cursos del grupo, busca el campo **Inicia** y elige la fecha.',
      'Se guarda solo ("Fecha de inicio guardada"). Ese día el curso se abre para todo el grupo y les llega un correo.',
    ],
    nota: 'El campo **Inicia** aparece en cursos con acceso por grupo. Sin fecha, el curso se abre en cuanto lo asignas.',
    ir: irAdmin('grupos', 'Ir a Grupos'),
  },
  {
    id: 'a-activar-curso',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:courses'],
    titulo: 'Activar (publicar) un curso',
    claves: ['activar curso', 'publicar curso', 'curso en borrador', 'hacer visible el curso', 'inactivar curso'],
    pasos: [
      'En **Cursos**, abre el curso.',
      'Abre **Revisión antes de publicar**: te dice qué falta.',
      'Cuando los puntos esenciales tengan ✓, toca **Activar curso** y confirma.',
    ],
    nota: 'Para ocultarlo otra vez usa **Inactivar curso**. Los alumnos inscritos no pierden su avance.',
    ir: irAdmin('courses', 'Ir a Cursos'),
  },
  {
    id: 'a-clonar-curso',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:courses'],
    titulo: 'Copiar (clonar) un curso',
    claves: ['clonar curso', 'copiar curso', 'duplicar curso', 'nueva edicion del curso'],
    pasos: [
      'En la lista de **Cursos**, toca el botón de copiar del curso.',
      'Confirma **Clonar curso**: se crea una copia **inactiva** con lecciones, exámenes, reglas y archivos (sin alumnos).',
      'Revisa la copia y actívala cuando esté lista.',
    ],
    ir: irAdmin('courses', 'Ir a Cursos'),
  },
  {
    id: 'a-sesion-en-vivo',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:courses'],
    titulo: 'Agregar una sesión en vivo (Zoom)',
    claves: ['sesion en vivo', 'clase por zoom', 'agregar zoom', 'reunion de zoom', 'asistencia zoom'],
    pasos: [
      'En el curso, pestaña **Lecciones** → **Agregar lección** → **Sesión en vivo**.',
      'Pega el ID de la reunión de Zoom y toca **Traer fecha y duración de Zoom**.',
      'El alumno se registra desde la lección y su asistencia se confirma sola.',
    ],
    flujo: 'admin_evaluaciones',
    ir: irAdmin('courses', 'Ir a Cursos'),
  },
  {
    id: 'a-inscribir-expediente',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:students'],
    titulo: 'Dar un curso a un alumno desde su expediente',
    claves: ['inscribir desde expediente', 'dar acceso a un curso', 'quitar acceso', 'beca', 'cursos inscritos'],
    pasos: [
      'En **Alumnos**, abre el expediente del alumno.',
      'En **Cursos inscritos** ves sus cursos y de dónde viene su acceso.',
      'Elige un curso y toca **Inscribir alumno** (funciona aunque sea de pago). Con la papelera le quitas el acceso.',
    ],
    flujo: 'admin_matricula',
    ir: irAdmin('students', 'Ir a Alumnos'),
  },
  {
    id: 'a-reiniciar-examen',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:students', 'admin:metricas', 'admin:certificates'],
    titulo: 'Reiniciar el examen de un alumno',
    claves: ['reiniciar examen', 'dar otro intento', 'se le acabaron los intentos', 'repetir examen', 'borrar intentos'],
    pasos: [
      'En **Alumnos**, toca **Reporte completo** del alumno.',
      'En la actividad, toca el botón de **Reiniciar** (flecha circular).',
      'Confirma **Reiniciar actividad**: se borran sus intentos y la lección vuelve a quedar pendiente.',
    ],
    ir: irAdmin('students', 'Ir a Alumnos'),
  },
  {
    id: 'a-solicitudes-inscripcion',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:students'],
    titulo: 'Aprobar solicitudes de inscripción a un curso',
    claves: ['solicitud de inscripcion', 'aprobar solicitud', 'curso con solicitud', 'pidio entrar a un curso'],
    pasos: [
      'Entra a **Alumnos**: arriba aparecen las solicitudes pendientes.',
      'Apruébala para inscribir al alumno, o recházala.',
    ],
    nota: 'Un curso pide solicitud si lo activaste en sus **Reglas** (Disponibilidad).',
    ir: irAdmin('students', 'Ir a Alumnos'),
  },
  {
    id: 'a-tarea-corregir-admin',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:tareas'],
    titulo: 'Pedir que corrijan una tarea',
    claves: ['pedir correccion', 'tarea mal', 'regresar tarea', 'comentario para el alumno'],
    pasos: [
      'En **Tareas**, abre la entrega.',
      'Escribe el **Comentario para el alumno** (es obligatorio para pedir corrección).',
      'Márcala **Por corregir**: el alumno lo ve en su lección y puede volver a entregar.',
    ],
    flujo: 'admin_tareas',
    ir: irAdmin('tareas', 'Ir a Tareas'),
  },
  {
    id: 'a-certificado-no-sale',
    tipo: 'problema',
    roles: ['admin'],
    pantallas: ['admin:certificates', 'admin:courses'],
    titulo: 'A un alumno no le sale su certificado',
    claves: ['no le sale el certificado', 'alumno sin certificado', 'certificado no se genera', 'no se emitio la constancia'],
    pasos: [
      'Revisa en el curso la pestaña **Certificado**: debe tener plantilla.',
      'En **Reglas**, revisa cómo se termina el curso (examen final o lecciones).',
      'En **Alumnos → Reporte completo** ve si el alumno ya cumplió la regla.',
      'Si el curso termina por lecciones, el alumno debe tocar **Obtener mi certificado** en el aula.',
    ],
    ir: irAdmin('certificates', 'Ir a Certificados'),
  },
  {
    id: 'a-categorias',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:categories'],
    titulo: 'Crear categorías del catálogo',
    claves: ['categorias', 'crear categoria', 'ordenar catalogo', 'clasificar cursos'],
    pasos: [
      'Entra a **Categorías** y usa **Crear Categoría**.',
      'El catálogo agrupa los cursos según su categoría.',
    ],
    ir: irAdmin('categories', 'Ir a Categorías'),
  },
  {
    id: 'a-webinar-crear',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:webinars'],
    titulo: 'Crear o editar un webinar',
    claves: ['crear webinar', 'nuevo webinar', 'editar webinar', 'publicar webinar'],
    pasos: [
      'En **Webinars**, toca **Crear Webinar** (o el lápiz para editar).',
      'Llena título, fecha, imagen y enlace. **Activo** lo muestra en la web.',
      'Para registro, asistencia y constancia, marca **Registro por el portal**.',
    ],
    flujo: 'admin_webinars',
    ir: irAdmin('webinars', 'Ir a Webinars'),
  },
  {
    id: 'a-webinar-zoom',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:webinars'],
    titulo: 'Conectar un webinar con Zoom',
    claves: ['zoom webinar', 'requerir registro', 'id del seminario', 'minutos minimos'],
    texto: 'En Zoom deja activado **Requerir registro**; luego pega la URL del seminario en el paso 1 del formulario.',
    flujo: 'admin_webinar_zoom',
    ir: irAdmin('webinars', 'Ir a Webinars'),
  },
  {
    id: 'a-webinar-constancia',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:webinars'],
    titulo: 'Liberar la constancia de un webinar',
    claves: ['liberar constancia', 'plantilla de constancia', 'codigo del webinar', 'quien puede descargar'],
    texto: 'En el paso 3 del formulario eliges quién puede descargarla: **Nadie todavía**, **Solo quien asistió** o **Todo el que se registró**.',
    flujo: 'admin_webinar_constancia',
    ir: irAdmin('webinars', 'Ir a Webinars'),
  },
  {
    id: 'a-webinar-asistencia',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:webinars'],
    titulo: 'Ver la asistencia de un webinar',
    claves: ['asistencia webinar', 'registrados', 'sincronizar con zoom', 'exportar asistentes'],
    texto: 'En la fila del webinar, el icono de **personas** abre el listado. Ahí están **Sincronizar con Zoom** y **Exportar**.',
    flujo: 'admin_webinar_asistencia',
    ir: irAdmin('webinars', 'Ir a Webinars'),
  },
  {
    id: 'a-divisiones',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:divisiones', 'admin:grupos'],
    titulo: 'Divisiones (otras asociaciones)',
    claves: ['divisiones', 'otra asociacion', 'separar alumnos por institucion', 'filtrar por division'],
    texto: 'Cada división tiene sus alumnos, sus cursos y sus grupos. En Informes y en Alumnos puedes filtrar por división.',
    flujo: 'admin_grupos',
    ir: irAdmin('divisiones', 'Ir a Divisiones'),
  },
  {
    id: 'a-crear-admin',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:admins'],
    titulo: 'Agregar a otro administrador',
    claves: ['crear administrador', 'nuevo admin', 'dar permisos', 'colaborador'],
    pasos: [
      'Entra a **Administradores**.',
      'Llena **Crear Nuevo Administrador** con una contraseña segura.',
    ],
    nota: 'Comparte la contraseña por un medio seguro y pide que la cambie al entrar.',
    ir: irAdmin('admins', 'Ir a Administradores'),
  },
  {
    id: 'a-comunicados',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:mensajes'],
    titulo: 'Publicar un comunicado',
    claves: ['comunicado', 'aviso en el portal', 'anuncio', 'banner'],
    pasos: [
      'En **Mensajes**, toca **Nuevo comunicado**.',
      'Elige **Dónde se muestra**: **Interno** (portal del alumno) o **Externo** (página de inicio).',
      'Pon las fechas **Desde** y **Hasta** y guarda.',
    ],
    ir: irAdmin('mensajes', 'Ir a Mensajes'),
  },
  {
    id: 'a-notificaciones',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:notificaciones', 'admin:mensajes'],
    titulo: 'Correos automáticos (notificaciones)',
    claves: ['notificaciones', 'correos automaticos', 'recordatorio', 'plantilla de correo', 'apagar correos'],
    pasos: [
      'Entra a **Notificaciones** y toca **Añadir notificación**.',
      'Elige el **Evento** (inscripción, examen aprobado, tarea revisada…) y escribe el texto. Puedes usar {nombre} o {curso}.',
      'Márcala **Activa** y guarda.',
    ],
    flujo: 'admin_comunicacion',
    ir: irAdmin('notificaciones', 'Ir a Notificaciones'),
  },
  {
    id: 'a-correo-no-llega-admin',
    tipo: 'problema',
    roles: ['admin'],
    pantallas: ['admin:notificaciones'],
    titulo: 'A un alumno no le llegó un correo',
    claves: ['no le llego el correo', 'correo no enviado', 'fallo el correo', 'historial de correos'],
    pasos: [
      'En **Notificaciones**, abre el **Historial**: ahí ves si el envío salió o **Falló**.',
      'Revisa que la notificación de ese evento esté **Activa**.',
      'Pídele al alumno que revise spam y que su correo esté bien en su perfil.',
    ],
    ir: irAdmin('notificaciones', 'Ir a Notificaciones'),
  },
  {
    id: 'a-metricas',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:metricas'],
    titulo: 'Ver el avance de un curso',
    claves: ['metricas', 'avance de alumnos', 'matriz de unidades', 'analisis del examen', 'quien no ha terminado'],
    texto: 'En **Métricas** eliges un curso: visitas, tiempo, abandono del video, la **matriz de unidades** (exportable a Excel) y el análisis de exámenes.',
    flujo: 'admin_metricas',
    ir: irAdmin('metricas', 'Ir a Métricas'),
  },
  {
    id: 'a-reportes',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:reports'],
    titulo: 'Reportes en Excel y PDF',
    claves: ['reporte', 'excel', 'pdf ejecutivo', 'kpis', 'descargar reporte'],
    texto: 'En **Reportes** descargas el listado de alumnos en CSV (Excel) o un reporte ejecutivo en PDF.',
    flujo: 'admin_reportes',
    ir: irAdmin('reports', 'Ir a Reportes'),
  },
  {
    id: 'a-exportar-alumnos',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:students', 'admin:reports'],
    titulo: 'Exportar la lista de alumnos',
    claves: ['exportar alumnos', 'lista de alumnos', 'csv', 'base de datos de alumnos'],
    pasos: [
      'En **Alumnos**, filtra si hace falta (especialidad, división, país).',
      'Toca **Exportar CSV** y ábrelo en Excel.',
    ],
    ir: irAdmin('students', 'Ir a Alumnos'),
  },
  {
    id: 'a-pagos',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:payments'],
    titulo: 'Ver pagos y formularios',
    claves: ['pagos', 'stripe', 'ingresos', 'transacciones', 'formularios recibidos', 'formspree'],
    texto: 'En **Pagos y Formularios** ves las transacciones de Stripe, los ingresos y los formularios recibidos (con la opción de reenviarlos a Formspree).',
    ir: irAdmin('payments', 'Ir a Pagos y Formularios'),
  },
  {
    id: 'a-pago-sin-curso-admin',
    tipo: 'problema',
    roles: ['admin'],
    pantallas: ['admin:payments', 'admin:students'],
    titulo: 'Un alumno pagó y no tiene su curso',
    claves: ['pago y no tiene curso', 'pago sin inscripcion', 'cobro sin curso', 'stripe sin curso'],
    pasos: [
      'Busca el pago en **Pagos y Formularios** y anota el correo con que se pagó.',
      'En **Alumnos**, busca ese correo: si es otra cuenta, el curso quedó en esa.',
      'Si el curso aparece pero cerrado, revisa si la cuenta está por activar o si es un curso por grupo.',
      'Si no aparece, inscríbelo a mano desde su expediente con **Inscribir alumno**.',
    ],
    relacionados: ['a-alumno-no-ve-curso'],
    ir: irAdmin('payments', 'Ir a Pagos y Formularios'),
  },
  {
    id: 'a-facturacion',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:facturacion'],
    titulo: 'Solicitudes de factura',
    claves: ['factura', 'facturacion', 'solicitud de factura', 'cfdi'],
    texto: 'En **Facturación** llegan las solicitudes que los alumnos mandan desde el formulario de facturación, con sus datos fiscales y el pago.',
    ir: irAdmin('facturacion', 'Ir a Facturación'),
  },
  {
    id: 'a-alumni-aceptar',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:alumni'],
    titulo: 'Alumni Pass: aceptar una solicitud',
    claves: ['alumni pass', 'aceptar solicitud', 'aprobar alumni', 'step 1 refresher', 'solicitud alumni'],
    pasos: [
      'Entra a **Alumni Pass** (en Ventas) y deja el filtro **Por revisar**.',
      'Revisa sus datos y toca **Ver diploma**.',
      'Toca **Aceptar y enviar enlace de pago** y confirma: le llega su enlace por correo.',
    ],
    nota: 'Si sale que no se pudo enviar el correo, usa **Reenviar enlace** o **Copiar enlace**.',
    ir: irAdmin('alumni', 'Ir a Alumni Pass'),
  },
  {
    id: 'a-reenviar-enlace-pago',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:alumni', 'admin:payments'],
    titulo: 'Reenviar el enlace de pago',
    claves: ['reenviar enlace de pago', 'no le llego el enlace de pago', 'copiar enlace', 'link de pago', 'mandar enlace por whatsapp'],
    pasos: [
      'En **Alumni Pass**, filtro **Aceptados sin pagar**.',
      'En la solicitud toca **Reenviar enlace** y confirma.',
      'O toca **Copiar enlace** para mandarlo tú por WhatsApp.',
    ],
    ir: irAdmin('alumni', 'Ir a Alumni Pass'),
  },
  {
    id: 'a-alumni-rechazar',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:alumni'],
    titulo: 'Alumni Pass: rechazar una solicitud',
    claves: ['rechazar solicitud', 'rechazar alumni', 'motivo del rechazo', 'regresar a revision'],
    pasos: [
      'En la solicitud toca **Rechazar**.',
      'Escribe el **Motivo del rechazo** (se incluye en el correo) y toca **Confirmar rechazo**.',
    ],
    nota: 'Si fue un error, en **Rechazados** está **Aceptar de todos modos**. A una aceptada sin pagar puedes **Regresar a revisión**.',
    ir: irAdmin('alumni', 'Ir a Alumni Pass'),
  },
  {
    id: 'a-alumni-pendientes',
    tipo: 'problema',
    roles: ['admin'],
    pantallas: ['admin:alumni'],
    titulo: 'Alumni Pass: avisos o registros pendientes',
    claves: ['registros pendientes', 'avisos pendientes', 'formspree pendiente', 'brevo pendiente', 'pase no enviado'],
    pasos: [
      'Si una solicitud dice **Pendiente de registrar**, toca **Reintentar registros pendientes**.',
      'Si un pago dice **Envío pendiente** del pase, toca **Reintentar avisos pendientes**.',
      'Si Formspree dice **Recepción sin confirmar**, revisa su buzón antes de reintentar para no duplicar.',
    ],
    ir: irAdmin('alumni', 'Ir a Alumni Pass'),
  },
  {
    id: 'a-bienvenida',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:settings'],
    titulo: 'Cambiar el mensaje de bienvenida',
    claves: ['mensaje de bienvenida', 'texto de inicio del alumno', 'saludo del portal'],
    pasos: [
      'Entra a **Configuración**.',
      'En **Mensaje de Bienvenida (Estudiantes)** escribe el texto y guarda. Lo ven los alumnos en su Inicio.',
    ],
    ir: irAdmin('settings', 'Ir a Configuración'),
  },
  {
    id: 'a-apariencia-admin',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:settings'],
    titulo: 'Tema claro u oscuro del panel',
    claves: ['modo oscuro', 'tema oscuro', 'tema claro', 'apariencia'],
    pasos: ['En **Configuración**, sección **Apariencia**, elige el tema del panel.'],
    ir: irAdmin('settings', 'Ir a Configuración'),
  },
  {
    id: 'a-gamificacion',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:settings'],
    titulo: 'Puntos, niveles y recompensas',
    claves: ['gamificacion', 'puntos', 'niveles', 'insignias', 'recompensas', 'descuento por nivel'],
    pasos: ['En **Configuración**, sección **Gamificación**, ajustas puntos, niveles, insignias y recompensas de los alumnos.'],
    ir: irAdmin('settings', 'Ir a Configuración'),
  },
  {
    id: 'a-errores',
    tipo: 'faq',
    roles: ['admin'],
    pantallas: ['admin:errores'],
    titulo: 'Ver errores reportados',
    claves: ['errores', 'fallas del portal', 'algo no funciona', 'reporte de errores'],
    texto: 'En **Sistema → Errores** ves los errores que el portal ha detectado, para saber qué revisar.',
    ir: irAdmin('errores', 'Ir a Errores'),
  },
];

/* ── 4. Flujos con botones que también se encuentran escribiendo ─────────── */

// Las claves que ya tienen una entrada propia (por `flujo`) no se repiten.
const INDICE_FLUJOS = {
  que_es_hce: { roles: ['publico'], titulo: '¿Qué es HCE?', claves: ['que es hce', 'quienes son', 'healthcare training experience'] },
  fundadora: { roles: ['publico'], titulo: '¿Quién fundó HCE?', claves: ['fundadora', 'quien fundo', 'jenifer trejo'] },
  programas: { roles: ['publico', 'alumno'], titulo: 'Programas de HCE', claves: ['programas', 'cursos que ofrecen', 'oferta educativa'] },
  disponibles: { roles: ['publico'], titulo: 'Qué está abierto ahora', claves: ['inscripciones abiertas', 'que hay disponible', 'proximas fechas'] },
  paris: { roles: ['publico'], titulo: 'Paris International Diploma in ECMO', claves: ['diploma paris', 'ecmo paris', 'pitie salpetriere', 'diplomado ecmo'] },
  step1: { roles: ['publico'], titulo: 'Step 1 teórico (por separado)', claves: ['step 1', 'solo teorico', 'step uno'] },
  temario: { roles: ['publico'], titulo: 'Temario del diploma', claves: ['temario', 'temas', 'modulos del diploma'] },
  instructores: { roles: ['publico'], titulo: 'Quiénes imparten el diploma', claves: ['instructores', 'profesores', 'alain combes', 'matthieu schmidt'] },
  inscripcion_paris: { roles: ['publico'], titulo: 'Inscribirme al diploma', claves: ['inscribirme al diploma', 'inscripcion paris', 'como me inscribo', 'formas de pago'] },
  ecmo_sim: { roles: ['publico'], titulo: 'ECMO Sim (simulador)', claves: ['simulador', 'ecmo sim', 'precio simulador'] },
  nursing: { roles: ['publico'], titulo: 'ECMO Nursing Care', claves: ['nursing', 'enfermeria', 'curso de enfermeria'] },
  webinars: { roles: ['publico'], titulo: 'Webinars gratuitos', claves: ['webinars', 'webinar gratis', 'sesiones gratuitas', 'constancia de asistencia'] },
  contacto: { roles: ['publico', 'alumno', 'admin'], titulo: 'Hablar con un asesor', claves: ['asesor', 'contacto', 'whatsapp', 'hablar con alguien', 'telefono', 'soporte'] },
  estudiante_clases: { roles: ['alumno'], titulo: 'Cómo funcionan los cursos', claves: ['como funcionan los cursos', 'tipos de leccion', 'como se termina un curso'] },
  estudiante_certificados: { roles: ['alumno'], titulo: 'Cómo obtengo certificados', claves: ['como obtengo certificado', 'aprobar con 80'] },
  estudiante_evaluaciones: { roles: ['alumno'], titulo: 'Exámenes y encuestas', claves: ['encuestas', 'examenes', 'intentos'] },
  estudiante_herramientas: { roles: ['alumno'], titulo: 'Calendario, mensajes y archivos', claves: ['calendario', 'herramientas'] },
  estudiante_revision: { roles: ['alumno'], titulo: 'Mi curso está en revisión', claves: ['curso en revision', 'cuenta en revision'] },
  estudiante_duracion: { roles: ['alumno'], titulo: '¿Cuánto dura un curso?', claves: ['cuanto dura', 'duracion del curso', 'horas'] },
  admin_gestion_cursos: { roles: ['admin'], titulo: 'Crear un curso y sus lecciones', claves: ['gestion de cursos', 'pestanas del curso'] },
  admin_lecciones: { roles: ['admin'], titulo: '¿Qué tipo de lección uso?', claves: ['tipo de leccion', 'video no listado', 'lectura con formato'] },
  admin_reglas: { roles: ['admin'], titulo: 'Reglas del curso', claves: ['reglas del curso', 'cupo', 'prerrequisito', 'dias de acceso', 'finalizacion'] },
  admin_cuentas: { roles: ['admin'], titulo: 'Cuentas por activar', claves: ['cuentas por activar', 'rechazar cuenta'] },
  admin_bloquear: { roles: ['admin'], titulo: 'Bloquear a un alumno', claves: ['bloquear alumno', 'suspender cuenta', 'candado'] },
  admin_seguridad: { roles: ['admin'], titulo: 'Seguridad y accesos', claves: ['seguridad', 'contrasenas seguras'] },
};

function entradasDeFlujos(yaCubiertas) {
  return Object.entries(INDICE_FLUJOS)
    .filter(([clave]) => FLUJOS[clave] && !yaCubiertas.has(clave))
    .map(([clave, meta]) => ({
      id: `flujo-${clave}`,
      tipo: 'flujo',
      roles: meta.roles,
      pantallas: meta.roles.includes('publico') ? ['publico'] : [],
      titulo: meta.titulo,
      claves: meta.claves,
      // El texto completo del flujo también se busca.
      cuerpo: FLUJOS[clave].text,
      flujo: clave,
    }));
}

/* ── Base completa ─────────────────────────────────────────────────────── */

const PROPIAS = [...ALUMNO, ...ADMIN];
const conFlujo = new Set(PROPIAS.map((e) => e.flujo).filter(Boolean));

export const BASE_CONOCIMIENTO = [
  ...entradasDeGuia(GUIA_ADMIN, 'admin'),
  ...entradasDeGuia(GUIA_ALUMNO, 'alumno'),
  ...PROPIAS,
  ...entradasDeFlujos(conFlujo),
];

const POR_ID = new Map(BASE_CONOCIMIENTO.map((e) => [e.id, e]));

export function entradaPorId(id) {
  return POR_ID.get(id) || null;
}

/** Entradas que puede ver alguien con estos roles. */
export function entradasPara(roles) {
  return BASE_CONOCIMIENTO.filter((e) => e.roles.some((r) => roles.includes(r)));
}

// Para el script de verificación.
export const _INDICE_FLUJOS = INDICE_FLUJOS;
