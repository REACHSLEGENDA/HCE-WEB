import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import ParisDiploma from './pages/ParisDiploma';
import AboutUs from './pages/AboutUs';
import Nursing from './pages/Nursing';
import EcmoSim from './pages/EcmoSim';
import InsuficienciaCardiaca from './pages/InsuficienciaCardiaca';
import Instructores from './pages/Instructores';
import Retroalimentacion from './pages/Retroalimentacion';

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
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/paris-diploma-ecmo" element={<ParisDiploma />} />
        <Route path="/quienes-somos" element={<AboutUs />} />
        <Route path="/ecmo-nursing-care" element={<Nursing />} />
        <Route path="/simulador-ecmo-sim" element={<EcmoSim />} />
        <Route path="/insuficiencia-cardiaca" element={<InsuficienciaCardiaca />} />
        <Route path="/instructores" element={<Instructores />} />
        <Route path="/retroalimentacion" element={<Retroalimentacion />} />
      </Routes>
    </Router>
  );
}

export default App;
