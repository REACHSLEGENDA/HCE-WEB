import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  Phone,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  MapPin,
  Award,
  BookOpen,
  Building,
  Briefcase
} from 'lucide-react';
import './Login.css';

const COUNTRIES = [
  { code: '+52',   iso: 'mx', label: 'MX' },
  { code: '+1',    iso: 'us', label: 'US' },
  { code: '+57',   iso: 'co', label: 'CO' },
  { code: '+54',   iso: 'ar', label: 'AR' },
  { code: '+56',   iso: 'cl', label: 'CL' },
  { code: '+51',   iso: 'pe', label: 'PE' },
  { code: '+593',  iso: 'ec', label: 'EC' },
  { code: '+502',  iso: 'gt', label: 'GT' },
  { code: '+504',  iso: 'hn', label: 'HN' },
  { code: '+505',  iso: 'ni', label: 'NI' },
  { code: '+506',  iso: 'cr', label: 'CR' },
  { code: '+503',  iso: 'sv', label: 'SV' },
  { code: '+58',   iso: 've', label: 'VE' },
  { code: '+591',  iso: 'bo', label: 'BO' },
  { code: '+595',  iso: 'py', label: 'PY' },
  { code: '+598',  iso: 'uy', label: 'UY' },
  { code: '+507',  iso: 'pa', label: 'PA' },
  { code: '+1787', iso: 'pr', label: 'PR' },
  { code: '+1809', iso: 'do', label: 'DO' },
  { code: '+53',   iso: 'cu', label: 'CU' },
  { code: '+509',  iso: 'ht', label: 'HT' },
  { code: '+55',   iso: 'br', label: 'BR' },
  { code: '+34',   iso: 'es', label: 'ES' },
  { code: '+33',   iso: 'fr', label: 'FR' },
];

function PhoneSelect({ value, onChange }) {
  return <select className="phone-select" aria-label="Código de país del teléfono" value={value} onChange={(ev) => onChange(ev.target.value)}>
    {COUNTRIES.map(c => <option key={c.iso} value={c.code}>{c.label} ({c.code})</option>)}
  </select>;
}

const Login = () => {
  const { login, signUp, resetPassword, user, profile, loading: authLoading } = useAuth();
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
        pais,
        estado,
        grado,
        especialidad,
        institucion,
        cargo
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
    <div className="login-page">
      <header className="auth-topbar"><Link to="/" aria-label="HCE, ir al inicio"><img src="/assets/componentes/ghghg-scaled.png" alt="HCE Healthcare Training Experience" width="184" height="48" /></Link><Link to="/" className="auth-toplink">Volver al sitio <ArrowRight size={16} /></Link></header>
      <main className="login-container">
        <section className="auth-intro" aria-label="Escuela HCE">
          <span className="auth-eyebrow">ESCUELA HCE</span>
          <h1>Tu siguiente<br />paso empieza aquí.</h1>
          <p>Un espacio para seguir aprendiendo, conectar con tu formación y avanzar en la práctica clínica.</p>
          <div className="auth-benefits"><span>01 / Tus cursos</span><span>02 / Tu progreso</span><span>03 / Tus certificados</span></div>
          <p className="auth-intro-note">Healthcare Training Experience<br /><strong>Educación médica continua.</strong></p>
        </section>
        <div className={`login-card ${activeTab === 'signup' ? 'large-card' : ''}`}>
          {/* Logo / Badge */}
          <div className="login-header">
            <span className="section-badge">
              Tu portal de aprendizaje
            </span>
            <h2>{activeTab === 'signup' ? 'Crea tu cuenta.' : activeTab === 'recovery' ? 'Volvamos a entrar.' : 'Qué gusto verte.'}</h2>
            <p>Accede a tus cursos, sigue tu progreso y continúa donde te quedaste.</p>
          </div>

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
                <LogIn size={16} />
                Iniciar sesión
              </button>
              <button
                disabled={isFormSubmitting}
                type="button"
                className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
                aria-pressed={activeTab === 'signup'}
                onClick={() => { setActiveTab('signup'); clearMessages(); }}
              >
                <UserPlus size={16} />
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
                <label htmlFor="login-email">Correo Electrónico</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="login-email" name="email" value={email}
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
                <label htmlFor="login-email">Correo Electrónico *</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="login-email" name="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label htmlFor="login-telefono">Teléfono de Contacto *</label>
                <div className="tel-group-wrapper">
                  <PhoneSelect value={lada} onChange={setLada} />
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <Phone className="input-icon" size={18} />
                    <input
                      type="tel"
                      placeholder="10 dígitos"
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
                    placeholder="México"
                    id="login-pais" name="pais" value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    required
                  />
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
                <label htmlFor="login-confirmPassword">Confirmar Contraseña *</label>
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
                {isFormSubmitting ? 'Creando tu cuenta…' : 'Crear Cuenta'} <ArrowRight size={16} />
              </button>
            </fieldset>
            </form>
          )}

          {/* Password Recovery Form */}
          {activeTab === 'recovery' && (
            <form onSubmit={handleRecovery} className="auth-form">
              <fieldset className="auth-controls" disabled={isFormSubmitting}>
              <h3 className="recovery-title">Recuperar contraseña</h3>
              <p className="recovery-desc">
                Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para restablecer tu contraseña.
              </p>

              <div className="input-group">
                <label htmlFor="login-email">Correo Electrónico</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    id="login-email" name="email" value={email}
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
                Volver a Iniciar sesión
              </button>
            </fieldset>
            </form>
          )}
        </div>
      </main>
      <footer className="auth-footer"><span>HCE · Healthcare Training Experience</span><Link to="/aviso-de-privacidad">Aviso de privacidad</Link></footer>
    </div>
  );
};

export default Login;
