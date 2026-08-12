const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export const getYouTubeVideoId = (value) => {
  const input = String(value || '').trim();
  if (!input) return '';
  if (YOUTUBE_VIDEO_ID_PATTERN.test(input)) return input;

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    let candidate = '';

    if (host === 'youtu.be') {
      candidate = url.pathname.split('/').filter(Boolean)[0] || '';
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      candidate = url.searchParams.get('v') || '';

      if (!candidate) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) {
          candidate = parts[1] || '';
        }
      }
    }

    return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : '';
  } catch {
    return '';
  }
};

export const getYouTubeEmbedUrl = (value, pageUrl = window.location.href) => {
  const videoId = getYouTubeVideoId(value);
  if (!videoId) return '';

  const currentUrl = new URL(pageUrl);
  const params = new URLSearchParams({
    autoplay: '0',
    rel: '0',
    playsinline: '1',
    origin: currentUrl.origin,
    widget_referrer: currentUrl.href
  });

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
};

export const getYouTubePlayerError = (code) => {
  const errors = {
    2: 'El enlace de YouTube configurado no es válido.',
    5: 'YouTube no pudo reproducir este video en el navegador.',
    100: 'El video fue eliminado, es privado o ya no está disponible.',
    101: 'El propietario del video no permite reproducirlo dentro de otras páginas.',
    150: 'El propietario del video no permite reproducirlo dentro de otras páginas.',
    153: 'YouTube no recibió la identificación del sitio necesaria para iniciar el reproductor.'
  };

  return errors[code] || 'YouTube no pudo iniciar el reproductor.';
};
