import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';
import './Login.css'; // Reuses clinical grid & EKG animations

const Confirmacion = () => {
  const navigate = useNavigate();

  return (
    <div className="login-page clinical-bg-light">
      <div className="login-container">
        <div className="login-card reveal active" style={{ maxWidth: '480px', textAlign: 'center', alignItems: 'center' }}>
          
          {/* Logo / Badge */}
          <div className="login-header" style={{ marginBottom: '10px' }}>
            <span className="section-badge" style={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
              <ShieldCheck size={14} /> Cuenta Verificada
            </span>
          </div>

          {/* Success Icon Animation */}
          <div style={{
            margin: '10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'scaleIn 0.5s ease-out'
          }}>
            <div style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, rgba(76, 175, 80, 0.02) 70%)',
              border: '2px solid rgba(76, 175, 80, 0.3)'
            }}>
              <CheckCircle2 size={56} style={{ color: '#4CAF50' }} />
            </div>
          </div>

          <div className="login-header" style={{ gap: '12px' }}>
            <h2 style={{ fontSize: '1.8rem', color: '#1A2B3C', fontWeight: 800 }}>¡Cuenta Activada!</h2>
            <p style={{ color: '#4a5568', fontSize: '1rem', lineHeight: '1.5', margin: '0 10px' }}>
              Tu dirección de correo electrónico ha sido confirmada con éxito. Tu cuenta ya se encuentra activa en el portal de Healthcare Training Experience.
            </p>
          </div>

          <div style={{
            width: '100%',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '16px',
            fontSize: '0.875rem',
            color: '#64748B',
            textAlign: 'left',
            margin: '8px 0'
          }}>
            <strong style={{ color: '#1E293B', display: 'block', marginBottom: '4px' }}>¿Qué sigue?</strong>
            Ya puedes acceder a tu panel de estudiante, inscribirte a seminarios en vivo, responder evaluaciones y descargar tus diplomas oficiales.
          </div>

          <button 
            onClick={() => navigate('/login')} 
            className="btn btn-primary w-full" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '14px', 
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Iniciar Sesión <ArrowRight size={18} />
          </button>
        </div>
      </div>
      
      {/* Small custom animation styling */}
      <style>{`
        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default Confirmacion;
