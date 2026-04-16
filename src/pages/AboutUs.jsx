import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Globe, Users, Activity, Shield, Sparkles, ArrowRight, PlayCircle, Award, Target, MonitorPlay, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './AboutUs.css'; 

const AboutUs = () => {
  const { ref: heroRef,     inView: heroInView     } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: queRef,      inView: queInView      } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: manifestRef, inView: manifestInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: historyRef,  inView: historyInView  } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: mvRef,       inView: mvInView       } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: methodRef,   inView: methodInView   } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: coreRef,     inView: coreInView     } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: statsRef,    inView: statsInView    } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div className="au-page">
      <Navbar />

      {/* ── HERO SECTION ── */}
      <section className="au-hero">
        <div 
          className="au-hero-bg"
          style={{ backgroundImage: "url('https://raw.githubusercontent.com/REACHSLEGENDA/Imagenes/refs/heads/main/Generated%20Image%20April%2016%2C%202026%20-%201_12AM.jpg')" }}
        ></div>
        <div className="au-hero-overlay"></div>

        <div className="hce-container">
          <div ref={heroRef} className={`au-hero-content au-reveal ${heroInView ? 'active' : ''}`}>
            <div className="au-badge">
              <Sparkles size={16} />
              MÁS ALLÁ DE LA TEORÍA
            </div>
            
            <h1 className="au-h1">
              Reinventando la <br/>
              <span className="au-gradient-text">Educación Médica</span>
            </h1>
            
            <p className="au-hero-desc">
              Fusionamos simulación inmersiva, tecnología clínica y experiencia internacional. Prepárate para el manejo del paciente crítico sin comprometer la vida real.
            </p>

            <div className="au-hero-actions">
              <button 
                onClick={() => document.getElementById('manifiesto').scrollIntoView({ behavior: 'smooth' })}
                className="au-btn au-btn-primary"
              >
                Conoce a HCE <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── QUÉ ES HCE ── */}
      <section className="au-que-section">
        <div className="hce-container">
          <div ref={queRef} className={`au-que-grid au-reveal ${queInView ? 'active' : ''}`}>

            <div className="au-que-logo-side">
              <div className="au-que-logo-frame">
                <div className="au-que-logo-ring au-que-logo-ring--1" />
                <div className="au-que-logo-ring au-que-logo-ring--2" />
                <img
                  src="https://raw.githubusercontent.com/REACHSLEGENDA/Imagenes/refs/heads/main/logo-hce-1-1.png"
                  alt="HCE Logo"
                  className="au-que-logo"
                />
              </div>
            </div>

            <div className="au-que-text">
              <div className="au-que-accent-line" />
              <span className="au-tag">¿Qué es HCE?</span>
              <h2 className="au-h2">
                Healthcare Clinical <span className="au-gradient-text">Experience</span>
              </h2>
              
              <p className="au-lead">
                Institución educativa especializada en el entrenamiento de alta complejidad para el manejo del paciente crítico cardiovascular.
              </p>

              <div className="au-que-features">
                <div className="au-q-feat">
                  <div className="au-q-feat-icon"><Zap size={18} /></div>
                  <p><strong>Ecosistema Disruptivo:</strong> No somos una universidad convencional. Fusionamos simulación, tecnología y clínica real.</p>
                </div>
                <div className="au-q-feat">
                  <div className="au-q-feat-icon"><Globe size={18} /></div>
                  <p><strong>Impacto Regional:</strong> Preparamos a los equipos médicos líderes de Latinoamérica con estándares internacionales.</p>
                </div>
              </div>

              <div className="au-que-stats">
                <div className="au-que-stat">
                   <div className="au-stat-mini-icon"><Users size={14} /></div>
                  <strong>1,500+</strong><span>Profesionales</span>
                </div>
                <div className="au-que-stat-divider" />
                <div className="au-que-stat">
                   <div className="au-stat-mini-icon"><Globe size={14} /></div>
                  <strong>15+</strong><span>Países</span>
                </div>
                <div className="au-que-stat-divider" />
                <div className="au-que-stat">
                   <div className="au-stat-mini-icon"><Award size={14} /></div>
                  <strong>4</strong><span>Diplomados</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── MANIFIESTO ── */}
      <section className="au-manifesto" id="manifiesto">
        <div className="hce-container">
          <div ref={manifestRef} className={`au-man-grid au-reveal ${manifestInView ? 'active' : ''}`}>

            <div className="au-man-left">
              <span className="au-tag">Nuestro Manifiesto</span>
              <blockquote className="au-man-quote">
                "No formamos médicos.<br />
                <span className="au-gradient-text">Entrenamos a la élite.</span>"
              </blockquote>
              <p className="au-man-body">
                Somos una institución global dedicada exclusivamente al paciente en estado crítico cardiovascular. Las clases tradicionales ya no son suficientes — el error de hoy cuesta vidas reales mañana.
              </p>
              <p className="au-man-body">
                Construimos ecosistemas de aprendizaje donde <strong>el error es tu mejor maestro</strong>. Te equivocas en el simulador para que tu respuesta clínica real sea automática y precisa.
              </p>
            </div>

            <div className="au-man-right">
              <div className="au-man-card au-man-card--1">
                <span className="au-man-card-num">2,000<sup>+</sup></span>
                <p>Profesionales entrenados en Latinoamérica</p>
              </div>
              <div className="au-man-card au-man-card--2">
                <span className="au-man-card-num">15<sup>+</sup></span>
                <p>Países con presencia activa</p>
              </div>
              <div className="au-man-card au-man-card--3">
                <Globe size={26} />
                <p>Red de expertos internacionales en ECMO y cuidado crítico</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── HISTORIA ── */}
      <section className="au-history">
        <div className="hce-container">
          <div ref={historyRef} className={`au-history-grid au-reveal ${historyInView ? 'active' : ''}`}>

            <div className="au-history-img-wrap">
              <img
                src="https://healthcareexp.com/wp-content/uploads/2025/04/DSC_0311.jpg"
                alt="Historia HCE"
                className="au-history-img"
              />
              <div className="au-history-badge">
                <span className="au-history-year">2018</span>
                <p>Año de fundación</p>
              </div>
            </div>

            <div className="au-history-text">
              <span className="au-tag">Nuestra Historia</span>
              <h2 className="au-h2">
                Nació de una <span className="au-gradient-text">frustración real.</span>
              </h2>
              <p>
                En 2018, un grupo de intensivistas latinoamericanos llegó a una certeza: la brecha entre la educación médica tradicional y la realidad de la UCI era inaceptable.
              </p>
              <p>
                Fundaron HCE con una sola misión — llevar formación de élite a Latinoamérica. Comenzaron con un primer curso ECMO en Ciudad de México, 18 participantes y un simulador prestado.
              </p>
              <p>
                Hoy operamos en más de 15 países, hemos entrenado a más de 2,000 profesionales y somos el único programa avalado por <strong>ELSO</strong> e <strong>ISHLT</strong> en la región.
              </p>

              <div className="au-history-timeline">
                <div className="au-tl-item">
                  <span className="au-tl-year">2018</span>
                  <p>Primer curso ECMO · CDMX · 18 participantes</p>
                </div>
                <div className="au-tl-item">
                  <span className="au-tl-year">2020</span>
                  <p>Alianza internacional con expertos en ECMO de París</p>
                </div>
                <div className="au-tl-item">
                  <span className="au-tl-year">2022</span>
                  <p>Lanzamiento del Paris Diploma ECMO en Latinoamérica</p>
                </div>
                <div className="au-tl-item">
                  <span className="au-tl-year">2024</span>
                  <p>Aval ISHLT · expansión a 15+ países</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── MISIÓN Y VISIÓN ── */}
      <section className="au-mv-section">
        <div className="hce-container">
          <div ref={mvRef} className={`au-mv-grid au-reveal ${mvInView ? 'active' : ''}`}>

            <div className="au-mv-card au-mv-mision">
              <div className="au-mv-icon"><Target size={30} /></div>
              <span className="au-mv-label">Misión</span>
              <p className="au-mv-text">
                Transformar la educación médica en cuidado crítico cardiovascular mediante programas de entrenamiento inmersivo, simulación de alta fidelidad y alianzas con los centros de referencia mundial, para que cada profesional de la salud en Latinoamérica tenga acceso a formación de élite.
              </p>
            </div>

            <div className="au-mv-card au-mv-vision">
              <div className="au-mv-icon"><Sparkles size={30} /></div>
              <span className="au-mv-label">Visión</span>
              <p className="au-mv-text">
                Ser la institución educativa en medicina crítica más reconocida de Latinoamérica para 2030 — un ecosistema donde la tecnología, la ciencia y la humanidad convergen para salvar más vidas.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── METODOLOGÍA HCE ── */}
      <section className="au-methodology" style={{ backgroundImage: "url('https://raw.githubusercontent.com/REACHSLEGENDA/Imagenes/refs/heads/main/png-architecture-furniture-hospital-building.jpg')" }}>
        <div className="au-methodology-overlay"></div>
        <div className="hce-container relative z-10">
          <div className="au-section-header">
            <span className="au-tag" style={{ color: '#00d2ff' }}>Cómo lo Hacemos</span>
            <h2 className="au-h2" style={{ color: "white" }}>Arquitectura de <span className="au-gradient-text">Aprendizaje</span></h2>
          </div>

          <div ref={methodRef} className={`au-method-grid au-reveal ${methodInView ? 'active' : ''}`}>
            
            <div className="au-method-card">
              <div className="au-method-num">01</div>
              <div className="au-method-content">
                <div className="au-method-icon"><Globe size={28} /></div>
                <h3>Teoría Asíncrona</h3>
                <p>Nuestra plataforma digital te da acceso a videoclases tipo Netflix, podcasts y material de lectura actualizado bajo protocolos ELSO, para que domines los fundamentos a tu ritmo.</p>
              </div>
            </div>

            <div className="au-method-card">
              <div className="au-method-num">02</div>
              <div className="au-method-content">
                <div className="au-method-icon"><MonitorPlay size={28} /></div>
                <h3>Simulación ECMO</h3>
                <p>Uso de simuladores virtuales fisiológicos (ECMO Sim / HARVI) donde observas en tiempo real cómo responde la hemodinamia del paciente a cada mililitro de flujo que cambias.</p>
              </div>
            </div>

            <div className="au-method-card">
              <div className="au-method-num">03</div>
              <div className="au-method-content">
                <div className="au-method-icon"><Zap size={28} /></div>
                <h3>Práctica Inmersiva</h3>
                <p>La culminación en nuestros bootcamps presenciales (ej. París, Monterrey). Maniquíes de alta fidelidad, circuitos reales y canulaciones bajo presión de tiempo.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── ADN HCE (Nuestros Pilares) ── */}
      <section className="au-core">
        <div className="hce-container">
          <div ref={coreRef} className={`au-core-grid au-reveal ${coreInView ? 'active' : ''}`}>
            
            <div className="au-core-header text-center mx-auto">
              <span className="au-tag">ADN de Marca</span>
              <h2 className="au-h2">Nuestros Pilares <span className="au-gradient-text">Estructurales</span></h2>
            </div>

            <div className="au-core-cards">
              <div className="au-core-box">
                <div className="au-icon-wrap cyan"><Activity size={32} /></div>
                <h3>Clínica Avanzada</h3>
                <p>Dominio total del espectro cardiovascular y soporte ECMO/VAD. No enseñamos lo básico.</p>
              </div>
              <div className="au-core-box">
                <div className="au-icon-wrap blue"><Shield size={32} /></div>
                <h3>Seguridad</h3>
                <p>Reducción de eventos adversos a través del modelado de escenarios de crisis en simuladores.</p>
              </div>
              <div className="au-core-box">
                <div className="au-icon-wrap cyan"><Target size={32} /></div>
                <h3>Precisión</h3>
                <p>Entrenamiento riguroso focalizado en la toma de decisiones milimétricas y trabajo bajo presión.</p>
              </div>
              <div className="au-core-box">
                <div className="au-icon-wrap blue"><Award size={32} /></div>
                <h3>Excelencia</h3>
                <p>Auditoría de contenido alineada a las guías ELSO y certificaciones biomédicas más estrictas.</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── IMPACT STATS ── */}
      <section className="au-stats" ref={statsRef}>
        <div className="au-stats-glow"></div>
        <div className="hce-container">
          <div className="au-stats-grid">
            
            <div className={`au-stat-item au-reveal ${statsInView ? 'active' : ''}`} style={{ transitionDelay: '0.1s' }}>
              <div className="au-stat-num">1,500<span>+</span></div>
              <div className="au-stat-label">Profesionales Formados</div>
            </div>
            <div className={`au-stat-item au-reveal ${statsInView ? 'active' : ''}`} style={{ transitionDelay: '0.2s' }}>
              <div className="au-stat-num">15<span>+</span></div>
              <div className="au-stat-label">Países Conectados</div>
            </div>
            <div className={`au-stat-item au-reveal ${statsInView ? 'active' : ''}`} style={{ transitionDelay: '0.3s' }}>
              <div className="au-stat-num">4</div>
              <div className="au-stat-label">Diplomados Élite</div>
            </div>
            <div className={`au-stat-item au-reveal ${statsInView ? 'active' : ''}`} style={{ transitionDelay: '0.4s' }}>
              <div className="au-stat-num" style={{ fontSize: '2.8rem', paddingBottom: '0.5rem' }}>ISHLT</div>
              <div className="au-stat-label">Respaldo Académico</div>
            </div>

          </div>
        </div>
      </section>

      {/* ── NUESTRA COMUNIDAD CTA ── */}
      <section className="au-cta">
        <div className="hce-container">
          <div className="au-cta-box">
            <div className="au-cta-glow-1"></div>
            <div className="au-cta-glow-2"></div>
            
            <div className="au-cta-icon">
              <Users size={56} />
            </div>
            <h2 className="au-h2" style={{ marginBottom: '1.5rem', color: '#0f172a', position: 'relative', zIndex: 2 }}>
              Únete a la nueva generación de <span className="au-gradient-text">Líderes Biomédicos</span>
            </h2>
            <p className="au-cta-desc">
              Transformamos la manera en la que aprendes, interactúas y salvas vidas. Explora nuestros programas, involúcrate en nuestros simuladores y vive la experiencia real HCE.
            </p>
            
            <div className="au-cta-actions">
              <a href="/paris" className="au-btn au-btn-cta">
                Ver Diplomado ECMO
              </a>
              <a href="/sim" className="au-btn au-btn-dark">
                Simulador Clínico
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default AboutUs;


