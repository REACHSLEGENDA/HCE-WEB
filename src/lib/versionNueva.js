// Versión nueva publicada mientras alguien tenía la página abierta.
//
// Cada publicación en Netlify cambia los nombres de los archivos de la página
// (ChatBot-B0jTYSZO.css, InstallApp-BLhZKI0p.js…) y borra los anteriores. Quien
// tenía el portal abierto desde antes, al cambiar de sección, pide un archivo
// que ya no existe: "Unable to preload CSS" o "Failed to fetch dynamically
// imported module". La solución es recargar una vez para tomar la versión
// nueva. Si vuelve a fallar en menos de un minuto, no se recarga otra vez (no
// hay ciclo) y el error sí se reporta, porque ya sería otra cosa.

const CLAVE = 'hce-recarga-version';
const ESPERA_MS = 60 * 1000;

const PATRON = /Unable to preload CSS|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError|Loading (CSS )?chunk [\w-]+ failed/i;

export const esVersionVieja = (texto) => PATRON.test(String(texto || ''));

// Una página vieja suele pedir varios archivos que ya no existen a la vez
// (la sección y el asistente, por ejemplo): el primero dispara la recarga y
// los demás llegan mientras la página se descarga. Esos no se reportan.
let recargando = false;

/** Si la página ya se está recargando (los errores de ahí en adelante sobran). */
export const estaRecargando = () => recargando;

/** Recarga la página una vez. Devuelve true si va a recargar. */
export function recargarPorVersionNueva() {
  if (typeof window === 'undefined') return false;
  if (recargando) return true;
  try {
    const ultima = Number(window.sessionStorage.getItem(CLAVE) || 0);
    if (Date.now() - ultima < ESPERA_MS) return false;
    window.sessionStorage.setItem(CLAVE, String(Date.now()));
  } catch {
    // Sin almacenamiento no hay forma de evitar un ciclo: no se recarga.
    return false;
  }
  recargando = true;
  window.location.reload();
  return true;
}

/** Vite avisa con este evento cuando no pudo precargar un archivo. */
export function instalarRecargaPorVersion() {
  if (typeof window === 'undefined') return;
  window.addEventListener('vite:preloadError', (evento) => {
    if (recargarPorVersionNueva()) evento.preventDefault();
  });
}

/**
 * Carga una página diferida y, si falla (red que se cortó un momento), lo
 * intenta otra vez antes de rendirse. Si el archivo ya no existe (versión
 * nueva publicada), el error sigue su camino y la página se recarga una vez.
 */
export function conReintento(cargar, { intentos = 2, esperaMs = 800 } = {}) {
  return cargar().then((modulo) => {
    if (modulo) return modulo;
    // Cuando el archivo no carga y ya se pidió recargar, Vite entrega
    // `undefined` en vez de un error, y React fallaba con "e._result.default".
    // Si la página se está recargando, se espera a la recarga sin pintar nada.
    if (recargando) return new Promise(() => {});
    throw new Error('Failed to fetch dynamically imported module');
  }).catch((err) => {
    if (intentos <= 0) throw err;
    return new Promise((ok) => setTimeout(ok, esperaMs))
      .then(() => conReintento(cargar, { intentos: intentos - 1, esperaMs: esperaMs * 2 }));
  });
}
