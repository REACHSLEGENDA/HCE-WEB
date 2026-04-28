import React from 'react';
import { useInView } from 'react-intersection-observer';
import { MonitorPlay, BookOpen, Layers, UsersRound, Target, BrainCircuit, ShieldAlert, TrendingUp, GraduationCap, MapPin, Award, CheckCircle, ArrowRight, Download, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Nursing.css';

const FacultyCard = ({ src, role, name, country, flag, delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const [imgError, setImgError] = React.useState(false);
  
  return (
    <div ref={ref} className={`nursing-faculty-card reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="n-faculty-head">
        <img src={src} alt={name} className="n-faculty-img" />
        <div className="n-verified"><CheckCircle size={14} fill="#00d2ff" color="white" /></div>
      </div>
      <div className="n-faculty-info">
        <h3>{name}</h3>
        <span className="n-country">{country}</span>
        {flag && !imgError ? (
          <img 
            src={flag} 
            alt={country} 
            className="n-mini-flag" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="n-mini-flag-fallback"><Award size={14} color="#00d2ff" /></div>
        )}
        <p className="n-role">{role}</p>
      </div>
    </div>
  );
};

const PresencialCard = ({ flag, img, name, country, bio, delay }) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });
  return (
    <div ref={ref} className={`presencial-expert-card reveal ${inView ? 'active' : ''}`} style={{ transitionDelay: `${delay}s` }}>
      <div className="flag-overlay-bg" style={{ backgroundImage: `url(${flag})` }}></div>
      <div className="presencial-head-area">
        <img src={img} alt={name} className="presencial-main-img" />
      </div>
      <div className="presencial-body-area">
        <span className="p-expert-tag">FACULTAD PRESENCIAL</span>
        <h3 className="p-expert-name">{name}</h3>
        <span className="p-expert-loc">{country}</span>
        <p className="p-expert-bio">{bio}</p>
        <div className="p-expert-line"></div>
      </div>
    </div>
  );
};

import { useSEO } from '../hooks/useSEO';

const Nursing = () => {
  useSEO({
    title: 'ECMO Nursing Care',
    description: 'Programa de alta especialidad diseñado para profesionales de enfermería en cuidados intensivos. Domina el monitoreo y protocolos de pacientes en ECMO.',
    keywords: 'ECMO Nursing, enfermería intensiva, cuidados críticos, soporte extracorpóreo, capacitación enfermería, HCE Nursing Care'
  });

  const { ref: heroRef, inView: heroInView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const virtualFaculty = [
    { src: "/assets/instructores/p-carlosm.jpeg", name: "Perf. Carlos García Camacho", country: "ESPAÑA", flag: "https://flagcdn.com/w80/es.png", role: "Perfusionista Senior" },
    { src: "/assets/instructores/p-juanm.jpeg", name: "Perf. Juan Blanco Morillo", country: "ESPAÑA", flag: "https://flagcdn.com/w80/es.png", role: "Coord. Terapias Extracorpóreas" },
    { src: "/assets/instructores/p-eduardom.webp", name: "Enf. Eduardo Aguilar Rivera", country: "COSTA RICA", flag: "https://flagcdn.com/w80/cr.png", role: "Experto en Soporte Crítico" },
    { src: "/assets/instructores/p-moisem.png", name: "Perf. Moisés Espitia", country: "MÉXICO", flag: "https://flagcdn.com/w80/mx.png", role: "Líder de Perfusión Royal HC" },
    { src: "/assets/instructores/p-gonzalom.jpeg", name: "Perf. Gonzalo Cartes", country: "CHILE", flag: "https://flagcdn.com/w80/cl.png", role: "Enfermero Intensivista" },
    { src: "/assets/instructores/a2e51cc5-9cb6-412c-b92e-7b9c9dcfc69e.jpg", name: "Enf. Lisbeth Ocaña Albites", country: "PERÚ", flag: "https://flagcdn.com/w80/pe.png", role: "Líder Cardiovascular INCOR" },
    { src: "/assets/instructores/219e522e-5aff-409c-8ab3-7e3904b9f45d.jpg", name: "Perf. Hans Castro Rosero", country: "CHILE", flag: "https://flagcdn.com/w80/cl.png", role: "Especialista en Circulación" },
    { src: "/assets/instructores/de5ae3a6-8be9-41fe-a8e0-aae691d2172e.jpg", name: "Perfu. Mario Alejandro Meza", country: "COLOMBIA", flag: "https://flagcdn.com/w80/co.png", role: "Perfusionista Clínico" },
    { src: "/assets/instructores/846fd848-ef66-4481-883a-ed3427059004.jpg", name: "Enf. Maira Rezende Girardi", country: "BRASIL", flag: "https://flagcdn.com/w80/br.png", role: "Hospital Israelita Albert Einstein" },
    { src: "/assets/instructores/17520b78-52ae-4256-be3d-eaf541a51961.jpg", name: "Enf. Patricia Villazón Alcón", country: "ARGENTINA", flag: "https://flagcdn.com/w80/ar.png", role: "Experta en POCUS y ECMO" },
    { src: "/assets/instructores/172c41c8-98cd-42d7-9ac6-774a6d8eb608.jpg", name: "Enf. Edwin Sánchez", country: "SALVADOR", flag: "https://flagcdn.com/w80/sv.png", role: "Especialista UCI Pediátrica" },
    { src: "/assets/instructores/1be2aa8d-0d0f-4a45-92d8-e24eb76fcb84.jpg", name: "Enf. Miguel Ángel Albino", country: "PERÚ", flag: "https://flagcdn.com/w80/pe.png", role: "Gestión de Servicios de Salud" },
    { src: "/assets/instructores/4db1ce3a-243f-4330-9f6c-c8114140c1c8.jpg", name: "Enf. Elkin Peñaranda", country: "COLOMBIA", flag: "https://flagcdn.com/w80/co.png", role: "Perfusionista Clínica Medical Duarte" },
    { src: "/assets/instructores/8d969ec9-4374-4808-bc65-77bd8f39a5b5-scaled.jpg", name: "Perf. Erick Paul Morales Vega", country: "MÉXICO", flag: "https://flagcdn.com/w80/mx.png", role: "Especialista Hospital CIMA" },
    { src: "/assets/instructores/WhatsApp-Image-2025-06-26-at-20.38.16.jpeg", name: "Enf. María José Ayerbes Ceron", country: "COLOMBIA", flag: "https://flagcdn.com/w80/co.png", role: "Fundación Cardio Infantil" },
    { src: "/assets/instructores/WhatsApp-Image-2025-06-22-at-12.01.16-1.jpeg", name: "Lic. Ricardo Fernando Rosero", country: "ARGENTINA", flag: "https://flagcdn.com/w80/ar.png", role: "Fundación Favaloro" },
    { src: "/assets/instructores/WhatsApp-Image-2025-08-04-at-16.19.00.jpeg", name: "Lic. Fabio Salas Alvarez", country: "COSTA RICA", flag: "https://flagcdn.com/w80/cr.png", role: "Coordinador Hospital Calderón Guardia" },
    { src: "/assets/instructores/p-elianam.jpeg", name: "Perf. Eliana Cerón López", country: "ECUADOR", flag: "https://flagcdn.com/w80/ec.png", role: "Clínica Guayaquil" },
  ];

  return (
    <div className="nursing-page">
      <Navbar />
      
      {/* Business-Focused Hero */}
      <section className="nursing-hero">
        <div className="nursing-hero-overlay"></div>
        <div className="hce-container">
          <div ref={heroRef} className={`nursing-hero-content reveal ${heroInView ? 'active' : ''}`}>
            <h1 className="n-hero-title">
              <span className="n-hero-title-main">Formación por y para</span><br />
              <span className="n-hero-title-sub">Profesionales de Enfermería</span>
            </h1>
            <p className="n-hero-subtitle">
              Nuestro compromiso es consolidar un programa de capacitación de alta especialidad que te empodere como profesional de enfermería. A través de un modelo educativo de vanguardia, transformamos el cuidado del paciente con soporte ECMO en una práctica segura, técnica y profundamente humana.
              <br /><br />
              <strong>Nadie comprende mejor tu labor que quien la vive a diario.</strong><br/>
              Por eso, nuestro entrenamiento está diseñado y liderado por enfermería para enfermería. Entendemos tus retos y la precisión que exige cada segundo al pie de cama del paciente crítico en ECMO.
            </p>
            <div className="n-hero-actions">
              <button className="n-btn n-btn-brand">Inscríbete <ArrowRight size={18} /></button>
            </div>
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="n-experience-section section-padding">
        <div className="hce-container">
          <div className="n-section-header">
            <span className="section-badge">PROGRAMA DE ALTO RENDIMIENTO</span>
            <h2 className="n-title">Ecosistema de <span className="cyan-text">Formación.</span></h2>
          </div>

          <div className="n-training-grid">
            <div className="n-train-card featured">
              <div className="n-icon-box"><MonitorPlay size={32} /></div>
              <span className="n-card-badge">+ 20 profesores</span>
              <h3>Experiencia Teórica Virtual</h3>
              <p>Inmersión de aprendizaje asincrónica y sincrónica virtual, diseñada para adaptarse a tu ritmo de vida profesional sin sacrificar la profundidad académica.</p>
              <button className="n-card-cta">Inscripciones Abiertas <ArrowRight size={14} /></button>
            </div>
            <div className="n-train-card">
              <div className="n-icon-box"><BookOpen size={32} /></div>
              <h3>Experiencia Teórica Presencial</h3>
              <p>Ponencias Magistrales con ponentes profesionales de enfermería reconocidos a nivel internacional.</p>
              <button className="n-card-cta secondary">Consultar Sedes</button>
            </div>
            <div className="n-train-card">
              <div className="n-icon-box"><Layers size={32} /></div>
              <h3>Experiencia Práctica Presencial</h3>
              <p>Simulaciones de alta fidelidad con expertos reconocidos a nivel internacional.</p>
              <button className="n-card-cta secondary">Próximamente</button>
            </div>
          </div>

          <div className="n-training-footer sales">
            <p>Asegura tu cupo en la certificación líder en cuidados críticos ECMO. <strong>Cupos limitados por cohorte.</strong></p>
            <button className="n-sales-btn">
              Inscribirme al Curso Ahora
            </button>
          </div>

          <div className="n-brief-panel">
            <div className="n-panel-item">
              <div className="n-panel-head"><Target size={24} /> <h3>Propuesta de Valor:</h3></div>
              <p>Elevar los estándares de seguridad y eficiencia operativa mediante la especialización avanzada en terapias extracorpóreas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Outcomes Section */}
      <section className="n-outcomes-section">
        <div className="n-outcomes-bg"></div>
        <div className="hce-container">
          <div className="n-section-header light">
            <span className="section-badge">ROI & OUTCOMES</span>
            <h2 className="n-title-white">Valor Clínico e <span className="cyan-text">Institucional</span></h2>
          </div>

          <div className="n-outcomes-grid">
            <div className="n-outcome-card">
              <div className="n-o-num">01</div>
              <div className="n-o-icon"><BrainCircuit size={32} /></div>
              <h3>Liderazgo Estratégico</h3>
              <p>Rol clave en equipos multidisciplinarios con visión de liderazgo en cuidados críticos avanzados.</p>
            </div>
            <div className="n-outcome-card">
              <div className="n-o-num">02</div>
              <div className="n-o-icon"><ShieldAlert size={32} /></div>
              <h3>Eficiencia y Seguridad</h3>
              <p>Optimización de protocolos ELSO para reducir complicaciones y mejorar la seguridad del paciente.</p>
            </div>
            <div className="n-outcome-card">
              <div className="n-o-num">03</div>
              <div className="n-o-icon"><TrendingUp size={32} /></div>
              <h3>Cultura de Excelencia</h3>
              <p>Fisología y toma de decisiones basadas en evidencia científica y simulación constante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Virtual Faculty Marquee */}
      <section className="n-virtual-faculty">
        <div className="hce-container">
          <div className="n-section-header">
            <span className="section-badge">FACULTAD CIENTÍFICA</span>
            <h2 className="n-title">Expertos <span className="cyan-text">Virtuales.</span></h2>
            <p className="n-subtitle">18 Referentes mundiales integrados en nuestra plataforma de aprendizaje.</p>
          </div>
        </div>
        
        <div className="n-faculty-marquee">
          <div className="n-faculty-track">
            {[...virtualFaculty, ...virtualFaculty].map((f, i) => (
              <FacultyCard key={i} {...f} delay={0} />
            ))}
          </div>
        </div>
      </section>

      {/* Presencial Faculty - COMPLETE LIST */}
      <section className="n-presencial-faculty">
        <div className="n-presencial-bg-glow"></div>
        <div className="hce-container">
          <div className="n-section-header">
            <span className="section-badge">EXPERIENCIA IN-SITU</span>
            <h2 className="n-title">Facultad <span className="cyan-text">Presencial.</span></h2>
            <p className="n-subtitle">Expertos internacionales que guiarán el entrenamiento práctico de alta fidelidad.</p>
          </div>

          <div className="n-presencial-grid">
            <PresencialCard 
              delay={0.1}
              flag="https://flagcdn.com/w160/ec.png"
              img="/assets/instructores/p-elianam.jpeg"
              name="Perf. Eliana Cerón López"
              country="ECUADOR"
              bio="Perfusionista y Especialista en ECMO en la Clínica Guayaquil. Formada en centros de referencia de LATAM."
            />
            <PresencialCard 
              delay={0.2}
              flag="https://flagcdn.com/w160/es.png"
              img="/assets/instructores/p-carlosm.jpeg"
              name="Perf. Carlos García Camacho"
              country="ESPAÑA"
              bio="Ex-presidente de la Asociación Española de Perfusionistas. +30 años de experiencia técnica internacional."
            />
            <PresencialCard 
              delay={0.3}
              flag="https://flagcdn.com/w160/cl.png"
              img="/assets/instructores/p-christianm.png"
              name="Perf. Christian Fajardo"
              country="CHILE"
              bio="Coordinador de Perfusión Clínica U. de los Andes. Co-Autor del Manual de Emergencias ECMO."
            />
            <PresencialCard 
              delay={0.4}
              flag="https://flagcdn.com/w160/co.png"
              img="/assets/instructores/tatiana-jaramillo.webp"
              name="Enf. Estefanía Giraldo"
              country="COLOMBIA"
              bio="Coordinadora Programa ECMO Clínica Shaio. Centro GOLD ELSO. Magister en Enf. Cardiovascular."
            />
            <PresencialCard 
              delay={0.5}
              flag="https://flagcdn.com/w160/cr.png"
              img="/assets/instructores/p-eduardom.webp"
              name="Enf. Eduardo Aguilar Rivera"
              country="COSTA RICA"
              bio="Especialista en ECMO. Fue Coordinador del Programa de ECMO del Hospital Rafael Ángel Calderón Guardia."
            />
            <PresencialCard 
              delay={0.6}
              flag="https://flagcdn.com/w160/co.png"
              img="/assets/instructores/tatiana-jaramillo.jpg"
              name="MBA. Tatiana Jaramillo"
              country="COLOMBIA"
              bio="Especialista en Enf. en Críticos. Coordinadora del Programa de ECMO de la Clínica Shaio Centro GOLD ELSO."
            />
            <PresencialCard 
              delay={0.7}
              flag="https://flagcdn.com/w160/mx.png"
              img="/assets/instructores/p-moisem.png"
              name="Perf. Moisés Espitia"
              country="MÉXICO"
              bio="Jefe de Enfermería y Perfusión de ECMO Heart Team Mx. Más de 12 años de experiencia como docente."
            />
          </div>
          
          <div className="n-section-cta">
            <button className="n-sales-btn large">Inscribirme al Curso Ahora <ArrowRight size={20} /></button>
          </div>
        </div>
      </section>

      {/* FINAL SALES BANNER */}
      <section className="n-final-sales-section">
        <div className="hce-container">
          <div className="n-final-card">
            <div className="n-final-content">
              <span className="section-badge">ÚLTIMOS CUPOS DISPONIBLES</span>
              <h2>Transforma tu carrera en el cuidado crítico con <span className="cyan-text">ECMO Nursing.</span></h2>
              <p>Únete a la red global de enfermería líder en soporte extracorpóreo. Entrenamiento de élite para desafíos reales.</p>
              <div className="n-final-actions">
                <button className="btn-buy-final">Inscribirme al Curso Ahora <ArrowRight size={18} /></button>
                <button className="btn-info-final">Ver Plan de Estudios</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Nursing;
