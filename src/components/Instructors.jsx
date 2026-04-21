import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Users, GraduationCap, MapPin, Award } from 'lucide-react';
import './Instructors.css';

const InstructorCard = ({ src, role, name, country, delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div ref={ref} className={`expert-profile-card reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="expert-image-area">
        <img src={src} alt={name} />
        <div className="expert-overlay">
          <div className="expert-stats">
            <div className="e-stat"><Award size={14} /> <span>Senior Expert</span></div>
            <div className="e-stat"><MapPin size={14} /> <span>{country || 'Francia'}</span></div>
          </div>
        </div>
      </div>
      <div className="expert-meta">
        <span className="expert-role-label">{role}</span>
        <h3 className="expert-full-name">{name}</h3>
        <div className="expert-bio-peak">Líder global en soporte extracorpóreo y cuidados intensivos advanced.</div>
        <div className="expert-h-line"></div>
      </div>
    </div>
  );
};

const Instructors = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="faculty-master-section" id="instructores">
      <div className="faculty-bg-elements">
        <div className="f-circle f-c1"></div>
        <div className="f-circle f-c2"></div>
      </div>
      <div className="hce-container">
        <div ref={ref} className={`faculty-header-block reveal ${inView ? 'active' : ''}`}>
          <div className="faculty-tag">
            <GraduationCap size={16} /> Facultad de élite
          </div>
          <h2 className="faculty-title">Referentes <span className="text-gradient">mundiales</span></h2>
          <p className="faculty-subtitle">
            Aprende de los líderes que están definiendo el futuro de la medicina crítica a nivel global.
          </p>
        </div>

        <div className="faculty-grid-modern">
          <InstructorCard 
            delay={0.1} 
            src="/assets/componentes/Alain-Combes.jpg" 
            role="Director del Programa" 
            name="Prof. Alain Combes" 
            country="Francia - Pitié Salpêtrière"
          />
          <InstructorCard 
            delay={0.2} 
            src="/assets/componentes/Alain-Combes.png" 
            role="Presidente Científico" 
            name="Prof. Matthieu Schmidt" 
            country="Francia - Pitié Salpêtrière"
          />
          <InstructorCard 
            delay={0.3} 
            src="/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-10-1.jpeg" 
            role="CEO Pratico Santé" 
            name="Enf. Hugo Guillou" 
            country="Francia"
          />
          <InstructorCard 
            delay={0.4} 
            src="/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-7-1.jpeg" 
            role="Presidente Pratico Santé" 
            name="Enf. Emric Besnard" 
            country="Francia"
          />
        </div>

        <div className={`faculty-bottom-call reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: '0.5s' }}>
          <div className="f-call-icon"><Users size={24} /></div>
          <p>
            Nuestros docentes son un estándar de excelencia en educación ECMO: combinan décadas de experiencia clínica en centros de referencia de Europa, Estados Unidos y Latinoamérica.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Instructors;
