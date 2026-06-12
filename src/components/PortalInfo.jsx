import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Link } from 'react-router-dom';
import { Award, BookOpen, Video, ShieldCheck, ArrowRight, GraduationCap, CheckCircle } from 'lucide-react';
import './PortalInfo.css';

const PortalInfo = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <section className="portal-info-section" id="portal-info">
      <div className="portal-glow-left"></div>
      <div className="portal-glow-right"></div>
      
      <div className="hce-container" ref={ref}>
        <div className={`portal-header reveal ${inView ? 'active' : ''}`}>
          <div className="section-badge">
            <GraduationCap size={16} /> PORTAL DE APRENDIZAJE HCE
          </div>
          <h2 className="portal-title">
            ¿Qué es el <span className="blue-gradient-text">Portal HCE</span> y para qué sirve?
          </h2>
          <p className="portal-subtitle">
            Tu centro de formación médica continua y simulación interactiva. Un espacio académico digital diseñado para acelerar tu desarrollo profesional en cuidados críticos.
          </p>
        </div>

        <div className="portal-grid">
          {/* Card 1: ¿Qué es? */}
          <div className={`portal-card reveal reveal-delay-1 ${inView ? 'active' : ''}`}>
            <div className="portal-card-glow"></div>
            <div className="portal-icon-wrapper">
              <BookOpen size={24} />
            </div>
            <h3>¿Qué es el Portal?</h3>
            <p>
              Es nuestra <strong>aula virtual interactiva</strong> y dashboard de control educativo. Actúa como el centro neurálgico donde los profesionales de la salud acceden a entrenamientos científicos de alta complejidad técnica y académica de manera autónoma.
            </p>
            <ul className="portal-bullet-list">
              <li><CheckCircle size={14} className="bullet-icon" /> Entorno 100% interactivo y digital</li>
              <li><CheckCircle size={14} className="bullet-icon" /> Integración con video-clases dinámicas</li>
              <li><CheckCircle size={14} className="bullet-icon" /> Dashboard personal de avance académico</li>
            </ul>
          </div>

          {/* Card 2: ¿Para qué sirve? */}
          <div className={`portal-card reveal reveal-delay-2 ${inView ? 'active' : ''}`}>
            <div className="portal-card-glow"></div>
            <div className="portal-icon-wrapper">
              <Award size={24} />
            </div>
            <h3>¿Para qué sirve?</h3>
            <p>
              Sirve para centralizar tu educación continua y acreditar formalmente tus competencias críticas. Te permite cursar módulos avanzados, evaluar tu nivel clínico y obtener certificaciones con respaldo internacional.
            </p>
            <ul className="portal-bullet-list">
              <li><CheckCircle size={14} className="bullet-icon" /> Tomar cursos clínicos especializados</li>
              <li><CheckCircle size={14} className="bullet-icon" /> Responder exámenes interactivos (80% aprobado)</li>
              <li><CheckCircle size={14} className="bullet-icon" /> Generar y descargar certificados temporales</li>
            </ul>
          </div>

          {/* Card 3: Webinars & Comunidad */}
          <div className={`portal-card reveal reveal-delay-3 ${inView ? 'active' : ''}`}>
            <div className="portal-card-glow"></div>
            <div className="portal-icon-wrapper">
              <Video size={24} />
            </div>
            <h3>Webinars & Vivo</h3>
            <p>
              Conecta en tiempo real con expertos globales de la salud. Accede a webinars automatizados y sesiones en vivo directamente integrados en tu panel para interactuar con líderes del soporte extracorpóreo y simulación.
            </p>
            <ul className="portal-bullet-list">
              <li><CheckCircle size={14} className="bullet-icon" /> Alertas dinámicas "🔴 EN VIVO" automáticas</li>
              <li><CheckCircle size={14} className="bullet-icon" /> Acceso directo a salas de Zoom/Meet</li>
              <li><CheckCircle size={14} className="bullet-icon" /> Registro directo y gestión de recordatorios</li>
            </ul>
          </div>
        </div>

        {/* CTA Section */}
        <div className={`portal-cta reveal reveal-delay-4 ${inView ? 'active' : ''}`}>
          <div className="cta-content">
            <div className="cta-badge">
              <ShieldCheck size={14} /> Acceso Seguro
            </div>
            <h3>¿Listo para iniciar tu capacitación?</h3>
            <p>Ingresa a tu cuenta de estudiante con tus credenciales autorizadas o explora los webinars activos sin costo.</p>
          </div>
          <div className="cta-actions">
            <Link to="/login" className="portal-primary-btn">
              Ingresar al Portal <ArrowRight size={18} />
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};

export default PortalInfo;
