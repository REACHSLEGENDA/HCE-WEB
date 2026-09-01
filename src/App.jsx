import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CookieBanner from './components/CookieBanner';
import Home from './pages/Home';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

/* ---------------------------------------------------------------------------
 * Code splitting por ruta.
 *
 * Home se mantiene ESTATICA a proposito: es la entrada mas comun del sitio y
 * la pagina que define el LCP. Cargarla con lazy() anadiria un round-trip de
 * red al camino critico de la mayoria de las visitas, justo lo contrario de lo
 * que buscamos. El resto de rutas -- incluidas AdminDashboard (6k lineas),
 * Dashboard, Classroom y las paginas de inscripcion -- salen del chunk inicial.
 * ------------------------------------------------------------------------ */
const ChatBot = lazy(() => import('./components/ChatBot'));
const InstallApp = lazy(() => import('./components/InstallApp'));

const Login = lazy(() => import('./pages/Login'));
const Confirmacion = lazy(() => import('./pages/Confirmacion'));
const RestablecerPassword = lazy(() => import('./pages/RestablecerPassword'));

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Classroom = lazy(() => import('./pages/Classroom'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

const ParisDiploma = lazy(() => import('./pages/ParisDiploma'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const Nursing = lazy(() => import('./pages/Nursing'));
const EcmoSim = lazy(() => import('./pages/EcmoSim'));
const Instructores = lazy(() => import('./pages/Instructores'));
const Retroalimentacion = lazy(() => import('./pages/Retroalimentacion'));
const Inscripciones = lazy(() => import('./pages/Inscripciones'));
const InscripcionesStep1 = lazy(() => import('./pages/InscripcionesStep1'));
const SecretPreview = lazy(() => import('./pages/SecretPreview'));
const InscripcionesNursing = lazy(() => import('./pages/InscripcionesNursing'));
const SecretNursingPreview = lazy(() => import('./pages/SecretNursingPreview'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TerminosCondiciones = lazy(() => import('./pages/TerminosCondiciones'));
const Facturacion = lazy(() => import('./pages/Facturacion'));
const Gallery = lazy(() => import('./pages/Gallery'));
const Comunidad = lazy(() => import('./pages/Comunidad'));
const NotFound = lazy(() => import('./pages/NotFound'));

/* ------------------------------------------------------------------------ */

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

/**
 * Fallback de carga para las rutas diferidas.
 * Usa las variables de src/index.css (--bg-light, --primary, --cyan-bright,
 * --gradient-primary) y aparece con 200 ms de retraso, de modo que una ruta que
 * se resuelve al instante no produce un parpadeo.
 */
const PageLoader = () => (
  <div className="hce-page-loader" role="status" aria-live="polite">
    <style>{`
      .hce-page-loader {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1.25rem;
        background: var(--bg-light, #f4f6f9);
        opacity: 0;
        animation: hceLoaderIn .35s ease forwards;
        animation-delay: .2s;
      }
      .hce-page-loader__ring {
        width: 52px;
        height: 52px;
        border-radius: 50%;
        border: 4px solid rgba(10, 25, 47, .1);
        border-top-color: var(--cyan-bright, #00d2ff);
        border-right-color: var(--secondary, #1e37b8);
        animation: hceLoaderSpin .9s linear infinite;
      }
      .hce-page-loader__label {
        font-family: 'Outfit', 'Montserrat', sans-serif;
        font-weight: 700;
        font-size: .78rem;
        letter-spacing: .18em;
        text-transform: uppercase;
        color: var(--text-muted, #7f8c8d);
      }
      .hce-page-loader__bar {
        width: 160px;
        height: 3px;
        border-radius: 99px;
        overflow: hidden;
        background: rgba(10, 25, 47, .08);
      }
      .hce-page-loader__bar::after {
        content: '';
        display: block;
        width: 40%;
        height: 100%;
        border-radius: 99px;
        background: var(--gradient-primary, linear-gradient(135deg, #0048ff 0%, #00d2ff 100%));
        animation: hceLoaderSlide 1.1s cubic-bezier(.65, 0, .35, 1) infinite;
      }
      @keyframes hceLoaderSpin { to { transform: rotate(360deg); } }
      @keyframes hceLoaderIn { to { opacity: 1; } }
      @keyframes hceLoaderSlide {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(350%); }
      }
      @media (prefers-reduced-motion: reduce) {
        .hce-page-loader { animation-delay: 0s; opacity: 1; }
        .hce-page-loader__ring,
        .hce-page-loader__bar::after { animation: none; }
      }
    `}</style>
    <div className="hce-page-loader__ring" />
    <div className="hce-page-loader__bar" />
    <span className="hce-page-loader__label">Cargando</span>
  </div>
);

/* ---------------------------------------------------------------------------
 * PWA solo para el portal.
 *
 * El manifest y el service worker se activan UNICAMENTE en /dashboard y
 * /classroom/:id. El sitio publico de marketing nunca enlaza el manifest (no
 * ofrece instalacion) ni queda bajo el control de un service worker.
 *
 * Se registra el MISMO /sw.js dos veces, con scope "/dashboard" y "/classroom",
 * porque un registro solo puede tener un scope y /classroom no cuelga de
 * /dashboard. Sin barra final: el scope se compara como prefijo de cadena, y
 * "/dashboard/" no cubriria la URL exacta "/dashboard".
 * ------------------------------------------------------------------------ */
const PORTAL_ROUTE = /^\/(dashboard|classroom)(\/|$)/;
const PORTAL_SCOPES = ['/dashboard', '/classroom'];

const PortalPWA = () => {
  const { pathname } = useLocation();
  const inPortal = PORTAL_ROUTE.test(pathname);

  useEffect(() => {
    const head = document.head;
    const managed = 'data-hce-portal-pwa';

    if (!inPortal) {
      // Fuera del portal: retiramos las etiquetas para no ofrecer la
      // instalacion desde el sitio publico.
      head.querySelectorAll(`[${managed}]`).forEach((el) => el.remove());
      return;
    }

    const addTag = (tag, attrs) => {
      const selector = tag === 'link'
        ? `link[rel="${attrs.rel}"]`
        : `meta[name="${attrs.name}"]`;
      if (head.querySelector(selector)) return;
      const el = document.createElement(tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      el.setAttribute(managed, '');
      head.appendChild(el);
    };

    addTag('link', { rel: 'manifest', href: '/manifest.json' });
    addTag('link', { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' });
    addTag('meta', { name: 'theme-color', content: '#00BCD4' });
    addTag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
    addTag('meta', { name: 'apple-mobile-web-app-title', content: 'Portal HCE' });
    addTag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' });

    // Los SW solo existen en contexto seguro (https o localhost).
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

    PORTAL_SCOPES.forEach((scope) => {
      navigator.serviceWorker
        .register('/sw.js', { scope, updateViaCache: 'none' })
        .catch(() => { /* el portal funciona igual sin SW */ });
    });
  }, [inPortal]);

  return null;
};

/* ------------------------------------------------------------------------ */

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ScrollToTop />
          <PortalPWA />
          <CookieBanner />
          <Suspense fallback={null}>
            <ChatBot />
            <InstallApp />
          </Suspense>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/confirmacion" element={<Confirmacion />} />
              <Route path="/restablecer-contrasena" element={<RestablecerPassword />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/classroom/:id"
                element={
                  <ProtectedRoute>
                    <Classroom />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/paris-diploma-ecmo" element={<ParisDiploma />} />
              <Route path="/quienes-somos" element={<AboutUs />} />
              <Route path="/ecmo-nursing-care" element={<Nursing />} />
              <Route path="/simulador-ecmo-sim" element={<EcmoSim />} />
              <Route path="/instructores" element={<Instructores />} />
              <Route path="/retroalimentacion" element={<Retroalimentacion />} />
              <Route path="/inscripciones-diploma-paris-ecmo" element={<Inscripciones />} />
              <Route path="/inscripciones-step1" element={<InscripcionesStep1 />} />
              <Route path="/debug-checkout-preview-2026" element={<SecretPreview />} />
              <Route path="/inscripciones-ecmo-nursing" element={<InscripcionesNursing />} />
              <Route path="/debug-checkout-nursing-preview-2026" element={<SecretNursingPreview />} />
              <Route path="/aviso-de-privacidad" element={<PrivacyPolicy />} />
              <Route path="/terminos-y-condiciones" element={<TerminosCondiciones />} />
              <Route path="/facturacion" element={<Facturacion />} />
              <Route path="/galeria" element={<Gallery />} />
              <Route path="/comunidad" element={<Comunidad />} />

              {/* Comodín: va al final porque React Router evalúa en orden y
                  esta ruta coincide con todo lo que no encajó antes. */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
