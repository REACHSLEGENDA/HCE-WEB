import React, { useEffect, useState } from 'react';
import { Sparkles, Gamepad2, Presentation } from 'lucide-react';
import './Hero.css';

const Hero = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    // Retrasar un poco la animación inicial
    setTimeout(() => setActive(true), 100);
  }, []);

  return (
    <header className="hero" id="home">
      <div className="hce-container hero-inner">
        <div className={`hero-content reveal ${active ? 'active' : ''}`}>
          <div className="badge-tag">
            <Sparkles size={16} /> EXPERIENCIA CLÍNICA VANGUARDISTA.
          </div>
          <h1>
            La Nueva Era en<br />
            <span className="text-gradient">Educación Clínica.</span>
          </h1>
          <p>
            Domina el soporte extracorpóreo y terapias críticas mediante aprendizaje inmersivo, simulación
            avanzada y entrenamiento de élite especialmente diseñado para equipos multidisciplinarios de
            salud.
          </p>

          <div className="hero-actions">
            <a href="https://healthcareexp.com/ecmosim/" target="_blank" rel="noreferrer" className="btn btn-primary hero-btn-shadow">
              Nuestro Simulador <Gamepad2 />
            </a>
            <a href="https://campus.healthcareexp.com/plus/login" target="_blank" rel="noreferrer" className="btn btn-outline">
              Ver Campus Virtual <Presentation />
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Hero;
