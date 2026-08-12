import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, logout, retrySessionRecovery, sessionRecoveryRequired } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a192f',
        color: '#00d2ff',
        fontFamily: 'Outfit, sans-serif',
        fontSize: '1.5rem',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid rgba(0, 210, 255, 0.2)',
          borderTop: '5px solid #00d2ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <span>Cargando perfil seguro...</span>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page and remember the location we tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (sessionRecoveryRequired) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: '#07111f',
        color: '#e2e8f0',
        fontFamily: 'Outfit, sans-serif'
      }}>
        <section style={{
          width: 'min(520px, 100%)',
          padding: '28px',
          border: '1px solid rgba(0, 210, 255, 0.25)',
          borderRadius: '18px',
          background: '#0d1b2a',
          boxShadow: '0 24px 60px rgba(0,0,0,.35)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
          <h1 style={{ margin: '0 0 10px', color: '#ffffff', fontSize: '1.35rem' }}>
            Es necesario renovar tu sesión
          </h1>
          <p style={{ margin: '0 0 8px', lineHeight: 1.55 }}>
            {sessionRecoveryRequired.message}
          </p>
          <p style={{ margin: '0 0 22px', color: '#94a3b8', fontSize: '.9rem', lineHeight: 1.5 }}>
            Pulsa reintentar. Si continúa, cierra la sesión y vuelve a ingresar después de aplicar la migración de Supabase.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => void retrySessionRecovery()}
              style={{ padding: '11px 17px', border: 0, borderRadius: '999px', background: '#00a9ce', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
            >
              Reintentar sesión
            </button>
            <button
              type="button"
              onClick={() => void logout()}
              style={{ padding: '11px 17px', border: '1px solid #64748b', borderRadius: '999px', background: 'transparent', color: '#e2e8f0', fontWeight: 700, cursor: 'pointer' }}
            >
              Cerrar sesión
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (allowedRoles && (!profile || !allowedRoles.includes(profile.rol))) {
    // If the user's role is not allowed, redirect to main dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
