import React from 'react';
import { useInView } from 'react-intersection-observer';
import { CalendarDays, Briefcase } from 'lucide-react';
import './Webinars.css';

const WebinarCard = ({ image, title, date, time, link, delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div className="webinar-immersive-card" style={{ opacity: 1, transform: 'none' }}>
      <div className="webinar-card-bg" style={{ 
        backgroundImage: `url(${image})`, 
        opacity: 1, 
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}></div>
      <div className="webinar-card-overlay"></div>

      <div className="webinar-card-content">
        <p className="webinar-card-date">{date}</p>
        <h3 className="webinar-card-title">{title}</h3>
        <p className="webinar-card-time" style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem', fontWeight: '500' }}>{time}</p>
        <div className="webinar-card-action">
          <a href={link} target="_blank" rel="noreferrer" className="btn-webinar-card">
            Registrarme Gratis
          </a>
        </div>
      </div>
    </div>
  );
};

const Webinars = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <>
      <section className="webinars-immersive-section" id="webinars-grid">
      <div className="hce-container">
        <div className="section-header" style={{ marginBottom: '3.5rem', textAlign: 'center', opacity: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="section-badge">
              <CalendarDays size={16} /> webinars
            </span>
          </div>
          <h2 className="section-title" style={{ textAlign: 'center' }}>
            Próximos webinars <span className="text-gradient">gratuitos</span>
          </h2>
          <p style={{ color: '#4b5563', maxWidth: '600px', margin: '1rem auto 0', fontSize: '1.1rem', lineHeight: '1.5', textAlign: 'center' }}>
            Actualización clínica con expertos, casos reales y mejores prácticas.
          </p>
        </div>
      </div>
      <div className="webinar-immersive-grid">
        <WebinarCard 
          delay={0.1} 
          image="https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/WhatsApp%20Image%202026-04-21%20at%2011.18.02%20AM.jpeg"
          title="Trasplante pulmonar en Latinoamérica"
          date="28 de Abril, 2026"
          time="5:00 PM (MEX/CR) | 8:00 PM (ARG/CHI)"
          link="https://bit.ly/LATICE-Trasplante-Pulmonar"
        />
      </div>
    </section>
    </>
  );
};

export default Webinars;
