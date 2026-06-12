import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = COUNTRIES.find(c => c.code === value) || COUNTRIES[0];

  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); 
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="phone-select" ref={ref}>
      <button type="button" className="phone-select__trigger" onClick={() => setOpen(v => !v)}>
        <img src={`https://flagcdn.com/w40/${selected.iso}.png`} alt={selected.label} className="phone-select__flag" />
        <span>{selected.code}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
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
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const isFormSubmitting = loading || authLoading || !!user;

  // If user is already logged in, redirect them once profile has resolved
  useEffect(() => {
    if (user && !authLoading) {
      const targetPath = location.state?.from?.pathname || (profile?.rol === 'admin' ? '/admin' : '/dashboard');
      navigate(targetPath, { replace: true });
    }
  }, [user, profile, authLoading, navigate, location.state]);

  const clearMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSignIn = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await login(email, password);
      // Redirection is handled by useEffect when user and profile are loaded.
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    clearMessages();

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

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
      setSuccessMsg('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Auto switch to signin tab after success
      setTimeout(() => {
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
        clearMessages();
      }, 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Error al crear la cuenta. Por favor intenta de nuevo.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMsg('Se ha enviado un correo de recuperación a tu dirección.');
    } catch (err) {
      setErrorMsg(err.message || 'Error al enviar correo de recuperación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page clinical-bg-light">
      <div className="login-container">
        <div className={`login-card reveal active ${activeTab === 'signup' ? 'large-card' : ''}`}>
          {/* Logo / Badge */}
          <div className="login-header">
            <span className="section-badge">
              <LogIn size={14} /> Portal HCE
            </span>
            <h2>Educación Médica Continua</h2>
            <p>Accede a tus cursos, simulaciones clínicas y certificaciones en ECMO</p>
          </div>

          {/* Navigation Tabs */}
          {activeTab !== 'recovery' && (
            <div className="login-tabs">
              <button 
                className={`tab-btn ${activeTab === 'signin' ? 'active' : ''}`}
                onClick={() => { setActiveTab('signin'); clearMessages(); }}
              >
                <LogIn size={16} />
                Iniciar Sesión
              </button>
              <button 
                className={`tab-btn ${activeTab === 'signup' ? 'active' : ''}`}
                onClick={() => { setActiveTab('signup'); clearMessages(); }}
              >
                <UserPlus size={16} />
                Registrarse
              </button>
            </div>
          )}

          {/* Alert Messages */}
          {errorMsg && (
            <div className="auth-alert alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Alert Messages */}
          {successMsg && (
            <div className="auth-alert alert-success">
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sign In Form */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="auth-form">
              <div className="input-group">
                <label>Correo Electrónico</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input 
                    type="email" 
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <div className="label-row">
                  <label>Contraseña</label>
                  <button 
                    type="button" 
                    className="forgot-link"
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={isFormSubmitting}>
                {isFormSubmitting ? 'Accediendo...' : 'Iniciar Sesión'} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Sign Up Form */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="auth-form signup-form-grid">
              <div className="input-group">
                <label>Nombre(s) *</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="Juan"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Apellido(s) *</label>
                <div className="input-wrapper">
                  <User className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="Pérez"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label>Correo Electrónico *</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input 
                    type="email" 
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label>Teléfono de Contacto *</label>
                <div className="tel-group-wrapper">
                  <PhoneSelect value={lada} onChange={setLada} />
                  <div className="input-wrapper" style={{ flex: 1 }}>
                    <Phone className="input-icon" size={18} />
                    <input 
                      type="tel" 
                      placeholder="10 dígitos"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>País *</label>
                <div className="input-wrapper">
                  <Globe className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="México"
                    value={pais}
                    onChange={(e) => setPais(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Estado / Ciudad *</label>
                <div className="input-wrapper">
                  <MapPin className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="CDMX"
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group span-2">
                <label>Grado académico / Profesión *</label>
                <div className="input-wrapper">
                  <Award className="input-icon" size={18} />
                  <select 
                    value={grado} 
                    onChange={(e) => setGrado(e.target.value)} 
                    required
                    className="select-input"
                  >
                    <option value="">Selecciona...</option>
                    <option value="Médico Especialista">Médico Especialista</option>
                    <option value="Médico Residente">Médico Residente</option>
                    <option value="Enfermero/a">Enfermero/a</option>
                    <option value="Terapeuta Respiratorio">Terapeuta Respiratorio</option>
                    <option value="Fisioterapeuta">Fisioterapeuta</option>
                    <option value="Estudiante">Estudiante</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div className="input-group span-2">
                <label>Especialidad * <span className="label-hint">(escribe "no aplica" si no tienes)</span></label>
                <div className="input-wrapper">
                  <BookOpen className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="Escribe tu especialidad o 'no aplica'"
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Institución / Hospital *</label>
                <div className="input-wrapper">
                  <Building className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="Hospital Central"
                    value={institucion}
                    onChange={(e) => setInstitucion(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Cargo / Puesto *</label>
                <div className="input-wrapper">
                  <Briefcase className="input-icon" size={18} />
                  <input 
                    type="text" 
                    placeholder="Médico de Guardia"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="input-group">
                <label>Contraseña (mín. 6) *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex="-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Confirmar Contraseña *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex="-1"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full span-2" disabled={isFormSubmitting}>
                {isFormSubmitting ? 'Registrando...' : 'Crear Cuenta'} <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Password Recovery Form */}
          {activeTab === 'recovery' && (
            <form onSubmit={handleRecovery} className="auth-form">
              <h3 className="recovery-title">Recuperar Contraseña</h3>
              <p className="recovery-desc">
                Ingresa tu correo electrónico registrado y te enviaremos un enlace seguro para restablecer tu contraseña.
              </p>

              <div className="input-group">
                <label>Correo Electrónico</label>
                <div className="input-wrapper">
                  <Mail className="input-icon" size={18} />
                  <input 
                    type="email" 
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>

              <button 
                type="button" 
                className="back-to-login"
                onClick={() => { setActiveTab('signin'); clearMessages(); }}
              >
                Volver a Iniciar Sesión
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
