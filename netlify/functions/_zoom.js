// Cliente compartido de Zoom (Server-to-Server OAuth).
//
// La app "HCE Web" vive en la cuenta de Zoom de HCE y tiene solo los permisos
// necesarios para dos cosas: dar de alta asistentes a un seminario y leer el
// reporte de participantes cuando termina. No pide grabaciones ni chat.

const ZOOM_API = 'https://api.zoom.us/v2';

export const isConfigured = () =>
  Boolean(
    process.env.ZOOM_ACCOUNT_ID &&
    process.env.ZOOM_CLIENT_ID &&
    process.env.ZOOM_CLIENT_SECRET
  );

// El token dura una hora. Se guarda en memoria del contenedor para no pedir uno
// nuevo en cada invocacion; si el contenedor se recicla simplemente se renueva.
let cachedToken = null;
let cachedUntil = 0;

async function getToken() {
  const ahora = Date.now();
  if (cachedToken && ahora < cachedUntil) return cachedToken;

  const basic = Buffer.from(
    `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(process.env.ZOOM_ACCOUNT_ID)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  const texto = await res.text();
  if (!res.ok) {
    throw new Error(`Zoom OAuth ${res.status}: ${texto}`);
  }

  const data = JSON.parse(texto);
  cachedToken = data.access_token;
  // Se renueva un minuto antes de que expire para no pegarle a la frontera.
  cachedUntil = ahora + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function zoomFetch(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  const res = await fetch(`${ZOOM_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const texto = res.status === 204 ? '' : await res.text();
  const data = texto ? JSON.parse(texto) : null;

  if (!res.ok) {
    const err = new Error(`Zoom ${res.status} ${path}: ${data?.message || texto}`);
    err.status = res.status;
    err.zoomCode = data?.code;
    throw err;
  }

  return data;
}

// Da de alta a la persona en el seminario y devuelve su enlace personal.
// `tipo` distingue un seminario web (webinars) de una reunion normal (meetings),
// porque Zoom los expone en rutas distintas aunque el cuerpo sea el mismo.
export async function agregarRegistrante(zoomId, tipo, { email, nombre, apellido }) {
  const recurso = tipo === 'meeting' ? 'meetings' : 'webinars';
  const data = await zoomFetch(`/${recurso}/${zoomId}/registrants`, {
    method: 'POST',
    body: {
      email,
      first_name: nombre || email.split('@')[0],
      last_name: apellido || '.',
    },
  });

  return {
    registrantId: data?.registrant_id ? String(data.registrant_id) : null,
    joinUrl: data?.join_url || null,
  };
}

// Reporte de participantes ya terminado el seminario. Zoom pagina, asi que se
// recorren todas las paginas antes de devolver.
export async function obtenerParticipantes(zoomId, tipo) {
  const recurso = tipo === 'meeting' ? 'meetings' : 'webinars';
  const participantes = [];
  let nextPageToken = '';

  do {
    const query = new URLSearchParams({ page_size: '300' });
    if (nextPageToken) query.set('next_page_token', nextPageToken);

    const data = await zoomFetch(`/report/${recurso}/${zoomId}/participants?${query}`);
    participantes.push(...(data?.participants || []));
    nextPageToken = data?.next_page_token || '';
  } while (nextPageToken);

  return participantes;
}

// Zoom reporta una fila por cada vez que alguien entro: quien se cae y vuelve a
// entrar aparece varias veces. Se suman los intervalos reales por correo en
// lugar de confiar en el campo `duration`, cuya unidad cambia entre endpoints.
export function minutosPorCorreo(participantes) {
  const acumulado = new Map();

  for (const p of participantes) {
    const email = (p.user_email || '').trim().toLowerCase();
    if (!email) continue;

    const entrada = p.join_time ? new Date(p.join_time).getTime() : NaN;
    const salida = p.leave_time ? new Date(p.leave_time).getTime() : NaN;

    let minutos = 0;
    if (Number.isFinite(entrada) && Number.isFinite(salida) && salida > entrada) {
      minutos = (salida - entrada) / 60000;
    } else if (Number.isFinite(p.duration)) {
      // Respaldo por si Zoom no mando las marcas de tiempo.
      minutos = p.duration > 600 ? p.duration / 60 : p.duration;
    }

    acumulado.set(email, (acumulado.get(email) || 0) + minutos);
  }

  const resultado = new Map();
  for (const [email, minutos] of acumulado) {
    resultado.set(email, Math.round(minutos));
  }
  return resultado;
}
