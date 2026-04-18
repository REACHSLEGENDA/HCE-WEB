import React from 'react';
import { useInView } from 'react-intersection-observer';
import { MessageSquare, Quote, Star, CheckCircle } from 'lucide-react';
import './Testimonials.css';

const TestimonialCard = ({ img, name, role, text, delay }) => {
  return (
    <div className="premium-testimonial-card">
      <div className="testi-glass-blur"></div>
      <div className="testi-avatar-group">
        <div className="avatar-ring">
          <img src={img} alt={name} onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`; }} />
          <div className="verified-badge"><CheckCircle size={12} fill="var(--cyan-bright)" color="white" /></div>
        </div>
        <div className="testi-user-meta">
          <h4 className="testi-user-name">{name}</h4>
          <span className="testi-user-role">{role}</span>
        </div>
      </div>
      
      <div className="testi-stars-row">
        {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="var(--accent)" color="var(--accent)" />)}
      </div>

      <div className="testi-content-area">
        <Quote className="opening-quote" size={24} />
        <p className="testi-text-body">{text}</p>
      </div>
    </div>
  );
};

const Testimonials = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const testimonials = [
    {
      img: "https://healthcareexp.com/wp-content/uploads/2024/11/aasd.png",
      name: "Dr. Carlos Durán",
      role: "Cirujano Pediatra - Hospital Nac. de Niños",
      text: "La herramienta ECMO Sim es sumamente didáctica. Una oportunidad única de entrenamiento para incursionar en el mundo del soporte extracorpóreo."
    },
    {
      img: "https://healthcareexp.com/wp-content/uploads/2024/11/asdsdasdas.png",
      name: "Lic. Daniel Rodríguez",
      role: "Perfusionista - Grupo ECMO México",
      text: "Healthcare Training Experience brinda alta calidad en capacitación y actualización técnica. Es vital para elevar los estándares del equipo."
    },
    {
      img: "https://healthcareexp.com/wp-content/uploads/2024/11/xsczc.png",
      name: "Dra. Andrea Martínez",
      role: "Perfusionista - Hospital Benjamin Bloom",
      text: "Excelente herramienta para el intercambio de conocimientos con ponentes internacionales de México y Francia. Muy productivo."
    },
    {
      img: "https://healthcareexp.com/wp-content/uploads/2024/11/dgf.png",
      name: "Dr. Elias Escalante",
      role: "Intensivista Pediatra",
      text: "Ha sido fabuloso capacitarnos con el simulador en un entorno pequeño. Muy eficiente para muchos profesionales a la vez."
    },
    {
      img: "https://healthcareexp.com/wp-content/uploads/2024/11/Sin-titulo-2.png",
      name: "Dr. David Castillo",
      role: "Subdirector Médico - Hospital Benjamin Bloom",
      text: "La constante capacitación es clave para el éxito del equipo. El seminario de conceptos generales fue sumamente satisfactorio."
    }
  ];

  return (
    <section className="testimonials-modern-section" id="testimonios">
      <div className="testimonials-bg-glow"></div>
      <div className="hce-container">
        <div ref={ref} className={`testimonials-header reveal ${inView ? 'active' : ''}`}>
          <div className="testi-tag">
            <MessageSquare size={16} /> Voces de éxito
          </div>
          <h2 className="testi-headline">Impacto en la <span>práctica clínica</span></h2>
          <p className="testi-subheadline">
            Historias reales de profesionales que han fortalecido su práctica con nuestra metodología.
          </p>
        </div>
      </div>

      <div className="testi-marquee-wrapper">
        <div className="testi-track">
          {[...testimonials, ...testimonials].map((t, idx) => (
            <TestimonialCard key={idx} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
