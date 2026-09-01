import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, X, Share, Plus } from 'lucide-react';
import './InstallApp.css';

/* ---------------------------------------------------------------------------
 * Invitación a instalar el portal como app.
 *
 * Solo aparece dentro del portal (/dashboard y /classroom), que es el único
 * ámbito que cubre el manifest. El sitio público no ofrece instalación.
 *
 * Hay dos caminos porque los sistemas operativos no se comportan igual:
 *
 *  - Android/Chrome y escritorio disparan `beforeinstallprompt`. Guardamos ese
 *    evento y lo lanzamos cuando el alumno toca el botón. Si el navegador nunca
 *    lo dispara (ya está instalada, o no cumple los criterios), no mostramos
 *    nada: un botón que no instala nada es peor que ningún botón.
 *
 *  - iOS no implementa ese evento en ninguna versión. La única forma de
 *    instalar es Compartir → Añadir a pantalla de inicio, así que ahí el banner
 *    explica los pasos en vez de ofrecer un botón.
 * ------------------------------------------------------------------------ */

const PORTAL_ROUTE = /^\/(dashboard|classroom)(\/|$)/;
const STORAGE_KEY = 'hce_install_prompt';
const DIAS_DE_ESPERA = 14; // si lo cierran, no volvemos a insistir en dos semanas
const RETRASO_MS = 2500;   // dejamos que el portal cargue antes de aparecer

const esIOS = () => {
  const ua = navigator.userAgent;
  // iPadOS 13+ se anuncia como Mac; se delata por el soporte táctil.
  return /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const yaInstalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

const descartadoHacePoco = () => {
  const guardado = Number(localStorage.getItem(STORAGE_KEY));
  if (!guardado) return false;
  return Date.now() - guardado < DIAS_DE_ESPERA * 24 * 60 * 60 * 1000;
};

export default function InstallApp() {
  const { pathname } = useLocation();
  const enPortal = PORTAL_ROUTE.test(pathname);

  // Se evalúan una sola vez, al montar: ni el sistema operativo ni un descarte
  // guardado cambian a media sesión.
  const [ios] = useState(esIOS);
  const [silenciado] = useState(() => yaInstalada() || descartadoHacePoco());

  const [promptEvent, setPromptEvent] = useState(null);
  const [cerrado, setCerrado] = useState(false);
  const [esperaCumplida, setEsperaCumplida] = useState(false);

  // En Android/escritorio hace falta el evento del navegador; en iOS no existe
  // y basta con estar en el portal para explicar los pasos a mano.
  const elegible = enPortal && !silenciado && !cerrado && (ios || Boolean(promptEvent));

  // El evento llega una sola vez y puede adelantarse al render, así que lo
  // escuchamos siempre, no solo dentro del portal.
  useEffect(() => {
    const capturar = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const instalada = () => {
      setCerrado(true);
      setPromptEvent(null);
    };
    window.addEventListener('beforeinstallprompt', capturar);
    window.addEventListener('appinstalled', instalada);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturar);
      window.removeEventListener('appinstalled', instalada);
    };
  }, []);

  // Dejamos respirar al portal antes de aparecer.
  useEffect(() => {
    if (!elegible) return;
    const t = setTimeout(() => setEsperaCumplida(true), RETRASO_MS);
    return () => clearTimeout(t);
  }, [elegible]);

  const cerrar = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setCerrado(true);
  };

  const instalar = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    // El evento no se puede reutilizar, acepte o no.
    setPromptEvent(null);
    if (outcome === 'accepted') setCerrado(true);
    else cerrar();
  };

  if (!elegible || !esperaCumplida) return null;

  return (
    <div className="hce-install" role="dialog" aria-label="Instalar la app del portal">
      <img src="/icons/icon-192.png" alt="" className="hce-install-icon" width="48" height="48" />

      <div className="hce-install-text">
        <strong>Lleva el portal en tu celular</strong>
        {ios ? (
          <span>
            Toca <Share size={14} aria-label="Compartir" /> Compartir y luego{' '}
            <Plus size={14} aria-label="Añadir" /> <em>Añadir a pantalla de inicio</em>.
          </span>
        ) : (
          <span>Instálalo como app y entra a tus clases con un toque, sin buscar la página.</span>
        )}
      </div>

      {!ios && (
        <button type="button" className="hce-install-btn" onClick={instalar}>
          <Download size={16} /> Instalar
        </button>
      )}

      <button type="button" className="hce-install-close" onClick={cerrar} aria-label="Ahora no">
        <X size={18} />
      </button>
    </div>
  );
}
