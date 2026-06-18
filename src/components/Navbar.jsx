import React, { useState, useEffect } from 'react';
import { X, Users, Heart, Activity, Award, Gamepad2, PlayCircle, Hospital, Home as HomeIcon, Image, Camera, LogIn, User, LogOut, ExternalLink, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const NurseCap = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M2 19c2-2 5-3 10-3s8 1 10 3" />
    <path d="M3 18c0-5 3-7 9-7s9 2 9 7" />
    <path d="M5 10c0-3 3-5 7-5s7 2 7 5" />
    <path d="M12 6v4" />
    <path d="M10 8h4" />
  </svg>
);

const Navbar = () => {
  const { user, logout } = useAuth();
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
            <img src="/assets/componentes/ghghg-scaled.png" alt="HCE Logo" />
          </Link>
        </div>

        <div className="header-user-action">
          <a
            href="https://campus.healthcareexp.com/plus/login"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-campus-link"
          >
            Campus Virtual
            <ExternalLink size={13} />
          </a>

          {user ? (
            <Link to="/dashboard" className="btn-portal">
              <User size={16} />
              <span className="btn-portal-text">Mi Portal</span>
            </Link>
          ) : (
            <Link to="/login" className="btn-portal login-style">
              <LogIn size={16} />
              <span className="btn-portal-text">Acceso Alumnos</span>
            </Link>
          )}
        </div>
      </header>

      {/* Overlay Navigation */}
      <nav className={`nav-overlay ${navOpen ? 'open' : ''}`} id="navOverlay">
        {/* Botón de Cerrar dentro del menú */}
        <div className="close-menu" id="closeMenu" title="Cerrar Menú" onClick={() => toggleNav(false)}>
          <X size={24} />
        </div>

        <div className="nav-grid">
          
          {/* Home Link dentro del menú */}
          <div className="nav-logo-overlay">
            <Link to="/" onClick={() => toggleNav(false)} className="nav-logo-link">
              <img src="/assets/componentes/ghghg-scaled.png" alt="HCE Logo" />
            </Link>
            <div className="nav-home-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
               <Link to="/" onClick={() => toggleNav(false)} className="nav-home-item">
                  <HomeIcon size={20} /> Inicio
               </Link>
               {user ? (
                 <>
                   <Link to="/dashboard" onClick={() => toggleNav(false)} className="nav-home-item">
                     <User size={20} /> Mi Portal
                   </Link>
                   <a href="#" onClick={(e) => { e.preventDefault(); logout(); toggleNav(false); }} className="nav-home-item" style={{ color: '#ff7675' }}>
                     <LogOut size={20} /> Cerrar Sesión
                   </a>
                 </>
               ) : (
                 <Link to="/login" onClick={() => toggleNav(false)} className="nav-home-item">
                   <LogIn size={20} /> Acceso Alumnos
                 </Link>
               )}
            </div>
          </div>

          {/* Nosotros */}
          <div className="menu-section">
            <h3>Nosotros</h3>
            <ul className="menu-list">
              <li><Link to="/quienes-somos" onClick={() => toggleNav(false)}><Users size={18} /> Quiénes Somos</Link></li>
              <li><Link to="/instructores" onClick={() => toggleNav(false)}><Users size={18} /> Instructores</Link></li>
              <li><Link to="/comunidad" onClick={() => toggleNav(false)}><MessageSquare size={18} /> Testimonios y Foro</Link></li>
            </ul>
          </div>

          {/* Experiencias */}
          <div className="menu-section">
            <h3>Experiencias</h3>
            <ul className="menu-list">
              <li>
                <a
                  href="https://campus.healthcareexp.com/plus/login"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="menu-campus-link"
                  onClick={() => toggleNav(false)}
                >
                  <PlayCircle size={18} />
                  Campus Virtual
                  <ExternalLink size={13} className="menu-campus-ext" />
                </a>
              </li>
              {/* <li><Link to="/insuficiencia-cardiaca" onClick={() => toggleNav(false)}><Heart size={18} /> Insuficiencia Cardiaca</Link></li> */}
              <li><Link to="/ecmo-nursing-care" onClick={() => toggleNav(false)}><NurseCap size={18} /> ECMO Nursing Care</Link></li>
              <li><Link to="/paris-diploma-ecmo" onClick={() => toggleNav(false)}><Award size={18} /> Paris Diploma ECMO</Link></li>
            </ul>
          </div>

          {/* Simulador */}
          <div className="menu-section">
            <h3>Simulador</h3>
            <ul className="menu-list">
              <li><Link to="/simulador-ecmo-sim" onClick={() => toggleNav(false)}><Gamepad2 size={18} /> ECMO SIM</Link></li>
            </ul>
          </div>

          {/* Webinars */}
          {/* <div className="menu-section">
            <h3>Webinars</h3>
            <ul className="menu-list">
              <li><a href="#" onClick={() => toggleNav(false)}><PlayCircle size={18} /> Biblioteca Científica</a></li>
            </ul>
          </div> */}

          {/* Galerías */}
          <div className="menu-section">
            <h3>Galerías</h3>
            <ul className="menu-list">
              <li><Link to="/galeria" onClick={() => toggleNav(false)}><Image size={18} /> Ver Todas</Link></li>
              <li><Link to="/galeria?tab=cdmx-inc-2024" onClick={() => toggleNav(false)}><Camera size={18} /> CDMX INC (Septiembre 2024)</Link></li>
              <li><Link to="/galeria?tab=cdmx-iner-2025" onClick={() => toggleNav(false)}><Camera size={18} /> CDMX INER (Marzo 2025)</Link></li>
              <li><Link to="/galeria?tab=ecuador-2024" onClick={() => toggleNav(false)}><Camera size={18} /> ECMO Nursing Guayaquil (Agosto 2024)</Link></li>
              <li><Link to="/galeria?tab=santiago-chile-2025" onClick={() => toggleNav(false)}><Camera size={18} /> Santiago de Chile (Octubre 2025)</Link></li>
            </ul>
          </div>

          {/* Alumnos / Mi Portal moved to the left sidebar */}

        </div>
      </nav>
    </>
  );
};

export default Navbar;
