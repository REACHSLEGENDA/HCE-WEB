import React from 'react';
import { useInView } from 'react-intersection-observer';
import { CalendarDays, Briefcase } from 'lucide-react';
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

const B2BTrainingCard = ({ delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div ref={ref} className={`webinar-immersive-card reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="webinar-card-bg" style={{ background: 'linear-gradient(45deg, #0f172a, #001f3f)' }}>
        <Briefcase size={80} style={{ opacity: 0.1, color: 'white' }} />
      </div>
      <div className="webinar-card-overlay"></div>

      <div className="webinar-card-content">
        <p className="webinar-card-date" style={{ color: 'var(--cyan)' }}>Programas a la medida</p>
        <h3 className="webinar-card-title" style={{ marginBottom: '1rem', fontSize: '1.6rem' }}>¿Buscas capacitar a tu personal?</h3>
        <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem', lineHeight: '1.5', fontSize: '0.95rem', maxWidth: '400px' }}>
          Entrena a tu equipo en terapias críticas con simulación avanzada y expertos y programas a la medida.
        </p>
        <div className="webinar-card-action">
          <a href="#" className="btn-webinar-card" style={{ background: 'var(--cyan)', color: '#0a192f', fontWeight: '800' }}>
            Contáctanos y solicita una propuesta personalizada
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
        <div ref={ref} className={`section-header reveal ${inView ? 'active' : ''}`} style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <span style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem', 
              background: 'rgba(0, 204, 255, 0.1)', color: 'var(--cyan)', 
              padding: '0.4rem 1rem', borderRadius: '50px', 
              fontSize: '0.9rem', fontWeight: 600, letterSpacing: '1px' 
            }}>
              <CalendarDays size={16} /> webinars
            </span>
          </div>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Próximos webinars <span className="text-gradient">gratuitos</span>
          </h2>
          <p style={{ color: 'var(--text-light)', maxWidth: '600px', margin: '1rem auto 0', fontSize: '1.1rem', lineHeight: '1.5', textAlign: 'center' }}>
            Actualización clínica con expertos, casos reales y mejores prácticas.
          </p>
        </div>
      </div>
      <div className="webinar-immersive-grid">
        <WebinarCard delay={0.1} />
        <B2BTrainingCard delay={0.2} />
      </div>
    </section>
  );
};

export default Webinars;
