import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import './Login.css';

export default function RestablecerPassword() {
  // Quien llega por la invitación al portal (Alumni Pass) crea su primera contraseña.
  const [bienvenida] = useState(() => new URLSearchParams(window.location.search).get('bienvenida') === '1');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasValidSession, setHasValidSession] = useState(true);
  const envioRef = useRef(false);
  const timerRef = useRef(null);
  const mensajeRef = useRef(null);

  useEffect(() => {
    let vigente = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!vigente) return;
      if (error) throw error;
      if (!data?.session && /error=|error_code=|error_description=/.test(window.location.hash)) {
        setErrorMsg('El enlace de recuperación venció o ya fue utilizado. Solicita uno nuevo desde el inicio de sesión.');
        setHasValidSession(false);
      }
    }).catch(() => {
      if (vigente) setErrorMsg('No pudimos comprobar tu sesión. Revisa tu conexión antes de continuar.');
    }).finally(() => { if (vigente) setChecking(false); });
    return () => { vigente = false; clearTimeout(timerRef.current); };
  }, []);
  useEffect(() => { if (errorMsg || successMsg) mensajeRef.current?.focus(); }, [errorMsg, successMsg]);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (envioRef.current || checking || !hasValidSession || successMsg) return;
    setErrorMsg(''); setSuccessMsg('');
    if (password.length < 6) { setErrorMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setErrorMsg('Las contraseñas no coinciden. Vuelve a escribirlas.'); return; }
    envioRef.current = true; setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccessMsg('Tu contraseña fue actualizada. En unos segundos volverás al inicio de sesión.');
      timerRef.current = setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const t = String(err?.message || '');
      setErrorMsg(/fetch|network|offline|timeout/i.test(t) ? 'No pudimos conectar. Revisa tu conexión e intenta de nuevo.' : /same.password|different.*password/i.test(t) ? 'Elige una contraseña diferente de la anterior.' : 'No pudimos actualizar la contraseña. El enlace puede haber vencido: solicita uno nuevo desde el inicio de sesión.');
    } finally { envioRef.current = false; setLoading(false); }
  };
  return <div className="login-page">
    <header className="auth-topbar"><Link to="/" aria-label="HCE, ir al inicio"><img src="/assets/componentes/ghghg-scaled.png" alt="HCE Healthcare Training Experience" width="184" height="48" /></Link><Link to="/login" className="auth-toplink">Iniciar sesión <ArrowRight size={16} /></Link></header>
    <main className="auth-reset-container"><div className="login-card">
      <div className="login-header"><span className="section-badge">SEGURIDAD HCE</span><h1 className="auth-reset-title">{bienvenida ? 'Crea tu contraseña.' : 'Nueva contraseña.'}</h1><p>{bienvenida ? 'Bienvenido al portal de HCE. Elige una contraseña para entrar cuando quieras.' : 'Recupera el acceso a tu formación con una contraseña que solo tú conozcas.'}</p></div>
      {(errorMsg || successMsg) && <div ref={mensajeRef} tabIndex={-1} className={`auth-alert ${errorMsg ? 'alert-error' : 'alert-success'}`} role={errorMsg ? 'alert' : 'status'}>{errorMsg ? <AlertCircle size={20} /> : <CheckCircle size={20} />}<span>{errorMsg || successMsg}</span></div>}
      {checking && <p role="status">Comprobando tu enlace…</p>}
      {hasValidSession && !successMsg && <form onSubmit={handleSubmit} className="auth-form" aria-busy={loading || checking}>
        <fieldset className="auth-controls" disabled={loading || checking}>
          <div className="input-group"><label htmlFor="reset-password">Nueva contraseña</label><div className="input-wrapper"><Lock className="input-icon" size={18} /><input id="reset-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={password} onChange={(ev) => setPassword(ev.target.value)} aria-describedby="reset-help" /><button type="button" className="password-toggle-btn" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><small id="reset-help">Usa al menos 6 caracteres.</small></div>
          <div className="input-group"><label htmlFor="reset-confirm">Confirmar nueva contraseña</label><div className="input-wrapper"><Lock className="input-icon" size={18} /><input id="reset-confirm" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} value={confirmPassword} onChange={(ev) => setConfirmPassword(ev.target.value)} /><button type="button" className="password-toggle-btn" aria-label={showConfirmPassword ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
          <button type="submit" className="btn btn-primary" disabled={loading || checking}>{loading ? 'Guardando contraseña…' : bienvenida ? 'Crear contraseña y entrar' : 'Guardar nueva contraseña'}<ArrowRight size={18} /></button>
        </fieldset>
      </form>}
      <Link to="/login" className="auth-secondary">Volver a iniciar sesión</Link>
    </div></main>
    <footer className="auth-footer"><span>HCE · Healthcare Training Experience</span><Link to="/aviso-de-privacidad">Aviso de privacidad</Link></footer>
  </div>;
}
