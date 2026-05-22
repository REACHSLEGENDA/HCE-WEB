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

  // Modal, Plan & Promo States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('4m'); // '4m' or '12m'
  const [usdRate, setUsdRate] = useState(18.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  
  // Promo code states
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

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
        body: JSON.stringify({ 
          planId: selectedPlan, 
          email: email.trim(),
          promoCode: appliedPromo ? 'EXPSIM26' : ''
        }),
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

  const handleApplyPromo = () => {
    if (promoInput.trim().toUpperCase() === 'EXPSIM26') {
      setAppliedPromo(true);
      setPromoError('');
    } else {
      setPromoError('Código de descuento inválido.');
      setAppliedPromo(false);
    }
  };

  // Success Form States
  const [successFormData, setSuccessFormData] = useState({
    nombres: '',
    apellidos: '',
    telefono: '',
    email: '',
    profesion: '',
    institucion: '',
    pais: '',
  });
  const [isSuccessFormSubmitted, setIsSuccessFormSubmitted] = useState(false);
  const [isSubmittingSuccessForm, setIsSubmittingSuccessForm] = useState(false);
  const [successFormError, setSuccessFormError] = useState('');

  // Prefill email in success form when checkout succeeds
  useEffect(() => {
    if (successInfo && successInfo.email) {
      setSuccessFormData(prev => ({ ...prev, email: successInfo.email }));
    }
  }, [successInfo]);

  const handleSuccessFormSubmit = async (e) => {
    e.preventDefault();
    if (!successFormData.nombres.trim() || !successFormData.apellidos.trim() || !successFormData.telefono.trim() || !successFormData.email.trim() || !successFormData.profesion.trim() || !successFormData.institucion.trim() || !successFormData.pais.trim()) {
      setSuccessFormError('Todos los campos son obligatorios.');
      return;
    }
    setSuccessFormError('');
    setIsSubmittingSuccessForm(true);

    const formData = new FormData();
    formData.append('_subject', `Nuevo Registro de Accesos ECMO Sim — ${successFormData.nombres} ${successFormData.apellidos}`);
    formData.append('Nombres', successFormData.nombres.trim());
    formData.append('Apellidos', successFormData.apellidos.trim());
    formData.append('Correo', successFormData.email.trim());
    formData.append('WhatsApp/Telefono', successFormData.telefono.trim());
    formData.append('Profesion/Especialidad', successFormData.profesion.trim());
    formData.append('Institucion', successFormData.institucion.trim());
    formData.append('Pais', successFormData.pais.trim());
    formData.append('Plan Adquirido', successInfo.plan === '4m' ? 'Plan 4 Meses ($250 USD)' : 'Plan 12 Meses ($700 USD)');

    try {
      const res = await fetch('https://formspree.io/f/xredqyol', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        // Enriquecer datos en Mailchimp de manera asíncrona
        fetch('/.netlify/functions/sim-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: successFormData.email.trim(),
            planId: successInfo.plan,
            nombres: successFormData.nombres.trim(),
            apellidos: successFormData.apellidos.trim(),
            telefono: successFormData.telefono.trim(),
            profesion: successFormData.profesion.trim(),
            institucion: successFormData.institucion.trim(),
            pais: successFormData.pais.trim()
          }),
        }).catch(err => console.error('Error enriching Mailchimp:', err));

        setIsSuccessFormSubmitted(true);
      } else {
        setSuccessFormError('Ocurrió un error al enviar el formulario. Intenta nuevamente.');
      }
    } catch (err) {
      setSuccessFormError('Error de red. Por favor revisa tu conexión.');
    } finally {
      setIsSubmittingSuccessForm(false);
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
                    <span className="sim-price-usd">
                      ${appliedPromo ? '200' : '250'} USD
                    </span>
                    <span className="sim-price-mxn">
                      ~ ${Math.round((appliedPromo ? 200 : 250) * usdRate).toLocaleString()} MXN
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
                    <span className="sim-plan-badge-simple">
                      AHORRA
                    </span>
                  </div>
                  <div className="sim-plan-pricing">
                    <span className="sim-price-usd">
                      ${appliedPromo ? '650' : '700'} USD
                    </span>
                    <span className="sim-price-mxn">
                      ~ ${Math.round((appliedPromo ? 650 : 700) * usdRate).toLocaleString()} MXN
                    </span>
                  </div>
                  <p className="sim-plan-desc">Entrenamiento continuo para excelencia clínica.</p>
                </div>
              </div>

              {/* Promo Code Input */}
              <div className="sim-promo-row" style={{ marginTop: '0.25rem' }}>
                {!appliedPromo ? (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Código de descuento"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="sim-modal-input"
                      style={{ flex: 1, padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="btn-gaming-sm"
                      style={{ padding: '0.55rem 1.25rem', fontSize: '0.8rem', minWidth: 'auto', borderRadius: '8px' }}
                    >
                      Aplicar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(46, 204, 113, 0.1)', border: '1px solid rgba(46, 204, 113, 0.25)', padding: '0.55rem 1rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.82rem', color: '#2ecc71', fontWeight: 700 }}>
                      ✓ Cupón EXPSIM26 Aplicado (-$50 USD)
                    </div>
                    <button
                      type="button"
                      onClick={() => { setAppliedPromo(false); setPromoInput(''); }}
                      style={{ background: 'none', border: 'none', color: '#e74c3c', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                    >
                      Quitar
                    </button>
                  </div>
                )}
                {promoError && <div style={{ color: '#e74c3c', fontSize: '0.78rem', marginTop: '4px', fontWeight: 600 }}>{promoError}</div>}
              </div>

              {/* Live exchange rate badge */}
              <div className="sim-rate-badge">
                💡 Tipo de cambio en tiempo real: <strong>1 USD = ${usdRate.toFixed(2)} MXN</strong> (El cobro final se procesará en MXN).
              </div>

              {checkoutError && <div className="sim-modal-error">{checkoutError}</div>}

              {/* Warning Clause */}
              <div style={{
                background: 'rgba(231, 76, 60, 0.08)',
                border: '1px solid rgba(231, 76, 60, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
                marginTop: '12px',
                fontSize: '0.78rem',
                lineHeight: '1.4',
                color: '#ecf0f1',
                textAlign: 'left'
              }}>
                <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                  ⚠️ NOTA DE SEGURIDAD CRÍTICA Y USO INDIVIDUAL:
                </span>
                Tus accesos son <strong>estrictamente personales e intransferibles</strong>. El simulador cuenta con un sistema inteligente de monitoreo geolocalizado de IP y dispositivo. Las conexiones concurrentes o uso compartido causarán la <strong>suspensión inmediata y permanente de tu cuenta</strong> sin reembolso.
              </div>

              {/* Action Button */}
              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="btn-gaming mega w-full mt-4"
                style={{ width: '100%' }}
              >
                {isSubmitting ? 'CARGANDO PASARELA…' : `PROCEDER AL PAGO — $${(selectedPlan === '4m' ? (appliedPromo ? 200 : 250) : (appliedPromo ? 650 : 700))} USD`}
              </button>
              
              <p className="sim-modal-secure">🔒 Pago 100% seguro encriptado por Stripe.</p>
            </form>
          </div>
        </div>
      )}

      {/* SUCCESS & REGISTRATION POPUP */}
      {successInfo && (
        <div className="sim-modal-overlay">
          <div className="sim-modal-card success" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
            {!isSuccessFormSubmitted ? (
              <>
                <div className="text-center">
                  <div className="sim-success-icon-wrapper">✓</div>
                  <h2 className="sim-modal-title" style={{ marginTop: '1rem' }}>¡PAGO CONFIRMADO!</h2>
                  <p className="sim-modal-subtitle" style={{ color: '#fff', fontSize: '0.95rem', margin: '0.5rem 0 1.25rem' }}>
                    Suscripción activa: <strong>{successInfo.plan === '4m' ? 'Plan 4 Meses' : 'Plan 12 Meses'}</strong>.
                  </p>
                  <p style={{ color: '#FBC531', fontSize: '0.85rem', marginBottom: '1.25rem', fontWeight: 'bold' }}>
                    ⚠️ Por favor completa tus datos de contacto. Tu acceso se te enviará a tu correo dentro de 24-72 hrs.
                  </p>
                </div>

                <form onSubmit={handleSuccessFormSubmit} className="sim-modal-form" style={{ gap: '0.85rem' }}>
                  <div className="sim-plans-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="sim-input-group">
                      <label htmlFor="succ-nombres" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>Nombres *</label>
                      <input
                        id="succ-nombres"
                        type="text"
                        required
                        placeholder="Ej: Juan"
                        value={successFormData.nombres}
                        onChange={e => setSuccessFormData(prev => ({ ...prev, nombres: e.target.value }))}
                        className="sim-modal-input"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                      />
                    </div>
                    <div className="sim-input-group">
                      <label htmlFor="succ-apellidos" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>Apellidos *</label>
                      <input
                        id="succ-apellidos"
                        type="text"
                        required
                        placeholder="Ej: Pérez"
                        value={successFormData.apellidos}
                        onChange={e => setSuccessFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                        className="sim-modal-input"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                      />
                    </div>
                  </div>

                  <div className="sim-plans-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="sim-input-group">
                      <label htmlFor="succ-email" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>Correo Electrónico *</label>
                      <input
                        id="succ-email"
                        type="email"
                        required
                        placeholder="tu@correo.com"
                        value={successFormData.email}
                        onChange={e => setSuccessFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="sim-modal-input"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                      />
                    </div>
                    <div className="sim-input-group">
                      <label htmlFor="succ-telefono" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>WhatsApp / Teléfono *</label>
                      <input
                        id="succ-telefono"
                        type="tel"
                        required
                        placeholder="Ej: 55 1234 5678"
                        value={successFormData.telefono}
                        onChange={e => setSuccessFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        className="sim-modal-input"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                      />
                    </div>
                  </div>

                  <div className="sim-input-group">
                    <label htmlFor="succ-profesion" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>Profesión / Especialidad *</label>
                    <input
                      id="succ-profesion"
                      type="text"
                      required
                      placeholder="Ej: Médico Intensivista, Lic. en Enfermería"
                      value={successFormData.profesion}
                      onChange={e => setSuccessFormData(prev => ({ ...prev, profesion: e.target.value }))}
                      className="sim-modal-input"
                      style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                    />
                  </div>

                  <div className="sim-plans-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                    <div className="sim-input-group">
                      <label htmlFor="succ-institucion" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>Institución / Hospital *</label>
                      <input
                        id="succ-institucion"
                        type="text"
                        required
                        placeholder="Ej: Hospital General"
                        value={successFormData.institucion}
                        onChange={e => setSuccessFormData(prev => ({ ...prev, institucion: e.target.value }))}
                        className="sim-modal-input"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                      />
                    </div>
                    <div className="sim-input-group">
                      <label htmlFor="succ-pais" style={{ fontSize: '0.72rem', color: '#c5c6c7' }}>País *</label>
                      <input
                        id="succ-pais"
                        type="text"
                        required
                        placeholder="Ej: México"
                        value={successFormData.pais}
                        onChange={e => setSuccessFormData(prev => ({ ...prev, pais: e.target.value }))}
                        className="sim-modal-input"
                        style={{ padding: '0.55rem 0.85rem', fontSize: '0.82rem', background: '#0a0d12' }}
                      />
                    </div>
                  </div>

                  {successFormError && <div className="sim-modal-error" style={{ fontSize: '0.78rem', padding: '0.5rem' }}>{successFormError}</div>}

                  {/* Anti-sharing Warning Clause */}
                  <div style={{
                    background: 'rgba(231, 76, 60, 0.08)',
                    border: '1px solid rgba(231, 76, 60, 0.25)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '0.78rem',
                    lineHeight: '1.4',
                    color: '#ecf0f1',
                    textAlign: 'left',
                    marginBottom: '12px'
                  }}>
                    <span style={{ color: '#e74c3c', fontWeight: 'bold', display: 'block', marginBottom: '3px' }}>
                      ⚠️ ADVERTENCIA ANTI-COMPARTICIÓN DE ACCESOS:
                    </span>
                    Tus credenciales individuales se asocian a tu identidad profesional y son monitoreadas activamente por geolocalización e IP. El ingreso simultáneo desde múltiples IPs o ubicaciones no autorizadas suspenderá la cuenta permanentemente por violación de propiedad intelectual.
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmittingSuccessForm} 
                    className="btn-gaming mega w-full"
                    style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', marginTop: '0.5rem' }}
                  >
                    {isSubmittingSuccessForm ? 'ENVIANDO REGISTRO…' : 'CONFIRMAR Y CREAR ACCESOS'}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center" style={{ padding: '1rem 0' }}>
                <div className="sim-success-icon-wrapper">✓</div>
                <h2 className="sim-modal-title" style={{ marginTop: '1.5rem' }}>¡REGISTRO COMPLETADO!</h2>
                <p className="sim-modal-subtitle" style={{ color: '#fff', fontSize: '1.1rem', margin: '1rem 0 2rem' }}>
                  Hemos recibido tus datos con éxito.
                </p>
                <p style={{ color: '#9ea2a8', fontSize: '0.9rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                  Estamos dando de alta tu cuenta para el plan de <strong>{successInfo.plan === '4m' ? '4 meses' : '12 meses'}</strong>. Tu acceso se te enviará a tu correo electrónico y a tu WhatsApp dentro de **24-72 hrs**. ¡Prepárate para entrenar!
                </p>
                <button onClick={() => { setSuccessInfo(null); setIsSuccessFormSubmitted(false); }} className="btn-gaming">
                  ENTENDIDO
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default EcmoSim;
