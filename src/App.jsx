import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import CookieBanner from './components/CookieBanner';
import ChatBot from './components/ChatBot';
import Home from './pages/Home';
import ParisDiploma from './pages/ParisDiploma';
import AboutUs from './pages/AboutUs';
import Nursing from './pages/Nursing';
import EcmoSim from './pages/EcmoSim';
import InsuficienciaCardiaca from './pages/InsuficienciaCardiaca';
import Instructores from './pages/Instructores';
import Retroalimentacion from './pages/Retroalimentacion';
import Inscripciones from './pages/Inscripciones';
import InscripcionesStep1 from './pages/InscripcionesStep1';
import SecretPreview from './pages/SecretPreview';
import InscripcionesNursing from './pages/InscripcionesNursing';
import SecretNursingPreview from './pages/SecretNursingPreview';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Facturacion from './pages/Facturacion';
import Gallery from './pages/Gallery';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Classroom from './pages/Classroom';
import Comunidad from './pages/Comunidad';
import Confirmacion from './pages/Confirmacion';
import RestablecerPassword from './pages/RestablecerPassword';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <ScrollToTop />
          <CookieBanner />
          <ChatBot />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/confirmacion" element={<Confirmacion />} />
            <Route path="/restablecer-contrasena" element={<RestablecerPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/classroom/:id" 
              element={
                <ProtectedRoute>
                  <Classroom />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/paris-diploma-ecmo" element={<ParisDiploma />} />
            <Route path="/quienes-somos" element={<AboutUs />} />
            <Route path="/ecmo-nursing-care" element={<Nursing />} />
            <Route path="/simulador-ecmo-sim" element={<EcmoSim />} />
            <Route path="/insuficiencia-cardiaca" element={<InsuficienciaCardiaca />} />
            <Route path="/instructores" element={<Instructores />} />
            <Route path="/retroalimentacion" element={<Retroalimentacion />} />
            <Route path="/inscripciones-diploma-paris-ecmo" element={<Inscripciones />} />
            <Route path="/inscripciones-step1" element={<InscripcionesStep1 />} />
            <Route path="/debug-checkout-preview-2026" element={<SecretPreview />} />
            <Route path="/inscripciones-ecmo-nursing" element={<InscripcionesNursing />} />
            <Route path="/debug-checkout-nursing-preview-2026" element={<SecretNursingPreview />} />
            <Route path="/aviso-de-privacidad" element={<PrivacyPolicy />} />
            <Route path="/facturacion" element={<Facturacion />} />
            <Route path="/galeria" element={<Gallery />} />
            <Route path="/comunidad" element={<Comunidad />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
