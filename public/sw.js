/* =============================================================================
 * Portal HCE - Service Worker
 * -----------------------------------------------------------------------------
 * Alcance deliberadamente limitado al PORTAL. Se registra dos veces desde
 * src/App.jsx, con scope "/dashboard" y con scope "/classroom", de modo que
 * NINGUNA pagina del sitio publico de marketing (/, /paris-diploma-ecmo,
 * /quienes-somos, /inscripciones-*, ...) queda bajo control de un SW.
 *
 * Estrategia (conservadora):
 *   - Navegaciones del portal .............. network-first + fallback al shell
 *   - Assets versionados del build ......... cache-first  (/assets/<n>-<hash>.js|css|woff2)
 *   - Iconos y manifest del portal ......... cache-first
 *   - TODO lo demas ........................ red directa, sin tocar
 *
 * NUNCA se cachea:
 *   - /.netlify/functions/*  (funciones de Netlify)
 *   - cualquier peticion cross-origin (Supabase, Stripe, GTM, Google Fonts)
 *   - metodos != GET
 *   - peticiones con Authorization / respuestas de API (JSON)
 * ========================================================================== */

const VERSION = 'hce-portal-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const CURRENT_CACHES = [SHELL_CACHE, ASSET_CACHE];

/* Clave unica bajo la que guardamos el app-shell (index.html de la SPA). */
const SHELL_KEY = '/dashboard';

/* Rutas que pertenecen al portal. */
const PORTAL_ROUTE = /^\/(dashboard|classroom)(\/|$|\?)/;

/* Assets emitidos por Vite con hash de contenido -> inmutables. */
const VERSIONED_ASSET = /^\/assets\/[^/]+-[A-Za-z0-9_-]{8,}\.(?:js|css|woff2?|ttf)$/;

/* Recursos estaticos propios del portal (estables, sin hash). */
const PORTAL_STATIC = /^\/(icons\/[^/]+\.png|manifest\.json|favicon\.ico)$/;

/* Prefijos que SIEMPRE van a la red, sin excepcion. */
const ALWAYS_NETWORK = [
  '/.netlify/',
  '/api/',
];

/* -------------------------------------------------------------------------- */

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Precarga unica del shell para que la primera visita offline funcione.
      try {
        const response = await fetch(SHELL_KEY, { credentials: 'same-origin' });
        if (response && response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(SHELL_KEY, response.clone());
        }
      } catch {
        /* sin red durante el install: el shell se cachea en la 1a navegacion */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('hce-portal-') && !CURRENT_CACHES.includes(key))
          .map((key) => caches.delete(key))
      );
      // clients.claim() solo alcanza clientes dentro del scope de ESTE registro,
      // por lo que el sitio publico nunca queda reclamado.
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/* -------------------------------------------------------------------------- */

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Solo GET: jamas interceptamos POST/PUT/PATCH/DELETE (mutaciones de API).
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Cross-origin (Supabase, Stripe, Google Fonts, GTM/Analytics) -> red directa.
  if (url.origin !== self.location.origin) return;

  // Funciones de Netlify y cualquier endpoint de API -> red directa.
  if (ALWAYS_NETWORK.some((prefix) => url.pathname.startsWith(prefix))) return;

  // Peticiones autenticadas -> red directa, nunca se cachean.
  if (request.headers.has('Authorization')) return;

  // --- Navegaciones -------------------------------------------------------
  if (request.mode === 'navigate') {
    // Blindaje extra: si por lo que sea llega una navegacion fuera del portal,
    // la dejamos pasar sin tocarla.
    if (!PORTAL_ROUTE.test(url.pathname)) return;
    event.respondWith(networkFirstShell(request));
    return;
  }

  // --- Assets versionados del build (inmutables) --------------------------
  if (VERSIONED_ASSET.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // --- Iconos / manifest del portal ---------------------------------------
  if (PORTAL_STATIC.test(url.pathname)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // Todo lo demas (imagenes de /assets/ sin hash, PDFs, XHR a mismo origen...)
  // se resuelve por la red con el cache HTTP normal del navegador.
});

/* -------------------------------------------------------------------------- */

async function networkFirstShell(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      const cache = await caches.open(SHELL_CACHE);
      // Guardamos siempre bajo la misma clave: en una SPA todas las rutas
      // devuelven el mismo index.html (redirect 200 de netlify.toml).
      cache.put(SHELL_KEY, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    const cached = await caches.match(SHELL_KEY, { cacheName: SHELL_CACHE });
    return cached || offlineFallback();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  } catch (error) {
    if (cached) return cached;
    throw error;
  }
}

function offlineFallback() {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portal HCE - Sin conexion</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
       font-family:'Outfit','Inter',system-ui,sans-serif;background:#F8FAFC;color:#1A2B3C}
  .card{max-width:420px;text-align:center;background:#fff;border:1px solid #E2E8F0;
        border-radius:12px;padding:32px;box-shadow:0 2px 12px rgba(0,0,0,.07)}
  h1{margin:0 0 8px;font-size:1.25rem}
  p{margin:0 0 20px;color:#64748B;line-height:1.55;font-size:.95rem}
  button{border:0;border-radius:9999px;background:#00BCD4;color:#fff;font-weight:700;
         padding:12px 24px;cursor:pointer;font-size:.9rem}
</style></head><body><div class="card">
<h1>Sin conexion</h1>
<p>No pudimos contactar al servidor. Revisa tu conexion e intenta de nuevo.</p>
<button onclick="location.reload()">Reintentar</button>
</div></body></html>`,
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
