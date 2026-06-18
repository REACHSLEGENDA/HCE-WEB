import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Star, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Heart, Stethoscope, Activity, Gamepad2, HeartPulse, Award } from 'lucide-react';
import './Experiences.css';

const NurseCap = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="m0 8.853 2.886 10.115c2.738-.403 5.899-.633 9.113-.633s6.375.23 9.467.675l-.353-.042 2.886-10.115c-9.502-4.225-15.141-4.448-23.999 0zm14.918 4.276h-2.071v2.071h-1.686v-2.071h-2.071v-1.686h2.071v-2.072h1.686v2.072h2.071z" />
  </svg>
);

const ExperienceCard = ({ title, description, link, img, imgClass, containerClass, badge, badgeClass, delay, icon: Icon }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  
  return (
    <a href={link} ref={ref} className={`exp-premium-card reveal ${inView ? 'active' : ''} ${badge?.toUpperCase() === 'PRÓXIMAMENTE' ? 'disabled-card' : ''}`} style={{ transitionDelay: `${delay}s`, pointerEvents: badge?.toUpperCase() === 'PRÓXIMAMENTE' ? 'none' : 'auto' }}>
      <div className="card-glass-glow"></div>
      <div className={`exp-img-container ${containerClass || ''}`}>
        {badge && <div className={`status-badge ${badgeClass}`}>{badge}</div>}
        <img src={img} alt={title} className={`exp-main-img ${imgClass || ''}`} />
        <div className="img-overlay-gradient"></div>
        {Icon && <div className="card-floating-icon"><Icon size={24} /></div>}
      </div>
      
      <div className="exp-content-body">
        <h3 className="exp-title-premium">{title}</h3>
        <p className="exp-desc-premium">{description}</p>
        <div className="exp-footer-premium">
            <span className="exp-link-action">
                <span>{badge?.toUpperCase() === 'PRÓXIMAMENTE' ? 'Próximamente' : 'Ver programa'}</span>
                {badge?.toUpperCase() !== 'PRÓXIMAMENTE' && <ArrowRight size={18} />}
            </span>
        </div>
      </div>
    </a>
  );
};

const Experiences = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="experiences-redesign-section" id="experiencias">
      <div className="bg-dots-pattern"></div>
      <div className="hce-container">
        <div ref={ref} className={`section-header-modern reveal ${inView ? 'active' : ''}`}>
          <div className="section-badge">
            <Sparkles size={16} /> ENTRENAMIENTOS DE ÉLITE
          </div>
          <h2 className="title-3d">Experiencias <span className="text-gradient">Transformadoras</span></h2>
          <p className="subtitle-modern">
            Diseñamos el futuro de la educación médica. Programas inmersivos con tecnología de simulación de vanguardia y aval internacional.
          </p>
        </div>

        <div className="experiences-grid-premium">
          <ExperienceCard 
            delay={0.1}
            icon={Heart}
            title="Manejo de avanzada en insuficiencia cardiaca"
            description="Domina los criterios de selección para asistencia ventricular y trasplante con simulación HARVI de alta precisión."
            link="/insuficiencia-cardiaca"
            img="/assets/componentes/exopins.png"
            badge="PRÓXIMAMENTE"
            badgeClass="badge-info"
          />
          <ExperienceCard
            delay={0.2}
            icon={NurseCap}
            title="ECMO Nursing Care Course"
            description="El primer entrenamiento 100% enfermería para enfermería. Lidera el cuidado crítico del paciente en soporte extracorpóreo."
            link="/ecmo-nursing-care"
            img="/assets/componentes/expnur.png"
          />
          <ExperienceCard
            delay={0.3}
            icon={Award}
            title="Paris International Diploma in ECMO"
            description="La especialización de mayor prestigio global en ECMO. Desarrolla competencias críticas para liderar equipos de soporte extracorpóreo al más alto nivel clínico."
            link="/paris-diploma-ecmo"
            img="/assets/componentes/expparis.png"
          />
          <ExperienceCard
            delay={0.4}
            icon={Gamepad2}
            title="ECMO SIM: Realidad Clínica"
            description="Simulación de alta fidelidad con tecnología inmersiva de vanguardia. Domina el manejo de escenarios críticos en un entorno clínico interactivo y seguro."
            link="/simulador-ecmo-sim"
            img="/assets/componentes/expsim.png"
            badge="SIMULADOR"
            badgeClass="badge-warning"
          />
        </div>
      </div>
    </section>
  );
};

export default Experiences;
