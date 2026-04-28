import React from 'react';
import ParisNewDesign from '../components/paris/ParisNewDesign';
import { useSEO } from '../hooks/useSEO';

const ParisDiploma = () => {
  useSEO({
    title: 'Paris International Diploma en ECMO',
    description: 'El programa de formación en ECMO más completo de Latinoamérica, desarrollado con el Hospital Pitié-Salpêtrière de París.',
    keywords: 'certificación ECMO México, curso ECMO México, diplomado ECMO INER, mejores cursos ECMO Latinoamérica, ECMO Paris, Pitié-Salpêtrière, Alain Combes, ECMO ELSO'
  });

  return (
    <ParisNewDesign />
  );
};

export default ParisDiploma;
