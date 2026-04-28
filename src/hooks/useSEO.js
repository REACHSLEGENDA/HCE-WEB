import { useEffect } from 'react';

export function useSEO({ title, description, keywords }) {
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
  }, [title, description, keywords]);
}
