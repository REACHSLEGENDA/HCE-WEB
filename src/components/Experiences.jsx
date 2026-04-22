import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Star, ArrowRight, ShieldCheck, Zap, Globe, Sparkles, Heart, Stethoscope, Activity, Gamepad2, HeartPulse } from 'lucide-react';
import './Experiences.css';

const ExperienceCard = ({ title, description, link, img, imgClass, badge, badgeClass, delay, icon: Icon }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  
  return (
    <a href={link} ref={ref} className={`exp-premium-card reveal ${inView ? 'active' : ''} ${badge?.toUpperCase() === 'PRÓXIMAMENTE' ? 'disabled-card' : ''}`} style={{ transitionDelay: `${delay}s`, pointerEvents: badge?.toUpperCase() === 'PRÓXIMAMENTE' ? 'none' : 'auto' }}>
      <div className="card-glass-glow"></div>
      <div className="exp-img-container">
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
            img="/assets/componentes/Generated-Image-March-03-2026-11_28PM.png"
            badge="PRÓXIMAMENTE"
            badgeClass="badge-info"
          />
          <ExperienceCard 
            delay={0.2}
            icon={Stethoscope}
            title="ECMO Nursing Care Course"
            description="El primer entrenamiento 100% enfermería para enfermería. Lidera el cuidado crítico del paciente en soporte extracorpóreo."
            link="/ecmo-nursing-care"
            img="/assets/componentes/ecmo-nursing-dm.png"
            imgClass="zoom-nursing"
            badge="Próximamente"
            badgeClass="badge-info"
          />
          <ExperienceCard 
            delay={0.3}
            icon={HeartPulse}
            title="Paris International Diploma in ECMO"
            description="La especialización en ECMO transforma tu trayectoria. Desarrolla habilidades críticas que no solo potencian tu perfil profesional, sino que redefinen el estándar clínico de todo tu equipo."
            link="/paris-diploma-ecmo"
            img="/assets/componentes/WhatsApp-Image-2026-03-04-at-12.06.38-AM.jpeg"
          />
          <ExperienceCard 
            delay={0.4}
            icon={Gamepad2}
            title="ECMO SIM: Realidad Clínica"
            description="Fusionamos educación, simulación y tecnología inmersiva de vanguardia. Especialízate en el manejo del paciente crítico en un entorno de alta fidelidad, donde el error es aprendizaje y la seguridad del paciente es la prioridad."
            link="/simulador-ecmo-sim"
            img="/assets/componentes/ecmosim.png"
            badge="SIMULADOR"
            badgeClass="badge-warning"
          />
        </div>
      </div>
    </section>
  );
};

export default Experiences;
