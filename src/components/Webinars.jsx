import React from 'react';
import { useInView } from 'react-intersection-observer';
import { CalendarDays } from 'lucide-react';
import './Webinars.css';

const WebinarCard = ({ delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div ref={ref} className={`webinar-immersive-card reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="webinar-card-bg">
        <CalendarDays size={80} style={{ opacity: 0.1, color: 'white' }} />
      </div>
      <div className="webinar-card-overlay"></div>

      <div className="webinar-card-content">
        <p className="webinar-card-date">Próximamente</p>
        <h3 className="webinar-card-title">Nuevo Webinar en Preparación</h3>
        <div className="webinar-card-action">
          <a href="#" className="btn-webinar-card disabled-btn">
            Pronto más información
          </a>
        </div>
      </div>
    </div>
  );
};

const Webinars = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="webinars-immersive-section" id="webinars-grid">
      <div className="hce-container">
        <div ref={ref} className={`section-header reveal ${inView ? 'active' : ''}`} style={{ marginBottom: '3.5rem' }}>
          <h2 className="section-title">
            Próximos Seminarios Web <span className="text-gradient">Gratuitos Exclusivos</span>
          </h2>
        </div>
      </div>
      <div className="webinar-immersive-grid">
        <WebinarCard delay={0.1} />
        <WebinarCard delay={0.2} />
      </div>
    </section>
  );
};

export default Webinars;
