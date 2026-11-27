// Intentos por alumno: cada intento con lo que respondió y si acertó.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import IntentosAlumno from '../src/components/admin/IntentosAlumno';

const preguntas = [
  { id: 1, tipo: 'opcion', texto: '¿Qué es ECMO?', opciones: ['Un soporte extracorpóreo', 'Un fármaco'], correctas: [0] },
  { id: 2, tipo: 'abierta', texto: 'Comentario', opciones: [], correctas: [] },
];
const intentos = [
  { id: 'a', user_id: 'u1', numero: 1, calificacion: 0, aprobado: false, enviado_en: '2026-11-27T10:00:00Z', respuestas: { 1: 1 } },
  { id: 'b', user_id: 'u1', numero: 2, calificacion: 100, aprobado: true, enviado_en: '2026-11-27T11:00:00Z', respuestas: { 1: 0, 2: 'Muy claro' } },
];

describe('Intentos por alumno', () => {
  it('muestra cada intento con sus respuestas, aciertos y errores', () => {
    render(<IntentosAlumno intentos={intentos} preguntas={preguntas} perfiles={[{ id: 'u1', nombre_completo: 'Ana Pérez' }]} esExamen />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Alumno' }), { target: { value: 'u1' } });
    expect(screen.getByText('0% · No aprobado')).toBeTruthy();
    expect(screen.getByText('100% · Aprobado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Intento 1/ }));
    expect(screen.getByLabelText('Incorrecta')).toBeTruthy();
    expect(screen.getByText('Un fármaco')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Intento 2/ }));
    expect(screen.getByLabelText('Correcta')).toBeTruthy();
    expect(screen.getByText('Muy claro')).toBeTruthy();
  });
});
