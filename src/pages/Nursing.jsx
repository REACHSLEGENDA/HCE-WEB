import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
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
        <div className="n-verified"><CheckCircle size={14} fill="#e31837" color="white" /></div>
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
          <div className="n-mini-flag-fallback"><Award size={14} color="#e31837" /></div>
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
  const navigate = useNavigate();
  useSEO({
    title: 'ECMO Nursing Care',
    description: 'Programa de alta especialidad diseñado para profesionales de enfermería en cuidados intensivos. Domina el monitoreo y protocolos de pacientes en ECMO.',
    keywords: 'ECMO Nursing, enfermería intensiva, cuidados críticos, soporte extracorpóreo, capacitación enfermería, HCE Nursing Care'
  });

  const { ref: heroRef, inView: heroInView } = useInView({ triggerOnce: true, threshold: 0.1 });

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const targetDate = new Date('2026-07-20T00:00:00');
    const updateTimer = () => {
      const difference = targetDate.getTime() - new Date().getTime();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

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
      
      {/* Hero Banner Section */}
      <section className="nursing-hero-banner">
        <div className="n-hero-bg" />
        <div className="n-hero-overlay" />
        <div className="n-hero-banner-wrap hce-container">
          <div className="n-hero-text">
            <span style={{ color: '#e31837', fontWeight: '800', letterSpacing: '2px', marginBottom: '0.8rem', fontSize: '1.1rem', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }}>
              INICIAMOS EL 20 DE JULIO DE 2026
            </span>
            <span className="section-badge">PROGRAMA DE ALTA ESPECIALIDAD</span>
            <h1 className="n-hero-title-text">
              Entrénate en el Cuidado de Enfermería en ECMO
            </h1>
            <p className="n-hero-subtitle-text">
              Entrenamiento diseñado e impartido 100% por enfermería para enfermería.
            </p>

            {/* Cronómetro de inicio */}
            <div className="n-countdown-container" style={{ display: 'flex', gap: '15px', marginBottom: '2.5rem' }}>
              <div className="n-countdown-item" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '10px 15px', minWidth: '75px', textAlign: 'center' }}>
                <div className="n-countdown-val" style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff', fontFamily: 'Outfit', lineHeight: '1.2' }}>{timeLeft.days}</div>
                <div className="n-countdown-lbl" style={{ fontSize: '0.65rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Días</div>
              </div>
              <div className="n-countdown-item" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '10px 15px', minWidth: '75px', textAlign: 'center' }}>
                <div className="n-countdown-val" style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff', fontFamily: 'Outfit', lineHeight: '1.2' }}>{timeLeft.hours}</div>
                <div className="n-countdown-lbl" style={{ fontSize: '0.65rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Horas</div>
              </div>
              <div className="n-countdown-item" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '10px 15px', minWidth: '75px', textAlign: 'center' }}>
                <div className="n-countdown-val" style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ffffff', fontFamily: 'Outfit', lineHeight: '1.2' }}>{timeLeft.minutes}</div>
                <div className="n-countdown-lbl" style={{ fontSize: '0.65rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Minutos</div>
              </div>
              <div className="n-countdown-item" style={{ background: 'rgba(255, 255, 255, 0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '12px', padding: '10px 15px', minWidth: '75px', textAlign: 'center' }}>
                <div className="n-countdown-val" style={{ fontSize: '1.8rem', fontWeight: '900', color: '#e31837', fontFamily: 'Outfit', lineHeight: '1.2' }}>{timeLeft.seconds}</div>
                <div className="n-countdown-lbl" style={{ fontSize: '0.65rem', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>Segundos</div>
              </div>
            </div>

            <button 
              className="n-hero-cta-btn" 
              onClick={() => navigate('/inscripciones-ecmo-nursing')}
            >
              INSCRÍBETE AHORA
            </button>
          </div>
        </div>
      </section>

      {/* Hero content moved below the banner */}
      <section className="n-intro-section">
        <div className="hce-container">
          <div ref={heroRef} className={`n-intro-content reveal ${heroInView ? 'active' : ''}`}>
            <span className="section-badge">PROGRAMA DE ALTA ESPECIALIDAD</span>
            <h1 className="n-intro-title">
              Formación por y para <span className="red-text">Profesionales de Enfermería</span>
            </h1>
            <div className="n-intro-body">
              <div className="n-intro-text">
                <p>
                  Nuestro compromiso es consolidar un programa de capacitación de alta especialidad que te empodere como profesional de enfermería. A través de un modelo educativo de vanguardia, transformamos el cuidado del paciente con soporte ECMO en una práctica segura, técnica y profundamente humana.
                </p>
                <p>
                  <strong>Nadie comprende mejor tu labor que quien la vive a diario.</strong> Por eso, nuestro entrenamiento está diseñado y liderado por enfermería para enfermería. Entendemos tus retos y la precisión que exige cada segundo al pie de cama del paciente crítico en ECMO.
                </p>
              </div>
              <div className="n-intro-sidebar">
                <div className="n-intro-card-box">
                  <h4>Entrenamiento HCE</h4>
                  <p>Asegura tu lugar en el entrenamiento líder en el cuidado de enfermería en ECMO. Cupos limitados.</p>
                  <button className="n-btn n-btn-brand" onClick={() => navigate('/inscripciones-ecmo-nursing')}>
                    Inscríbete Ahora <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Aval de FLECI */}
      <section className="n-endorsement-section">
        <div className="hce-container">
          <div className="n-endorsement-card">
            <img 
              src="/assets/componentes/fleci.jpeg" 
              alt="Aval FLECI" 
              className="n-endorsement-img"
            />
            <div className="n-endorsement-text">
              <span className="section-badge" style={{ marginBottom: '0.8rem', display: 'inline-block' }}>
                AVAL ACADÉMICO INTERNACIONAL
              </span>
              <h3>Programa Avalado por FLECI</h3>
              <p>
                Este entrenamiento cuenta con el aval y reconocimiento científico de la <strong>Federación Latinoamericana de Enfermería en Cuidado Intensivo</strong> (FLECI).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 1. Metodología — "Cómo aprenderás" */}
      <section className="n-sec-padding n-methodology-section">
        <div className="hce-container">
          <div className="n-sec-header center">
            <span className="n-sec-badge">METODOLOGÍA</span>
            <h2 className="n-sec-title">Un método diseñado por enfermería, validado por la evidencia</h2>
            <p className="n-sec-subtitle">Estructura pedagógica optimizada para el Dominio del Soporte ECMO.</p>
          </div>

          <div className="n-methodology-grid">
            {/* Card 1 */}
            <div className="n-card-base n-phase-card">
              <div className="n-phase-top">
                <div className="n-circle-icon">
                  <BookOpen size={26} />
                </div>
                <span className="n-phase-num">01</span>
              </div>
              <h3>Fase asincrónica</h3>
              <p><strong>"Aprende a tu ritmo"</strong>: Plataforma flexible que respeta tus turnos de trabajo, con acceso completo a clases pregrabadas, biblioteca de artículos científicos y guías ELSO.</p>
            </div>

            {/* Card 2 */}
            <div className="n-card-base n-phase-card">
              <div className="n-phase-top">
                <div className="n-circle-icon">
                  <UsersRound size={26} />
                </div>
                <span className="n-phase-num">02</span>
              </div>
              <h3>Sesiones en vivo</h3>
              <p><strong>"Consolida con expertos"</strong>: Tutorías en tiempo real dirigidas a la resolución de dudas, análisis exhaustivo de casos clínicos y clave de especialistas de ECMO con amplia experiencia.</p>
            </div>

            {/* Card 3 */}
            <div className="n-card-base n-phase-card">
              <div className="n-phase-top">
                <div className="n-circle-icon">
                  <BrainCircuit size={26} />
                </div>
                <span className="n-phase-num">03</span>
              </div>
              <h3>Simulación clínica</h3>
              <p><strong>"Practica sin riesgo"</strong>: Práctica deliberada con simulaciones de fidelidad progresiva, donde resolverás complicaciones mecánicas y clínicas reales en un entorno controlado y seguro.</p>
            </div>
          </div>

          <div className="n-methodology-footer">
            "Liderado bajo un enfoque par a par: enfermeros especialistas en ECMO como tus instructores."
          </div>
        </div>
      </section>

      {/* 2. Banda de cifras de impacto */}
      <section className="n-stats-band">
        <div className="hce-container">
          <div className="n-stats-grid">
            <div className="n-stat-card">
              <span className="n-stat-num">86–88%</span>
              <span className="n-stat-label">del tiempo de atención directa al paciente en ECMO lo brinda enfermería.</span>
            </div>
            <div className="n-stat-card">
              <span className="n-stat-num">1:1</span>
              <span className="n-stat-label">ratio ideal para la atención de un paciente en soporte ECMO en la UCI.</span>
            </div>
            <div className="n-stat-card">
              <span className="n-stat-num">+20</span>
              <span className="n-stat-label">expertos internacionales acompañando activamente tu formación.</span>
            </div>
            <div className="n-stat-card">
              <span className="n-stat-num">2 meses</span>
              <span className="n-stat-label">programa estructurado de aprendizaje híbrido con inmersión práctica final.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Qué lograrás al terminar */}
      <section className="n-sec-padding">
        <div className="hce-container">
          <div className="n-sec-header">
            <span className="n-sec-badge">RESULTADOS</span>
            <h2 className="n-sec-title">Al finalizar el curso serás capaz de:</h2>
            <p className="n-sec-subtitle">Competencias críticas que integrarás a tu práctica clínica diaria.</p>
          </div>

          <div className="n-outcomes-list-grid">
            <div className="n-outcome-list-item">
              <div className="n-outcome-icon-wrapper">
                <CheckCircle size={16} strokeWidth={3} />
              </div>
              <div className="n-outcome-text">
                <h4>Fisiología y Hemodinamia</h4>
                <p>Comprender a profundidad la fisiología y hemodinamia de las modalidades V-V y V-A, diferenciando con precisión sus indicaciones clínicas.</p>
              </div>
            </div>

            <div className="n-outcome-list-item">
              <div className="n-outcome-icon-wrapper">
                <CheckCircle size={16} strokeWidth={3} />
              </div>
              <div className="n-outcome-text">
                <h4>Monitoreo del Circuito</h4>
                <p>Ejecutar protocolos estandarizados de monitoreo de componentes (consola, bomba centrífuga y oxigenador) bajo lineamientos internacionales.</p>
              </div>
            </div>

            <div className="n-outcome-list-item">
              <div className="n-outcome-icon-wrapper">
                <CheckCircle size={16} strokeWidth={3} />
              </div>
              <div className="n-outcome-text">
                <h4>Detección de Complicaciones</h4>
                <p>Detectar de forma precoz complicaciones clínicas (hemólisis, sangrados) y mecánicas (falla de bomba, embolismo aéreo, falla de oxigenador).</p>
              </div>
            </div>

            <div className="n-outcome-list-item">
              <div className="n-outcome-icon-wrapper">
                <CheckCircle size={16} strokeWidth={3} />
              </div>
              <div className="n-outcome-text">
                <h4>Resolución de Crisis</h4>
                <p>Resolver situaciones críticas en equipo multidisciplinario, reduciendo al mínimo la latencia de respuesta ante emergencias.</p>
              </div>
            </div>

            <div className="n-outcome-list-item">
              <div className="n-outcome-icon-wrapper">
                <CheckCircle size={16} strokeWidth={3} />
              </div>
              <div className="n-outcome-text">
                <h4>Gestión de Recursos en Crisis (CRM)</h4>
                <p>Aplicar principios fundamentales de CRM, incluyendo liderazgo efectivo y comunicación en bucle cerrado a pie de cama.</p>
              </div>
            </div>

            <div className="n-outcome-list-item">
              <div className="n-outcome-icon-wrapper">
                <CheckCircle size={16} strokeWidth={3} />
              </div>
              <div className="n-outcome-text">
                <h4>Consolidación de Juicio Clínico</h4>
                <p>Fortalecer la toma de decisiones y el criterio de vigilancia del paciente crítico de alta complejidad en soporte vital extracorpóreo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Itinerario / Estructura del programa */}
      <section className="n-sec-padding n-itinerary-section">
        <div className="hce-container">
          <div className="n-sec-header center">
            <span className="n-sec-badge">ITINERARIO</span>
            <h2 className="n-sec-title">Tu recorrido formativo, fase por fase</h2>
            <p className="n-sec-subtitle">Un diseño curricular que combina la flexibilidad teórica con la rigurosidad práctica.</p>
          </div>

          <div className="n-timeline-container">
            {/* Step 1 */}
            <div className="n-card-base n-timeline-step">
              <span className="n-timeline-badge">Semanas 1 a 7</span>
              <h3>Fase teórica e híbrida</h3>
              <p>Aprendizaje combinado a través de nuestra plataforma virtual. Cubre de manera progresiva los fundamentos de la terapia, modalidades clínicas, monitoreo y prevención de complicaciones.</p>
            </div>

            {/* Step 2 */}
            <div className="n-card-base n-timeline-step">
              <span className="n-timeline-badge">Semana 8</span>
              <h3>Inmersión práctica intensiva</h3>
              <p>Sesiones presenciales intensivas enfocadas en simulación de alta fidelidad, talleres de destrezas operativas con circuitos reales de ECMO y sesiones estructuradas de debriefing.</p>
            </div>
          </div>

          <div className="n-chips-header">Temas Centrales de Aprendizaje</div>
          <div className="n-chips-wrapper">
            <span className="n-chip-tag">Fisiología y hemodinamia</span>
            <span className="n-chip-tag">Modalidades V-V y V-A</span>
            <span className="n-chip-tag">Monitoreo del circuito</span>
            <span className="n-chip-tag">Detección de complicaciones</span>
            <span className="n-chip-tag">Manejo de crisis (CRM)</span>
          </div>
        </div>
      </section>

      {/* Sección Temario PDF */}
      <section className="n-sec-padding n-syllabus-section">
        <div className="hce-container">
          <div className="n-sec-header center">
            <span className="n-sec-badge">PLAN DE ESTUDIOS</span>
            <h2 className="n-sec-title">Temario y Contenido Detallado</h2>
            <p className="n-sec-subtitle">Consulte el programa completo de clases, módulos y contenidos del curso ECMO Nursing Care.</p>
          </div>

          <div className="n-syllabus-container">
            <div className="n-syllabus-viewer-wrapper">
              <iframe
                src="/Programa_ECMO_Nursing_Virtual_clases_.pdf#toolbar=1"
                title="Temario ECMO Nursing Care"
                className="n-syllabus-iframe"
                width="100%"
                height="600px"
              />
            </div>
            
            <div className="n-syllabus-download-box">
              <div className="n-syllabus-info">
                <h3>¿Prefiere descargarlo?</h3>
                <p>Descargue el documento PDF oficial con la programación detallada de clases, fechas de tutorías y contenidos prácticos.</p>
              </div>
              <a 
                href="/Programa_ECMO_Nursing_Virtual_clases_.pdf" 
                download="Programa_ECMO_Nursing_Virtual_clases_.pdf"
                className="n-btn n-btn-secondary"
              >
                <Download size={18} /> Descargar PDF Completo
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Recursos y equipamiento */}
      <section className="n-sec-padding n-equipment-section">
        <div className="hce-container">
          <div className="n-sec-header center">
            <span className="n-sec-badge">EQUIPAMIENTO</span>
            <h2 className="n-sec-title white">Entrenas con tecnología real, no con diapositivas</h2>
            <p className="n-sec-subtitle white-muted">Acceso directo a los dispositivos estándar utilizados en las unidades de cuidados intensivos líderes.</p>
          </div>

          <div className="n-equipment-grid">
            {/* Card 1 */}
            <div className="n-equipment-card">
              <div className="n-circle-icon accent">
                <MonitorPlay size={24} />
              </div>
              <h3>Consolas ECMO</h3>
              <p>Práctica directa en consolas clínicas reales de marcas de referencia mundial (Getinge, Medtronic, Sorin).</p>
            </div>

            {/* Card 2 */}
            <div className="n-equipment-card">
              <div className="n-circle-icon accent">
                <BrainCircuit size={24} />
              </div>
              <h3>Simulador ECMO SIM</h3>
              <p>Integración de simuladores clínicos interactivos especializados para escenarios críticos y de alta fidelidad.</p>
            </div>

            {/* Card 3 */}
            <div className="n-equipment-card">
              <div className="n-circle-icon accent">
                <Layers size={24} />
              </div>
              <h3>Circuitos Reales</h3>
              <p>Práctica deliberada en cebado, purgado y manipulación directa de líneas y circuitos reales de soporte vital.</p>
            </div>

            {/* Card 4 */}
            <div className="n-equipment-card">
              <div className="n-circle-icon accent">
                <GraduationCap size={24} />
              </div>
              <h3>Estaciones de Destreza</h3>
              <p>Guiadas de manera personalizada por instructores certificados bajo estándares de cuidados intensivos.</p>
            </div>
          </div>

          <p className="n-equipment-disclaimer">* Nota de acreditación: Equipamiento sujeto a disponibilidad por sede y taller práctico.</p>
        </div>
      </section>

      {/* 6. "Cómo se evalúa tu aprendizaje" */}
      <section className="n-sec-padding">
        <div className="hce-container">
          <div className="n-sec-header center">
            <span className="n-sec-badge">EVALUACIÓN</span>
            <h2 className="n-sec-title">Tu progreso, medido en cada etapa</h2>
            <p className="n-sec-subtitle">Un sistema integral que asegura que integras los conocimientos de forma teórica y procedimental.</p>
          </div>

          <div className="n-evaluation-grid">
            {/* Step 1 */}
            <div className="n-card-base n-eval-card">
              <div className="n-eval-header">
                <div className="n-circle-icon">
                  <Target size={22} />
                </div>
                <span className="n-eval-step-num">Paso 1</span>
              </div>
              <h3>Diagnóstico inicial</h3>
              <p>Identificamos tu nivel inicial de conocimientos para personalizar y enfocar el proceso de aprendizaje.</p>
            </div>

            {/* Step 2 */}
            <div className="n-card-base n-eval-card">
              <div className="n-eval-header">
                <div className="n-circle-icon">
                  <TrendingUp size={22} />
                </div>
                <span className="n-eval-step-num">Paso 2</span>
              </div>
              <h3>Conocimiento teórico</h3>
              <p>Evaluación comparativa (antes y después) de conceptos clave, guías internacionales y protocolos de monitoreo.</p>
            </div>

            {/* Step 3 */}
            <div className="n-card-base n-eval-card">
              <div className="n-eval-header">
                <div className="n-circle-icon">
                  <Award size={22} />
                </div>
                <span className="n-eval-step-num">Paso 3</span>
              </div>
              <h3>Desempeño práctico</h3>
              <p>Aplicación de listas de cotejo de destrezas y rúbricas estructuradas ELSO en entornos de simulación clínica.</p>
            </div>

            {/* Step 4 */}
            <div className="n-card-base n-eval-card">
              <div className="n-circle-icon">
                <UsersRound size={22} />
              </div>
              <h3>Debriefing estructurado</h3>
              <p>Retroalimentación enfocada en la toma de decisiones, la comunicación en crisis y el análisis constructivo de los casos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Virtual Faculty Marquee */}
      <section className="n-virtual-faculty">
        <div className="hce-container">
          <div className="n-section-header">
            <span className="section-badge">FACULTAD CIENTÍFICA</span>
            <h2 className="n-title">Expertos <span className="red-text">Virtuales.</span></h2>
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
            <h2 className="n-title">Facultad <span className="red-text">Presencial.</span></h2>
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
            <button className="n-sales-btn large" onClick={() => navigate('/inscripciones-ecmo-nursing')}>Inscribirme al Curso Ahora <ArrowRight size={20} /></button>
          </div>
        </div>
      </section>

      {/* FINAL SALES BANNER */}
      <section className="n-final-sales-section" id="final-cta">
        <div className="hce-container">
          <div className="n-final-card">
            <div className="n-final-content">
              <span className="section-badge">ÚLTIMOS CUPOS DISPONIBLES</span>
              <h2>Empodera tu práctica. <span className="red-text">Salva más vidas.</span></h2>
              <p>Formación de alta especialidad en ECMO, liderada por enfermería, para enfermería.</p>
              <div className="n-final-actions">
                <button className="btn-buy-final" onClick={() => navigate('/inscripciones-ecmo-nursing')}>Reserva tu lugar <ArrowRight size={18} /></button>
                <button className="btn-info-final" onClick={() => window.open('/Programa_ECMO_Nursing_Virtual_clases_.pdf', '_blank')}>Ver Plan de Estudios</button>
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
