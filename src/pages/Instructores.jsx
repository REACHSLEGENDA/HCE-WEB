import { useInView } from 'react-intersection-observer';
import { Sparkles, ArrowRight, BookOpen, Microscope, Users, Award, FlaskConical } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Instructores.css';

const Instructores = () => {
  const { ref: heroRef,    inView: heroInView    } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: statsRef,   inView: statsInView   } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: gridRef,    inView: gridInView    } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: pillarsRef, inView: pillarsInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: ctaRef,     inView: ctaInView     } = useInView({ triggerOnce: true, threshold: 0.1 });

  const faculty = [
    {
      id: 1,
      name: "Prof. Alain Combes",
      country: "Francia",
      role: "Director del Programa",
      bio: "Jefe de la UCI del Hosp. Pitié-Salpêtrière, Paris. Investigador principal del estudio EOLIA. Más de 372 publicaciones científicas internacionales.",
      flag: "🇫🇷",
      image: "https://healthcareexp.com/wp-content/uploads/2024/11/Alain-Combes.jpg",
      tag: "Intensivista · ECMO",
    },
    {
      id: 2,
      name: "Prof. Matthieu Schmidt",
      country: "Francia",
      role: "Presidente Científico",
      bio: "Médico de la UCI del Hosp. Pitié-Salpêtrière. Presidente del Comité Científico de EuroELSO (2018–2022). Experto mundial en ECMO-VV.",
      flag: "🇫🇷",
      image: "https://healthcareexp.com/wp-content/uploads/2024/11/Alain-Combes.png",
      tag: "UCI · EuroELSO",
    },
    {
      id: 3,
      name: "Enf. Hugo Guillou",
      country: "Francia",
      role: "CEO Practico Santé",
      bio: "Enfermero Especialista en ECMO (Pitié-Salpêtrière). Entrenador certificado de Simulación ELSO. Creador de ECMO SIM.",
      flag: "🇫🇷",
      image: "https://healthcareexp.com/wp-content/uploads/2024/11/WhatsApp-Image-2024-04-09-at-11.02.32-10-1-1152x1536.jpeg",
      tag: "Simulación · Enfermería",
    },
    {
      id: 4,
      name: "Enf. Emric Besnard",
      country: "Francia",
      role: "Presidente Practico Santé",
      bio: "Enfermero Especialista en ECMO (Pitié-Salpêtrière). Entrenador certificado de Simulación ELSO. Co-creador de ECMO SIM.",
      flag: "🇫🇷",
      image: "https://healthcareexp.com/wp-content/uploads/2024/11/WhatsApp-Image-2024-04-09-at-11.02.32-7-1-1152x1536.jpeg",
      tag: "Simulación · Enfermería",
    },
  ];

  const stats = [
    { num: "372+", label: "Publicaciones científicas" },
    { num: "30+",  label: "Años de experiencia clínica" },
    { num: "4",    label: "Centros de referencia mundial" },
    { num: "1,500+", label: "Profesionales formados" },
  ];

  const pillars = [
    {
      icon: <Microscope size={22} />,
      title: "Ciencia de vanguardia",
      desc: "Cada clase está sustentada en evidencia publicada en las revistas más importantes del mundo.",
    },
    {
      icon: <BookOpen size={22} />,
      title: "Casos clínicos reales",
      desc: "Aprende con pacientes reales de los centros de mayor complejidad en Europa.",
    },
    {
      icon: <FlaskConical size={22} />,
      title: "Simulación de alto realismo",
      desc: "Entrenamiento con el simulador ECMO SIM creado por los propios docentes del programa.",
    },
    {
      icon: <Users size={22} />,
      title: "Tutoría directa",
      desc: "Acceso personalizado al docente durante todo el programa, no solo en clases magistrales.",
    },
  ];

  return (
    <div className="inst-page">
      <Navbar />

      {/* ── HERO ── */}
      <section className="inst-hero">
        <div
          className="inst-hero-bg"
          style={{ backgroundImage: "url('https://raw.githubusercontent.com/REACHSLEGENDA/Imagenes/refs/heads/main/png-hospital-doctor-adult-togetherness.jpg')" }}
        />
        <div className="inst-hero-overlay" />
        <div className="hce-container">
          <div ref={heroRef} className={`inst-hero-content inst-reveal ${heroInView ? 'active' : ''}`}>
            <div className="inst-badge">
              <Sparkles size={14} />
              Facultad de Élite
            </div>
            <h1 className="inst-h1">
              Los mejores del mundo<br />
              <span className="inst-grad-text">enseñan aquí.</span>
            </h1>
            <p className="inst-hero-sub">
              Aprende directamente de los líderes que están redefiniendo la medicina crítica cardiovascular a nivel global.
            </p>
            <button
              className="inst-hero-btn"
              onClick={() => document.getElementById('faculty').scrollIntoView({ behavior: 'smooth' })}
            >
              Conocer la facultad <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="inst-stats-section">
        <div className="hce-container">
          <div ref={statsRef} className={`inst-stats-grid inst-reveal ${statsInView ? 'active' : ''}`}>
            {stats.map((s, i) => (
              <div key={i} className="inst-stat-item" style={{ transitionDelay: `${i * 0.08}s` }}>
                <span className="inst-stat-num">{s.num}</span>
                <span className="inst-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FACULTY GRID ── */}
      <section className="inst-faculty-section" id="faculty">
        <div className="hce-container">
          <div className="inst-section-head">
            <span className="inst-section-tag">Staff Académico</span>
            <h2 className="inst-h2">
              Expertos que definen<br />
              <span className="inst-grad-text">el estándar global</span>
            </h2>
            <p className="inst-section-sub">Avalados internacionalmente por ELSO e ISHLT</p>
          </div>

          <div ref={gridRef} className={`inst-faculty-grid inst-reveal ${gridInView ? 'active' : ''}`}>
            {faculty.map((doc, i) => (
              <div key={doc.id} className="inst-card" style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="inst-card-photo">
                  <div className="inst-card-img" style={{ backgroundImage: `url(${doc.image})` }} />
                  <div className="inst-card-bio-overlay">
                    <p>{doc.bio}</p>
                  </div>
                  <div className="inst-card-country">
                    <span>{doc.flag}</span> {doc.country}
                  </div>
                </div>
                <div className="inst-card-body">
                  <div className="inst-card-meta">
                    <span className="inst-card-tag">{doc.tag}</span>
                    <span className="inst-card-role"><Award size={12} /> {doc.role}</span>
                  </div>
                  <h3 className="inst-card-name">{doc.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PILLARS ── */}
      <section className="inst-pillars-section">
        <div className="hce-container">
          <div ref={pillarsRef} className={`inst-pillars-inner inst-reveal ${pillarsInView ? 'active' : ''}`}>

            <div className="inst-pillars-left">
              <span className="inst-section-tag inst-section-tag--dark">Metodología</span>
              <h2 className="inst-h2">
                ¿Por qué aprender<br />
                <span className="inst-grad-text">de ellos?</span>
              </h2>
              <p className="inst-pillars-desc">
                No contratamos conferenciantes. Traemos a los clínicos que publicaron los estudios que tú estudias.
              </p>
            </div>

            <div className="inst-pillars-right">
              {pillars.map((p, i) => (
                <div key={i} className="inst-pillar-item" style={{ transitionDelay: `${i * 0.08}s` }}>
                  <div className="inst-pillar-icon">{p.icon}</div>
                  <div>
                    <h4 className="inst-pillar-title">{p.title}</h4>
                    <p className="inst-pillar-text">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="inst-cta-section">
        <div className="hce-container">
          <div ref={ctaRef} className={`inst-cta-box inst-reveal ${ctaInView ? 'active' : ''}`}>
            <div className="inst-cta-deco" />
            <div className="inst-cta-content">
              <h2 className="inst-cta-h2">
                Aprende con los mejores.<br />
                <span className="inst-grad-text">Forma parte del programa.</span>
              </h2>
              <p className="inst-cta-sub">
                Cupos estrictamente limitados para garantizar acompañamiento personalizado por parte de los docentes.
              </p>
              <a href="/" className="inst-cta-btn">
                Ver programas disponibles <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Instructores;
