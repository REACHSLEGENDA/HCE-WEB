import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
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

  if (allowedRoles && (!profile || !allowedRoles.includes(profile.rol))) {
    // If the user's role is not allowed, redirect to main dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
