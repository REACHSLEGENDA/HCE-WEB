import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Users, Globe, GraduationCap, Laptop2, BarChart3 } from 'lucide-react';
import './Impact.css';

const AnimatedCounter = ({ target, duration = 2000, trigger }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!trigger) return;

    let start = 0;
    const end = parseInt(target);
    if (start === end) return;
    
    let totalMilSecDur = duration;
    let incrementTime = (totalMilSecDur / end) * 5;
    if (incrementTime > 50) incrementTime = 50;

    const timer = setInterval(() => {
      start += Math.ceil(end / (duration / incrementTime));
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [target, duration, trigger]);

  return <span>{count >= 1000 ? (count / 1000).toString() + 'k' : count}</span>;
};

const ImpactCard = ({ icon, target, plus, title, desc, delay, triggerAnim }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div ref={ref} className={`impact-premium-card reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="card-glow-element"></div>
      <div className="impact-icon-wrapper">{icon}</div>
      <div className="impact-data-group">
        <h3 className="impact-number">
          {plus && <span className="p-accent">+</span>}
          <AnimatedCounter target={target} trigger={triggerAnim || inView} />
        </h3>
        <span className="impact-label">{title}</span>
      </div>
      <p className="impact-detail" dangerouslySetInnerHTML={{ __html: desc }}></p>
      <div className="impact-card-line"></div>
    </div>
  );
};

const Impact = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="impact-modern-section" id="impacto">
      <div className="impact-nebula-bg"></div>
      <div className="hce-container">
        <div ref={ref} className={`impact-header reveal ${inView ? 'active' : ''}`}>
          <div className="impact-tag">
            <BarChart3 size={16} /> Métricas de éxito
          </div>
          <h2 className="impact-main-title">Impacto <span className="cyan-highlight">académico</span> global</h2>
          <p className="impact-main-subtitle">
            Lideramos la educación clínica avanzada con resultados medibles y una comunidad en expansión.
          </p>
        </div>

        <div className="impact-flex-grid">
          <ImpactCard 
            icon={<Users size={32} />}
            target={1500}
            plus
            title="Profesionales formados"
            desc="Egresados de nuestros programas de <strong>entrenamiento intensivo</strong>."
            delay={0.1}
            triggerAnim={inView}
          />
          <ImpactCard 
            icon={<Globe size={32} />}
            target={10000}
            plus
            title="Alcance global"
            desc="Especialistas conectados a través de nuestra <strong>red educativa</strong>."
            delay={0.2}
            triggerAnim={inView}
          />
          <ImpactCard 
            icon={<GraduationCap size={32} />}
            target={100}
            title="Docentes internacionales"
            desc="Expertos de <strong>centros ECMO líderes</strong> en Europa, EE. UU. y LATAM."
            delay={0.3}
            triggerAnim={inView}
          />
          <ImpactCard 
            icon={<Laptop2 size={32} />}
            target={50}
            title="Clases magistrales"
            desc="Contenido premium disponible 24/7 en nuestra <strong>Biblioteca Científica</strong>."
            delay={0.4}
            triggerAnim={inView}
          />
        </div>
      </div>
    </section>
  );
};

export default Impact;
