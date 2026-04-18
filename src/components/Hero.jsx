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
            <Sparkles size={16} /> Experiencia clínica de vanguardia
          </div>
          <h1>
            La nueva era de la<br />
            <span className="text-gradient">educación clínica</span>
          </h1>
          <p>
            Domina el soporte extracorpóreo y las terapias críticas mediante aprendizaje inmersivo, simulación avanzada y entrenamiento de alto desempeño, diseñado para equipos multidisciplinarios de salud.
          </p>

          <div className="hero-actions">
            <a href="/simulador-ecmo-sim" className="btn btn-primary hero-btn-shadow">
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
