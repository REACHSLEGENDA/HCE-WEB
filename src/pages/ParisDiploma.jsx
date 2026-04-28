import React from 'react';
import ParisNewDesign from '../components/paris/ParisNewDesign';
import { useSEO } from '../hooks/useSEO';

const ParisDiploma = () => {
  useSEO({
    title: 'Paris International Diploma en ECMO',
    description: 'El programa de formación en ECMO más completo de Latinoamérica, desarrollado con el Hospital Pitié-Salpêtrière de París.',
    keywords: 'ECMO, Diploma Paris ECMO, Pitié-Salpêtrière, Prof. Alain Combes, INER, simulación clínica, medicina intensiva, soporte vital extracorpóreo'
  });

  return (
    <ParisNewDesign />
  );
};

export default ParisDiploma;
