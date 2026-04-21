import { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { HeartPulse, Activity, BookOpen, Target, Users, Award, CheckCircle2, ChevronDown, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './InsuficienciaCardiaca.css';

const InsuficienciaCardiaca = () => {
  const [activeModule, setActiveModule] = useState(1);

  const { ref: heroRef,       inView: heroInView       } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: valueRef,      inView: valueInView      } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: audienceRef,   inView: audienceInView   } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: curriculumRef, inView: curriculumInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: waitlistRef,   inView: waitlistInView   } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: avalsRef,      inView: avalsInView      } = useInView({ triggerOnce: true, threshold: 0.1 });

  const objetivos = [
    "Fundamentos de la Insuficiencia Cardíaca",
    "Manejo Integral de la Insuficiencia Cardíaca",
    "Soportes Circulatorios Mecánicos (SCM)",
    "Asistencias Ventriculares de Larga Duración",
    "Trasplante Cardíaco",
    "Cuidados Paliativos y Ética",
    "Simulación y Toma de Decisiones",
  ];

  const modules = [
    { id: 1, title: "Fundamentos de la Insuficiencia Cardíaca Avanzada",                                          desc: "Clasificación avanzada, herramientas de estratificación y selección para terapias destino." },
    { id: 2, title: "Manejo Médico de la Insuficiencia Cardíaca Avanzada",                                        desc: "Optimización hemodinámica, uso racional de inotrópicos y terapias neurohumorales." },
    { id: 3, title: "Intervencionismo en la Insuficiencia Cardíaca Avanzada",                                     desc: "Procedimientos intervencionistas clave para el manejo de la insuficiencia cardíaca refractaria." },
    { id: 4, title: "El rol del Electrofisiólogo en la Insuficiencia Cardíaca",                                   desc: "Arritmias, resincronización cardíaca y desfibriladores en el paciente con IC avanzada." },
    { id: 5, title: "Empeoramiento en la Trayectoria de la Insuficiencia Cardíaca",                              desc: "Reconocimiento y manejo del deterioro clínico progresivo y optimización terapéutica." },
    { id: 6, title: "Ingreso del Paciente con Bajo Gasto Cardíaco y Necesidad de Soporte Circulatorio Mecánico", desc: "Criterios de activación, selección del dispositivo y manejo inicial del shock cardiogénico." },
    { id: 7, title: "Trasplante Cardíaco",                                                                        desc: "Indicaciones, criterios de urgencia, inmunosupresión y seguimiento agudo postrasplante." },
    { id: 8, title: "Asistencia Ventricular de Larga Duración (LVAD)",                                           desc: "Selección del paciente, manejo perioperatorio y seguimiento del dispositivo." },
    { id: 9, title: "Cuidados Paliativos y Ética en Insuficiencia Cardíaca",                                     desc: "Decisiones al final de la vida, comunicación con el paciente y familia, y marcos éticos en IC terminal." },
  ];

  const audience = [
    "Intensivistas", "Cardiólogos", "Urgenciólogos",
    "Anestesiólogos", "Enfermería Especializada", "Perfusionistas",
  ];

  return (
    <div className="ic-page">
      <Navbar />

      {/* HERO */}
      <section className="ic-hero">
        <div className="ic-hero-bg" />
        <div className="ic-hero-overlay" />
        <div className="ic-hero-inner hce-container">
          <div ref={heroRef} className={`ic-hero-content reveal ${heroInView ? 'active' : ''}`}>

            <div className="ic-badge">
              <HeartPulse size={14} />
              Educación Médica de Élite
            </div>

            <h1 className="ic-h1">
              Vanguardia en<br />
              <span className="ic-grad-text">Insuficiencia Cardíaca</span>
            </h1>

            <p className="ic-hero-sub">
              Domina el manejo farmacológico, hemodinámico y los soportes circulatorios en el paciente crítico con tecnología de simulación de alto realismo.
            </p>

            <div className="ic-alert-box">
              <div className="ic-alert-status">
                <span className="ic-pulse-dot" />
                <span className="ic-alert-label">Próxima Cohorte: Próximamente</span>
              </div>
              <p className="ic-alert-title">Inscripciones por abrir.</p>
              <button
                className="ic-btn-hero"
                onClick={() => document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' })}
              >
                Reserva tu prioridad <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* PROPUESTA DE VALOR */}
      <section className="ic-value-section">
        <div className="hce-container">
          <div ref={valueRef} className={`ic-value-wrap reveal ${valueInView ? 'active' : ''}`}>

            <div className="ic-value-header">
              <span className="ic-section-tag ic-section-tag--dark">Por qué elegirnos</span>
              <h2 className="ic-h2">
                Todo lo que necesitas<br />
                <span className="ic-grad-text">en un solo programa</span>
              </h2>
              <p className="ic-value-sub">9 módulos diseñados para profesionales exigentes que quieren resultados reales desde el primer día.</p>
            </div>

            <div className="ic-feat-cards">
              <div className="ic-feat-card">
                <div className="ic-feat-top">
                  <div className="ic-feat-icon ic-icon-blue"><Activity size={22} /></div>
                  <span className="ic-feat-num">6</span>
                </div>
                <p className="ic-feat-unit">meses de licencia</p>
                <h4 className="ic-feat-title">Simulación HARVI</h4>
                <p className="ic-feat-desc">Casos clínicos hemodinámicos en tiempo real.</p>
              </div>

              <div className="ic-feat-card ic-feat-card--accent">
                <div className="ic-feat-top">
                  <div className="ic-feat-icon ic-icon-green"><BookOpen size={22} /></div>
                  <span className="ic-feat-num">2</span>
                </div>
                <p className="ic-feat-unit">modalidades</p>
                <h4 className="ic-feat-title">Metodología Híbrida</h4>
                <p className="ic-feat-desc">Teoría asincrónica + talleres clínicos en vivo.</p>
              </div>

              <div className="ic-feat-card">
                <div className="ic-feat-top">
                  <div className="ic-feat-icon ic-icon-dark"><Target size={22} /></div>
                  <span className="ic-feat-num">4</span>
                </div>
                <p className="ic-feat-unit">meses de programa</p>
                <h4 className="ic-feat-title">Enfoque Intensivo</h4>
                <p className="ic-feat-desc">Aplicación inmediata en UCI desde el día uno.</p>
              </div>
            </div>

            <div className="ic-value-cta">
              <button
                className="ic-cta-btn ic-cta-btn--dark"
                onClick={() => document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' })}
              >
                Reserva tu lugar ahora <ArrowRight size={16} />
              </button>
              <span className="ic-cta-note">Cupos limitados · Próximamente</span>
            </div>

          </div>
        </div>
      </section>

      {/* AUDIENCIA */}
      <section className="ic-audience-section">
        <div className="hce-container">
          <div ref={audienceRef} className={`ic-audience-grid reveal ${audienceInView ? 'active' : ''}`}>

            <div className="ic-audience-text">
              <span className="ic-section-tag">Perfil de Ingreso</span>
              <h2 className="ic-h2">
                ¿A quién<br />
                <span className="ic-grad-text">dirigimos el éxito?</span>
              </h2>
              <p className="ic-audience-desc">
                Programa de alta especialidad diseñado para profesionales de la salud involucrados en el cuidado crítico cardiovascular.
              </p>
              <div className="ic-tags-grid">
                {audience.map((item, idx) => (
                  <div key={idx} className="ic-tag-item">
                    <span className="ic-tag-dot" />
                    {item}
                  </div>
                ))}
              </div>
              <button
                className="ic-cta-btn ic-cta-btn--light"
                onClick={() => document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' })}
              >
                Quiero inscribirme <ArrowRight size={16} />
              </button>
            </div>

            <div className="ic-audience-img-wrap">
              <img
                src="/assets/paginas/dirigido.png"
                alt="A quién está dirigido"
                className="ic-audience-img"
              />
              <div className="ic-float-card">
                <Users size={26} />
                <p>Expertos de todo el continente</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CURRÍCULO */}
      <section className="ic-curriculum-section" id="curriculum">
        <div className="hce-container">
          <div ref={curriculumRef} className={`ic-curriculum-grid reveal ${curriculumInView ? 'active' : ''}`}>

            <div className="ic-sidebar">
              <h2 className="ic-h2">
                Objetivos del <span className="ic-blue-text">Diplomado</span>
              </h2>
              <ul className="ic-objetivos-list">
                {objetivos.map((obj, idx) => (
                  <li key={idx} className="ic-objetivo-item">
                    <span className="ic-objetivo-dot" />
                    {obj}
                  </li>
                ))}
              </ul>
              <div className="ic-cert-card">
                <div className="ic-cert-icon"><Award size={26} /></div>
                <div>
                  <span className="ic-cert-label">Certificación</span>
                  <strong>Aval Internacional</strong>
                </div>
              </div>
              <button
                className="ic-cta-btn ic-cta-btn--blue"
                onClick={() => document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' })}
              >
                Asegura tu lugar <ArrowRight size={16} />
              </button>
            </div>

            <div className="ic-accordion">
              <p className="ic-modules-label">Módulos del Diplomado</p>
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className={`ic-acc-item ${activeModule === mod.id ? 'ic-acc-item--open' : ''}`}
                  onClick={() => setActiveModule(mod.id)}
                >
                  <div className="ic-acc-header">
                    <div className="ic-acc-left">
                      <span className="ic-acc-num">0{mod.id}</span>
                      <span className="ic-acc-title">{mod.title}</span>
                    </div>
                    <ChevronDown className="ic-acc-chevron" size={18} />
                  </div>
                  <div className="ic-acc-body">
                    <p>{mod.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="ic-waitlist-section" id="waitlist">
        <div className="hce-container">
          <div ref={waitlistRef} className={`ic-waitlist-box reveal ${waitlistInView ? 'active' : ''}`}>

            <div className="ic-waitlist-left">
              <h2 className="ic-h2 ic-h2--white">
                No te quedes de<br />
                <span className="ic-grad-text">espectador.</span>
              </h2>
              <p className="ic-waitlist-desc">
                Nuestros cupos son estrictamente limitados para garantizar acompañamiento personalizado. Únete a la lista prioritaria.
              </p>
              <div className="ic-priority-badge">
                <CheckCircle2 size={14} />
                Prioridad de inscripción
              </div>
            </div>

            <div className="ic-waitlist-form">
              <h3 className="ic-form-title">Lista Prioritaria</h3>
              <p className="ic-form-sub">Acceso exclusivo a becas anticipadas y plan de estudios detallado.</p>
              <form onSubmit={(e) => { e.preventDefault(); alert('¡Te hemos registrado con prioridad!'); }}>
                <div className="ic-field">
                  <label>Nombre completo</label>
                  <input type="text" placeholder="Ej. Dr. Mauricio Cardona" required />
                </div>
                <div className="ic-field">
                  <label>Email Profesional</label>
                  <input type="email" placeholder="doctor@tuinstitucion.com" required />
                </div>
                <button type="submit" className="ic-submit-btn">
                  Unirme a la lista prioritaria
                </button>
              </form>
            </div>

          </div>
        </div>
      </section>

      {/* AVALES */}
      <section className="ic-avales-section">
        <div className="hce-container">
          <div ref={avalsRef} className={`ic-avales-inner reveal ${avalsInView ? 'active' : ''}`}>
            <div className="ic-avales-text">
              <p className="ic-avales-label">Avalado Internacionalmente Por</p>
              <p>Programa con respaldo de la sociedad médica más importante en insuficiencia cardíaca y trasplante a nivel mundial.</p>
            </div>
            <div className="ic-avales-logo-wrap">
              <img src="/assets/componentes/ENDORSED-BY-ISHLT.png" alt="ISHLT" />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default InsuficienciaCardiaca;
