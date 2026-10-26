// Después de `vite build`: genera un HTML por página pública con su título,
// descripción, imagen para compartir, canonical, datos estructurados y el
// texto de la página dentro de #root (los crawlers de IA y las vistas previas
// no ejecutan JavaScript; React lo reemplaza al cargar; oculto a la vista, ver
// ESTILO_ESTATICO). También escribe
// sitemap.xml con la fecha real de cada página (último commit de sus fuentes).
// Los datos viven en src/data/seo.js.
//
// Netlify sirve /ruta desde dist/ruta.html antes de las reglas de la SPA.
// Las rutas privadas (/dashboard, /admin, /classroom...) usan dist/app.html, la
// copia genérica sin textos de una página (ver netlify.toml).

import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PAGINAS, SITIO, NOMBRE, jsonLdDe } from '../src/data/seo.js';

const DIST = path.resolve('dist');
const base = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
const HOY = new Date().toISOString().slice(0, 10);

const esc = (t) => String(t ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// El JSON-LD va dentro de <script>: se evita que un texto cierre la etiqueta.
const jsonSeguro = (obj) => JSON.stringify(obj).replace(/</g, '\\u003c');

// Fecha del último commit que tocó las fuentes de la página (o la de hoy).
function lastmod(p) {
  if (p.actualizado) return p.actualizado;
  try {
    const salida = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...(p.archivos || [])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(salida) ? salida : HOY;
  } catch {
    return HOY;
  }
}

function etiquetas(p) {
  const url = `${SITIO}${p.ruta === '/' ? '/' : p.ruta}`;
  const [ancho, alto] = p.imagenCuadrada ? [1200, 900] : [1200, 630];
  return [
    `<link rel="canonical" href="${url}" />`,
    p.noindex ? '<meta name="robots" content="noindex, nofollow" />' : '<meta name="robots" content="index, follow, max-image-preview:large" />',
    `<meta property="og:type" content="${p.tipoOg || 'website'}" />`,
    `<meta property="og:site_name" content="${esc(NOMBRE)}" />`,
    '<meta property="og:locale" content="es_MX" />',
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(p.titulo)}" />`,
    `<meta property="og:description" content="${esc(p.descripcion)}" />`,
    `<meta property="og:image" content="${p.imagen}" />`,
    `<meta property="og:image:width" content="${ancho}" />`,
    `<meta property="og:image:height" content="${alto}" />`,
    `<meta property="og:image:alt" content="${esc(p.h1)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${esc(p.titulo)}" />`,
    `<meta name="twitter:description" content="${esc(p.descripcion)}" />`,
    `<meta name="twitter:image" content="${p.imagen}" />`,
    `<script type="application/ld+json">${jsonSeguro(jsonLdDe(p))}</script>`,
  ].join('\n    ');
}

const lista = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
const preguntas = (faqs) => faqs.map((f) => `<h3>${esc(f.pregunta)}</h3><p>${esc(f.respuesta)}</p>`).join('');
const tabla = (t) => `<table>${t.titulo ? `<caption>${esc(t.titulo)}</caption>` : ''}<tr>${t.encabezados.map((h) => `<th>${esc(h)}</th>`).join('')}</tr>${t.filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>`;
const enlaces = (items) => `<ul>${items.map((e) => `<li><a href="${e.ruta}">${esc(e.texto)}</a></li>`).join('')}</ul>`;

function contenido(p) {
  let cuerpo = `<h1>${esc(p.h1)}</h1><p>${esc(p.descripcion)}</p>`;
  const c = p.consulta;
  if (c) {
    cuerpo += `<p class="guia-respuesta"><strong>Respuesta rápida:</strong> ${esc(c.respuestaRapida)}</p>`;
    cuerpo += `<h2>Ficha clínica</h2>${tabla({ encabezados: ['Dato', 'Detalle'], filas: c.ficha.map((f) => [f.dato, f.valor]) })}`;
    for (const s of c.secciones) {
      cuerpo += `<h2>${esc(s.titulo)}</h2>`;
      for (const parrafo of s.parrafos || []) cuerpo += `<p>${esc(parrafo)}</p>`;
      if (s.puntos) cuerpo += lista(s.puntos);
      if (s.tabla) cuerpo += tabla(s.tabla);
      if (s.nota) {
        const enlace = s.notaEnlace?.url
          ? ` <a href="${esc(s.notaEnlace.url)}" rel="noopener">${esc(s.notaEnlace.texto)} ↗</a>`
          : '';
        cuerpo += `<p><em>${esc(s.nota)}</em>${enlace}</p>`;
      }
    }
    cuerpo += `<h2>La visión del equipo académico</h2><p>${esc(c.vision)}</p>`;
    cuerpo += `<h2>Preguntas frecuentes</h2>${preguntas(c.faqs)}`;
    cuerpo += `<h2>Fuentes</h2><ul>${c.fuentes.map((f) => `<li><a href="${esc(f.url)}" rel="noopener">${esc(f.nombre)}</a></li>`).join('')}</ul>`;
    cuerpo += `<p>Publicada el ${esc(c.publicado)} · actualizada el ${esc(c.actualizado)}. Contenido educativo para profesionales de la salud; no sustituye los protocolos institucionales.</p>`;
  }
  if (p.texto) {
    if (p.texto.respuesta) cuerpo += `<p class="guia-respuesta">${esc(p.texto.respuesta)}</p>`;
    if (p.texto.ficha) cuerpo += tabla({ encabezados: ['Dato', 'Detalle'], filas: p.texto.ficha });
    if (p.texto.tabla) cuerpo += tabla(p.texto.tabla);
    if (p.texto.enlaces?.length) cuerpo += enlaces(p.texto.enlaces);
  }
  if (p.faqs) cuerpo += preguntas(p.faqs);
  const nav = PAGINAS.filter((x) => !x.noindex && x.prioridad >= 0.7 && x.ruta !== p.ruta)
    .map((x) => `<a href="${x.ruta}">${esc(x.h1)}</a>`).join(' · ');
  return `<main class="seo-estatico">${cuerpo}<nav>${nav}</nav></main>`;
}

// El texto de #root es para buscadores, lectores de IA y navegadores sin
// JavaScript. Con JavaScript, el visitante no debe verlo: antes se pintaba unos
// segundos como texto plano ("una especie de código") hasta que React montaba.
// Se oculta solo visualmente (fuera de pantalla con clip, NO display:none, para
// que siga en el HTML y en el árbol de accesibilidad) y el visitante ve el fondo
// liso de la página hasta que React lo reemplaza. Sin JavaScript, el <noscript>
// lo vuelve a mostrar con un formato legible.
const ESTILO_ESTATICO = [
  '<style>.seo-estatico{position:absolute!important;width:1px!important;height:1px!important;margin:-1px!important;padding:0!important;border:0!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important}</style>',
  '<noscript><style>.seo-estatico{position:static!important;width:auto!important;height:auto!important;max-width:820px;margin:0 auto!important;padding:32px 16px!important;overflow:visible!important;clip:auto!important;clip-path:none!important;white-space:normal!important;font-family:Inter,system-ui,sans-serif;color:#0a192f;line-height:1.6}.seo-estatico nav{margin-top:32px;font-size:14px}</style></noscript>',
].join('\n    ');

function htmlDe(p) {
  let html = base;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.titulo)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(p.descripcion)}" />`);
  // Quita las etiquetas genéricas del index para no duplicarlas.
  html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '')
    .replace(/\s*<meta (property="og:|name="twitter:|name="robots")[^>]*>/g, '')
    .replace(/\s*<meta name="keywords"[^>]*>/g, '')
    .replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '');
  html = html.replace('</head>', `    ${etiquetas(p)}\n    ${ESTILO_ESTATICO}\n  </head>`);
  if (!html.includes('<div id="root"></div>')) console.warn(`SEO: no se encontró <div id="root"></div> para ${p.ruta}; la página queda sin texto base.`);
  html = html.replace('<div id="root"></div>', `<div id="root">${contenido(p)}</div>`);
  return html;
}

// La copia genérica de la SPA (rutas privadas y no encontradas), sin etiquetas
// de una página en particular.
await fs.writeFile(path.join(DIST, 'app.html'), base.replace(/\s*<meta name="keywords"[^>]*>/g, ''));

let escritas = 0;
for (const p of PAGINAS) {
  const html = htmlDe(p);
  if (p.ruta === '/') {
    await fs.writeFile(path.join(DIST, 'index.html'), html);
  } else {
    const destino = path.join(DIST, `${p.ruta.slice(1)}.html`);
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, html);
  }
  escritas += 1;
}

const indexables = PAGINAS.filter((p) => !p.noindex);
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexables.map((p) => `  <url><loc>${SITIO}${p.ruta === '/' ? '/' : p.ruta}</loc><lastmod>${lastmod(p)}</lastmod><priority>${p.prioridad.toFixed(1)}</priority></url>`).join('\n')}
</urlset>
`;
await fs.writeFile(path.join(DIST, 'sitemap.xml'), sitemap);

console.log(`SEO: ${escritas} páginas con etiquetas propias y sitemap con ${indexables.length} URLs.`);
