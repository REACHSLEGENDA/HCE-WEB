import { useInView } from 'react-intersection-observer';
import { Sparkles, ArrowRight, BookOpen, Microscope, Users, Award, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Instructores.css';
import { useSEO } from '../hooks/useSEO';

const Linkedin = ({ size = 24, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const FranceFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="12"
    viewBox="0 0 3 2"
    style={{ borderRadius: '2px', display: 'inline-block', verticalAlign: 'middle', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' }}
  >
    <rect width="1" height="2" fill="#00209F"/>
    <rect x="1" width="1" height="2" fill="#FFF"/>
    <rect x="2" width="1" height="2" fill="#F42A38"/>
  </svg>
);

const Instructores = () => {
  useSEO({
    title: 'Instructores y Facultad',
    description: 'Aprende directamente de la fuente. Nuestros instructores incluyen a los referentes mundiales en ECMO y medicina crítica como el Prof. Alain Combes.',
    keywords: 'instructores médicos, profesores ECMO, Alain Combes, Matthieu Schmidt, Jenifer Trejo Guerra, expertos en simulación médica, HCE instructores'
  });

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
      image: "/assets/componentes/Alain-Combes.jpg",
      tag: "Intensivista · ECMO",
      linkedin: "https://www.linkedin.com/in/alain-combes-81534062/",
      courses: [
        { name: "Diplomado de París ECMO", path: "/paris-diploma-ecmo" }
      ]
    },
    {
      id: 2,
      name: "Prof. Matthieu Schmidt",
      country: "Francia",
      role: "Director Científico",
      bio: "Médico de la UCI del Hosp. Pitié-Salpêtrière. Presidente del Comité Científico de EuroELSO (2018–2022). Experto mundial en ECMO-VV.",
      flag: "🇫🇷",
      image: "/assets/componentes/Alain-Combes.png",
      tag: "UCI · EuroELSO",
      linkedin: "https://www.linkedin.com/in/matthieu-schmidt-b19b6748/",
      courses: [
        { name: "Diplomado de París ECMO", path: "/paris-diploma-ecmo" }
      ]
    },
    {
      id: 3,
      name: "Enf. Hugo Guillou",
      country: "Francia",
      role: "Instructor Principal",
      bio: "Enfermero Especialista en ECMO (Pitié-Salpêtrière). Entrenador certificado de Simulación ELSO. Creador de ECMO SIM.",
      flag: "🇫🇷",
      image: "/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-10-1.jpeg",
      tag: "Simulación · Enfermería",
      linkedin: "https://www.linkedin.com/in/hugo-guillou-022067160/",
      courses: [
        { name: "Diplomado de París ECMO", path: "/paris-diploma-ecmo" }
      ]
    },
    {
      id: 4,
      name: "Enf. Emric Besnard",
      country: "Francia",
      role: "Instructor Principal",
      bio: "Enfermero Especialista en ECMO (Pitié-Salpêtrière). Entrenador certificado de Simulación ELSO. Co-creador de ECMO SIM.",
      flag: "🇫🇷",
      image: "/assets/componentes/WhatsApp-Image-2024-04-09-at-11.02.32-7-1.jpeg",
      tag: "Simulación · Enfermería",
      linkedin: "https://www.linkedin.com/in/emric-besnard-b8a786221/",
      courses: [
        { name: "Diplomado de París ECMO", path: "/paris-diploma-ecmo" }
      ]
    },
  ];

  const stats = [
    { num: "372+", label: "Publicaciones científicas" },
    { num: "30+",  label: "Años de experiencia clínica" },
    { num: "4",    label: "Centros de referencia mundial" },
    { num: "2,000+", label: "Alumnos profesionales" },
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
      title: "Mentoría directa",
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
            <div className="section-badge">
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
            <span className="section-badge">Staff Académico</span>
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
                  <div className="inst-card-country">
                    <FranceFlag /> {doc.country}
                  </div>
                </div>
                <div className="inst-card-body">
                  <div className="inst-card-header">
                    <h3 className="inst-card-name">{doc.name}</h3>
                    {doc.linkedin && (
                      <a
                        href={doc.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inst-card-linkedin"
                        aria-label={`Perfil de LinkedIn de ${doc.name}`}
                      >
                        <Linkedin size={16} />
                      </a>
                    )}
                  </div>
                  <span className="inst-card-role">{doc.role}</span>
                  <p className="inst-card-bio-static">{doc.bio}</p>
                  
                  {doc.courses && (
                    <div className="inst-card-courses">
                      <span className="inst-courses-label">Imparte:</span>
                      <div className="inst-courses-list">
                        {doc.courses.map((course, idx) => (
                          <Link key={idx} to={course.path} className="inst-course-link">
                            <span>{course.name}</span>
                            <ArrowRight size={12} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
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
              <span className="section-badge">Metodología</span>
              <h2 className="inst-h2">
                ¿Por qué aprender<br />
                <span className="inst-grad-text">de ellos?</span>
              </h2>
              <p className="inst-pillars-desc">
                Aprende directamente de la fuente, traemos a los autores de la evidencia científica que consultas a diario.
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
                Transformamos la forma en que aprendes, interactúas y salvas vidas. Explora nuestros programas, domina la técnica en nuestros simuladores y experimenta el estándar de excelencia HCE.
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
