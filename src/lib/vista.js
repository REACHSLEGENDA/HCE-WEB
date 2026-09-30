// "Vista de alumno" para administradores: ver el portal y el aula tal como los
// ve un alumno (sin botones de administración y con los candados puestos).
// Se recuerda durante la pestaña; al cerrarla vuelve a la vista de admin.

const CLAVE = 'hce_vista_alumno';

export function leerVistaAlumno() {
  try {
    return sessionStorage.getItem(CLAVE) === '1';
  } catch {
    return false;
  }
}

export function fijarVistaAlumno(activa) {
  try {
    if (activa) sessionStorage.setItem(CLAVE, '1');
    else sessionStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento (ventana privada estricta): solo dura esta página.
  }
}
