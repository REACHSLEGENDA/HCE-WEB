import { useEffect } from 'react';

export function useSEO({ title, description, keywords, noindex = false }) {
  useEffect(() => {
    if (title) {
      document.title = `${title} | HCE Healthcare Training Experience`;
    }

    if (description) {
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', description);
      } else {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        metaDesc.content = description;
        document.head.appendChild(metaDesc);
      }
    }

    if (keywords) {
      let metaKey = document.querySelector('meta[name="keywords"]');
      if (metaKey) {
        metaKey.setAttribute('content', keywords);
      } else {
        metaKey = document.createElement('meta');
        metaKey.name = 'keywords';
        metaKey.content = keywords;
        document.head.appendChild(metaKey);
      }
    }

    // Páginas que no deben salir en buscadores (enlaces privados). Se retira
    // al salir de la página: en una SPA la etiqueta sobreviviría a la
    // navegación y dejaría medio sitio sin indexar.
    if (noindex) {
      const meta = document.createElement('meta');
      meta.name = 'robots';
      meta.content = 'noindex, nofollow';
      document.head.appendChild(meta);
      return () => meta.remove();
    }
  }, [title, description, keywords, noindex]);
}
