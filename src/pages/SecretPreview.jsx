import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { RegistrationForm } from './Inscripciones';
import './Inscripciones.css';

const SecretPreview = () => {
  // Simulamos que venimos de un pago exitoso para que el formulario se vea completo
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

export default SecretPreview;
