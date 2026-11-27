// Correo de inscripción: texto de la Dra. Trejo, saludo sin nombre y botón.
import { describe, expect, it } from 'vitest';
import { botonPara, llenarPlantilla } from '../netlify/functions/_notificaciones.js';

const CUERPO = '¡Hola, {nombre}!\n\n¡Tu inscripción al {curso} ha sido exitosa!\n\n{acceso}';

describe('Correo de inscripción', () => {
  it('llena el nombre y el curso', () => {
    expect(llenarPlantilla(CUERPO, { nombre: 'Jenifer', curso: 'Entrenamiento Introductorio en ECMO', acceso: 'Listo.' }))
      .toBe('¡Hola, Jenifer!\n\n¡Tu inscripción al Entrenamiento Introductorio en ECMO ha sido exitosa!\n\nListo.');
  });

  it('sin nombre no deja "¡Hola, !" ni "Hola :"', () => {
    expect(llenarPlantilla(CUERPO, { curso: 'X' }).startsWith('¡Hola!')).toBe(true);
    expect(llenarPlantilla('Hola {nombre}:\n\nTexto', {})).toBe('Hola:\n\nTexto');
  });

  it('el botón dice "Comenzar mi curso" al inscribirse e "Ir a mi curso" en lo demás', () => {
    const aula = 'https://healthcareexp.com/classroom/3';
    expect(botonPara('alumno', aula, 'inscrito_curso').boton).toBe('Comenzar mi curso');
    expect(botonPara('alumno', aula, 'examen_aprobado').boton).toBe('Ir a mi curso');
    expect(botonPara('alumno', 'https://healthcareexp.com/dashboard', 'inscrito_curso').boton).toBe('Entrar al portal');
  });
});
