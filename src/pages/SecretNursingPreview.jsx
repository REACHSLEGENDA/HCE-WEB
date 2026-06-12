import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { RegistrationForm } from './InscripcionesNursing';
import './Inscripciones.css';

const SecretNursingPreview = () => {
  return (
    <div className="ins-page">
      <Navbar />
      <div style={{ paddingTop: '100px' }}>
        <RegistrationForm />
      </div>
      <Footer />
    </div>
  );
};

export default SecretNursingPreview;
