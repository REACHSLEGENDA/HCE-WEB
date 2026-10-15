/* ---------------------------------------------------------------------------
 * ¿En qué pantalla está la persona? (contrato C5)
 *
 * El asistente lo deduce de la ruta y de la pestaña que cada panel guarda en
 * localStorage (`adminActiveTab` en /admin, `studentActiveTab` en /dashboard).
 * No depende de Dashboard ni de AdminDashboard: si mañana cambia una pestaña,
 * basta con actualizar los nombres de aquí.
 *
 * `acciones` son ids de la base de conocimiento (asistenteConocimiento.js):
 * lo que más se hace en esa pantalla, en el orden en que se muestra.
 * ------------------------------------------------------------------------ */

export const CLAVE_TAB = { admin: 'adminActiveTab', alumno: 'studentActiveTab' };
export const RUTA_PANEL = { admin: '/admin', alumno: '/dashboard' };

export const PANTALLAS_ADMIN = {
  dashboard: { nombre: 'Dashboard', acciones: ['guia-admin-pendientes', 'guia-admin-activar-cuentas', 'a-alumno-no-ve-curso', 'guia-admin-tareas'] },
  courses: { nombre: 'Cursos', acciones: ['guia-admin-crear-curso', 'a-activar-curso', 'guia-admin-lecciones', 'a-sesion-en-vivo', 'a-clonar-curso'] },
  grupos: { nombre: 'Grupos', acciones: ['a-fecha-inicio-grupo', 'guia-admin-grupos', 'a-alumno-no-ve-curso', 'a-divisiones'] },
  tareas: { nombre: 'Tareas', acciones: ['guia-admin-tareas', 'a-tarea-corregir-admin'] },
  certificates: { nombre: 'Certificados', acciones: ['guia-admin-certificados', 'a-certificado-no-sale', 'a-reiniciar-examen'] },
  categories: { nombre: 'Categorías', acciones: ['a-categorias'] },
  webinars: { nombre: 'Webinars', acciones: ['a-webinar-crear', 'a-webinar-zoom', 'a-webinar-constancia', 'a-webinar-asistencia'] },
  students: { nombre: 'Alumnos', acciones: ['guia-admin-activar-cuentas', 'a-alumno-no-ve-curso', 'a-inscribir-expediente', 'a-reiniciar-examen', 'a-solicitudes-inscripcion'] },
  divisiones: { nombre: 'Divisiones', acciones: ['a-divisiones', 'guia-admin-grupos'] },
  admins: { nombre: 'Administradores', acciones: ['a-crear-admin'] },
  mensajes: { nombre: 'Mensajes', acciones: ['guia-admin-mensajes', 'a-comunicados', 'a-notificaciones'] },
  notificaciones: { nombre: 'Notificaciones', acciones: ['a-notificaciones', 'a-correo-no-llega-admin'] },
  metricas: { nombre: 'Métricas', acciones: ['a-metricas', 'a-reiniciar-examen'] },
  reports: { nombre: 'Reportes', acciones: ['a-reportes', 'a-exportar-alumnos'] },
  payments: { nombre: 'Pagos y Formularios', acciones: ['a-pagos', 'a-pago-sin-curso-admin', 'a-reenviar-enlace-pago'] },
  facturacion: { nombre: 'Facturación', acciones: ['a-facturacion'] },
  alumni: { nombre: 'Alumni Pass', acciones: ['a-alumni-aceptar', 'a-reenviar-enlace-pago', 'a-alumni-rechazar', 'a-alumni-pendientes'] },
  settings: { nombre: 'Configuración', acciones: ['a-bienvenida', 'a-apariencia-admin', 'a-gamificacion'] },
  errores: { nombre: 'Errores', acciones: ['a-errores'] },
  ayuda: { nombre: 'Ayuda', acciones: ['guia-admin-pendientes', 'guia-admin-crear-curso', 'guia-admin-activar-cuentas', 'guia-admin-vista-alumno'] },
};

export const PANTALLAS_ALUMNO = {
  dashboard: { nombre: 'Inicio', acciones: ['guia-alumno-entrar-curso', 'p-no-entro-curso', 'p-pague-sin-curso', 'guia-alumno-clases-en-vivo'] },
  courses: { nombre: 'Mis cursos', acciones: ['guia-alumno-entrar-curso', 'p-no-entro-curso', 'p-pague-sin-curso', 'p-avance-no-cuenta'] },
  calendario: { nombre: 'Calendario', acciones: ['guia-alumno-clases-en-vivo', 'p-zoom-no-entro', 'f-zona-horaria'] },
  calificaciones: { nombre: 'Mis calificaciones', acciones: ['f-calificaciones', 'p-sin-intentos', 'f-tarea-corregir'] },
  certificates: { nombre: 'Certificados', acciones: ['guia-alumno-constancia', 'p-sin-certificado', 'f-recertificar', 'p-constancia-webinar'] },
  explore: { nombre: 'Catálogo', acciones: ['f-inscribirme-curso', 'p-pague-sin-curso', 'f-factura'] },
  webinars: { nombre: 'Webinars', acciones: ['f-webinar-registro', 'p-constancia-webinar', 'p-correo-no-llega'] },
  mensajes: { nombre: 'Mensajes', acciones: ['guia-alumno-mensajes', 'p-correo-no-llega'] },
  profile: { nombre: 'Mi perfil', acciones: ['f-mis-datos', 'f-factura', 'p-correo-no-llega'] },
  settings: { nombre: 'Configuración', acciones: ['guia-alumno-tema', 'f-zona-horaria', 'guia-alumno-instalar-app'] },
  ayuda: { nombre: 'Ayuda', acciones: ['guia-alumno-entrar-curso', 'guia-alumno-instalar-app', 'p-no-entro-curso', 'p-sin-certificado'] },
};

export const PANTALLA_AULA = {
  nombre: 'el aula del curso',
  acciones: ['guia-alumno-entrar-curso', 'p-video-no-carga', 'guia-alumno-examen', 'p-avance-no-cuenta', 'p-no-entro-curso'],
};

export const PANTALLA_ACCESO = {
  nombre: 'Acceso alumnos',
  acciones: ['f-crear-cuenta', 'p-olvide-contrasena', 'p-correo-no-llega', 'f-portal-que-es'],
};

const leerLocal = (clave) => {
  try { return localStorage.getItem(clave); } catch { return null; }
};

/**
 * Pantalla actual, a partir de la ruta y la pestaña guardada.
 * @param {{ pathname: string, rol?: string|null, tabAdmin?: string|null, tabAlumno?: string|null }} datos
 * @returns {{ zona: 'admin'|'alumno'|'aula'|'acceso'|'publico', tab: string|null, clave: string,
 *             nombre: string, acciones: string[], roles: string[], esAdmin: boolean }}
 */
export function detectarPantalla({ pathname = '/', rol = null, tabAdmin, tabAlumno } = {}) {
  const esAdmin = rol === 'admin';
  const ruta = String(pathname || '/');

  if (/^\/admin(\/|$)/.test(ruta)) {
    const guardada = tabAdmin === undefined ? leerLocal(CLAVE_TAB.admin) : tabAdmin;
    const tab = PANTALLAS_ADMIN[guardada] ? guardada : 'dashboard';
    return { zona: 'admin', tab, clave: `admin:${tab}`, ...PANTALLAS_ADMIN[tab], roles: ['admin'], esAdmin: true };
  }
  if (/^\/dashboard(\/|$)/.test(ruta)) {
    const guardada = tabAlumno === undefined ? leerLocal(CLAVE_TAB.alumno) : tabAlumno;
    const tab = PANTALLAS_ALUMNO[guardada] ? guardada : 'dashboard';
    // Un administrador en "Vista de alumno" ve la ayuda del alumno, pero
    // también puede buscar temas del panel.
    return { zona: 'alumno', tab, clave: `alumno:${tab}`, ...PANTALLAS_ALUMNO[tab], roles: esAdmin ? ['alumno', 'admin'] : ['alumno'], esAdmin };
  }
  if (/^\/classroom(\/|$)/.test(ruta)) {
    return { zona: 'aula', tab: null, clave: 'aula', ...PANTALLA_AULA, roles: esAdmin ? ['alumno', 'admin'] : ['alumno'], esAdmin };
  }
  if (/^\/(login|restablecer-contrasena|confirmacion)(\/|$)/.test(ruta)) {
    return { zona: 'acceso', tab: null, clave: 'acceso', ...PANTALLA_ACCESO, roles: ['publico', 'alumno'], esAdmin };
  }
  return { zona: 'publico', tab: null, clave: 'publico', nombre: 'el sitio de HCE', acciones: [], roles: rol ? ['publico', 'alumno'] : ['publico'], esAdmin };
}

/** Pestañas válidas de cada panel (para "Llévame ahí"). */
export function pestanaValida(zona, tab) {
  if (zona === 'admin') return Boolean(PANTALLAS_ADMIN[tab]);
  if (zona === 'alumno') return Boolean(PANTALLAS_ALUMNO[tab]);
  return false;
}

/** Nombre visible de una pestaña ("Cursos", "Mis cursos"…). */
export function nombrePestana(zona, tab) {
  return (zona === 'admin' ? PANTALLAS_ADMIN : PANTALLAS_ALUMNO)[tab]?.nombre || tab;
}

/** Texto corto para el mensaje a soporte. Sin nombre, correo ni ids. */
export function describirPantalla(pantalla) {
  if (!pantalla) return 'Sitio de HCE';
  const quien = pantalla.zona === 'admin' ? 'panel de administración' : pantalla.zona === 'publico' || pantalla.zona === 'acceso' ? 'sitio' : 'portal del alumno';
  return `${pantalla.nombre.replace(/^el /, '')} (${quien})`;
}
