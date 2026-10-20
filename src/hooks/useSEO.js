import { useEffect } from 'react';

// Título, descripción, canonical y Open Graph de la página al navegar dentro
// del sitio. Si la ruta tiene SEO propio en src/data/seo.js (lo mismo que va en
// el HTML generado al compilar), se usa ese para que coincidan; si no, el que
// manda la página. `keywords` se ignora: Google no la usa desde hace años.
const ponerEtiqueta = (selector, crear, valor) => {
  let el = document.head.querySelector(selector);
  if (!el) { el = crear(); document.head.appendChild(el); }
  el.setAttribute(el.tagName === 'LINK' ? 'href' : 'content', valor);
};
const meta = (atributo, nombre) => () => { const m = document.createElement('meta'); m.setAttribute(atributo, nombre); return m; };

function aplicar(titulo, descripcion) {
  if (titulo) document.title = titulo;
  if (descripcion) ponerEtiqueta('meta[name="description"]', meta('name', 'description'), descripcion);
  const url = `${window.location.origin}${window.location.pathname}`;
  ponerEtiqueta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), url);
  ponerEtiqueta('meta[property="og:url"]', meta('property', 'og:url'), url);
  if (titulo) ponerEtiqueta('meta[property="og:title"]', meta('property', 'og:title'), titulo);
  if (descripcion) ponerEtiqueta('meta[property="og:description"]', meta('property', 'og:description'), descripcion);
}

export function useSEO({ title, description, noindex = false }) {
  useEffect(() => {
    let vigente = true;
    aplicar(title ? `${title} | HCE – Healthcare Training Experience` : '', description);
    // El SEO central se carga aparte (no pesa en la primera carga del sitio).
    import('../data/seo.js').then(({ paginaPorRuta }) => {
      if (!vigente) return;
      const p = paginaPorRuta(window.location.pathname.replace(/\/+$/, '') || '/');
      if (p) aplicar(p.titulo, p.descripcion);
    }).catch(() => { /* sin SEO central: queda el de la página */ });

    // Páginas que no deben salir en buscadores (enlaces privados). Se retira
    // al salir de la página: en una SPA la etiqueta sobreviviría a la
    // navegación y dejaría medio sitio sin indexar.
    let robots = null;
    if (noindex) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      robots.content = 'noindex, nofollow';
      document.head.appendChild(robots);
    }
    return () => { vigente = false; robots?.remove(); };
  }, [title, description, noindex]);
}
