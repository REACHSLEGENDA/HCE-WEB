import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Layout, Globe, Cpu, Zap, ExternalLink } from 'lucide-react';
import './Campus.css';

const Campus = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="campus-futuristic-section" id="campus">
      <div className="campus-mesh-bg"></div>
      <div className="hce-container campus-flex-container">
        
        <div ref={ref} className={`campus-info-block reveal ${inView ? 'active' : ''}`}>
          <div className="tech-badge">
            <Cpu size={14} /> AI-POWERED PLATFORM
          </div>
          <h2 className="campus-title-main">
            Tu Clínica <span className="blue-gradient-text">Evoluciona</span>
          </h2>
          <p className="campus-description">
            Bienvenido al ecosistema digital más avanzado de la región. Una plataforma inteligente diseñada para potenciar el razonamiento clínico mediante simulación virtual y aprendizaje adaptativo.
          </p>
          
          <div className="campus-features-list">
            <div className="c-feature-item">
              <div className="cf-icon"><Zap size={18} /></div>
              <span>Acceso Inmediato 24/7</span>
            </div>
            <div className="c-feature-item">
              <div className="cf-icon"><Globe size={18} /></div>
              <span>Comunidad Internacional</span>
            </div>
            <div className="c-feature-item">
              <div className="cf-icon"><Layout size={18} /></div>
              <span>Recursos Exclusivos</span>
            </div>
          </div>

          <a href="https://campus.healthcareexp.com/plus/login" target="_blank" rel="noreferrer" className="campus-go-btn">
            Entrar al Campus <ExternalLink size={18} />
          </a>
        </div>

        <div className={`campus-mockup-wrapper reveal reveal-delay-2 ${inView ? 'active' : ''}`}>
          <div className="glow-orb"></div>
          <div className="mockup-stack">
            <div className="m-card m-main">
              <img src="https://healthcareexp.com/wp-content/uploads/2026/02/Captura-de-pantalla-2026-02-28-143925.png" alt="Plataforma HCE" />
              <div className="m-label">Dashboard Principal</div>
            </div>
            <div className="m-card m-secondary">
              <img src="https://healthcareexp.com/wp-content/uploads/2026/02/Captura-de-pantalla-2026-02-28-143944.png" alt="Cursos" />
            </div>
            <div className="m-card m-tertiary">
              <img src="https://healthcareexp.com/wp-content/uploads/2026/02/Captura-de-pantalla-2026-02-28-143959.png" alt="Simulación" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Campus;
