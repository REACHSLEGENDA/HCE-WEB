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
              maxWidth: '450px', 
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
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '450px',
            width: '100%',
            backgroundColor: '#1a1f2b', // color oscuro explícito
            borderRadius: '15px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <button 
              onClick={() => setShowPopup(false)}
              style={{
                position: 'absolute',
                top: '15px', right: '15px',
                background: 'rgba(0,0,0,0.7)',
                color: '#fff',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '50%',
                width: '36px', height: '36px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
                fontSize: '22px',
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
            >
              ×
            </button>
            <a href="https://cnadot.healthcareexp.com/" target="_blank" rel="noopener noreferrer" onClick={() => setShowPopup(false)}>
              <img src="/assets/cnadot_flyer.png" alt="CNADOT" style={{ width: '100%', maxHeight: '55vh', objectFit: 'contain', display: 'block', backgroundColor: '#fff' }} />
            </a>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.4rem', color: '#ffffff' }}>CNADOT</h3>
              <p style={{ margin: '0 0 15px 0', color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.4' }}>
                Conoce la convocatoria para el Curso Nacional Avanzado en Donación de Órganos y Tejidos.
              </p>
              <a href="https://cnadot.healthcareexp.com/" target="_blank" rel="noopener noreferrer" 
                 style={{ display: 'inline-block', padding: '12px 28px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '50px', fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s', boxShadow: '0 4px 10px rgba(2,132,199,0.4)' }}
                 onClick={() => setShowPopup(false)}
                 onMouseOver={e => e.currentTarget.style.backgroundColor = '#0369a1'}
                 onMouseOut={e => e.currentTarget.style.backgroundColor = '#0284c7'}
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
