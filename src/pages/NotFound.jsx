import { Link } from 'react-router-dom';
import { Home, ArrowLeft, LifeBuoy } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './NotFound.css';

/* ---------------------------------------------------------------------------
 * Página 404.
 *
 * Va en la ruta comodín, la última de todas: React Router evalúa en orden y
 * `path="*"` solo entra cuando ninguna otra coincidió.
 *
 * En Netlify el redirect de SPA (`/* -> /index.html`) hace que cualquier URL
 * inexistente cargue la aplicación, así que es esta página —y no un error del
 * servidor— la que ve el visitante.
 * ------------------------------------------------------------------------ */

const ATAJOS = [
  { a: '/paris-diploma-ecmo', texto: 'Diploma Internacional París en ECMO' },
  { a: '/ecmo-nursing-care', texto: 'ECMO Nursing Care Course' },
  { a: '/simulador-ecmo-sim', texto: 'Simulador ECMO Sim' },
  { a: '/quienes-somos', texto: 'Quiénes somos' },
];

const NotFound = () => (
  <div className="nf-page">
    <Navbar />

    <main className="nf-main">
      <div className="hce-container nf-inner">
        <p className="nf-codigo" aria-hidden="true">404</p>

        <h1 className="nf-titulo">Esta página no existe</h1>

        <p className="nf-texto">
          El enlace que seguiste está roto o la página cambió de dirección.
          No perdiste tu inscripción ni tu progreso: todo sigue en su lugar.
        </p>

        <div className="nf-acciones">
          <Link to="/" className="nf-btn nf-btn--primario">
            <Home size={18} /> Ir al inicio
          </Link>
          <button type="button" className="nf-btn nf-btn--secundario" onClick={() => window.history.back()}>
            <ArrowLeft size={18} /> Volver atrás
          </button>
        </div>

        <div className="nf-atajos">
          <p className="nf-atajos-titulo">Quizá buscabas:</p>
          <ul>
            {ATAJOS.map(({ a, texto }) => (
              <li key={a}>
                <Link to={a}>{texto}</Link>
              </li>
            ))}
          </ul>
        </div>

        <p className="nf-ayuda">
          <LifeBuoy size={15} />
          ¿Necesitas ayuda? Escríbenos a{' '}
          <a href="mailto:info@healthcareexp.com">info@healthcareexp.com</a>
        </p>
      </div>
    </main>

    <Footer />
  </div>
);

export default NotFound;
