import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, ChevronRight, Stethoscope, Heart, Shield, MapPin, Globe } from 'lucide-react';
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
};

const PROFILES = {
  especialista: {
    label: 'Médico(a) Especialista / Residente',
    price: 5000,
    extras: ['ecmo_sim'],
  },
  enfermero: {
    label: 'Enfermero(a) / Otro Profesional',
    price: 5000,
    extras: ['ecmo_sim'],
  },
};

const fmt = (n, cur) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 0 }).format(n);

import { useSEO } from '../hooks/useSEO';
import { COUNTRIES as ALL_COUNTRIES, getFlagUrl } from '../data/countries';

export default function InscripcionesNursing() {
  useSEO({
    title: 'Inscripciones ECMO Nursing Care',
    description: 'Asegura tu lugar en el programa ECMO Nursing Care. Selecciona tu perfil e inscríbete de manera segura.',
    keywords: 'inscripciones ECMO Nursing, enfermería UCI, curso ECMO, HCE'
  });

  const [searchParams] = useSearchParams();
  const [cardSel, setCardSel] = useState(null);   // 'especialista' | 'otros'
  const [subRole, setSubRole] = useState(null);    // 'enfermero'
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
    if (code === 'HCE10MSI') {
      setAppliedPromo({ code: 'HCE10MSI', discount: 0.1, type: 'discount' });
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
      const res = await fetch('/.netlify/functions/create-nursing-checkout', {
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
            <a href="/inscripciones-ecmo-nursing" className="ins-btn ins-btn--primary">Intentar de nuevo</a>
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
            Personaliza tu inscripción al programa ECMO Nursing Care Course y asegura tu lugar de manera segura.
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
              {/* Card 1 — Enfermero */}
              <button
                type="button"
                className={`ins-card ${cardSel === 'enfermero' ? 'ins-card--active' : ''}`}
                onClick={() => selectCard('enfermero')}
              >
                <div className="ins-card-visual ins-card-visual--blue">
                  <Heart size={40} strokeWidth={1.5} />
                </div>
                <div className="ins-card-body">
                  <div className="ins-card-top">
                    <span className="ins-card-tag">Perfil Principal</span>
                    {cardSel === 'enfermero' && <CheckCircle2 size={20} className="ins-card-check" />}
                  </div>
                  <h3 className="ins-card-title">Enfermero(a) / Otro Profesional</h3>
                </div>
              </button>

              {/* Card 2 — Especialista */}
              <button
                type="button"
                className={`ins-card ${cardSel === 'especialista' ? 'ins-card--active' : ''}`}
                onClick={() => selectCard('especialista')}
              >
                <div className="ins-card-visual ins-card-visual--cyan">
                  <Stethoscope size={40} strokeWidth={1.5} />
                </div>
                <div className="ins-card-body">
                  <div className="ins-card-top">
                    <span className="ins-card-tag">Perfil Médico</span>
                    {cardSel === 'especialista' && <CheckCircle2 size={20} className="ins-card-check" />}
                  </div>
                  <h3 className="ins-card-title">Médico(a) Especialista / Residente</h3>
                </div>
              </button>
            </div>
          </section>

          {/* STEP 2 — extras selection */}
          {perfil && availableExtras.length > 0 && (
            <section className="ins-section">
              <div className="ins-step-header">
                <span className="ins-step-num">2</span>
                <div>
                  <h2 className="ins-step-title">Potencia tu entrenamiento (Opcional)</h2>
                  <p className="ins-step-subtext">Agrega módulos complementarios con precio preferencial:</p>
                </div>
              </div>

              <div className="ins-extras-list">
                {availableExtras.map((ex) => {
                  const active = extras.has(ex.id);
                  return (
                    <div
                      key={ex.id}
                      className={`ins-extra-item ${active ? 'ins-extra-item--active' : ''}`}
                      onClick={() => toggleExtra(ex.id)}
                    >
                      <div className="ins-extra-checkbox">
                        {active && <CheckCircle2 size={20} />}
                      </div>
                      <div className="ins-extra-info">
                        <div className="ins-extra-header">
                          <h4>{ex.label}</h4>
                          <span className="ins-extra-price">+{fmt(moneda === 'usd' ? Math.ceil(ex.price / USD_RATE) : ex.price, moneda)} {cur}</span>
                        </div>
                        <p className="ins-extra-desc">{ex.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* ── RIGHT: price summary & payment CTA ── */}
        <aside className="ins-sidebar">
          <div className="ins-sidebar-card">
            <h3 className="ins-sidebar-title">Tu inversión</h3>

            {/* Currency selector */}
            <div className="ins-currency-toggle">
              <button
                type="button"
                className={`ins-currency-btn ${moneda === 'mxn' ? 'ins-currency-btn--active' : ''}`}
                onClick={() => setMoneda('mxn')}
              >
                MXN ($)
              </button>
              <button
                type="button"
                className={`ins-currency-btn ${moneda === 'usd' ? 'ins-currency-btn--active' : ''}`}
                onClick={() => setMoneda('usd')}
              >
                USD ($)
              </button>
            </div>

            {/* Price breakdown */}
            <div className="ins-breakdown">
              {perfil ? (
                <>
                  <div className="ins-row">
                    <span>Base ({PROFILES[perfil].label})</span>
                    <strong>{fmt(displayBase, moneda)} {cur}</strong>
                  </div>
                  {extras.size > 0 && (
                    <div className="ins-row">
                      <span>Módulos Adicionales</span>
                      <strong>{fmt(displayExtras, moneda)} {cur}</strong>
                    </div>
                  )}
                  {appliedPromo && appliedPromo.discount > 0 && (
                    <div className="ins-row ins-row--discount">
                      <span>Descuento ({appliedPromo.code})</span>
                      <strong>-{fmt(moneda === 'usd' ? Math.ceil(baseDiscount / USD_RATE) : baseDiscount, moneda)} {cur}</strong>
                    </div>
                  )}
                  <div className="ins-row ins-row--total">
                    <span>Total</span>
                    <span>{fmt(displayTotal, moneda)} {cur}</span>
                  </div>
                </>
              ) : (
                <p className="ins-empty-state">Selecciona un perfil para ver el desglose de tu inversión.</p>
              )}
            </div>

            {/* Promo code input */}
            {perfil && (
              <div className="ins-promo-section">
                {appliedPromo ? (
                  <div className="ins-promo-badge">
                    <span>Código aplicado: <strong>{appliedPromo.code}</strong></span>
                    <button type="button" onClick={() => setAppliedPromo(null)}>Eliminar</button>
                  </div>
                ) : (
                  <div className="ins-promo-form">
                    <input
                      type="text"
                      placeholder="Código de descuento"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                    />
                    <button type="button" onClick={applyPromo}>Aplicar</button>
                  </div>
                )}
              </div>
            )}

            {/* Email field */}
            <div className="ins-email-field">
              <label>Correo electrónico del alumno *</label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="ins-field-hint">A este correo se enviarán las claves de acceso al finalizar el pago.</p>
            </div>

            {/* Terms consents */}
            <div className="ins-consents">
              <label className="ins-consent-item">
                <input
                  type="checkbox"
                  checked={consentPrimary}
                  onChange={(e) => setConsentPrimary(e.target.checked)}
                />
                <span className="ins-consent-text">
                  Acepto los términos de servicio, políticas de privacidad y propiedad intelectual de HCE. *
                </span>
              </label>
              <label className="ins-consent-item">
                <input
                  type="checkbox"
                  checked={consentSecondary}
                  onChange={(e) => setConsentSecondary(e.target.checked)}
                />
                <span className="ins-consent-text">
                  Deseo recibir actualizaciones académicas y promociones de nuevos programas.
                </span>
              </label>
            </div>

            {apiError && <p className="ins-error">{apiError}</p>}

            {/* Pay Button */}
            <button
              type="button"
              className="ins-btn ins-btn--brand ins-btn--pay"
              onClick={handlePay}
              disabled={!canPay || loading}
            >
              {loading ? (
                <><Loader2 size={18} className="ins-spin" /> Procesando...</>
              ) : (
                <>Inscribirse Ahora <ChevronRight size={18} /></>
              )}
            </button>

            {/* Legal details */}
            <div className="ins-security-details">
              <div className="ins-security-item">
                <Shield size={16} />
                <span>Pago Seguro procesado por Stripe</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}

export function RegistrationForm() {
  const [params] = useSearchParams();
  const stored = (() => {
    try {
      const d = params.get('d');
      if (!d) return {};
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
  const [showCountrySuggestions, setShowCountrySuggestions] = useState(false);

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
        tag:         'ECMONursing2026',
      };

      await Promise.all([
        // Formspree — notificación por email
        fetch('https://formspree.io/f/mnjlvbpw', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {}),

        // Mailchimp — alta del contacto + tag + flujo de bienvenida
        fetch('/.netlify/functions/nursing-register', {
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
            <div className="reg-field" style={{ position: 'relative' }}>
              <label>País *</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="text" 
                  value={form.pais} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm(f => ({ ...f, pais: val }));
                    setShowCountrySuggestions(true);
                  }}
                  onFocus={() => setShowCountrySuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowCountrySuggestions(false), 250);
                  }}
                  required 
                  style={{ paddingRight: getFlagUrl(form.pais) ? '45px' : '12px', width: '100%' }}
                  placeholder="Escribe tu país..."
                  autoComplete="off"
                />
                {getFlagUrl(form.pais) && (
                  <img 
                    src={getFlagUrl(form.pais)} 
                    alt="Bandera" 
                    style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      height: '18px', 
                      width: 'auto', 
                      borderRadius: '3px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      pointerEvents: 'none'
                    }} 
                  />
                )}
              </div>

              {showCountrySuggestions && form.pais.trim().length > 0 && (
                <div className="country-autocomplete-dropdown">
                  {ALL_COUNTRIES.filter(c => {
                    const cleanName = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const cleanInput = form.pais.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    return cleanName.includes(cleanInput);
                  }).slice(0, 5).map(c => (
                    <div 
                      key={c.code} 
                      className="country-suggestion-item"
                      onMouseDown={() => {
                        setForm(f => ({ ...f, pais: c.name }));
                        setShowCountrySuggestions(false);
                      }}
                    >
                      <img 
                        src={`https://flagcdn.com/w40/${c.code}.png`} 
                        alt={c.name} 
                        className="suggestion-flag" 
                      />
                      <span>{c.name}</span>
                    </div>
                  ))}
                </div>
              )}
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

// Reutilizamos el selector de lada telefónica
function PhoneSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const selected = ALL_COUNTRIES.find((c) => c.dial === value) || { code: 'mx', dial: '+52', name: 'México' };

  return (
    <div className="phone-select-wrap" ref={dropdownRef}>
      <button type="button" className="phone-select-trigger" onClick={() => setOpen(!open)}>
        <img src={`https://flagcdn.com/w40/${selected.code}.png`} alt={selected.name} />
        <span>{selected.dial}</span>
      </button>
      {open && (
        <div className="phone-select-dropdown">
          {ALL_COUNTRIES.map((c) => (
            <div
              key={c.code}
              className="phone-select-option"
              onClick={() => {
                onChange(c.dial);
                setOpen(false);
              }}
            >
              <img src={`https://flagcdn.com/w40/${c.code}.png`} alt={c.name} />
              <span>{c.name} ({c.dial})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
