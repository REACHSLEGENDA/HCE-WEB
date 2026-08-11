import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Experiences from '../components/Experiences';
import Webinars from '../components/Webinars';
import Campus from '../components/Campus';
import Impact from '../components/Impact';
import Instructors from '../components/Instructors';
import Testimonials from '../components/Testimonials';
import Partners from '../components/Partners';
import Footer from '../components/Footer';
import { FAQHome } from '../components/FAQSection';
import { useSEO } from '../hooks/useSEO';

const Home = () => {
  useSEO({
    title: 'Inicio',
    description: 'Redefiniendo el estándar de la educación médica continua a través de simulación avanzada, ECMO y excelencia académica. Únete a HCE.',
    keywords: 'curso ECMO México, certificación ECMO México, donde estudiar ECMO, diplomado ECMO INER, simulación clínica ECMO, ECMO Nursing, HCE, Healthcare Training Experience'
  });

  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Verificar si ya vio el popup en esta sesión
    const hasSeenPopup = sessionStorage.getItem('cnadot_popup_seen');
    if (!hasSeenPopup) {
      const timer = setTimeout(() => {
        setShowPopup(true);
        sessionStorage.setItem('cnadot_popup_seen', 'true');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <>
      <Navbar />
      <Hero />
      <Partners />
      <Experiences />
      <Campus />
      <Instructors />
      <Impact />
      <Testimonials />
      <Webinars />
      
      {/* Colaboraciones / CNADOT Flyer */}
      <section style={{ backgroundColor: 'var(--bg-color)', padding: '2rem 1rem 6rem 1rem', display: 'flex', justifyContent: 'center' }}>
        <div className="section-container" style={{ textAlign: 'center', width: '100%' }}>
          <h2 className="section-title" style={{ marginBottom: '2rem', textAlign: 'center' }}>Colaboraciones</h2>
          <a 
            href="https://cnadot.healthcareexp.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ 
              display: 'inline-block', 
              maxWidth: '600px', 
              width: '100%', 
              borderRadius: '20px', 
              overflow: 'hidden', 
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)', 
              transition: 'transform 0.3s ease',
              border: '1px solid rgba(255,255,255,0.05)'
            }}
            onMouseOver={e => e.currentTarget.style.transform='translateY(-5px)'} 
            onMouseOut={e => e.currentTarget.style.transform='translateY(0)'}
          >
            <img 
              src="/assets/cnadot_flyer.png" 
              alt="Convocatoria CNADOT Master" 
              style={{ width: '100%', height: 'auto', display: 'block' }} 
            />
          </a>
        </div>
      </section>
      <FAQHome />
      <Footer />

      {/* CNADOT Promotional Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'var(--bg-color)',
            borderRadius: '15px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}>
            <button 
              onClick={() => setShowPopup(false)}
              style={{
                position: 'absolute',
                top: '10px', right: '10px',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '30px', height: '30px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2,
                fontSize: '18px'
              }}
            >
              ×
            </button>
            <a href="https://cnadot.healthcareexp.com/" target="_blank" rel="noopener noreferrer" onClick={() => setShowPopup(false)}>
              <img src="/assets/cnadot_flyer.png" alt="CNADOT" style={{ width: '100%', display: 'block' }} />
            </a>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>Máster CNADOT</h3>
              <p style={{ margin: '0 0 15px 0', color: 'var(--text-color)', opacity: 0.8, fontSize: '0.9rem' }}>
                Conoce la convocatoria para el Máster en Donación de Órganos y Tejidos.
              </p>
              <a href="https://cnadot.healthcareexp.com/" target="_blank" rel="noopener noreferrer" 
                 style={{ display: 'inline-block', padding: '10px 24px', backgroundColor: 'var(--primary-color)', color: '#fff', borderRadius: '50px', fontWeight: 600, textDecoration: 'none' }}
                 onClick={() => setShowPopup(false)}
              >
                Ver Información
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
