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
      <Experiences />
      <Campus />
      <Instructors />
      <Impact />
      <Testimonials />
      <Webinars />
      <Partners />
      <Footer />
    </>
  );
};

export default Home;
