import { useState, useRef } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './Facturacion.css';

const REGIMENES = [
  { value: '601', label: '601 – General de Ley Personas Morales' },
  { value: '603', label: '603 – Personas Morales con Fines no Lucrativos' },
  { value: '605', label: '605 – Sueldos y Salarios e Ingresos Asimilados' },
  { value: '606', label: '606 – Arrendamiento' },
  { value: '608', label: '608 – Demás ingresos' },
  { value: '612', label: '612 – Personas Físicas con Actividades Empresariales y Profesionales' },
  { value: '616', label: '616 – Sin obligaciones fiscales' },
  { value: '621', label: '621 – Incorporación Fiscal' },
  { value: '625', label: '625 – Plataformas Tecnológicas' },
  { value: '626', label: '626 – Régimen Simplificado de Confianza (RESICO)' },
];

const USOS_CFDI = [
  { value: 'G01', label: 'G01 – Adquisición de mercancias' },
  { value: 'G03', label: 'G03 – Gastos en general' },
  { value: 'D01', label: 'D01 – Honorarios médicos y gastos hospitalarios' },
  { value: 'D10', label: 'D10 – Pagos por servicios educativos (colegiaturas)' },
  { value: 'S01', label: 'S01 – Sin efectos fiscales' },
  { value: 'CP01', label: 'CP01 – Pagos' },
];

const ESTADOS_MX = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Guanajuato',
  'Guerrero','Hidalgo','Jalisco','México','Michoacán','Morelos','Nayarit',
  'Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí',
  'Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas',
];

const INITIAL = {
  razon_social: '',
  rfc: '',
  correo: '',
  telefono: '',
  cp_fiscal: '',
  regimen_fiscal: '',
  uso_cfdi: '',
  calle: '',
  numero_ext: '',
  numero_int: '',
  colonia: '',
  ciudad: '',
  estado: '',
  referencia_pago: '',
  concepto: '',
  monto: '',
  notas: '',
};

function Field({ label, required, error, children }) {
  return (
    <div className={`fac-field ${error ? 'fac-field--error' : ''}`}>
      <label className="fac-label">
        {label} {required && <span className="fac-req">*</span>}
      </label>
      {children}
      {error && <span className="fac-error-msg">{error}</span>}
    </div>
  );
}

import { useSEO } from '../hooks/useSEO';

export default function Facturacion() {
  useSEO({
    title: 'Facturación Electrónica',
    description: 'Solicita tu factura electrónica CFDI 4.0 para nuestros programas y certificaciones médicas. Completa tus datos fiscales y adjunta tu comprobante.',
    keywords: 'facturación electrónica, facturación HCE, CFDI 4.0, solicitar factura, recibo médico'
  });

  const [form, setForm] = useState(INITIAL);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const fileRef = useRef(null);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const validateRFC = (rfc) => {
    const re = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})?$/i;
    return re.test(rfc.trim());
  };

  const validate = () => {
    const e = {};
    if (!form.razon_social.trim()) e.razon_social = 'Campo requerido';
    if (!form.rfc.trim()) e.rfc = 'Campo requerido';
    else if (!validateRFC(form.rfc)) e.rfc = 'RFC no válido (ej: XAXX010101000)';
    if (!form.correo.trim()) e.correo = 'Campo requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo)) e.correo = 'Correo no válido';
    if (!form.cp_fiscal.trim()) e.cp_fiscal = 'Campo requerido';
    else if (!/^\d{5}$/.test(form.cp_fiscal)) e.cp_fiscal = 'Debe ser 5 dígitos';
    if (!form.regimen_fiscal) e.regimen_fiscal = 'Selecciona un régimen';
    if (!form.uso_cfdi) e.uso_cfdi = 'Selecciona el uso del CFDI';
    if (!form.referencia_pago.trim()) e.referencia_pago = 'Campo requerido';
    return e;
  };

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    const valid = selected.filter(f => f.size <= 25 * 1024 * 1024);
    setFiles(prev => {
      const combined = [...prev, ...valid].slice(0, 5);
      return combined;
    });
  };

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStatus('loading');

    const data = new FormData();
    data.append('_subject', `Solicitud de factura — ${form.razon_social} (${form.rfc})`);
    data.append('_replyto', form.correo);

    // Datos principales
    data.append('Razón Social', form.razon_social);
    data.append('RFC', form.rfc.toUpperCase());
    data.append('Correo electrónico', form.correo);
    if (form.telefono) data.append('Teléfono', form.telefono);

    // Datos fiscales
    data.append('Código Postal Fiscal', form.cp_fiscal);
    data.append('Régimen Fiscal', form.regimen_fiscal);
    data.append('Uso del CFDI', form.uso_cfdi);

    // Dirección fiscal
    const dir = [
      form.calle, form.numero_ext && `#${form.numero_ext}`,
      form.numero_int && `Int. ${form.numero_int}`,
      form.colonia, form.ciudad, form.estado,
    ].filter(Boolean).join(', ');
    if (dir.trim()) data.append('Dirección Fiscal', dir);

    // Referencia de pago
    data.append('Referencia de Pago', form.referencia_pago);
    if (form.concepto) data.append('Concepto', form.concepto);
    if (form.monto) data.append('Monto', form.monto);
    if (form.notas) data.append('Notas adicionales', form.notas);

    // Archivos
    files.forEach((f, i) => data.append(`Comprobante_${i + 1}`, f, f.name));

    try {
      const res = await fetch('https://formspree.io/f/mreroozv', {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setStatus('success');
        setForm(INITIAL);
        setFiles([]);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="fac-page">
        <Navbar />
        <div className="fac-success-wrap">
          <div className="fac-success-card">
            <div className="fac-success-icon">✓</div>
            <h2>Solicitud enviada</h2>
            <p>Recibimos tu solicitud de factura. En breve nos comunicamos contigo al correo <strong>{form.correo || 'indicado'}</strong>.</p>
            <button className="fac-btn-primary" onClick={() => setStatus('idle')}>
              Enviar otra solicitud
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="fac-page">
      <Navbar />

      <section className="fac-hero">
        <div className="fac-hero-inner hce-container">
          <span className="fac-badge">Facturación</span>
          <h1 className="fac-h1">Solicitud de <span className="fac-gradient">Factura</span></h1>
          <p className="fac-hero-sub">
            Completa el formulario con tus datos fiscales y adjunta tu comprobante de pago. Procesamos tu factura en un plazo de 24 a 48 horas hábiles.
          </p>
        </div>
      </section>

      <section className="fac-body hce-container">
        <form className="fac-form" onSubmit={handleSubmit} noValidate>

          {/* ── Datos del solicitante ── */}
          <div className="fac-section">
            <h3 className="fac-section-title">
              <span className="fac-section-num">01</span> Datos del solicitante
            </h3>
            <div className="fac-grid fac-grid--2">
              <Field label="Nombre completo o Razón Social" required error={errors.razon_social}>
                <input
                  className="fac-input"
                  placeholder="Ej: HOSPITAL ABC S.A. DE C.V."
                  value={form.razon_social}
                  onChange={e => set('razon_social', e.target.value)}
                />
              </Field>
              <Field label="RFC" required error={errors.rfc}>
                <input
                  className="fac-input fac-input--mono"
                  placeholder="Ej: XAXX010101000"
                  maxLength={13}
                  value={form.rfc}
                  onChange={e => set('rfc', e.target.value.toUpperCase())}
                />
              </Field>
              <Field label="Correo electrónico" required error={errors.correo}>
                <input
                  className="fac-input"
                  type="email"
                  placeholder="facturacion@empresa.com"
                  value={form.correo}
                  onChange={e => set('correo', e.target.value)}
                />
              </Field>
              <Field label="Teléfono" error={errors.telefono}>
                <input
                  className="fac-input"
                  placeholder="+52 55 0000 0000"
                  value={form.telefono}
                  onChange={e => set('telefono', e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* ── Datos fiscales ── */}
          <div className="fac-section">
            <h3 className="fac-section-title">
              <span className="fac-section-num">02</span> Datos fiscales
            </h3>
            <div className="fac-grid fac-grid--3">
              <Field label="Código Postal fiscal" required error={errors.cp_fiscal}>
                <input
                  className="fac-input fac-input--mono"
                  placeholder="00000"
                  maxLength={5}
                  value={form.cp_fiscal}
                  onChange={e => set('cp_fiscal', e.target.value.replace(/\D/g, ''))}
                />
              </Field>
              <Field label="Régimen Fiscal" required error={errors.regimen_fiscal}>
                <select
                  className="fac-select"
                  value={form.regimen_fiscal}
                  onChange={e => set('regimen_fiscal', e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {REGIMENES.map(r => (
                    <option key={r.value} value={`${r.value} – ${r.label.split('–')[1]?.trim()}`}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Uso del CFDI" required error={errors.uso_cfdi}>
                <select
                  className="fac-select"
                  value={form.uso_cfdi}
                  onChange={e => set('uso_cfdi', e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {USOS_CFDI.map(u => (
                    <option key={u.value} value={`${u.value} – ${u.label.split('–')[1]?.trim()}`}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Dirección fiscal */}
            <p className="fac-subsection">Dirección fiscal <span className="fac-optional">(opcional)</span></p>
            <div className="fac-grid fac-grid--4">
              <Field label="Calle">
                <input className="fac-input" placeholder="Calle" value={form.calle} onChange={e => set('calle', e.target.value)} />
              </Field>
              <Field label="Número exterior">
                <input className="fac-input" placeholder="Núm. ext." value={form.numero_ext} onChange={e => set('numero_ext', e.target.value)} />
              </Field>
              <Field label="Número interior">
                <input className="fac-input" placeholder="Núm. int." value={form.numero_int} onChange={e => set('numero_int', e.target.value)} />
              </Field>
              <Field label="Colonia">
                <input className="fac-input" placeholder="Colonia" value={form.colonia} onChange={e => set('colonia', e.target.value)} />
              </Field>
            </div>
            <div className="fac-grid fac-grid--2">
              <Field label="Municipio / Ciudad">
                <input className="fac-input" placeholder="Ciudad" value={form.ciudad} onChange={e => set('ciudad', e.target.value)} />
              </Field>
              <Field label="Estado">
                <select className="fac-select" value={form.estado} onChange={e => set('estado', e.target.value)}>
                  <option value="">Seleccionar…</option>
                  {ESTADOS_MX.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          {/* ── Referencia de pago ── */}
          <div className="fac-section">
            <h3 className="fac-section-title">
              <span className="fac-section-num">03</span> Referencia de pago
            </h3>
            <div className="fac-grid fac-grid--2">
              <Field label="Número de orden / Referencia de pago" required error={errors.referencia_pago}>
                <input
                  className="fac-input fac-input--mono"
                  placeholder="Ej: HCE-2026-00123"
                  value={form.referencia_pago}
                  onChange={e => set('referencia_pago', e.target.value)}
                />
              </Field>
              <Field label="Monto pagado">
                <input
                  className="fac-input"
                  placeholder="Ej: $39,000 MXN"
                  value={form.monto}
                  onChange={e => set('monto', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Concepto de facturación">
              <input
                className="fac-input"
                placeholder="Ej: Diploma Paris International ECMO 2026"
                value={form.concepto}
                onChange={e => set('concepto', e.target.value)}
              />
            </Field>
          </div>

          {/* ── Comprobante de pago ── */}
          <div className="fac-section">
            <h3 className="fac-section-title">
              <span className="fac-section-num">04</span> Comprobante de pago
            </h3>
            <p className="fac-file-hint">
              Adjunta tu comprobante (captura de pantalla, PDF o imagen). Máx. 5 archivos · 25 MB cada uno.
            </p>

            <div
              className="fac-dropzone"
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles({ target: { files: e.dataTransfer.files } }); }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                style={{ display: 'none' }}
                onChange={handleFiles}
              />
              <div className="fac-drop-icon">↑</div>
              <p className="fac-drop-text">Arrastra archivos aquí o <span>selecciona</span></p>
              <p className="fac-drop-sub">PDF, JPG, PNG, WEBP</p>
            </div>

            {files.length > 0 && (
              <ul className="fac-file-list">
                {files.map((f, i) => (
                  <li key={i} className="fac-file-item">
                    <span className="fac-file-icon">📄</span>
                    <span className="fac-file-name">{f.name}</span>
                    <span className="fac-file-size">({(f.size / 1024).toFixed(0)} KB)</span>
                    <button type="button" className="fac-file-remove" onClick={() => removeFile(i)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* ── Notas ── */}
          <div className="fac-section">
            <h3 className="fac-section-title">
              <span className="fac-section-num">05</span> Notas adicionales
            </h3>
            <Field label="¿Algo más que debamos saber?">
              <textarea
                className="fac-textarea"
                rows={4}
                placeholder="Indicaciones especiales, correo alternativo para envío de factura, etc."
                value={form.notas}
                onChange={e => set('notas', e.target.value)}
              />
            </Field>
          </div>

          {status === 'error' && (
            <div className="fac-submit-error">
              Ocurrió un error al enviar. Por favor intenta de nuevo o escríbenos directamente.
            </div>
          )}

          <div className="fac-submit-row">
            <p className="fac-submit-note">Los campos marcados con <span className="fac-req">*</span> son obligatorios.</p>
            <button className="fac-btn-primary" type="submit" disabled={status === 'loading'}>
              {status === 'loading' ? 'Enviando…' : 'Enviar solicitud de factura'}
            </button>
          </div>

        </form>
      </section>

      <Footer />
    </div>
  );
}
