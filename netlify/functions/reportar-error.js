// Recibe los errores que ocurren en el navegador de los usuarios del portal
// (src/lib/reporteErrores.js), los guarda agrupados por huella en
// `errores_cliente` (supabase/errores.sql) y avisa por correo a los
// administradores la primera vez que aparece una huella, y luego como máximo
// una vez por hora por huella.
//
// Es un endpoint público (el error puede ocurrir sin sesión), así que:
//  - limita el tamaño del cuerpo y recorta cada campo;
//  - limita la tasa por IP (en memoria y, con el SQL, en la base);
//  - nunca confía en el usuario que diga el cuerpo: lo saca del token;
//  - calcula la huella aquí, no la acepta del navegador;
//  - todo lo que va al correo se escapa.
// Antes de correr supabase/errores.sql solo se deja en el registro de Netlify
// y se manda el correo con un límite en memoria.

import { createHash, createHmac } from 'node:crypto';
import { admin, isConfigured as supabaseListo, usuarioDesdeToken, esEsquemaFaltante, json } from './_supabase.js';
import { enviarCorreo, isConfigured as brevoListo } from './_brevo.js';
import { plantillaHce } from './_notificaciones.js';

const MAX_CUERPO = 16 * 1024;
const LIMITE_IP_MEMORIA = 20; // reportes por IP cada 10 minutos (por instancia)
const LIMITE_IP_BASE = 30; // reportes por IP cada 10 minutos (en la base)
const VENTANA_MS = 10 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
const PORTAL = 'https://healthcareexp.com';

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Recorta y quita datos que no deben guardarse (correos, tokens, números largos).
export function limpiarTexto(valor, max) {
  if (valor == null) return null;
  const texto = String(valor)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, '[token]')
    .replace(/\b(sk|pk|rk)_(live|test)_[\w]+/g, '[llave]')
    .replace(/([?&](?:token|access_token|refresh_token|code|key|apikey|password)=)[^&\s)]+/gi, '$1[oculto]')
    .replace(/\b\d{12,}\b/g, '[num]')
    .trim();
  return texto ? texto.slice(0, max) : null;
}

// /classroom/12 -> /classroom/:id (el mismo error en cursos distintos se agrupa).
export function normalizarRuta(ruta) {
  const limpia = String(ruta || '/').split(/[?#]/)[0].slice(0, 300) || '/';
  return limpia
    .split('/')
    .map((parte) => (/^\d+$/.test(parte) || /^[0-9a-f-]{20,}$/i.test(parte) ? ':id' : parte))
    .join('/');
}

// Primera línea del stack que apunta a código (formato de Chrome "at ..." o de
// Safari/Firefox "fn@url:l:c"), sin el dominio.
export function primeraLineaStack(stack) {
  const linea = String(stack || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^at\s/.test(l) || /@\S+:\d+/.test(l)) || '';
  return linea.replace(/https?:\/\/[^/\s)]+/g, '').replace(/\?[^:\s)]*/g, '');
}

export function huellaDe({ mensaje, stack, ruta }) {
  const base = [
    String(mensaje || '').replace(/\d+/g, '#').slice(0, 300),
    primeraLineaStack(stack),
    normalizarRuta(ruta),
  ].join('|');
  return createHash('sha256').update(base).digest('hex').slice(0, 40);
}

// "Chrome 141 · Android" a partir del user agent.
export function navegadorDe(ua = '') {
  const u = String(ua);
  const nav = (/Edg\/(\d+)/.exec(u) && `Edge ${/Edg\/(\d+)/.exec(u)[1]}`)
    || (/OPR\/(\d+)/.exec(u) && `Opera ${/OPR\/(\d+)/.exec(u)[1]}`)
    || (/SamsungBrowser\/(\d+)/.exec(u) && `Samsung ${/SamsungBrowser\/(\d+)/.exec(u)[1]}`)
    || (/(?:CriOS|Chrome)\/(\d+)/.exec(u) && `Chrome ${/(?:CriOS|Chrome)\/(\d+)/.exec(u)[1]}`)
    || (/(?:FxiOS|Firefox)\/(\d+)/.exec(u) && `Firefox ${/(?:FxiOS|Firefox)\/(\d+)/.exec(u)[1]}`)
    || (/Version\/(\d+)[\d.]* .*Safari/.exec(u) && `Safari ${/Version\/(\d+)/.exec(u)[1]}`)
    || 'Otro navegador';
  const so = /iPhone|iPad|iPod/.test(u) ? 'iOS'
    : /Android/.test(u) ? 'Android'
      : /Windows/.test(u) ? 'Windows'
        : /Mac OS X/.test(u) ? 'macOS'
          : /Linux/.test(u) ? 'Linux' : '';
  return so ? `${nav} · ${so}` : nav;
}

// ---- Límite en memoria (primera barrera; la base tiene la definitiva) ----
const porIp = new Map();
function excedeIp(ipHash, ahora = Date.now()) {
  const actual = porIp.get(ipHash);
  if (!actual || ahora - actual.desde > VENTANA_MS) {
    porIp.set(ipHash, { desde: ahora, conteo: 1 });
    if (porIp.size > 5000) porIp.clear();
    return false;
  }
  actual.conteo += 1;
  return actual.conteo > LIMITE_IP_MEMORIA;
}

// Sin la tabla, el correo se limita por huella en memoria y con un tope global.
const correosSinTabla = new Map();
function puedeAvisarSinTabla(huella, ahora = Date.now()) {
  const recientes = [...correosSinTabla.values()].filter((t) => ahora - t < HORA_MS).length;
  const ultimo = correosSinTabla.get(huella);
  if ((ultimo && ahora - ultimo < HORA_MS) || recientes >= 5) return false;
  correosSinTabla.set(huella, ahora);
  return true;
}

function ipDe(headers = {}) {
  return headers['x-nf-client-connection-ip']
    || headers['client-ip']
    || String(headers['x-forwarded-for'] || '').split(',')[0].trim()
    || 'desconocida';
}

const hashIp = (ip) => createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'hce-errores')
  .update(ip).digest('hex').slice(0, 32);

async function correosAdmins(db) {
  const extra = String(process.env.AVISO_ERRORES_PARA || process.env.AVISO_REGISTROS_PARA || '')
    .split(',').map((c) => c.trim()).filter(Boolean);
  let correos = [];
  if (db) {
    try {
      const { data, error } = await db.from('profiles').select('email').eq('rol', 'admin').eq('activo', true);
      if (error) console.error('reportar-error: no se pudo leer la lista de admins:', error.message);
      correos = (data || []).map((x) => x.email).filter(Boolean);
    } catch (error) {
      console.error('reportar-error: no se pudo leer la lista de admins:', error.message);
    }
  }
  return [...new Set([...correos, ...extra])];
}

async function avisarAdmins(db, reporte, { veces = 1, reabierto = false } = {}) {
  if (!brevoListo()) return false;
  const para = await correosAdmins(db);
  if (!para.length) return false;
  const titulo = reabierto ? 'Volvió a aparecer un error que estaba resuelto' : veces > 1 ? `Un error del portal sigue ocurriendo (${veces} veces)` : 'Nuevo error en el portal';
  const fila = (k, v) => (v ? `<tr><td style="padding:4px 10px 4px 0;color:#64748b;font-size:13px;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:4px 0;color:#0f172a;font-size:13px;overflow-wrap:anywhere;">${escapar(v)}</td></tr>` : '');
  const contenido = `
    <p style="margin:0 0 14px;font-size:16px;color:#1e293b;"><strong>${escapar(titulo)}</strong></p>
    <p style="margin:0 0 16px;line-height:1.6;color:#475569;">Alguien vio una falla en el portal. El mensaje técnico es:</p>
    <pre style="margin:0 0 16px;padding:12px 14px;background:#0f172a;color:#f8fafc;border-radius:10px;font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;">${escapar(reporte.mensaje)}</pre>
    <table style="margin:0 0 16px;border-collapse:collapse;">
      ${fila('Pantalla', reporte.ruta)}
      ${fila('Tipo', { render: 'Al dibujar la pantalla', error: 'Error de la página', promesa: 'Operación sin terminar' }[reporte.origen] || reporte.origen)}
      ${fila('Veces', String(veces))}
      ${fila('Navegador', reporte.navegador)}
      ${fila('Versión', reporte.version)}
      ${fila('Con sesión', reporte.userId ? 'Sí' : 'No')}
    </table>
    ${reporte.stack ? `<p style="margin:0 0 6px;color:#64748b;font-size:13px;">Dónde ocurrió:</p><pre style="margin:0 0 16px;padding:10px 12px;background:#f1f5f9;color:#334155;border-radius:10px;font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;">${escapar(String(reporte.stack).split('\n').slice(0, 6).join('\n'))}</pre>` : ''}
    <p style="margin:0;line-height:1.6;color:#475569;font-size:13px;">Mientras no se resuelva, este aviso se repite como máximo una vez por hora. Puedes marcarlo como resuelto en el panel: Sistema → Errores.</p>`;
  try {
    await enviarCorreo({
      para,
      asunto: `[Portal HCE] ${titulo}: ${String(reporte.mensaje).slice(0, 80)}`,
      html: plantillaHce(contenido, { boton: 'Ver errores en el panel', enlace: `${PORTAL}/admin` }),
      claveIdempotencia: `error-${reporte.huella}-${Math.floor(Date.now() / HORA_MS)}`,
    });
    return true;
  } catch (err) {
    console.error('reportar-error: no se pudo enviar el aviso:', err.message);
    return false;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método no permitido' });

  const cuerpoBruto = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (cuerpoBruto.length > MAX_CUERPO) return json(413, { error: 'Reporte demasiado grande' });

  let datos;
  try {
    datos = JSON.parse(cuerpoBruto || '{}');
  } catch {
    return json(400, { error: 'JSON inválido' });
  }
  if (!datos || typeof datos !== 'object' || typeof datos.mensaje !== 'string' || !datos.mensaje.trim()) {
    return json(400, { error: 'Falta el mensaje' });
  }

  const ipHash = hashIp(ipDe(event.headers || {}));
  if (excedeIp(ipHash)) return json(429, { error: 'Demasiados reportes' });

  const userAgent = limpiarTexto(event.headers?.['user-agent'] || datos.userAgent, 300);
  const reporte = {
    mensaje: limpiarTexto(datos.mensaje, 500),
    stack: limpiarTexto(datos.stack, 4000),
    componente: limpiarTexto(datos.componente, 2000),
    ruta: normalizarRuta(datos.ruta),
    origen: ['render', 'error', 'promesa'].includes(datos.origen) ? datos.origen : 'error',
    version: limpiarTexto(datos.version, 80),
    navegador: navegadorDe(userAgent || ''),
    userAgent,
    userId: null,
  };
  reporte.huella = huellaDe(reporte);

  if (!supabaseListo()) {
    console.error('[error del portal]', reporte.ruta, reporte.mensaje);
    return json(202, { ok: true, guardado: false });
  }

  const db = admin();
  try {
    reporte.userId = (await usuarioDesdeToken(event.headers || {}))?.id || null;
  } catch {
    reporte.userId = null;
  }

  let resultado, error;
  try {
    ({ data: resultado, error } = await db.rpc('registrar_error_cliente', {
    p_huella: reporte.huella,
    p_mensaje: reporte.mensaje,
    p_stack: reporte.stack,
    p_componente: reporte.componente,
    p_ruta: reporte.ruta,
    p_origen: reporte.origen,
    p_version: reporte.version,
    p_navegador: reporte.navegador,
    p_user_agent: reporte.userAgent,
    p_user_id: reporte.userId,
    p_ip_hash: ipHash,
    p_limite: LIMITE_IP_BASE,
    }));
  } catch (err) {
    error = err;
  }

  if (error) {
    // Sin supabase/errores.sql: queda en el registro de Netlify y se avisa con
    // el límite en memoria.
    console.error('[error del portal]', reporte.ruta, reporte.mensaje, reporte.stack ? `\n${reporte.stack.split('\n').slice(0, 4).join('\n')}` : '');
    if (!esEsquemaFaltante(error)) console.error('reportar-error: no se pudo guardar:', error.message);
    if (puedeAvisarSinTabla(reporte.huella)) await avisarAdmins(db, reporte);
    return json(202, { ok: true, guardado: false });
  }

  if (resultado?.limitado) return json(429, { error: 'Demasiados reportes' });

  if (resultado?.enviar_correo) {
    await avisarAdmins(db, reporte, { veces: resultado.veces || 1, reabierto: !!resultado.reabierto });
  }
  return json(200, { ok: true, guardado: true, nuevo: !!resultado?.nuevo });
};
