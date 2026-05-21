import React, { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Gamepad2, PlayCircle, Trophy, Users, Zap, ShieldAlert, MonitorPlay, ChevronRight, Activity } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './EcmoSim.css';
import { useSEO } from '../hooks/useSEO';

const EcmoSim = () => {
  useSEO({
    title: 'ECMO Sim - Simulador Clínico',
    description: 'ECMO Sim es el simulador clínico virtual 100% online diseñado para profesionales de la salud. Recrea una UCI real en 3D para dominar el soporte ECMO.',
    keywords: 'ECMO Sim, simulador clínico, simulador médico, UCI virtual, soporte extracorpóreo, videojuego médico, simulación médica 3D'
  });

  const { ref: heroRef, inView: heroInView } = useInView({ triggerOnce: true, threshold: 0.1 });
  const { ref: featuresRef, inView: featuresInView } = useInView({ triggerOnce: true, threshold: 0.1 });

  // Modal & Plan States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('4m'); // '4m' or '12m'
  const [usdRate, setUsdRate] = useState(18.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);

  // Live exchange rate & URL checking
  useEffect(() => {
    const fetchRate = async () => {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
          const data = await res.json();
          if (data && data.rates && data.rates.MXN) {
            setUsdRate(data.rates.MXN);
          }
        }
      } catch (err) {
        console.error('Error fetching live USD rate:', err);
      }
    };
    fetchRate();

    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status === 'success') {
      const successEmail = params.get('email');
      const successPlan = params.get('plan');
      setSuccessInfo({ email: successEmail, plan: successPlan });

      if (successEmail && successPlan) {
        fetch('/.netlify/functions/sim-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: successEmail, planId: successPlan }),
        })
        .then(r => r.json())
        .then(d => console.log('Sim registration response:', d))
        .catch(e => console.error('Sim registration error:', e));
      }
      
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'cancel') {
      alert('Pago cancelado. Si tuviste algún problema, por favor contáctanos.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setCheckoutError('Por favor introduce un correo válido.');
      return;
    }
    setCheckoutError('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/.netlify/functions/create-sim-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: selectedPlan, email: email.trim() }),
      });
      
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || 'Ocurrió un error al procesar el pago.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setCheckoutError('Error de red. Intenta nuevamente.');
      setIsSubmitting(false);
    }
  };

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
              Toma el control de la Unidad de Cuidados Intensivos. Interactúa con dispositivos de alta complejidad —desde ventiladores mecánicos hasta consolas de ECMO— con un nivel de realismo que te hará sentir dentro de la unidad.
              <br /><br />
              <strong>El videojuego de los profesionales de la salud.</strong>
            </p>
            
            <div className="sim-hero-actions">
              <button onClick={() => setIsModalOpen(true)} className="btn-gaming">
                <PlayCircle size={24} /> JUGAR AHORA
              </button>
              <p className="sim-cta-hint">Elige tu suscripción de 4 o 12 meses. Acceso ilimitado.</p>
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
                <img src="/assets/paginas/1920x1080_HomeEcmoSim.jpg" alt="ECMO Sim Gameplay" />
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
                <button onClick={() => setIsModalOpen(true)} className="btn-gaming-sm mt-4">
                  Desbloquea el Simulador
                </button>
              </div>
              <div className="sim-f-img">
                <img src="/assets/paginas/Game-ECMO_SIM_XX.jpg" alt="ECMO Sim Interface" />
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
             <button onClick={() => setIsModalOpen(true)} className="btn-gaming shadow-glow">
                <Zap size={24} /> DESBLOQUEAR EL SIMULADOR
             </button>
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
                <img src="/assets/paginas/Game-ECMO_SIM_VV.png" alt="ECMO Veno-Venoso" />
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
                <img src="/assets/paginas/Game-ECMO_SIM_VA.jpg" alt="ECMO Veno-Arterial" />
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
                <img src="/assets/paginas/Game-ECMO_SIM_XX.jpg" alt="Nuevos Escenarios" />
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
            <button onClick={() => setIsModalOpen(true)} className="btn-gaming-outline">
              Suscríbete para jugar todo
            </button>
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
              <img src="/assets/componentes/ecmosim-logo-new.png" alt="ECMO Sim Logo" className="sim-float-img" />
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
            <button onClick={() => setIsModalOpen(true)} className="btn-gaming mega shadow-glow">
              <Gamepad2 size={28} /> ELEGIR PLAN Y JUGAR
            </button>
            <p className="sim-secure-checkout">Pago seguro vía Stripe.</p>
          </div>
        </div>
      </section>

      {/* EXTREMELY PREMIUM PLAN SELECTOR MODAL */}
      {isModalOpen && (
        <div className="sim-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="sim-modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="sim-modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            
            <div className="sim-modal-header">
              <div className="sim-modal-badge">
                <Gamepad2 size={14} /> SELECCIÓN DE PLAN
              </div>
              <h2 className="sim-modal-title">ELIGE TU PLAN <span className="sim-neon-text">DE JUEGO</span></h2>
              <p className="sim-modal-subtitle">
                Acceso completo e ilimitado a todos los escenarios clínicos 3D en tiempo real.
              </p>
            </div>

            <form onSubmit={handleCheckout} className="sim-modal-form">
              {/* Email Input */}
              <div className="sim-input-group">
                <label htmlFor="sim-email">Correo electrónico *</label>
                <input
                  id="sim-email"
                  type="email"
                  required
                  placeholder="ejemplo@medico.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sim-modal-input"
                />
              </div>

              {/* Plans Display */}
              <div className="sim-plans-grid">
                {/* Plan 4 Months */}
                <div 
                  className={`sim-plan-box ${selectedPlan === '4m' ? 'active' : ''}`}
                  onClick={() => setSelectedPlan('4m')}
                >
                  <div className="sim-plan-meta">
                    <span className="sim-plan-duration">4 MESES</span>
                    <span className="sim-plan-badge-simple">ACCESO COMPLETO</span>
                  </div>
                  <div className="sim-plan-pricing">
                    <span className="sim-price-usd">$250 USD</span>
                    <span className="sim-price-mxn">
                      ~ ${Math.round(250 * usdRate).toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="sim-plan-desc">Entrenamiento intensivo de mediano plazo.</p>
                </div>

                {/* Plan 12 Months */}
                <div 
                  className={`sim-plan-box ${selectedPlan === '12m' ? 'active' : ''}`}
                  onClick={() => setSelectedPlan('12m')}
                >
                  <div className="sim-plan-tag">MEJOR OPCIÓN</div>
                  <div className="sim-plan-meta">
                    <span className="sim-plan-duration">12 MESES</span>
                    <span className="sim-plan-badge-simple">AHORRA MÁS DEL 20%</span>
                  </div>
                  <div className="sim-plan-pricing">
                    <span className="sim-price-usd">$700 USD</span>
                    <span className="sim-price-mxn">
                      ~ ${Math.round(700 * usdRate).toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="sim-plan-desc">Entrenamiento continuo para excelencia clínica.</p>
                </div>
              </div>

              {/* Live exchange rate badge */}
              <div className="sim-rate-badge">
                💡 Tipo de cambio en tiempo real: <strong>1 USD = ${usdRate.toFixed(2)} MXN</strong> (El cobro final se procesará en MXN).
              </div>

              {checkoutError && <div className="sim-modal-error">{checkoutError}</div>}

              {/* Action Button */}
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="btn-gaming mega w-full mt-4"
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'CARGANDO PASARELA…' : `PROCEDER AL PAGO — $${(selectedPlan === '4m' ? 250 : 700)} USD`}
              </button>
              
              <p className="sim-modal-secure">🔒 Pago 100% seguro encriptado por Stripe.</p>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS POPUP */}
      {successInfo && (
        <div className="sim-modal-overlay" onClick={() => setSuccessInfo(null)}>
          <div className="sim-modal-card success text-center" onClick={(e) => e.stopPropagation()}>
            <button className="sim-modal-close" onClick={() => setSuccessInfo(null)}>✕</button>
            <div className="sim-success-icon-wrapper">✓</div>
            <h2 className="sim-modal-title" style={{ marginTop: '1.5rem' }}>¡PAGO PROCESADO!</h2>
            <p className="sim-modal-subtitle" style={{ color: '#fff', fontSize: '1.1rem', margin: '1rem 0 2rem' }}>
              Tu suscripción al plan de <strong>{successInfo.plan === '4m' ? '4 meses' : '12 meses'}</strong> se ha completado con éxito.
            </p>
            <p style={{ color: '#9ea2a8', fontSize: '0.9rem', marginBottom: '2.5rem' }}>
              Enviamos un correo a <strong>{successInfo.email}</strong> con las credenciales y el enlace para acceder de inmediato al simulador. ¡Que disfrutes tu entrenamiento clínico!
            </p>
            <button onClick={() => setSuccessInfo(null)} className="btn-gaming">
              EMPEZAR A ENTRENAR
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EcmoSim;
