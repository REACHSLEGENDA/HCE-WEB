// Aviso automático de errores del navegador.
//
// Captura los errores al dibujar una pantalla (ErrorBoundary y la raíz de
// React), `window.onerror` y las promesas rechazadas sin atender, filtra el
// ruido (extensiones, ResizeObserver, scripts de terceros, cancelaciones,
// fallas de red) y los manda a /.netlify/functions/reportar-error, que los
// guarda agrupados y avisa a los administradores por correo.
//
// Sin datos sensibles: solo la ruta (sin ?query ni #hash, donde pueden ir
// tokens), mensaje y stack recortados, versión y navegador. El usuario lo
// identifica el servidor a partir del token de la sesión.
// Límite: 8 reportes por sesión del navegador y cada error distinto una sola vez.

import { supabase } from './supabase';
import { esVersionVieja, estaRecargando, recargarPorVersionNueva } from './versionNueva';

const ENDPOINT = '/.netlify/functions/reportar-error';
const MAX_POR_SESION = 8;
const CLAVE_SESION = 'hce-errores-reportados';

const enviadosEnPagina = new Set();
let instalado = false;

// Solo en producción (o si se pide explícitamente con VITE_REPORTAR_ERRORES=1).
const activo = () => {
  try {
    return import.meta.env.PROD || import.meta.env.VITE_REPORTAR_ERRORES === '1';
  } catch {
    return false;
  }
};

// Versión de la app: la variable del build si existe; si no, el nombre con
// hash del archivo principal (en producción este módulo vive en index-XXXX.js).
export function versionApp() {
  const env = import.meta.env || {};
  if (env.VITE_COMMIT_REF) return String(env.VITE_COMMIT_REF).slice(0, 12);
  try {
    return new URL(import.meta.url).pathname.split('/').pop().slice(0, 60);
  } catch {
    return '';
  }
}

const RUIDO = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /AbortError|The (user|operation) (aborted|was aborted)|signal is aborted|aborted a request/i,
  /^(TypeError: )?(cancelled|cancelado|Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?)$/i,
  /Network request failed|net::ERR_|ERR_INTERNET_DISCONNECTED|ERR_NETWORK_CHANGED/i,
  /chrome-extension:|moz-extension:|safari-(web-)?extension:|webkit-masked-url:/i,
  // Navegadores dentro de apps y traductores automáticos.
  /_AutofillCallbackHandler|__gCrWeb|instantSearchSDKJSBridge|zaloJSV2|WeixinJSBridge|ucbrowser|Java exception was raised/i,
  /Non-Error promise rejection captured/i,
  // Revisores de enlaces de Outlook/Bing (abren los enlaces de los correos en un
  // navegador automático): no son personas ni errores del sitio.
  /Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/i,
  /play\(\) (request was interrupted|failed because the user)/i,
  /The play\(\) request was interrupted|NotAllowedError: play\(\)/i,
];

/** Si un error es ruido que no vale la pena reportar. */
export function esRuido({ mensaje = '', stack = '', archivo = '' } = {}) {
  const texto = String(mensaje).trim();
  if (!texto) return true;
  if (RUIDO.some((re) => re.test(texto) || (stack && re.test(String(stack))))) return true;
  // Error lanzado por un script de otro dominio (analítica, Stripe, YouTube…).
  if (archivo && typeof window !== 'undefined') {
    try {
      const origen = new URL(archivo, window.location.href).origin;
      if (origen !== window.location.origin) return true;
    } catch { /* archivo raro: se evalúa por el resto */ }
  }
  // Script que mete el navegador o una app (navegadores dentro de Facebook,
  // Instagram, traductores…): su recorrido no pasa por ningún archivo del sitio.
  // Los errores del portal siempre pasan por /assets/ (o /src/ en desarrollo).
  const marcos = String(stack || '').split('\n').filter((l) => /^\s*at\s|@/.test(l));
  const delSitio = (l) => /\/assets\/|\/src\/|\/tests?\/|file:/.test(l)
    || (typeof window !== 'undefined' && l.includes(window.location.origin));
  if (marcos.length && !marcos.some(delSitio)) return true;
  // Sin conexión, cualquier falla es de red.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return false;
}

// Quita correos, tokens y parámetros de URLs; recorta.
export function limpiar(texto, max) {
  if (texto == null) return '';
  return String(texto)
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[correo]')
    .replace(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}/g, '[token]')
    .replace(/(https?:\/\/[^\s?#)]+)[?#][^\s):]*/g, '$1')
    .slice(0, max);
}

const recortarStack = (stack, lineas = 15) => limpiar(String(stack || '').split('\n').slice(0, lineas).join('\n'), 4000);

function leerContador() {
  try {
    return JSON.parse(sessionStorage.getItem(CLAVE_SESION) || '{"total":0,"claves":[]}');
  } catch {
    return { total: 0, claves: [] };
  }
}

function guardarContador(c) {
  try { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
}

async function tokenSesion() {
  try {
    const espera = new Promise((resolve) => { setTimeout(() => resolve(null), 1500); });
    const sesion = supabase.auth.getSession().then(({ data }) => data?.session?.access_token || null, () => null);
    return await Promise.race([sesion, espera]);
  } catch {
    return null;
  }
}

/**
 * Reporta un error. `origen`: 'render' | 'error' | 'promesa'.
 * Devuelve el cuerpo enviado (o null si se filtró), útil en pruebas.
 */
export function reportarError(error, { origen = 'error', componente = '', archivo = '', forzar = false } = {}) {
  try {
    if (!forzar && !activo()) return null;
    // La página ya se está recargando por una versión nueva: lo que falle
    // mientras se descarga no es un error del portal.
    if (estaRecargando()) return null;
    if (error == null) return null;
    const mensaje = limpiar(
      error instanceof Error ? `${error.name && error.name !== 'Error' ? `${error.name}: ` : ''}${error.message}` : typeof error === 'string' ? error : (() => { try { return JSON.stringify(error); } catch { return String(error); } })(),
      500,
    );
    const stack = error instanceof Error ? recortarStack(error.stack) : '';
    // Archivo que no carga (versión vieja abierta, señal que se cae, robots con
    // navegadores viejos y sin almacenamiento): se intenta recargar y nunca se
    // reporta. No es un error del portal: Vite publica todos los archivos de una
    // versión a la vez, así que un archivo faltante siempre es de una anterior.
    if (esVersionVieja(mensaje)) { recargarPorVersionNueva(); return null; }
    if (esRuido({ mensaje, stack, archivo })) return null;

    const ruta = typeof window !== 'undefined' ? window.location.pathname : '';
    const clave = `${mensaje}|${stack.split('\n').find((l) => /^\s*at\s|@/.test(l)) || ''}|${ruta}`;
    if (enviadosEnPagina.has(clave)) return null;
    const contador = leerContador();
    if (contador.total >= MAX_POR_SESION || contador.claves.includes(clave)) return null;
    enviadosEnPagina.add(clave);
    guardarContador({ total: contador.total + 1, claves: [...contador.claves, clave].slice(-MAX_POR_SESION) });

    const cuerpo = {
      mensaje,
      stack,
      componente: limpiar(String(componente || '').split('\n').filter((l) => l.trim()).slice(0, 12).join('\n'), 2000),
      ruta,
      origen,
      version: versionApp(),
    };

    void (async () => {
      const token = await tokenSesion();
      await fetch(ENDPOINT, {
        method: 'POST',
        keepalive: true,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(cuerpo),
      });
    })().catch(() => { /* el reporte nunca debe causar otro error */ });

    return cuerpo;
  } catch {
    return null;
  }
}

/** Instala los escuchas globales una sola vez (se llama desde main.jsx). */
export function instalarReporteErrores() {
  if (instalado || typeof window === 'undefined') return;
  instalado = true;

  window.addEventListener('error', (evento) => {
    // Errores de carga de recursos (<img>, <script>) no traen `error`.
    if (!evento.error && !evento.message) return;
    reportarError(evento.error || evento.message, { origen: 'error', archivo: evento.filename || '' });
  });

  window.addEventListener('unhandledrejection', (evento) => {
    const motivo = evento.reason;
    if (motivo == null) return;
    reportarError(motivo, { origen: 'promesa' });
  });
}
