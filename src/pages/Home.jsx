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

const Home = () => {
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
