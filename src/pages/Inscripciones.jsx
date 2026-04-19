import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ChevronRight, Stethoscope, Heart, Shield } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Inscripciones.css';

const USD_RATE = 17;

const EXTRA_CATALOG = {
  ecmo_sim: {
    label: 'ECMO SIM',
    desc: 'Taller de simulación avanzada en ECMO con maniquí de alta fidelidad',
    price: 3500,
  },
  ecmo_nursing: {
    label: 'ECMO NURSING',
    desc: 'Módulo especializado de ECMO para cuidados de enfermería intensiva',
    price: 3500,
  },
};

const PROFILES = {
  especialista: {
    label: 'Médicos Especialistas',
    price: 39000,
    extras: ['ecmo_sim'],
  },
  residente: {
    label: 'Médicos Residentes',
    price: 37000,
    extras: ['ecmo_sim'],
  },
  enfermero: {
    label: 'Enfermeros y Otros Profesionales',
    price: 37000,
    extras: ['ecmo_sim', 'ecmo_nursing'],
  },
};

const fmt = (n, cur) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: cur.toUpperCase(), maximumFractionDigits: 0 }).format(n);

export default function Inscripciones() {
  const [searchParams] = useSearchParams();
  const [cardSel, setCardSel] = useState(null);   // 'especialista' | 'otros'
  const [subRole, setSubRole] = useState(null);    // 'residente' | 'enfermero'
  const [extras, setExtras] = useState(new Set());
  const [moneda, setMoneda] = useState('mxn');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const payStatus = searchParams.get('status'); // 'success' | 'cancel'

  const perfil = cardSel === 'especialista' ? 'especialista' : subRole;

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

  const availableExtras = perfil ? PROFILES[perfil].extras.map((id) => ({ id, ...EXTRA_CATALOG[id] })) : [];
  const baseMXN = perfil ? PROFILES[perfil].price : 0;
  const extrasMXN = [...extras].reduce((s, id) => s + EXTRA_CATALOG[id].price, 0);
  const totalMXN = baseMXN + extrasMXN;
  const displayBase = moneda === 'usd' ? Math.ceil(baseMXN / USD_RATE) : baseMXN;
  const displayExtras = moneda === 'usd' ? Math.ceil(extrasMXN / USD_RATE) : extrasMXN;
  const displayTotal = moneda === 'usd' ? Math.ceil(totalMXN / USD_RATE) : totalMXN;
  const cur = moneda.toUpperCase();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canPay = !!perfil && emailValid;

  const handlePay = async () => {
    if (!canPay) return;
    setLoading(true);
    setApiError('');
    try {
      // Guardar datos del pago para el formulario de registro post-pago
      localStorage.setItem('hce_pago', JSON.stringify({
        email:   email.trim(),
        perfil,
        perfilLabel: PROFILES[perfil].label,
        extras:  [...extras],
        extrasLabel: [...extras].map((id) => EXTRA_CATALOG[id].label).join(', ') || 'Ninguno',
        moneda,
        total_mxn: totalMXN,
      }));

      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil, extras: [...extras], moneda, email: email.trim() }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No se pudo iniciar el pago');
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
            <h2>Pago cancelado</h2>
            <p>No se realizó ningún cargo. Puedes intentarlo nuevamente cuando lo desees.</p>
            <a href="/inscripciones" className="ins-btn ins-btn--primary">Intentar de nuevo</a>
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
          <span className="ins-hero-badge">Programas 2026</span>
          <h1 className="ins-hero-title">Inscripciones</h1>
          <p className="ins-hero-sub">
            Selecciona tu perfil y personaliza tu inscripción al programa de formación clínica más completo de Latinoamérica.
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
                <p className="ins-step-sub">Cada perfil tiene precio y contenido específico.</p>
              </div>
            </div>

            <div className="ins-cards">
              {/* Card 1 — Especialista */}
              <button
                type="button"
                className={`ins-card ${cardSel === 'especialista' ? 'ins-card--active' : ''} ${cardSel === 'otros' ? 'ins-card--locked' : ''}`}
                onClick={() => cardSel !== 'otros' && selectCard('especialista')}
                disabled={cardSel === 'otros'}
              >
                <div className="ins-card-visual ins-card-visual--blue">
                  <Stethoscope size={40} strokeWidth={1.5} />
                </div>
                <div className="ins-card-body">
                  <div className="ins-card-top">
                    <span className="ins-card-tag">Perfil A</span>
                    {cardSel === 'especialista' && <CheckCircle2 size={20} className="ins-card-check" />}
                  </div>
                  <h3 className="ins-card-title">Médicos Especialistas</h3>
                  <p className="ins-card-desc">Para médicos con especialidad clínica activa. Acceso completo al programa avanzado.</p>
                </div>
              </button>

              {/* Card 2 — Otros */}
              <button
                type="button"
                className={`ins-card ${cardSel === 'otros' ? 'ins-card--active' : ''} ${cardSel === 'especialista' ? 'ins-card--locked' : ''}`}
                onClick={() => cardSel !== 'especialista' && selectCard('otros')}
                disabled={cardSel === 'especialista'}
              >
                <div className="ins-card-visual ins-card-visual--cyan">
                  <Heart size={40} strokeWidth={1.5} />
                </div>
                <div className="ins-card-body">
                  <div className="ins-card-top">
                    <span className="ins-card-tag">Perfil B</span>
                    {cardSel === 'otros' && <CheckCircle2 size={20} className="ins-card-check" />}
                  </div>
                  <h3 className="ins-card-title">Residentes, Enfermeros y Otros</h3>
                  <p className="ins-card-desc">Médicos residentes, enfermeros, terapeutas respiratorios y otros profesionales de salud.</p>
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
                  <p className="ins-step-sub">Esto determina los módulos adicionales disponibles para ti.</p>
                </div>
              </div>
              <div className="ins-role-grid">
                {[
                  { id: 'residente', label: 'Médico Residente', desc: 'Actualmente en programa de residencia médica' },
                  { id: 'enfermero', label: 'Enfermero / Otro Profesional', desc: 'Enfermero, terapeuta respiratorio, fisioterapeuta, u otro' },
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
                      <span className="ins-role-desc">{r.desc}</span>
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
                  <h2 className="ins-step-title">Módulos adicionales</h2>
                  <p className="ins-step-sub">Agrega módulos opcionales a tu inscripción.</p>
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
                      <span className="ins-extra-desc">{ex.desc}</span>
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
                      <div key={id} className="ins-summary-line ins-summary-line--extra">
                        <span>+ {ex.label}</span>
                        <span>{fmt(price, cur)}</span>
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
                <span>Total</span>
                <strong>{fmt(displayTotal, cur)}</strong>
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

            {apiError && <p className="ins-error">{apiError}</p>}

            <button
              type="button"
              className="ins-btn ins-btn--primary ins-btn--full"
              disabled={!canPay || loading}
              onClick={handlePay}
            >
              {loading
                ? <><Loader2 size={18} className="ins-spin" /> Redirigiendo a pago...</>
                : <><span>Pagar inscripción</span><ChevronRight size={18} /></>
              }
            </button>

            <p className="ins-summary-secure">
              <Shield size={13} /> Pago seguro con Stripe · SSL cifrado
            </p>
          </div>
        </aside>
      </div>

      {/* ── ZONA DE PRUEBAS ── */}
      <TestZone />

      <Footer />
    </div>
  );
}

function RegistrationForm() {
  const stored = (() => {
    try { return JSON.parse(localStorage.getItem('hce_pago') || '{}'); } catch { return {}; }
  })();

  const [form, setForm] = useState({
    nombres:      '',
    apellidos:    '',
    email:        stored.email || '',
    telefono:     '',
    pais:         '',
    estado:       '',
    grado:        '',
    especialidad: '',
    institucion:  '',
    cargo:        '',
  });
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      const payload = {
        ...form,
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
      {/* Banner pago exitoso */}
      <div className="reg-paid-banner">
        <CheckCircle2 size={20} />
        <span>¡Pago procesado con éxito! Completa tu registro para confirmar tu lugar.</span>
      </div>

      <div className="reg-layout">
        {/* Resumen del pago */}
        <aside className="reg-summary-card">
          <h3 className="reg-summary-title">Resumen de tu inscripción</h3>
          <div className="reg-summary-row"><span>Perfil</span><strong>{stored.perfilLabel || '—'}</strong></div>
          <div className="reg-summary-row"><span>Extras</span><strong>{stored.extrasLabel || 'Ninguno'}</strong></div>
          <div className="reg-summary-row"><span>Moneda</span><strong>{(stored.moneda || 'mxn').toUpperCase()}</strong></div>
          <div className="reg-summary-row reg-summary-row--total">
            <span>Total pagado</span>
            <strong>${(stored.total_mxn || 0).toLocaleString('es-MX')} MXN</strong>
          </div>
        </aside>

        {/* Formulario */}
        <form className="reg-form" onSubmit={handleSubmit}>
          <h2 className="reg-form-title">Completa tu registro</h2>
          <p className="reg-form-sub">Necesitamos tus datos para enviarte el acceso y materiales del programa.</p>

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
              <label>Teléfono * <span className="reg-hint">(con código de país)</span></label>
              <input type="tel" value={form.telefono} onChange={set('telefono')} required />
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

function TestZone() {
  const [testExtras, setTestExtras] = useState(new Set());
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState('');

  const TEST_EXTRAS = [
    { id: 'test_extra_a', label: 'Extra de prueba A', price: 5 },
    { id: 'test_extra_b', label: 'Extra de prueba B', price: 5 },
  ];

  const toggleTest = (id) =>
    setTestExtras((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const base = 10;
  const extrasTotal = [...testExtras].reduce((s, id) => {
    const ex = TEST_EXTRAS.find((e) => e.id === id);
    return s + (ex?.price ?? 0);
  }, 0);
  const total = base + extrasTotal;

  const handleTestPay = async () => {
    setTestLoading(true);
    setTestError('');
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perfil: 'test', extras: [...testExtras], moneda: 'mxn', email: 'test@hce.com' }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'Error');
    } catch (err) {
      setTestError(err.message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="test-zone hce-container">
      <div className="test-zone-inner">
        <div className="test-zone-header">
          <span className="test-zone-badge">⚙ TESTEO</span>
          <p className="test-zone-sub">Zona de pruebas — no visible en producción final</p>
        </div>

        <div className="test-zone-body">
          <div className="test-zone-info">
            <p className="test-zone-label">Producto</p>
            <p className="test-zone-val">Inscripción de prueba · <strong>$10 MXN</strong></p>
          </div>

          <div className="test-zone-extras">
            {TEST_EXTRAS.map((ex) => (
              <label key={ex.id} className={`test-extra ${testExtras.has(ex.id) ? 'test-extra--on' : ''}`}>
                <input
                  type="checkbox"
                  checked={testExtras.has(ex.id)}
                  onChange={() => toggleTest(ex.id)}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
                <span className="test-extra-box">{testExtras.has(ex.id) ? '✓' : ''}</span>
                {ex.label} · +${ex.price} MXN
              </label>
            ))}
          </div>

          <div className="test-zone-total">
            Total: <strong>${total} MXN</strong>
          </div>

          {testError && <p className="test-zone-error">{testError}</p>}

          <button
            type="button"
            className="test-zone-btn"
            onClick={handleTestPay}
            disabled={testLoading}
          >
            {testLoading ? 'Redirigiendo...' : 'Probar pago ($' + total + ' MXN)'}
          </button>
        </div>
      </div>
    </div>
  );
}
