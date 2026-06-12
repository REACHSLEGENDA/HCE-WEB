import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';
import './Login.css';

const RestablecerPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasValidSession, setHasValidSession] = useState(true);

  // Parse the recovery flow or active temporary session from URL
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // In Supabase, if the user clicked the reset password link, 
      // they should have an active session established automatically.
      if (!session) {
        // If there's no session, check if there's an error in the hash fragment 
        // indicating an expired link.
        const hash = window.location.hash;
        if (hash && (hash.includes('error=unauthorized_client') || hash.includes('error_description'))) {
          setErrorMsg('El enlace de recuperación ha expirado o ya fue utilizado.');
          setHasValidSession(false);
        } else {
          // No session yet, but we allow trying the update.
        }
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      
      setSuccessMsg('¡Contraseña actualizada con éxito! Redirigiendo al inicio de sesión...');
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Error al restablecer la contraseña. El enlace podría haber expirado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page clinical-bg-light">
      <div className="login-container">
        <div className="login-card reveal active" style={{ maxWidth: '450px' }}>
          
          <div className="login-header">
            <span className="section-badge">
              <ShieldAlert size={14} /> Seguridad HCE
            </span>
            <h2>Nueva Contraseña</h2>
            <p>Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta</p>
          </div>

          {/* Alert Messages */}
          {errorMsg && (
            <div className="auth-alert alert-error">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="auth-alert alert-success">
              <CheckCircle size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {hasValidSession && !successMsg && (
            <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label>Nueva Contraseña *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Escribe al menos 6 caracteres"
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

              <div className="input-group">
                <label>Confirmar Nueva Contraseña *</label>
                <div className="input-wrapper">
                  <Lock className="input-icon" size={18} />
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'} 
                    placeholder="Confirma tu nueva contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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

              <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: '14px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
              </button>
            </form>
          )}

          {!hasValidSession && (
            <button 
              onClick={() => navigate('/login')} 
              className="btn btn-primary w-full" 
              style={{ padding: '14px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', marginTop: '10px' }}
            >
              Ir a Iniciar Sesión
            </button>
          )}

        </div>
      </div>
    </div>
  );
};

export default RestablecerPassword;
