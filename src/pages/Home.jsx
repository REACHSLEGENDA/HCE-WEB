import React from 'react';
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
import Comunicados from '../components/Comunicados';
import { useSEO } from '../hooks/useSEO';

// La 2ª Carrera con Causa (CENATRA) es el domingo 11 de octubre de 2026: el
// aviso se quita solo al terminar ese día, hora del centro de México.
const FIN_AVISO_CARRERA = new Date('2026-10-12T00:00:00-06:00');
const ENLACE_CARRERA = 'https://www.entusmarcas.com';

const Home = () => {
  useSEO({
    title: 'Inicio',
    description: 'Redefiniendo el estándar de la educación médica continua a través de simulación avanzada, ECMO y excelencia académica. Únete a HCE.',
    keywords: 'curso ECMO México, certificación ECMO México, donde estudiar ECMO, diplomado ECMO INER, simulación clínica ECMO, ECMO Nursing, HCE, Healthcare Training Experience'
  });

  const mostrarCarrera = new Date() < FIN_AVISO_CARRERA;

  return (
    <>
      <Navbar />
      <Hero />
      <Comunicados tipo="externo" />
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
              src="/assets/cnadot_flyer.webp"
              alt="Convocatoria CNADOT Master"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </a>
        </div>
      </section>
      <FAQHome />

      {/* 2ª Carrera con Causa por la Donación de Órganos (solo hasta el 11 de octubre) */}
      {mostrarCarrera && (
        <section style={{ backgroundColor: 'var(--bg-color)', padding: '3rem 1rem 4rem', display: 'flex', justifyContent: 'center' }}>
          <div className="section-container" style={{ textAlign: 'center', width: '100%', maxWidth: '520px' }}>
            <h2 className="section-title" style={{ marginBottom: '0.75rem', textAlign: 'center' }}>Corre por la donación de órganos</h2>
            <p style={{ margin: '0 auto 1.75rem', color: 'var(--text-muted, #94a3b8)', lineHeight: 1.6, maxWidth: '440px' }}>
              2ª Carrera con Causa por la Donación de Órganos de CENATRA: domingo 11 de octubre de 2026, con distancias de 3, 5 y 10 km. Por un México sin lista de espera.
            </p>
            <a
              href={ENLACE_CARRERA}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', width: '100%', maxWidth: '420px', margin: '0 auto', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}
            >
              <img
                src="/assets/carrera_donacion_2026.jpg"
                alt="2ª Carrera con Causa por la Donación de Órganos, 11 de octubre de 2026, 3, 5 y 10 km"
                loading="lazy"
                decoding="async"
                width="1080"
                height="1397"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </a>
            <a
              href={ENLACE_CARRERA}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: '1.5rem', padding: '12px 28px', backgroundColor: '#0284c7', color: '#ffffff', borderRadius: '50px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 10px rgba(2,132,199,0.4)' }}
            >
              Inscríbete en entusmarcas.com
            </a>
          </div>
        </section>
      )}

      <Footer />
    </>
  );
};

export default Home;
