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
import { useSEO } from '../hooks/useSEO';

const Home = () => {
  useSEO({
    title: 'Inicio',
    description: 'Redefiniendo el estándar de la educación médica continua a través de simulación avanzada, ECMO y excelencia académica. Únete a HCE.',
    keywords: 'curso ECMO México, certificación ECMO México, donde estudiar ECMO, diplomado ECMO INER, simulación clínica ECMO, ECMO Nursing, HCE, Healthcare Training Experience'
  });

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
              maxWidth: '1000px', 
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
    </>
  );
};

export default Home;
