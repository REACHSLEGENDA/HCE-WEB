import React from 'react';
import { useInView } from 'react-intersection-observer';
import { Gamepad2, PlayCircle, Trophy, Users, Zap, ShieldAlert, MonitorPlay, ChevronRight, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './EcmoSim.css';

const EcmoSim = () => {
  const { ref: heroRef, inView: heroInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: featuresRef, inView: featuresInView } = useInView({ triggerOnce: true, threshold: 0.1 });

  return (
    <div className="ecmo-sim-page">
      <Navbar />
      
      {/* GAMING HERO */}
      <section className="sim-hero">
        <div className="hce-container relative z-10">
          <div ref={heroRef} className={`sim-hero-content reveal ${heroInView ? 'active' : ''}`}>
            <div className="sim-badge"><Gamepad2 size={16} /> SIMULADOR CLÍNICO VIRTUAL</div>
            <h1 className="sim-title">
              ECMO <span className="sim-neon-text">Sim.</span>
            </h1>
            <p className="sim-subtitle">
              El primer videojuego de simulación clínica diseñado por y para profesionales de la salud. Asume el control, toma decisiones críticas y salva vidas en un entorno 3D de alta fidelidad.
            </p>
            
            <div className="sim-hero-actions">
              <a href="https://buy.stripe.com/bJe8wHezt5Rm58fbEP9IQ0U" className="btn-gaming">
                <PlayCircle size={24} /> JUGAR AHORA
              </a>
              <p className="sim-cta-hint">Suscripción mensual. Acceso ilimitado a todos los escenarios.</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE ECMO SIM - GAMEPLAY FEATURES */}
      <section className="sim-features">
        <div className="hce-container">
          <div className="sim-section-header">
            <h2 className="sim-h2">Gameplay <span className="sim-neon-text">Realista.</span></h2>
            <p>Un motor fisiológico avanzado donde cada decisión tiene consecuencias inmediatas.</p>
          </div>

          <div className="sim-feature-grid">
            <div className="sim-feature-box">
              <div className="sim-f-img">
                <img src="https://healthcareexp.com/wp-content/uploads/2025/03/1920x1080_HomeEcmoSim.jpg" alt="ECMO Sim Gameplay" />
                <div className="sim-f-overlay"></div>
              </div>
              <div className="sim-f-content">
                <div className="sim-icon-wrapper"><Activity size={28} /></div>
                <h3>Fisiología Dinámica</h3>
                <p>Las constantes vitales del paciente reaccionan en tiempo real a tus intervenciones, igual que en la UCI real.</p>
              </div>
            </div>

            <div className="sim-feature-box reverse">
              <div className="sim-f-content">
                <div className="sim-icon-wrapper"><MonitorPlay size={28} /></div>
                <h3>Entorno 3D Inmersivo</h3>
                <p>Navega por una unidad de cuidados intensivos detallada. Interactúa con las bombas, el ventilador y la consola ECMO como si estuvieras allí.</p>
                <a href="https://buy.stripe.com/bJe8wHezt5Rm58fbEP9IQ0U" className="btn-gaming-sm mt-4">
                  Desbloquea el Simulador
                </a>
              </div>
              <div className="sim-f-img">
                <img src="https://healthcareexp.com/wp-content/uploads/2024/12/Game-ECMO_SIM_XX.jpg" alt="ECMO Sim Interface" />
                <div className="sim-f-overlay"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CINEMATIC TRAILER */}
      <section className="sim-cinema">
        <div className="hce-container">
          <div className="sim-section-header text-center">
            <h2 className="sim-h2">Tráiler Oficial</h2>
          </div>
          
          <div className="sim-video-container">
            <iframe src="https://www.youtube.com/embed/bfaFZCmEyEU?autoplay=0&rel=0" allowFullScreen title="ECMO Sim Trailer"></iframe>
          </div>

          <div className="sim-shorts-grid mt-12">
            <div className="sim-h3-sub text-center mb-8">DEMOSTRACIONES RÁPIDAS</div>
            <div className="sim-shorts-wrapper">
              <div className="sim-short-item">
                <iframe src="https://www.youtube.com/embed/-C9U8-URKnE" allowFullScreen title="Short 1"></iframe>
              </div>
              <div className="sim-short-item">
                <iframe src="https://www.youtube.com/embed/iuhlwMcpzDs" allowFullScreen title="Short 2"></iframe>
              </div>
              <div className="sim-short-item">
                <iframe src="https://www.youtube.com/embed/ejQidcKJN5M" allowFullScreen title="Short 3"></iframe>
              </div>
              <div className="sim-short-item">
                <iframe src="https://www.youtube.com/embed/1l0jcR4utro" allowFullScreen title="Short 4"></iframe>
              </div>
            </div>
          </div>

          <div className="sim-video-secondary mt-12">
            <div className="sim-video-container small">
              <iframe src="https://www.youtube.com/embed/GrCMg-KVOqE?rel=0" allowFullScreen title="ECMO Sim Features"></iframe>
            </div>
          </div>
          
          <div className="sim-cinema-footer">
             <a href="https://buy.stripe.com/bJe8wHezt5Rm58fbEP9IQ0U" className="btn-gaming shadow-glow">
                <Zap size={24} /> OBTENER MEMBRESÍA MENSUAL
              </a>
          </div>
        </div>
      </section>

      {/* GAME MODES */}
      <section className="sim-modes">
        <div className="hce-container">
          <div className="sim-section-header">
            <h2 className="sim-h2">Selecciona tu <span className="sim-neon-text">Misión.</span></h2>
            <p>Diferentes modos de juego para poner a prueba tus conocimientos.</p>
          </div>

          <div className="sim-modes-wrapper">
            <div className="sim-mode-card">
              <div className="sim-mode-img">
                <img src="https://healthcareexp.com/wp-content/uploads/2024/12/Game-ECMO_SIM_VV.png" alt="ECMO Veno-Venoso" />
              </div>
              <div className="sim-mode-info">
                <h3>MODO: ECMO VV</h3>
                <p>Paciente con SDRA severo. Optimiza la oxigenación y maneja las emergencias del circuito.</p>
                <div className="sim-mode-meta">
                  <span><ShieldAlert size={16}/> Dificultad: Alta</span>
                </div>
              </div>
            </div>

            <div className="sim-mode-card center">
              <div className="sim-mode-img">
                <img src="https://healthcareexp.com/wp-content/uploads/2024/12/Game-ECMO_SIM_VA.jpg" alt="ECMO Veno-Arterial" />
              </div>
              <div className="sim-mode-info">
                <h3>MODO: ECMO VA</h3>
                <p>Shock cardiogénico refractario. Equilibra el soporte hemodinámico y previene el síndrome de Arlequín.</p>
                <div className="sim-mode-meta">
                  <span className="text-red"><ShieldAlert size={16}/> Dificultad: Extrema</span>
                </div>
              </div>
            </div>

            <div className="sim-mode-card">
              <div className="sim-mode-img">
                <img src="https://healthcareexp.com/wp-content/uploads/2024/12/Game-ECMO_SIM_XX.jpg" alt="Nuevos Escenarios" />
              </div>
              <div className="sim-mode-info">
                <h3>PRÓXIMAMENTE</h3>
                <p>Nuevas actualizaciones, expansión de la UCI y casos clínicos pediátricos en camino.</p>
                <div className="sim-mode-meta">
                  <span className="text-cyan"><Zap size={16}/> En desarrollo</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <a href="https://buy.stripe.com/bJe8wHezt5Rm58fbEP9IQ0U" className="btn-gaming-outline">
              Suscríbete para jugar todo
            </a>
          </div>
        </div>
      </section>

      {/* LEADERBOARD / PLAYERS */}
      <section className="sim-players">
        <div className="hce-container">
          <div className="sim-players-grid">
            <div className="sim-players-info">
              <Trophy size={48} className="sim-icon-glow" />
              <h2 className="sim-h2 mt-4">Únete a la <span className="sim-neon-text">Comunidad Global.</span></h2>
              <p>Compite contigo mismo, mejora tus tiempos de respuesta y entrena junto a más de 1000 profesionales de la salud en Latinoamérica y Europa.</p>
              
              <div className="sim-stats">
                <div className="sim-stat-box">
                  <span className="sim-stat-num">1000+</span>
                  <span className="sim-stat-label">Jugadores</span>
                </div>
                <div className="sim-stat-box">
                  <span className="sim-stat-num">12+</span>
                  <span className="sim-stat-label">Países</span>
                </div>
                <div className="sim-stat-box">
                  <span className="sim-stat-num">24H</span>
                  <span className="sim-stat-label">Acceso</span>
                </div>
              </div>
            </div>
            
            <div className="sim-players-visual">
              <img src="https://healthcareexp.com/wp-content/uploads/2024/11/aprendizaje-electronico.png" alt="Players" className="sim-float-img" />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL GAMING CTA */}
      <section className="sim-final-cta">
        <div className="hce-container text-center">
          <div className="sim-final-box">
            <div className="sim-glitch" data-text="GAME ON.">GAME ON.</div>
            <h3>El Simulador Definitivo para Profesionales.</h3>
            <p>La práctica hace al maestro. Equivócate aquí, salva vidas en el mundo real.</p>
            <a href="https://buy.stripe.com/bJe8wHezt5Rm58fbEP9IQ0U" className="btn-gaming mega shadow-glow">
              <Gamepad2 size={28} /> COMPRAR SUSCRIPCIÓN MENSUAL
            </a>
            <p className="sim-secure-checkout">Pago seguro vía Stripe. Cancela cuando quieras.</p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default EcmoSim;
