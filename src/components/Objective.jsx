import React from 'react';
import { useInView } from 'react-intersection-observer';
import './Objective.css';

const TimelineItem = ({ icon, text, delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  
  return (
    <div ref={ref} className={`timeline-item reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="timeline-icon">{icon}</div>
      <h4>{text}</h4>
    </div>
  );
};

const Objective = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="objective-section clinical-bg-anim" id="objetivo">
      <div ref={ref} className={`hce-container reveal ${inView ? 'active' : ''}`}>
        <h2>
          Nuestro Objetivo: <span className="text-gradient">Entrenar con Pasión y Propósito</span>
        </h2>
        <p>
          Como profesional de la salud, tienes el poder de transformar la evolución y los resultados de tus
          pacientes a través de la formación continua y la actualización permanente. Nuestros programas de
          entrenamiento están diseñados para brindarte la oportunidad de:
        </p>

        <div className="timeline-container">
          <div className="timeline-row">
            <TimelineItem icon="📚" text="ACCESO A EDUCACIÓN CONTINUA." delay={0} />
            <TimelineItem icon="🎓" text="POTENCIAR TUS CONOCIMIENTOS Y HABILIDADES." delay={0.1} />
            <TimelineItem icon="💡" text="DESARROLLO PROFESIONAL." delay={0.2} />
          </div>

          <div className="timeline-row" style={{ marginBottom: 0 }}>
            <TimelineItem icon="🤝" text="MAYOR CONFIANZA EN TU PRÁCTICA PROFESIONAL." delay={0.3} />
            <TimelineItem icon="🙌" text="SER PARTE DE EQUIPOS MULTIDISCIPLINARIOS." delay={0.4} />
            <TimelineItem icon="👨‍⚕️" text="FORTALECER LA SEGURIDAD DEL PACIENTE." delay={0.5} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Objective;
