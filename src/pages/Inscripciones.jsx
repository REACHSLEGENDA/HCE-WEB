import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, ChevronRight, Stethoscope, Heart, Shield, MapPin } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Inscripciones.css';

const USD_RATE = 17.5;

const EXTRA_CATALOG = {
  ecmo_sim: {
    label: 'Simulador ECMO SIM',
    subhint: 'Suscripción por 4 meses',
    desc: 'Taller de simulación avanzada en ECMO con maniquí de alta fidelidad',
    price: 3500,
  },
  ecmo_nursing: {
    label: 'ECMO Nursing Care Course',
    subhint: 'Experiencia virtual',
    desc: 'Módulo especializado de ECMO para cuidados de enfermería intensiva',
    price: 3500,
  },
};

const PROFILES = {
  especialista: {
    label: 'Médico(a) Especialista',
    price: 39000,
    extras: ['ecmo_sim'],
  },
  residente: {
    label: 'Médico(a) Residente',
    price: 37000,
    extras: ['ecmo_sim'],
  },
  enfermero: {
    label: 'Enfermero(a) / Otro Profesional',
    price: 37000,
    extras: ['ecmo_sim', 'ecmo_nursing'],
  },
};

const fmt = (n, cur) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 0 }).format(n);

import { useSEO } from '../hooks/useSEO';

export default function Inscripciones() {
  useSEO({
    title: 'Inscripciones',
    description: 'Asegura tu lugar en nuestros programas educativos y certificaciones internacionales. Selecciona tu perfil e inscríbete de manera segura.',
    keywords: 'inscripciones HCE, inscripción médica, diplomado ECMO, registrarse HCE, precios cursos médicos'
  });

  const [searchParams] = useSearchParams();
  const [cardSel, setCardSel] = useState(null);   // 'especialista' | 'otros'
  const [subRole, setSubRole] = useState(null);    // 'residente' | 'enfermero'
  const [extras, setExtras] = useState(new Set());
  const [moneda, setMoneda] = useState('mxn');
  const [email, setEmail] = useState('');
  const [consentPrimary, setConsentPrimary] = useState(false);
  const [consentSecondary, setConsentSecondary] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null); // { code: string, discount: number }

  const payStatus = searchParams.get('status'); // 'success' | 'cancel'
  const perfil = cardSel === 'otros' ? subRole : cardSel;

  const selectCard = (card) => {
    setCardSel(card);
    setSubRole(null);
    setExtras(new Set());
    setApiError('');
  };

  const selectSubRole = (role) => {
    setSubRole(role);
    setExtras(new Set());
  };

  const toggleExtra = (id) => {
    setExtras((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (code === 'HCE-INERPARIS2026') {
      setAppliedPromo({ code: 'HCE-INERPARIS2026', discount: 0.3, type: 'discount' });
      setApiError('');
    } else if (code === 'HCEMS' || code === 'HCEMESES') {
      setAppliedPromo({ code, discount: 0, type: 'installments' });
      setApiError('');
    } else {
      setAppliedPromo(null);
      if (promoInput.trim()) setApiError('Código no válido');
    }
  };

  const availableExtras = perfil ? PROFILES[perfil].extras.map((id) => ({ id, ...EXTRA_CATALOG[id] })) : [];
  const rawBase = perfil ? PROFILES[perfil].price : 0;
  const baseDiscount = (perfil && appliedPromo) ? Math.floor(rawBase * appliedPromo.discount) : 0;
  const baseMXN = rawBase - baseDiscount;
  
  const extrasMXN = [...extras].reduce((s, id) => s + EXTRA_CATALOG[id].price, 0);
  const totalMXN = baseMXN + extrasMXN;
  const displayBase = moneda === 'usd' ? Math.ceil(baseMXN / USD_RATE) : baseMXN;
  const displayExtras = moneda === 'usd' ? Math.ceil(extrasMXN / USD_RATE) : extrasMXN;
  const displayTotal = moneda === 'usd' ? Math.ceil(totalMXN / USD_RATE) : totalMXN;
  const cur = moneda.toUpperCase();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canPay = !!perfil && emailValid && consentPrimary;

  const handlePay = async () => {
    if (!canPay) return;
    setLoading(true);
    setApiError('');
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          perfil, 
          extras: [...extras], 
          moneda, 
          email: email.trim(),
          promoCode: appliedPromo?.code || null
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No se pudo iniciar la inversión');
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (payStatus === 'success') {
    return (
      <div className="ins-page">
        <Navbar />
        <RegistrationForm />
        <Footer />
      </div>
    );
  }

  if (payStatus === 'cancel') {
    return (
      <div className="ins-page">
        <Navbar />
        <div className="ins-result-wrap">
          <div className="ins-result-card">
            <div className="ins-result-icon ins-result-icon--cancel">✕</div>
            <h2>Inversión cancelada</h2>
            <p>No se realizó ningún cargo.</p>
            <a href="/inscripciones-diploma-paris-ecmo" className="ins-btn ins-btn--primary">Intentar de nuevo</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="ins-page">
      <Navbar />

      {/* HERO */}
      <div className="ins-hero">
        <div className="ins-hero-inner hce-container">
          <span className="section-badge">PROGRAMAS 2026</span>
          <h1 className="ins-hero-title">Inscripciones</h1>
          <p className="ins-hero-sub">
            Personaliza tu inscripción al programa de formación en ECMO de élite, aprovecha nuestras promociones.
          </p>
        </div>
      </div>

      {/* CONTENT */}
      <div className="ins-layout hce-container">

        {/* ── LEFT: selection flow ── */}
        <div className="ins-main">

          {/* STEP 1 — profile cards */}
          <section className="ins-section">
            <div className="ins-step-header">
              <span className="ins-step-num">1</span>
              <div>
                <h2 className="ins-step-title">Selecciona tu perfil</h2>
              </div>
            </div>

            <div className="ins-cards">
              {/* Card 1 — Especialista */}
              <button
                type="button"
                className={`ins-card ${cardSel === 'especialista' ? 'ins-card--active' : ''}`}
                onClick={() => selectCard('especialista')}
              >
                <div className="ins-card-visual ins-card-visual--blue">
                  <Stethoscope size={40} strokeWidth={1.5} />
                </div>
                <div className="ins-card-body">
                  <div className="ins-card-top">
                    <span className="ins-card-tag">Perfil A</span>
                    {cardSel === 'especialista' && <CheckCircle2 size={20} className="ins-card-check" />}
                  </div>
                  <h3 className="ins-card-title">Médico(a) Especialista</h3>
                </div>
              </button>

              {/* Card 2 — Otros */}
              <button
                type="button"
                className={`ins-card ${cardSel === 'otros' ? 'ins-card--active' : ''}`}
                onClick={() => selectCard('otros')}
              >
                <div className="ins-card-visual ins-card-visual--cyan">
                  <Heart size={40} strokeWidth={1.5} />
                </div>
                <div className="ins-card-body">
                  <div className="ins-card-top">
                    <span className="ins-card-tag">Perfil B</span>
                    {cardSel === 'otros' && <CheckCircle2 size={20} className="ins-card-check" />}
                  </div>
                  <h3 className="ins-card-title">Residente, Enfermero(a) y Otros</h3>
                </div>
              </button>

            </div>
          </section>

          {/* STEP 2 — sub-role (only card 'otros') */}
          {cardSel === 'otros' && (
            <section className="ins-section ins-section--animate">
              <div className="ins-step-header">
                <span className="ins-step-num">2</span>
                <div>
                  <h2 className="ins-step-title">¿Cuál es tu rol?</h2>
                </div>
              </div>
              <div className="ins-role-grid">
                {[
                  { id: 'residente', label: 'Médico(a) Residente', desc: 'Actualmente en programa de residencia médica' },
                  { id: 'enfermero', label: 'Enfermero(a) / Otro Profesional', desc: 'Enfermero, terapeuta respiratorio, fisioterapeuta, u otro' },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={`ins-role-btn ${subRole === r.id ? 'ins-role-btn--active' : ''}`}
                    onClick={() => selectSubRole(r.id)}
                  >
                    <Shield size={18} />
                    <div>
                      <span className="ins-role-label">{r.label}</span>
                    </div>
                    {subRole === r.id && <CheckCircle2 size={18} className="ins-role-check" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* STEP 3 — extras */}
          {availableExtras.length > 0 && (
            <section className="ins-section ins-section--animate">
              <div className="ins-step-header">
                <span className="ins-step-num">{cardSel === 'otros' ? '3' : '2'}</span>
                <div>
                  <h2 className="ins-step-title">Potencia tu formación</h2>
                  <p className="ins-step-sub" style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Añade un curso ¡Promoción especial por tiempo limitado!</p>
                </div>
              </div>
              <div className="ins-extras">
                {availableExtras.map((ex) => (
                  <label
                    key={ex.id}
                    className={`ins-extra-card ${extras.has(ex.id) ? 'ins-extra-card--active' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={extras.has(ex.id)}
                      onChange={() => toggleExtra(ex.id)}
                      className="ins-extra-input"
                    />
                    <div className="ins-extra-check">
                      {extras.has(ex.id) && <CheckCircle2 size={16} />}
                    </div>
                    <div className="ins-extra-info">
                      <span className="ins-extra-label">{ex.label}</span>
                      {ex.subhint && <span style={{ fontSize: '0.75rem', opacity: 0.7, display: 'block', marginTop: '2px' }}>{ex.subhint}</span>}
                    </div>
                    <div className="ins-extra-price">
                      +{fmt(ex.price, 'mxn')}
                      {moneda === 'usd' && <small>≈ +{fmt(Math.ceil(ex.price / USD_RATE), 'usd')}</small>}
                    </div>
                  </label>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* ── RIGHT: sticky order summary ── */}
        <aside className="ins-sidebar">
          <div className="ins-summary">
            <h3 className="ins-summary-title">Resumen de inscripción</h3>

            {/* Currency toggle */}
            <div className="ins-currency">
              <span className="ins-currency-label">Moneda</span>
              <div className="ins-currency-toggle">
                {['mxn', 'usd'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`ins-currency-btn ${moneda === c ? 'ins-currency-btn--active' : ''}`}
                    onClick={() => setMoneda(c)}
                  >
                    {c.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="ins-summary-lines">
              {perfil ? (
                <>
                  <div className="ins-summary-line">
                    <span>{PROFILES[perfil].label}</span>
                    <span>{fmt(displayBase, cur)}</span>
                  </div>
                  {[...extras].map((id) => {
                    const ex = EXTRA_CATALOG[id];
                    const price = moneda === 'usd' ? Math.ceil(ex.price / USD_RATE) : ex.price;
                    return (
                      <div key={id} className="ins-summary-line ins-summary-line--extra" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                          <span>+ {ex.label}</span>
                          <span>{fmt(price, cur)}</span>
                        </div>
                        {ex.subhint && <small style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '-2px' }}>{ex.subhint}</small>}
                      </div>
                    );
                  })}
                </>
              ) : (
                <p className="ins-summary-empty">Selecciona un perfil para ver el desglose.</p>
              )}
            </div>

            {perfil && (
              <div className="ins-summary-total">
                <span>Inversión total</span>
                <strong>{fmt(displayTotal, cur)}</strong>
              </div>
            )}

            {/* Promo code field */}
            {perfil && (
              <div className="ins-promo-wrap" style={{ marginTop: '1rem', borderTop: '1px dashed var(--ins-border)', paddingTop: '1rem' }}>
                {!appliedPromo ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Código de descuento" 
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--ins-border)', fontSize: '0.8rem' }}
                    />
                    <button 
                      onClick={applyPromo}
                      className="ins-btn" 
                      style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: 'var(--ins-dark)', color: '#fff' }}
                    >
                      Aplicar
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: appliedPromo.type === 'installments' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)', padding: '0.6rem 0.8rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.8rem', color: appliedPromo.type === 'installments' ? '#1d4ed8' : '#065f46', fontWeight: 600 }}>
                      ✓ {appliedPromo.code} {appliedPromo.type === 'installments' ? '(Pagos a meses desbloqueado)' : `(-${appliedPromo.discount * 100}%)`}
                    </div>
                    <button 
                      onClick={() => { setAppliedPromo(null); setPromoInput(''); setApiError(''); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            )}

            {moneda === 'usd' && perfil && (
              <p className="ins-summary-note">Tipo de cambio referencial: 1 USD = {USD_RATE} MXN</p>
            )}

            <div className="ins-email-field">
              <label className="ins-email-label" htmlFor="ins-email">
                Correo electrónico *
              </label>
              <input
                id="ins-email"
                type="email"
                className="ins-email-input"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="ins-privacy-block">
              <p className="ins-privacy-text">
                *Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.
              </p>
              <label className="ins-consent-row">
                <input type="checkbox" checked={consentPrimary} onChange={(e) => setConsentPrimary(e.target.checked)} />
                <span>Consiento y autorizo expresamente que los datos personales aquí señalados sean tratados conforme al Aviso de Privacidad.</span>
              </label>
              <label className="ins-consent-row">
                <input type="checkbox" checked={consentSecondary} onChange={(e) => setConsentSecondary(e.target.checked)} />
                <span>Consiento y autorizo expresamente que mis datos personales sean tratados para finalidades secundarias, como publicidad sobre futuros entrenamientos, mismas que no son necesarias para tu acceso.</span>
              </label>
            </div>

            {apiError && <p className="ins-error">{apiError}</p>}

            <button
              type="button"
              className="ins-btn ins-btn--primary ins-btn--full"
              disabled={!canPay || loading}
              onClick={handlePay}
            >
              {loading
                ? <><Loader2 size={18} className="ins-spin" /> Procesando inversión...</>
                : <><span>Invertir en inscripción</span><ChevronRight size={18} /></>
              }
            </button>

            <p className="ins-summary-secure">
              <Shield size={13} /> Inversión segura con Stripe · SSL cifrado
            </p>
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}

const COUNTRIES = [
  { code: '+52',  iso: 'mx', label: 'MX' },
  { code: '+1',   iso: 'us', label: 'US' },
  { code: '+57',  iso: 'co', label: 'CO' },
  { code: '+54',  iso: 'ar', label: 'AR' },
  { code: '+56',  iso: 'cl', label: 'CL' },
  { code: '+51',  iso: 'pe', label: 'PE' },
  { code: '+593', iso: 'ec', label: 'EC' },
  { code: '+502', iso: 'gt', label: 'GT' },
  { code: '+506', iso: 'cr', label: 'CR' },
  { code: '+503', iso: 'sv', label: 'SV' },
  { code: '+58',  iso: 've', label: 'VE' },
  { code: '+591', iso: 'bo', label: 'BO' },
  { code: '+595', iso: 'py', label: 'PY' },
  { code: '+598', iso: 'uy', label: 'UY' },
  { code: '+507', iso: 'pa', label: 'PA' },
  { code: '+34',  iso: 'es', label: 'ES' },
  { code: '+33',  iso: 'fr', label: 'FR' },
];

function PhoneSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = COUNTRIES.find(c => c.code === value) || COUNTRIES[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="phone-select" ref={ref}>
      <button type="button" className="phone-select__trigger" onClick={() => setOpen(v => !v)}>
        <img src={`https://flagcdn.com/w40/${selected.iso}.png`} alt={selected.label} className="phone-select__flag" />
        <span>{selected.code}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </button>
      {open && (
        <div className="phone-select__dropdown">
          {COUNTRIES.map(c => (
            <button
              key={c.code}
              type="button"
              className={`phone-select__option ${c.code === value ? 'active' : ''}`}
              onClick={() => { onChange(c.code); setOpen(false); }}
            >
              <img src={`https://flagcdn.com/w40/${c.iso}.png`} alt={c.label} className="phone-select__flag" />
              <span>{c.label}</span>
              <span className="phone-select__dial">{c.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function RegistrationForm() {
  const [params] = useSearchParams();
  const stored = (() => {
    try {
      const d = params.get('d');
      if (!d) return {};
      // Revertir base64url a base64 estándar y decodificar
      const b64 = d.replace(/-/g, '+').replace(/_/g, '/');
      return JSON.parse(atob(b64));
    } catch (err) { 
      console.error('Error decoding pay data:', err);
      return {}; 
    }
  })();

  const [form, setForm] = useState({
    nombres: '', apellidos: '', email: stored.email || '', telefono: '', lada: '+52',
    pais: '', estado: '', grado: '', especialidad: '', institucion: '', cargo: '',
  });
  const [status, setStatus] = useState('idle');

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const payload = {
        ...form,
        telefono:    `${form.lada} ${form.telefono}`,
        perfil:      stored.perfilLabel || '',
        extras:      stored.extrasLabel || '',
        moneda:      stored.moneda || '',
        total_mxn:   stored.total_mxn || '',
        tag:         'ECMOParis2026',
      };

      await Promise.all([
        // Formspree — notificación por email
        fetch('https://formspree.io/f/mnjlvbpw', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),

        // Mailchimp — alta del contacto + tag + flujo de bienvenida
        fetch('/.netlify/functions/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }),
      ]);

      localStorage.removeItem('hce_pago');
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="ins-result-wrap">
        <div className="ins-result-card">
          <CheckCircle2 size={60} className="ins-result-icon ins-result-icon--ok" />
          <h2>¡Registro completado!</h2>
          <p>Tu inscripción está confirmada. En breve recibirás un correo de bienvenida con todos los detalles del programa.</p>
          <a href="/" className="ins-btn ins-btn--primary">Volver al inicio</a>
        </div>
      </div>
    );
  }

  return (
    <div className="reg-wrap hce-container">
      {/* Banner inversión exitosa */}
      <div className="reg-paid-banner">
        <CheckCircle2 size={20} />
        <span>¡Inversión procesada con éxito! Completa tu registro para confirmar tu lugar.</span>
      </div>

      <div className="reg-layout">
        {/* Resumen del pago */}
        <aside className="reg-summary-card">
          <h3 className="reg-summary-title">Resumen de tu inversión</h3>
          <div className="reg-summary-row"><span>Perfil</span><strong>{stored.perfilLabel || '—'}</strong></div>
          <div className="reg-summary-row"><span>Extras</span><strong>{stored.extrasLabel || 'Ninguno'}</strong></div>
          <div className="reg-summary-row"><span>Moneda</span><strong>{(stored.moneda || 'mxn').toUpperCase()}</strong></div>
          <div className="reg-summary-row reg-summary-row--total">
            <span>Inversión realizada</span>
            <strong>${(stored.total_mxn || 0).toLocaleString('es-MX')} MXN</strong>
          </div>
        </aside>

        {/* Formulario */}
        <form className="reg-form" onSubmit={handleSubmit}>
          <h2 className="reg-form-title">Completa tu inscripción</h2>
          <p className="reg-form-sub">Una vez enviado este formulario, recibirás en tu correo electrónico la confirmación oficial y los detalles de acceso nuestro programa.</p>

          <div className="reg-grid">
            <div className="reg-field">
              <label>Nombre(s) *</label>
              <input type="text" value={form.nombres} onChange={set('nombres')} required />
            </div>
            <div className="reg-field">
              <label>Apellido(s) *</label>
              <input type="text" value={form.apellidos} onChange={set('apellidos')} required />
            </div>
            <div className="reg-field">
              <label>Correo electrónico *</label>
              <input type="email" value={form.email} onChange={set('email')} required />
            </div>
            <div className="reg-field">
              <label>Teléfono *</label>
              <div className="tel-group">
                <PhoneSelect value={form.lada} onChange={(v) => setForm(f => ({ ...f, lada: v }))} />
                <input type="tel" value={form.telefono} onChange={set('telefono')} required placeholder="10 dígitos" />
              </div>
            </div>
            <div className="reg-field">
              <label>País *</label>
              <input type="text" value={form.pais} onChange={set('pais')} required />
            </div>
            <div className="reg-field">
              <label>Estado / Ciudad *</label>
              <input type="text" value={form.estado} onChange={set('estado')} required />
            </div>
            <div className="reg-field">
              <label>Grado académico / Profesión *</label>
              <select value={form.grado} onChange={set('grado')} required>
                <option value="">Selecciona...</option>
                <option>Médico Especialista</option>
                <option>Médico Residente</option>
                <option>Enfermero/a</option>
                <option>Terapeuta Respiratorio</option>
                <option>Fisioterapeuta</option>
                <option>Estudiante</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="reg-field">
              <label>Especialidad * <span className="reg-hint">(escribe "no aplica" si no tienes)</span></label>
              <input type="text" value={form.especialidad} onChange={set('especialidad')} required />
            </div>
            <div className="reg-field">
              <label>Institución / Hospital *</label>
              <input type="text" value={form.institucion} onChange={set('institucion')} required />
            </div>
            <div className="reg-field">
              <label>Cargo / Puesto *</label>
              <input type="text" value={form.cargo} onChange={set('cargo')} required />
            </div>
          </div>

          {status === 'error' && (
            <p className="ins-error">Ocurrió un error al enviar. Intenta de nuevo.</p>
          )}

          <button
            type="submit"
            className="ins-btn ins-btn--primary reg-submit"
            disabled={status === 'loading'}
          >
            {status === 'loading'
              ? <><Loader2 size={18} className="ins-spin" /> Enviando...</>
              : 'Concluir registro'}
          </button>
        </form>
      </div>
    </div>
  );
}

