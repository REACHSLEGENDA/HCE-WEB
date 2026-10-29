// Aviso de inscripciones cerradas del Diploma de París (ver src/lib/cierreParis.js).
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import '../pages/Inscripciones.css';

export default function InscripcionesCerradas() {
  return (
    <div className="ins-page">
      <Navbar />
      <div className="ins-result-wrap">
        <div className="ins-result-card">
          <div className="ins-result-icon ins-result-icon--cancel" aria-hidden="true">✕</div>
          <h1 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem' }}>Inscripciones cerradas</h1>
          <p>
            Las inscripciones del Paris International Diploma in ECMO 2026 ya están cerradas.
            ¡Gracias por tu interés! Escríbenos para avisarte de la próxima generación.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            <a
              href="https://wa.me/525659271906?text=Hola%2C%20me%20interesa%20la%20pr%C3%B3xima%20generaci%C3%B3n%20del%20Diploma%20de%20Par%C3%ADs%20en%20ECMO."
              target="_blank"
              rel="noopener noreferrer"
              className="ins-btn ins-btn--primary"
            >
              Avísame de la próxima generación
            </a>
            <Link to="/programas" className="ins-btn">Ver otros programas</Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
