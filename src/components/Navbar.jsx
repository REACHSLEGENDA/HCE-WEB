import React, { useState, useEffect } from 'react';
import { X, Users, Heart, Activity, Award, Gamepad2, PlayCircle, Hospital } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [navOpen]);

  const toggleNav = (open) => {
    setNavOpen(open);
  };

  return (
    <>
      <header className={`hce-header ${scrolled ? 'scrolled' : ''}`}>
        {/* 1. Menú a la izquierda */}
        <div 
          className={`menu-toggle ${navOpen ? 'active' : ''}`} 
          id="menuToggle"
          onClick={() => toggleNav(true)}
        >
          <span></span>
          <span></span>
          <span></span>
        </div>

        <div className="logo-wrap">
          <Link to="/">
            <img src="https://healthcareexp.com/wp-content/uploads/2024/09/ghghg.png" alt="HCE Logo" />
          </Link>
        </div>
      </header>

      {/* Overlay Navigation */}
      <nav className={`nav-overlay ${navOpen ? 'open' : ''}`} id="navOverlay">
        {/* Botón de Cerrar dentro del menú */}
        <div className="close-menu" id="closeMenu" title="Cerrar Menú" onClick={() => toggleNav(false)}>
          <X size={24} />
        </div>

        <div className="nav-grid">

          {/* Nosotros */}
          <div className="menu-section">
            <h3>Nosotros</h3>
            <ul className="menu-list">
              <li><Link to="/somos" onClick={() => toggleNav(false)}><Users size={18} /> Quiénes Somos</Link></li>
              <li><Link to="/instructores" onClick={() => toggleNav(false)}><Users size={18} /> Instructores</Link></li>
            </ul>
          </div>

          {/* Experiencias */}
          <div className="menu-section">
            <h3>Experiencias</h3>
            <ul className="menu-list">
              <li><Link to="/insuficiencia-cardiaca" onClick={() => toggleNav(false)}><Heart size={18} /> Insuficiencia Cardiaca</Link></li>
              <li><Link to="/nursing" onClick={() => toggleNav(false)}><Activity size={18} /> ECMO Nursing Care</Link></li>
              <li><Link to="/paris" onClick={() => toggleNav(false)}><Award size={18} /> Paris Diploma ECMO</Link></li>
            </ul>
          </div>

          {/* Simulador */}
          <div className="menu-section">
            <h3>Simulador</h3>
            <ul className="menu-list">
              <li><Link to="/sim" onClick={() => toggleNav(false)}><Gamepad2 size={18} /> ECMO SIM</Link></li>
            </ul>
          </div>

          {/* Webinars */}
          <div className="menu-section">
            <h3>Webinars</h3>
            <ul className="menu-list">
              <li><a href="#" onClick={() => toggleNav(false)}><PlayCircle size={18} /> Biblioteca Científica</a></li>
            </ul>
          </div>

          {/* Galerías */}
          <div className="menu-section">
            <h3>Galerías</h3>
            <ul className="menu-list">
              <li>
                <a href="#" onClick={() => toggleNav(false)}>
                  <Hospital size={18} /> ECMO Nursing: Teórica Guayaquil Agosto 2025
                </a>
              </li>
              <li>
                <a href="#" onClick={() => toggleNav(false)}>
                  <Hospital size={18} /> ECMO Nursing: Práctica Guayaquil Agosto 2025
                </a>
              </li>
              <li>
                <a href="#" onClick={() => toggleNav(false)}>
                  <Hospital size={18} /> Paris Diploma: INER CDMX Marzo 2025
                </a>
              </li>
              <li>
                <a href="#" onClick={() => toggleNav(false)}>
                  <Hospital size={18} /> Paris Simulation: INER CDMX Marzo 2025
                </a>
              </li>
              <li>
                <a href="#" onClick={() => toggleNav(false)}>
                  <Hospital size={18} /> Paris Diploma: INC CDMX Septiembre 2024
                </a>
              </li>
              <li>
                <a href="#" onClick={() => toggleNav(false)}>
                  <Hospital size={18} /> Paris Simulation: CEACCS CDMX Septiembre 2024
                </a>
              </li>
            </ul>
          </div>

        </div>
      </nav>
    </>
  );
};

export default Navbar;
