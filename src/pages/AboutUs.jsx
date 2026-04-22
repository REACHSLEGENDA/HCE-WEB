import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Globe, Users, Activity, Shield, Sparkles, ArrowRight, PlayCircle, Award, Target, MonitorPlay, Zap, Gamepad2, Laptop } from 'lucide-react';
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
            <div className="section-badge">
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
              <a 
                href="https://youtu.be/yxIz2LKxuwg?si=csFc3oMbY9WQVdME"
                target="_blank"
                rel="noreferrer"
                className="au-btn au-btn-primary"
              >
                Conoce a HCE <ArrowRight size={18} />
              </a>
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
                  src="/assets/componentes/firma-hce.png"
                  alt="HCE Logo"
                  className="au-que-logo"
                />
              </div>
            </div>

            <div className="au-que-text">
              <div className="au-que-accent-line" />
              <span className="section-badge">¿Qué es HCE?</span>
              <h2 className="au-h2">
                Healthcare Training <span className="au-gradient-text">Experience</span>
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
                  <strong>2,000+</strong><span>Alumnos Profesionales</span>
                </div>
                <div className="au-que-stat-divider" />
                <div className="au-que-stat">
                   <div className="au-stat-mini-icon"><Globe size={14} /></div>
                  <strong>15+</strong><span>Países con presencia activa</span>
                </div>
                <div className="au-que-stat-divider" />
                <div className="au-que-stat">
                   <div className="au-stat-mini-icon"><Award size={14} /></div>
                  <strong>4</strong><span>Experiencias</span>
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
              <span className="section-badge">Nuestro Manifiesto</span>
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
                <p>Alumnos profesionales entrenados en Latinoamérica</p>
              </div>
              <div className="au-man-card au-man-card--2">
                <span className="au-man-card-num">15<sup>+</sup></span>
                <p>Alumnos de más de 15 Países de Latinoamérica</p>
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
                src="/assets/aboutus/DSC_0311.jpg"
                alt="Historia HCE"
                className="au-history-img"
              />
              <div className="au-hist-box">
                <div className="au-hist-year-wrap">
                  <span className="au-history-year">2024</span>
                  <span className="au-history-label">AÑO DE FUNDACIÓN</span>
                </div>
              </div>
            </div>

            <div className="au-history-text">
              <span className="section-badge">Nuestra Historia</span>
              <p className="au-hist-lead">
                Nació de una frustración real.
              </p>
              <p className="au-hist-p">
                En 2024, llegamos a una conclusión: la brecha entre la educación médica tradicional y la realidad de la UCI era abismal.
              </p>
              <p>
                Fundamos HCE con una sola misión — llevar formación de élite a Latinoamérica. Comenzamos con una primer certificación ECMO en Ciudad de México con + de 200 participantes y un sueño.
              </p>
              <p>
                Hoy entrenamos en todo latinoamérica, hemos impactado a más de 2,000 profesionales y creamos el único programa en español avalado por <strong>ISHLT</strong> en la región hasta el momento.
              </p>

              <div className="au-history-timeline">
                <div className="au-tl-item">
                  <div className="au-tl-dot"></div>
                  <div className="au-tl-content">
                    <span className="au-tl-year">2023</span>
                    <h4>Alianza Internacional</h4>
                    <p>Alianza internacional Prático Santé creadores de ECMO Sim. Dra. Jenifer Trejo Embajada de ECMO Sim para todo Latinoamérica.</p>
                  </div>
                </div>
                <div className="au-tl-item">
                  <div className="au-tl-dot"></div>
                  <div className="au-tl-content">
                    <span className="au-tl-year">2024</span>
                    <h4>Lanzamiento CDMX</h4>
                    <p>Lanzamiento del Diploma Internacional de Paris en ECMO en Ciudad de México.</p>
                  </div>
                </div>
                <div className="au-tl-item">
                  <div className="au-tl-dot"></div>
                  <div className="au-tl-content">
                    <span className="au-tl-year">2024</span>
                    <h4>Expansión a Ecuador</h4>
                    <p>Lanzamiento de ECMO Nursing Care Course. Primer entrenamiento diseñado de enfermería para enfermería en la región.</p>
                  </div>
                </div>
                <div className="au-tl-item">
                  <div className="au-tl-dot"></div>
                  <div className="au-tl-content">
                    <span className="au-tl-year">2025</span>
                    <h4>Expansión a Chile</h4>
                    <p>Lanzamiento del Diploma Internacional de Paris en ECMO en Chile.</p>
                  </div>
                </div>
                <div className="au-tl-item">
                  <div className="au-tl-dot"></div>
                  <div className="au-tl-content">
                    <span className="au-tl-year">2026</span>
                    <h4>Hito Regional</h4>
                    <p>Diplomado de Manejo de Avanzada en Insuficiencia Cardiaca; Primer programa en español avalado por la ISHLT.</p>
                  </div>
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
            <span className="section-badge">Cómo lo Hacemos</span>
            <h2 className="au-h2" style={{ color: "white" }}>Arquitectura de <span className="au-gradient-text">Aprendizaje</span></h2>
          </div>

          <div ref={methodRef} className={`au-method-grid au-reveal ${methodInView ? 'active' : ''}`}>
            
            <div className="au-method-card">
              <div className="au-method-num">01</div>
              <div className="au-method-content">
                <div className="au-method-icon"><Laptop size={28} /></div>
                <h3>Accede a nuestro ecosistema digital</h3>
                <p>Una combinación perfecta de formación asincrónica, tutorías sincrónicas con especialistas y una biblioteca científica de alto nivel. Todo diseñado para que refuerces tu conocimiento cuando y donde quieras.</p>
              </div>
            </div>

            <div className="au-method-card">
              <div className="au-method-num">02</div>
              <div className="au-method-content">
                <div className="au-method-icon"><Gamepad2 size={28} /></div>
                <h3>Simulación fisiológica avanzada</h3>
                <p>Con nuestros simuladores virtuales (ECMO Sim / HARVI), observarás en tiempo real el impacto de tus decisiones sobre el paciente, permitiéndote perfeccionar el juicio clínico en escenarios críticos.</p>
              </div>
            </div>

            <div className="au-method-card">
              <div className="au-method-num">03</div>
              <div className="au-method-content">
                <div className="au-method-icon"><Zap size={28} /></div>
                <h3>Simulación Clínica</h3>
                <p>Culmina tu formación con una experiencia inmersiva. Nuestros bootcamps presenciales integran simulación de baja, mediana y alta fidelidad, con un enfoque prioritario en CRM (Crisis Resource Management). Desarrolla tu juicio clínico en un entorno seguro a través del análisis de casos reales junto a nuestros expertos.</p>
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
              <span className="section-badge">ADN de Marca</span>
              <h2 className="au-h2">Nuestros Pilares <span className="au-gradient-text">Estructurales</span></h2>
            </div>

            <div className="au-core-cards">
              <div className="au-core-box">
                <div className="au-icon-wrap cyan"><Activity size={32} /></div>
                <h3>Clínica Avanzada</h3>
                <p>Dominio total del espectro cardiovascular y soporte ECMO/VAD.</p>
              </div>
              <div className="au-core-box">
                <div className="au-icon-wrap blue"><Shield size={32} /></div>
                <h3>Seguridad del Paciente</h3>
                <p>Prevención y manejo de emergencias a traves de aprendizaje basado en simulación.</p>
              </div>
              <div className="au-core-box">
                <div className="au-icon-wrap cyan"><Target size={32} /></div>
                <h3>Precisión</h3>
                <p>Entrenamiento riguroso focalizado en la toma de decisiones milimétricas y trabajo bajo presión.</p>
              </div>
              <div className="au-core-box">
                <div className="au-icon-wrap blue"><Award size={32} /></div>
                <h3>Excelencia</h3>
                <p>Contenido Vanguardista actualizado a las últimas recomendaciones y guías a nivel internacional.</p>
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
              <div className="au-stat-num">2,000<span>+</span></div>
              <div className="au-stat-label">Alumnos Profesionales</div>
            </div>
            <div className={`au-stat-item au-reveal ${statsInView ? 'active' : ''}`} style={{ transitionDelay: '0.2s' }}>
              <div className="au-stat-num">15<span>+</span></div>
              <div className="au-stat-label">Países Conectados</div>
            </div>
            <div className={`au-stat-item au-reveal ${statsInView ? 'active' : ''}`} style={{ transitionDelay: '0.3s' }}>
              <div className="au-stat-num">4</div>
              <div className="au-stat-label">Experiencias Élite</div>
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
              <a href="/paris-diploma-ecmo" className="au-btn au-btn-cta">
                Ver Diplomado ECMO
              </a>
              <a href="/simulador-ecmo-sim" className="au-btn au-btn-dark">
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


