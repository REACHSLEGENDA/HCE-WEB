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
            <Cpu size={14} /> Plataforma impulsada por IA
          </div>
          <h2 className="campus-title-main">
            Tu clínica <span className="blue-gradient-text">evoluciona</span>
          </h2>
          <p className="campus-description">
            Accede al ecosistema digital más avanzado de la región: una plataforma inteligente que potencia el razonamiento clínico mediante simulación virtual y aprendizaje adaptativo.
          </p>
          
          <div className="campus-features-list">
            <div className="c-feature-item">
              <div className="cf-icon"><Zap size={18} /></div>
              <span>Acceso 24/7</span>
            </div>
            <div className="c-feature-item">
              <div className="cf-icon"><Globe size={18} /></div>
              <span>Comunidad internacional</span>
            </div>
            <div className="c-feature-item">
              <div className="cf-icon"><Layout size={18} /></div>
              <span>Recursos exclusivos</span>
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
              <img src="/assets/componentes/Captura-de-pantalla-2026-02-28-143925.png" alt="Plataforma HCE" />
              <div className="m-label">Dashboard Principal</div>
            </div>
            <div className="m-card m-secondary">
              <img src="/assets/componentes/Captura-de-pantalla-2026-02-28-143944.png" alt="Cursos" />
            </div>
            <div className="m-card m-tertiary">
              <img src="/assets/componentes/Captura-de-pantalla-2026-02-28-143959.png" alt="Simulación" />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Campus;
