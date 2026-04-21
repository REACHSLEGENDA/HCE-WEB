import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Retroalimentacion.css';

const AREAS = ['ECMO', 'Insuficiencia Cardíaca Avanzada', 'Monitoreo Hemodinámico', 'Cuidados Intensivos', 'Trasplante Pulmonar', 'Simulación Clínica Avanzada', 'Otro'];

const initialState = {
  taller: '', lugar: '', nombres: '', apellidos: '', estado: '', pais: '',
  grado: '', especialidad: '', institucion: '', cargo: '',
  email: '', telefono: '', modalidad: '',
  satisfaccion: '', utilidad: '', organizacion: '',
  valoroso: '', mejoras: '', comentarios: '',
  interesFuturo: '', preferenciaContacto: '',
  areasInteres: [],
  privacidad: false,
};

const Radio = ({ name, value, label, checked, onChange }) => (
  <label className="ret-radio-label">
    <input type="radio" name={name} value={value} checked={checked} onChange={onChange} />
    <span className="ret-radio-custom" />
    {label}
  </label>
);

const Retroalimentacion = () => {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState('idle'); // idle | loading | success | error

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const toggleArea = (area) =>
    setForm((f) => ({
      ...f,
      areasInteres: f.areasInteres.includes(area)
        ? f.areasInteres.filter((a) => a !== area)
        : [...f.areasInteres, area],
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await Promise.all([
        // Mailchimp via Netlify function
        fetch('/.netlify/functions/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
        // Formspree → email a academia@healthcareexp.com (sin redirección)
        fetch('https://formspree.io/f/xnjlvzdq', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }),
      ]);
      setStatus('success');
      setForm(initialState);
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="ret-page">
        <Navbar />
        <div className="ret-success-wrap">
          <div className="ret-success-card">
            <CheckCircle2 size={56} className="ret-success-icon" />
            <h2>¡Gracias por tu retroalimentación!</h2>
            <p>Tu opinión nos ayuda a seguir mejorando. Pronto estaremos en contacto.</p>
            <a href="/" className="ret-btn ret-btn--primary">Volver al inicio</a>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="ret-page">
      <Navbar />

      <div className="ret-hero">
        <div className="ret-hero-inner hce-container">
          <img
            src="/assets/componentes/firma-hce.png"
            alt="HCE"
            className="ret-logo"
          />
          <h1 className="ret-hero-title">Retroalimentación del Taller</h1>
          <p className="ret-hero-sub">Tu experiencia nos ayuda a seguir construyendo la mejor educación médica de la región.</p>
        </div>
      </div>

      <div className="hce-container ret-container">
        <form className="ret-form" onSubmit={handleSubmit}>

          {/* ── DATOS DEL TALLER ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Datos del Taller</legend>
            <div className="ret-grid ret-grid--2">
              <div className="ret-field">
                <label>Nombre del taller *</label>
                <input type="text" value={form.taller} onChange={set('taller')} required />
              </div>
              <div className="ret-field">
                <label>Congreso / Hospital / Evento *</label>
                <input type="text" value={form.lugar} onChange={set('lugar')} required />
              </div>
            </div>
          </fieldset>

          {/* ── DATOS PERSONALES ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Datos Personales</legend>
            <div className="ret-grid ret-grid--2">
              <div className="ret-field">
                <label>Nombre(s) *</label>
                <input type="text" value={form.nombres} onChange={set('nombres')} required />
              </div>
              <div className="ret-field">
                <label>Apellido(s) *</label>
                <input type="text" value={form.apellidos} onChange={set('apellidos')} required />
              </div>
              <div className="ret-field">
                <label>Estado / Provincia *</label>
                <input type="text" value={form.estado} onChange={set('estado')} required />
              </div>
              <div className="ret-field">
                <label>País *</label>
                <input type="text" value={form.pais} onChange={set('pais')} required />
              </div>
            </div>
          </fieldset>

          {/* ── DATOS PROFESIONALES ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Datos Profesionales</legend>
            <div className="ret-grid ret-grid--2">
              <div className="ret-field">
                <label>Grado académico *</label>
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
              <div className="ret-field">
                <label>Especialidad * <span className="ret-hint">(escribe "no aplica" si no tienes)</span></label>
                <input type="text" value={form.especialidad} onChange={set('especialidad')} required />
              </div>
              <div className="ret-field">
                <label>Institución / Hospital *</label>
                <input type="text" value={form.institucion} onChange={set('institucion')} required />
              </div>
              <div className="ret-field">
                <label>Cargo / Puesto *</label>
                <input type="text" value={form.cargo} onChange={set('cargo')} required />
              </div>
            </div>
          </fieldset>

          {/* ── CONTACTO ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Contacto</legend>
            <div className="ret-grid ret-grid--2">
              <div className="ret-field">
                <label>Correo electrónico *</label>
                <input type="email" value={form.email} onChange={set('email')} required />
              </div>
              <div className="ret-field">
                <label>Teléfono * <span className="ret-hint">(incluye código de país)</span></label>
                <input type="tel" value={form.telefono} onChange={set('telefono')} required />
              </div>
            </div>
          </fieldset>

          {/* ── EXPERIENCIA ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Tu Experiencia en el Taller</legend>

            <div className="ret-field ret-field--inline">
              <label>Modalidad</label>
              <div className="ret-radio-group">
                <Radio name="modalidad" value="Presencial" label="Presencial" checked={form.modalidad === 'Presencial'} onChange={set('modalidad')} />
                <Radio name="modalidad" value="Virtual"    label="Virtual"    checked={form.modalidad === 'Virtual'}    onChange={set('modalidad')} />
              </div>
            </div>

            <div className="ret-field">
              <label>Satisfacción general *</label>
              <div className="ret-scale-group">
                {['Muy satisfecho', 'Satisfecho', 'Neutral', 'Insatisfecho', 'Muy insatisfecho'].map((v) => (
                  <Radio key={v} name="satisfaccion" value={v} label={v} checked={form.satisfaccion === v} onChange={set('satisfaccion')} />
                ))}
              </div>
            </div>

            <div className="ret-field">
              <label>Utilidad para tu práctica clínica *</label>
              <div className="ret-scale-group">
                {['Muy útil', 'Útil', 'Neutral', 'Poco útil', 'Nada útil'].map((v) => (
                  <Radio key={v} name="utilidad" value={v} label={v} checked={form.utilidad === v} onChange={set('utilidad')} />
                ))}
              </div>
            </div>

            <div className="ret-field">
              <label>Organización y logística *</label>
              <div className="ret-scale-group">
                {['Excelente', 'Buena', 'Regular', 'Necesita mejorar'].map((v) => (
                  <Radio key={v} name="organizacion" value={v} label={v} checked={form.organizacion === v} onChange={set('organizacion')} />
                ))}
              </div>
            </div>
          </fieldset>

          {/* ── COMENTARIOS ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Retroalimentación Abierta</legend>
            <div className="ret-field">
              <label>¿Qué fue lo más valioso del taller? *</label>
              <textarea value={form.valoroso} onChange={set('valoroso')} rows={3} required />
            </div>
            <div className="ret-field">
              <label>¿Qué mejorarías? *</label>
              <textarea value={form.mejoras} onChange={set('mejoras')} rows={3} required />
            </div>
            <div className="ret-field">
              <label>Comentarios adicionales</label>
              <textarea value={form.comentarios} onChange={set('comentarios')} rows={3} />
            </div>
          </fieldset>

          {/* ── PREFERENCIAS ── */}
          <fieldset className="ret-fieldset">
            <legend className="ret-legend">Preferencias de Comunicación</legend>

            <div className="ret-field ret-field--inline">
              <label>¿Te interesa participar en futuros programas? *</label>
              <div className="ret-radio-group">
                <Radio name="interesFuturo" value="si" label="Sí" checked={form.interesFuturo === 'si'} onChange={set('interesFuturo')} />
                <Radio name="interesFuturo" value="no" label="No" checked={form.interesFuturo === 'no'} onChange={set('interesFuturo')} />
              </div>
            </div>

            <div className="ret-field ret-field--inline">
              <label>¿Cómo prefieres que te contactemos? *</label>
              <div className="ret-radio-group">
                <Radio name="preferenciaContacto" value="Email"    label="Email"    checked={form.preferenciaContacto === 'Email'}    onChange={set('preferenciaContacto')} />
                <Radio name="preferenciaContacto" value="WhatsApp" label="WhatsApp" checked={form.preferenciaContacto === 'WhatsApp'} onChange={set('preferenciaContacto')} />
              </div>
            </div>

            <div className="ret-field">
              <label>Áreas de interés *</label>
              <div className="ret-checkbox-grid">
                {AREAS.map((area) => (
                  <label key={area} className="ret-check-label">
                    <input
                      type="checkbox"
                      checked={form.areasInteres.includes(area)}
                      onChange={() => toggleArea(area)}
                    />
                    <span className="ret-check-custom" />
                    {area}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          {/* ── CONSENTIMIENTO ── */}
          <div className="ret-consent">
            <label className="ret-check-label">
              <input
                type="checkbox"
                checked={form.privacidad}
                onChange={(e) => setForm((f) => ({ ...f, privacidad: e.target.checked }))}
                required
              />
              <span className="ret-check-custom" />
              Autorizo el tratamiento de mis datos personales conforme al aviso de privacidad de HCE.
            </label>
          </div>

          {status === 'error' && (
            <p className="ret-error">
              Error al enviar. En local usa <code>netlify dev</code>; en producción funcionará automáticamente.
            </p>
          )}

          <button type="submit" className="ret-btn ret-btn--primary ret-submit" disabled={status === 'loading'}>
            {status === 'loading' ? <><Loader2 size={18} className="ret-spin" /> Enviando...</> : 'Enviar retroalimentación'}
          </button>

        </form>
      </div>

      <Footer />
    </div>
  );
};

export default Retroalimentacion;
