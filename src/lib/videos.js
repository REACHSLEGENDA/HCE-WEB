// Videos de las lecciones: YouTube, Vimeo, un archivo de video directo o
// cualquier otra plataforma que dé un enlace para insertar.
//
// Con YouTube, Vimeo y archivos directos se mide cuánto se ve (la lección
// cuenta como vista al 90%). Del resto no se puede leer el avance desde otra
// página, así que el alumno la marca como completada, igual que un PDF.

import { getYouTubeVideoId } from './youtube';

const EXTENSIONES_VIDEO = /\.(mp4|webm|ogv|ogg|mov|m4v)$/i;

/** Si pegaron el código completo (<iframe src="…">), se queda con el enlace. */
export function extraerEnlace(valor) {
  const texto = String(valor || '').trim();
  const src = texto.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  return (src ? src[1] : texto).replace(/&amp;/g, '&').trim();
}

function urlSegura(valor) {
  try {
    const url = new URL(valor);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function vimeoDe(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'vimeo.com' && host !== 'player.vimeo.com') return null;
  const partes = url.pathname.split('/').filter(Boolean);
  const i = partes.findIndex((p) => /^\d+$/.test(p));
  if (i === -1) return null;
  // Los videos "no listados" llevan un código extra: vimeo.com/123/abc o ?h=abc
  const hash = url.searchParams.get('h') || (partes[i + 1] && /^[a-f0-9]+$/i.test(partes[i + 1]) ? partes[i + 1] : null);
  return { id: partes[i], hash };
}

// Enlaces de "compartir" que tienen su versión para insertar.
function enlaceInsertable(url) {
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'drive.google.com') {
    const archivo = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (archivo) return `https://drive.google.com/file/d/${archivo[1]}/preview`;
  }
  if (host === 'loom.com') {
    const loom = url.pathname.match(/\/share\/([a-z0-9]+)/i);
    if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  }
  return url.href;
}

/**
 * Qué es un enlace de video y cómo reproducirlo. `null` si no sirve.
 *   { proveedor: 'youtube', id }
 *   { proveedor: 'vimeo', id, hash }
 *   { proveedor: 'archivo', url }   mp4/webm directo
 *   { proveedor: 'otro', url }      se inserta tal cual, sin medir avance
 */
export function detectarVideo(valor) {
  const enlace = extraerEnlace(valor);
  if (!enlace) return null;

  const youtube = getYouTubeVideoId(enlace);
  if (youtube) return { proveedor: 'youtube', id: youtube };

  const url = urlSegura(enlace);
  if (!url) return null;

  const vimeo = vimeoDe(url);
  if (vimeo) return { proveedor: 'vimeo', ...vimeo };

  if (EXTENSIONES_VIDEO.test(url.pathname)) return { proveedor: 'archivo', url: url.href };

  return { proveedor: 'otro', url: enlaceInsertable(url) };
}

/** Si el avance de este video se puede medir. */
export const midePorcentaje = (video) => !!video && video.proveedor !== 'otro';

export const NOMBRE_PROVEEDOR = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  archivo: 'archivo de video',
  otro: 'otra plataforma',
};

/** Una página para insertar (tipo "Página web"). `null` si no es https. */
export function detectarPagina(valor) {
  const url = urlSegura(extraerEnlace(valor));
  return url ? enlaceInsertable(url) : null;
}

// ---- Reproductores con la misma forma que el de YouTube ------------------------
//
// El aula y el registro de visitas leen el reproductor con getCurrentTime,
// getDuration, getPlayerState (1 = reproduciendo), seekTo y destroy. Estos
// adaptadores dan esa misma forma para Vimeo y para un <video> normal.

const REPRODUCIENDO = 1;
const EN_PAUSA = 2;

export async function crearReproductorVimeo(elemento, { id, hash }, { alReproducir, alDetener, alFallar }) {
  const { default: Player } = await import('@vimeo/player');
  const player = new Player(elemento, {
    url: `https://vimeo.com/${id}${hash ? `/${hash}` : ''}`,
    dnt: true,
  });

  const estado = { tiempo: 0, duracion: 0, reproduciendo: false };
  player.getDuration().then((d) => { estado.duracion = d || 0; }).catch(() => {});
  player.on('timeupdate', (d) => {
    estado.tiempo = d.seconds || 0;
    estado.duracion = d.duration || estado.duracion;
  });
  // El evento timeupdate se frena con la pestaña en segundo plano; mientras
  // se reproduce, además se le pregunta la posición cada segundo.
  const leerPosicion = () => {
    player.getCurrentTime().then((t) => { estado.tiempo = t || estado.tiempo; }).catch(() => {});
    if (!estado.duracion) player.getDuration().then((d) => { estado.duracion = d || 0; }).catch(() => {});
  };
  const consulta = setInterval(() => { if (estado.reproduciendo) leerPosicion(); }, 1000);
  player.on('play', () => { estado.reproduciendo = true; alReproducir?.(); });
  player.on('pause', () => { estado.reproduciendo = false; alDetener?.(); });
  player.on('ended', () => { estado.reproduciendo = false; alDetener?.(); });
  player.on('error', (e) => console.warn('Vimeo:', e?.message || e));
  player.ready().catch((e) => alFallar?.(
    e?.name === 'PrivacyError'
      ? 'El video de Vimeo no permite insertarse en otras páginas. En Vimeo, en Privacidad, permite insertarlo en healthcareexp.com.'
      : 'No se pudo cargar el video de Vimeo. Revisa que el enlace sea correcto.'
  ));

  return {
    getCurrentTime: () => estado.tiempo,
    getDuration: () => estado.duracion,
    getPlayerState: () => (estado.reproduciendo ? REPRODUCIENDO : EN_PAUSA),
    seekTo: (segundos) => {
      estado.tiempo = segundos;
      player.setCurrentTime(segundos).catch(() => {});
    },
    destroy: () => {
      clearInterval(consulta);
      player.destroy().catch(() => {});
    },
  };
}

export function adaptarVideoHtml(video) {
  return {
    getCurrentTime: () => video.currentTime || 0,
    getDuration: () => (Number.isFinite(video.duration) ? video.duration : 0),
    getPlayerState: () => (!video.paused && !video.ended ? REPRODUCIENDO : EN_PAUSA),
    seekTo: (segundos) => { video.currentTime = segundos; },
    destroy: () => {},
  };
}
