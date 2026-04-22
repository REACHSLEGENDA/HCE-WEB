import { ChevronRight, Calendar, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ParisHero.css';

const ParisHero = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    // Target date from the user's original HTML (October 28, 2026 roughly)
    const targetDate = new Date(1793196000 * 1000).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="paris-hero">
      <div className="paris-hero-bg">
        {/* Usamos la imagen proporcionada por el usuario */}
        <img 
          src="https://raw.githubusercontent.com/REACHSLEGENDA/Imagenes/refs/heads/main/Generated%20Image%20April%2015%2C%202026%20-%201_42AM.jpg" 
          alt="Paris Diploma ECMO Hero" 
          className="paris-hero-img"
        />
        <div className="paris-hero-overlay"></div>
      </div>

      <div className="paris-hero-content">
        <div className="section-badge">
          <Award size={16} /> Certificación Internacional
        </div>
        
        <h1 className="paris-title">
          ¡Conviértete en <br />
          <span className="text-gradient">Especialista en ECMO!</span>
        </h1>
        
        <p className="paris-subtitle" style={{ fontSize: '1.4rem', fontWeight: '500' }}>
          Certificación Teórico-Práctica
        </p>

        <div className="paris-cta-group">
          <Link to="/inscripciones-diploma-paris-ecmo" className="btn-paris-primary">
            Inscríbete Ahora <ChevronRight size={18} />
          </Link>
        </div>

        <div className="paris-countdown-box">
          <div className="countdown-header">
            <Calendar size={18} /> <span>Save The Date</span>
          </div>
          <div className="countdown-timer">
            <div className="time-block">
              <span className="time-val">{timeLeft.days}</span>
              <span className="time-label">Días</span>
            </div>
            <span className="time-sep">:</span>
            <div className="time-block">
              <span className="time-val">{timeLeft.hours}</span>
              <span className="time-label">Horas</span>
            </div>
            <span className="time-sep">:</span>
            <div className="time-block">
              <span className="time-val">{timeLeft.minutes}</span>
              <span className="time-label">Min</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ParisHero;
