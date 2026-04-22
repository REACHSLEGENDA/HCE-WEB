import { useState, useEffect } from 'react';
import { Cookie, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import './CookieBanner.css';

const STORAGE_KEY = 'hce_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [prefs, setPrefs] = useState({ analysis: true, advertising: true });

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true, analysis: true, advertising: true }));
    setVisible(false);
  };

  const savePrefs = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ necessary: true, ...prefs }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Configuración de cookies">
      <div className="cookie-banner__inner">
        <div className="cookie-banner__header">
          <span className="cookie-banner__icon"><Cookie size={20} /></span>
          <p className="cookie-banner__text">
            <strong>Healthcare Training Experience</strong> utiliza cookies para mejorar tu experiencia y brindarte servicios personalizados.
            Para más información consulta nuestro{' '}
            <Link to="/aviso-de-privacidad" className="cookie-banner__link">Aviso de Privacidad</Link>.
          </p>
        </div>

        {expanded && (
          <div className="cookie-banner__details">
            <div className="cookie-type">
              <div className="cookie-type__row">
                <div>
                  <strong>Cookies Necesarias</strong>
                  <p>Esenciales para que el sitio funcione correctamente. No pueden desactivarse.</p>
                </div>
                <span className="cookie-toggle cookie-toggle--always">Siempre activas</span>
              </div>
            </div>
            <div className="cookie-type">
              <div className="cookie-type__row">
                <div>
                  <strong>Cookies de Análisis</strong>
                  <p>Seguimiento del comportamiento de usuarios para mejorar el contenido del sitio.</p>
                </div>
                <label className="cookie-switch">
                  <input type="checkbox" checked={prefs.analysis} onChange={(e) => setPrefs(p => ({ ...p, analysis: e.target.checked }))} />
                  <span className="cookie-switch__slider" />
                </label>
              </div>
            </div>
            <div className="cookie-type">
              <div className="cookie-type__row">
                <div>
                  <strong>Cookies de Publicidad</strong>
                  <p>Anuncios relevantes para ti y tus intereses, en acuerdo con terceros seleccionados.</p>
                </div>
                <label className="cookie-switch">
                  <input type="checkbox" checked={prefs.advertising} onChange={(e) => setPrefs(p => ({ ...p, advertising: e.target.checked }))} />
                  <span className="cookie-switch__slider" />
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="cookie-banner__actions">
          <button className="cookie-btn cookie-btn--ghost" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {expanded ? 'Ocultar opciones' : 'Configuración de cookies'}
          </button>
          {expanded && (
            <button className="cookie-btn cookie-btn--outline" onClick={savePrefs}>
              Guardar preferencias
            </button>
          )}
          <button className="cookie-btn cookie-btn--primary" onClick={accept}>
            Aceptar todo
          </button>
        </div>
      </div>
    </div>
  );
}
