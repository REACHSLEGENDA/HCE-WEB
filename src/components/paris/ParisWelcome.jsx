import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Target, Users, BookOpen } from 'lucide-react';
import './ParisWelcome.css';

const ParisWelcome = () => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="paris-welcome" ref={ref}>
      <div className={`welcome-container ${inView ? 'is-visible' : ''}`}>
        
        {/* Intro Block */}
        <div className="welcome-intro text-center">
          <span className="welcome-label">Bienvenidos a nuestro</span>
          <h2 className="welcome-title">
            <span className="text-navy">Paris Internacional Diploma in ECMO</span>
            <br /> <span className="text-gold">&amp; Paris ECMO Simulation Course</span>
          </h2>
          
          <div className="welcome-divider"></div>
          
          <div className="welcome-content">
            <p className="lead-text">
              <strong>Este entrenamiento presencial está diseñado para brindar una experiencia académica y práctica de alto nivel.</strong>
            </p>
            <p className="audience-text">
              Está dirigido a médicos (intensivistas, cardiólogos, neumólogos, cirujanos, anestesiólogos, médicos de urgencias, etc.), enfermeras/os, perfusionistas, terapeutas respiratorios y otros profesionales de la salud que ya forman parte de un programa ECMO o que se encuentran en proceso de iniciar uno.
            </p>
          </div>
        </div>

        {/* Nursing Promo Banner */}
        <div className="nursing-promo-box">
          <div className="promo-text-side">
            <h3>¿Eres Enfermera o Enfermero?</h3>
            <p>
              Contamos con una promoción exclusiva para nuestros alumnos de enfermería matriculados en el Diploma Internacional de Paris en ECMO. ¡Aprovecha este beneficio diseñado para impulsar tu carrera!
            </p>
            <a href="https://healthcareexp.com/inscripciones-ecmo/" className="btn-promo">
              Aplicar a la Promoción
            </a>
          </div>
          <div className="promo-img-side">
            <img 
              src="https://healthcareexp.com/wp-content/uploads/2025/06/ecmo-nursing-dm.png" 
              alt="Promoción ECMO Nursing" 
            />
          </div>
        </div>

      </div>
    </section>
  );
};

export default ParisWelcome;
