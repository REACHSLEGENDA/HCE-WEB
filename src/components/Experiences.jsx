import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Star, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Heart, Stethoscope, Activity, Gamepad2, HeartPulse, Award, Calendar } from 'lucide-react';
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

const ExperienceCard = ({ title, description, link, img, imgClass, containerClass, badge, badgeClass, delay, icon: Icon, startDate }) => {
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
        {startDate && (
          <div className="exp-start-date">
            <Calendar size={14} className="calendar-icon" />
            <span>{startDate}</span>
          </div>
        )}
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
            title="Diplomado de Manejo de Avanzada en Insuficiencia Cardiaca"
            description="Domina la trayectoria completa de la insuficiencia cardíaca avanzada: desde la optimización farmacológica y la indicación de soportes circulatorios mecánicos, hasta el trasplante cardíaco. Todo integrado mediante un aprendizaje interactivo y dinámico con HARVI."
            link="/insuficiencia-cardiaca"
            img="/assets/componentes/exopins.png"
            badge="PRÓXIMAMENTE"
            badgeClass="badge-info"
          />
          <ExperienceCard
            delay={0.2}
            icon={NurseCap}
            title="ECMO Nursing Care Course"
            description="El primer entrenamiento diseñado por y para enfermería. Lidera con seguridad y criterio clínico el cuidado integral del paciente crítico en soporte ECMO."
            link="/ecmo-nursing-care"
            img="/assets/componentes/expnur.png"
            badge="INSCRIPCIONES ABIERTAS"
            badgeClass="badge-danger"
            startDate="Inicio: 20 de Julio, 2026"
          />
          <ExperienceCard
            delay={0.3}
            icon={Award}
            title="Paris International Diploma in ECMO"
            description="Certifícate en el programa de mayor prestigio global en ECMO, liderado por los profesores Alain Combes (ex Presidente de EuroELSO) y Matthieu Schmidt (Presidente de EuroELSO actual), máximos referentes globales e investigadores de ECMO del Hospital la Pitié-Salpêtrière. Accede a la experiencia del centro ECMO más grande del mundo, directo de París a Latinoamérica."
            link="/paris-diploma-ecmo"
            img="/assets/componentes/expparis.png"
            badge="INSCRIPCIONES ABIERTAS"
            badgeClass="badge-danger"
            startDate="Inicio: 27 de Octubre, 2026"
          />
          <ExperienceCard
            delay={0.4}
            icon={Gamepad2}
            title="ECMO SIM: Realidad Clínica"
            description="Sumérgete en una experiencia de alta fidelidad. Toma decisiones críticas y domina el soporte ECMO V-V y V-A en un entorno virtual interactivo, intuitivo y seguro, diseñado para acelerar tu curva de aprendizaje y el de tu equipo multidisciplinario."
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
