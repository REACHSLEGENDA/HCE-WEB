import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMarca, estiloMarca } from '../context/MarcaContext';
import {
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Award,
  BookOpen,
  Building,
  Briefcase
} from 'lucide-react';
import { PAISES, normalizarPais, paisPorIso, paisPorLada } from '../lib/paises';
import './Login.css';

// Ladas: la lista vive en lib/paises.js (también da el nombre con que se guarda el país).
const COUNTRIES = PAISES.map((p) => ({ code: p.lada, iso: p.iso.toLowerCase(), label: p.iso }));

function PhoneSelect({ value, onChange }) {
  return <select className="phone-select" aria-label="Código de país del teléfono" value={value} onChange={(ev) => onChange(ev.target.value)}>
    {COUNTRIES.map(c => <option key={c.iso} value={c.code}>{c.label} ({c.code})</option>)}
  </select>;
}

// Mismo tema que eligió el alumno dentro del portal (Dashboard lo guarda en
// 'studentTheme'). 'system' sigue al sistema con prefers-color-scheme; sin
// preferencia, claro, como el portal. Solo cambia la apariencia.
const temaGuardado = () => {
  try {
    const t = localStorage.getItem('studentTheme');
    if (t === 'dark') return 'dark';
    if (t === 'system') return undefined;
  } catch { /* sin almacenamiento */ }
  return 'light';
};

const Login = () => {
  const [tema] = useState(temaGuardado);
  const { login, signUp, resetPassword, user, profile, loading: authLoading } = useAuth();
  // Entrada por la dirección o el enlace de una división (su logo y su registro).
  const { marca, slugRegistro } = useMarca();
  const navigate = useNavigate();
  const location = useLocation();

  // Tabs: 'signin' | 'signup' | 'recovery'
  const [activeTab, setActiveTab] = useState('signin');

  // Fields - General/Sign In
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Fields - Sign Up
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [lada, setLada] = useState('+52');
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('');
  // Preselecciona la lada y el país con el país de la visita (geo.js). Solo es
  // el valor inicial: si el alumno ya los tocó, no se cambian.
  const tocoLada = useRef(false);
  const tocoPais = useRef(false);
  useEffect(() => {
    let cancelado = false;
    const aplicar = (iso) => {
      const encontrado = paisPorIso(iso);
      if (cancelado || !encontrado) return;
      if (!tocoLada.current) setLada(encontrado.lada);
      if (!tocoPais.current) setPais(encontrado.nombre);
    };
    let guardado = null;
    try { guardado = sessionStorage.getItem('hce_pais_visita'); } catch { /* sin almacenamiento */ }
    if (guardado) { aplicar(guardado); return () => { cancelado = true; }; }
    fetch('/.netlify/functions/geo')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.country) return;
        try { sessionStorage.setItem('hce_pais_visita', data.country); } catch { /* sin almacenamiento */ }
        aplicar(data.country);
      })
      .catch(() => { /* sin geolocalización se queda México */ });
    return () => { cancelado = true; };
  }, []);
  const digitosLada = paisPorLada(lada)?.digitos;
  const [estado, setEstado] = useState('');
  const [grado, setGrado] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [institucion, setInstitucion] = useState('');
  const [cargo, setCargo] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // States
  const envioRef = useRef(false);
  const mensajeRef = useRef(null);
  const registroTimer = useRef(null);
  useEffect(() => () => clearTimeout(registroTimer.current), []);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isFormSubmitting = loading || authLoading || !!user;

  // If user is already logged in, redirect them once profile has resolved
  useEffect(() => {
    if (user && !authLoading) {
      // Se conserva también la búsqueda (?curso_pago=ok&session_id=…, ?webinar=…)
      // para que el regreso de Stripe o de un webinar no se pierda.
      const desde = location.state?.from;
      const targetPath = desde?.pathname
        ? `${desde.pathname}${desde.search || ''}${desde.hash || ''}`
        : (profile?.rol === 'admin' ? '/admin' : '/dashboard');
      navigate(targetPath, { replace: true });
    }
  }, [user, profile, authLoading, navigate, location.state]);

  useEffect(() => { if (errorMsg || successMsg) mensajeRef.current?.focus(); }, [errorMsg, successMsg]);

  const errorEnEspanol = (err, defecto) => {
    const t = String(err?.message || '');
    if (/invalid.login.credentials|invalid.credentials|invalid_grant/i.test(t)) return 'Correo o contraseña incorrectos. Revisa tus datos e intenta de nuevo.';
    if (/email.not.confirmed/i.test(t)) return 'Confirma tu correo antes de iniciar sesión. Revisa también spam.';
    if (/already.registered|already.exists/i.test(t)) return 'Este correo ya tiene una cuenta. Inicia sesión o recupera tu contraseña.';
    if (/rate.limit|too.many|security.purposes|seconds/i.test(t) || err?.status === 429) return 'Hubo varios intentos seguidos. Espera un momento e intenta de nuevo.';
    if (/fetch|network|offline|timeout/i.test(t)) return 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.';
    return defecto;
  };

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (envioRef.current || isFormSubmitting) return;
    clearMessages();
    envioRef.current = true;
    setLoading(true);
    try {
      await login(email, password);
      // Redirection is handled by useEffect when user and profile are loaded.
    } catch (err) {
      setErrorMsg(errorEnEspanol(err, 'No pudimos iniciar sesión. Intenta de nuevo en un momento.'));
    } finally {
      envioRef.current = false;
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (envioRef.current || isFormSubmitting) return;
    clearMessages();

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    envioRef.current = true;
    setLoading(true);
    try {
      const fullPhone = `${lada} ${telefono}`.trim();
      await signUp(
        email,
        password,
        nombres,
        apellidos,
        fullPhone,
        normalizarPais(pais),
        estado,
        grado,
        especialidad,
        institucion,
        cargo,
        slugRegistro
      );
      setSuccessMsg('Tu cuenta fue creada. Revisa tu correo por si necesitas confirmarla y después inicia sesión.');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Auto switch to signin tab after success
      registroTimer.current = setTimeout(() => {
        setActiveTab('signin');
        setPassword('');
        setConfirmPassword('');
        setNombres('');
        setApellidos('');
        setTelefono('');
        setPais('');
        setEstado('');
        setGrado('');
        setEspecialidad('');
        setInstitucion('');
        setCargo('');
      }, 3500);
    } catch (err) {
      setErrorMsg(errorEnEspanol(err, 'No pudimos crear la cuenta. Revisa tus datos e intenta de nuevo.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      envioRef.current = false;
      setLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    if (envioRef.current || isFormSubmitting) return;
    clearMessages();
    envioRef.current = true;
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMsg('Revisa tu correo. Si corresponde a una cuenta, recibirás un enlace para restablecer tu contraseña. Revisa también spam o promociones.');
    } catch (err) {
      setErrorMsg(errorEnEspanol(err, 'No pudimos enviar el enlace. Revisa tu correo e intenta de nuevo.'));
    } finally {
      envioRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className={`login-page auth-entrada${marca ? ' auth-entrada--marca' : ''}`} data-theme={tema} style={estiloMarca(marca, ['--a-accent', '--a-button'])}>
      {!marca && (
        <nav className="auth-volver" aria-label="Sitio de HCE">
          <Link to="/" className="auth-toplink"><ArrowLeft size={16} aria-hidden="true" /> Volver al sitio</Link>
        </nav>
      )}
      <main className={`auth-main${activeTab === 'signup' ? ' auth-main--ancho' : ''}`}>
        <header className="auth-cabecera">
          {marca ? (
            <span className="auth-marca">{marca.logo_url ? <img src={marca.logo_url} alt={marca.nombre} height="64" /> : <strong>{marca.nombre}</strong>}</span>
          ) : (
            <Link to="/" className="auth-logo" aria-label="HCE, ir al inicio"><img src="/assets/componentes/firma-hce.png" alt="HCE Healthcare Training Experience" width="500" height="317" /></Link>
          )}
          <h1>Bienvenido al Portal de {marca ? marca.nombre : 'HCE'}</h1>
          <p>{marca?.bienvenida || 'Entra para continuar con tus cursos, clases y certificados.'}</p>
        </header>
        <div className={`login-card ${activeTab === 'signup' ? 'large-card' : ''}`}>
          {/* Navigation Tabs */}
          {activeTab !== 'recovery' && (
            <div className="login-tabs">
              <button
                disabled={isFormSubmitting}
                type="button"
                className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
                aria-pressed={activeTab === 'signin'}
                onClick={() => { setActiveTab('signin'); clearMessages(); }}
              >
                Iniciar sesión
              </button>
              <button
                disabled={isFormSubmitting}
                type="button"
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                aria-pressed={activeTab === 'signup'}
                onClick={() => { setActiveTab('signup'); clearMessages(); }}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div ref={mensajeRef} tabIndex={-1} role="alert" className="auth-alert alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alert Messages */}
          {successMsg && (
            <div ref={mensajeRef} tabIndex={-1} role="status" className="auth-alert alert-success">
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="auth-form">
              <fieldset className="auth-controls" disabled={isFormSubmitting}>
              <div className="input-group">
                <label htmlFor="login-email">Correo electrónico</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="login-email" name="email" value={email} autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="label-row">
                  <label htmlFor="login-password">Contraseña</label>
                  <button
                    type="button"
                    className="forgot-link" disabled={isFormSubmitting}
                    onClick={() => { setActiveTab('recovery'); clearMessages(); }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    id="login-password" name="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isFormSubmitting}>
                {isFormSubmitting ? 'Entrando…' : 'Iniciar sesión'} <ArrowRight size={16} />
              </button>
            </fieldset>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="auth-form signup-form-grid">
              <fieldset className="auth-controls" disabled={isFormSubmitting}>
              <div className="input-group">
                <label htmlFor="login-nombres">Nombre(s) *</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Juan"
                    id="login-nombres" name="nombres" value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-apellidos">Apellido(s) *</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Pérez"
                    id="login-apellidos" name="apellidos" value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label htmlFor="login-email">Correo electrónico *</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="login-email" name="email" value={email} autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label htmlFor="login-telefono">Teléfono de contacto *</label>
                <div className="tel-group-wrapper">
                  <PhoneSelect value={lada} onChange={(valor) => { tocoLada.current = true; setLada(valor); }} />
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <Phone className="input-icon" size={18} />
                    <input
                      type="tel"
                      placeholder={digitosLada ? `${digitosLada} dígitos` : 'Número sin lada'}
                      id="login-telefono" name="telefono" value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-pais">País *</label>
                <div className="input-wrapper">
                  <Globe className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Tu país"
                    id="login-pais" name="pais" value={pais} list="lista-paises" autoComplete="country-name"
                    onChange={(e) => { tocoPais.current = true; setPais(e.target.value); }}
                    onBlur={() => setPais(normalizarPais(pais))}
                    required
                  />
                  <datalist id="lista-paises">
                    {PAISES.map((p) => <option key={p.iso} value={p.nombre} />)}
                  </datalist>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-estado">Estado / Ciudad *</label>
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="CDMX"
                    id="login-estado" name="estado" value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label htmlFor="login-grado">Grado académico / Profesión *</label>
                <div className="input-wrapper">
                  <Award className="input-icon" size={18} />
                  <select
                    id="login-grado" name="grado" value={grado}
                    onChange={(e) => setGrado(e.target.value)}
                    required
                    className="select-input"
                  >
                    <option value="">Selecciona...</option>
                    <option value="Médico Especialista">Médico Especialista</option>
                    <option value="Médico Residente">Médico Residente</option>
                    <option value="Médico General">Médico General</option>
                    <option value="Perfusionista">Perfusionista</option>
                    <option value="Enfermero/a">Enfermero/a</option>
                    <option value="Terapeuta Respiratorio">Terapeuta Respiratorio</option>
                    <option value="Fisioterapeuta">Fisioterapeuta</option>
                    <option value="Estudiante">Estudiante</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="input-group span-2">
                <label htmlFor="login-especialidad">Especialidad * <span className="label-hint">(escribe "no aplica" si no tienes)</span></label>
                <div className="input-wrapper">
                  <BookOpen className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Escribe tu especialidad o 'no aplica'"
                    id="login-especialidad" name="especialidad" value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-institucion">Institución / Hospital *</label>
                <div className="input-wrapper">
                  <Building className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Hospital Central"
                    id="login-institucion" name="institucion" value={institucion}
                    onChange={(e) => setInstitucion(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-cargo">Cargo / Puesto *</label>
                <div className="input-wrapper">
                  <Briefcase className="input-icon" size={18} />
                  <input
                    type="text"
                    placeholder="Médico de Guardia"
                    id="login-cargo" name="cargo" value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-password">Contraseña (mín. 6) *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    id="login-password" name="password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label htmlFor="login-confirmPassword">Confirmar contraseña *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    id="login-confirmPassword" name="confirmPassword" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Ocultar confirmación de contraseña" : "Mostrar confirmación de contraseña"} aria-pressed={showConfirmPassword}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full span-2" disabled={isFormSubmitting}>
                {isFormSubmitting ? 'Creando tu cuenta…' : 'Crear cuenta'} <ArrowRight size={16} />
              </button>
            </fieldset>
            </form>
          )}

          {/* Password Recovery Form */}
          {activeTab === 'recovery' && (
            <form onSubmit={handleRecovery} className="auth-form">
              <fieldset className="auth-controls" disabled={isFormSubmitting}>
              <h2 className="recovery-title">Recuperar contraseña</h2>
              <p className="recovery-desc">
                Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para restablecer tu contraseña.
              </p>

              <div className="input-group">
                <label htmlFor="login-email">Correo electrónico</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="login-email" name="email" value={email} autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isFormSubmitting}>
                {loading ? 'Enviando enlace…' : 'Enviar enlace de recuperación'}
              </button>

              <button
                type="button"
                className="back-to-login"
                onClick={() => { setActiveTab('signin'); clearMessages(); }}
              >
                Volver a iniciar sesión
              </button>
            </fieldset>
            </form>
          )}
        </div>
      </main>
      <footer className="auth-footer"><span>{marca ? `Portal de ${marca.nombre} · Con tecnología de HCE` : "HCE · Healthcare Training Experience"}</span><Link to="/aviso-de-privacidad">Aviso de privacidad</Link></footer>
    </div>
  );
};

export default Login;
