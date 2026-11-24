// Preguntas de repaso al final de una lectura: editor y vista del alumno.
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import RepasoLeccion from '../src/components/RepasoLeccion';
import EditorRepaso from '../src/components/admin/EditorRepaso';
import { problemaRepaso, repasoValido } from '../src/lib/lecciones';

const PREGUNTAS = [
  { pregunta: '¿Qué es ELSO?', opciones: ['Una organización', 'Un equipo'], correcta: 0, explicacion: 'Es la Extracorporeal Life Support Organization.' },
  { pregunta: '¿Cuántas guías hay en español?', opciones: ['Ninguna', 'Más de 10'], correcta: 1, explicacion: '' },
];

describe('repasoValido', () => {
  it('quita opciones vacías y recorre la correcta', () => {
    expect(repasoValido([{ pregunta: ' P ', opciones: ['', 'a', ' ', 'b'], correcta: 3 }])).toEqual([
      { pregunta: 'P', opciones: ['a', 'b'], correcta: 1, explicacion: '' },
    ]);
  });
  it('descarta preguntas incompletas o con la correcta vacía', () => {
    expect(repasoValido([{ pregunta: 'P', opciones: ['a'], correcta: 0 }, { pregunta: 'Q', opciones: ['a', 'b', ''], correcta: 2 }, null])).toEqual([]);
    expect(repasoValido(null)).toEqual([]);
  });
});

describe('problemaRepaso', () => {
  it('avisa lo que falta y deja pasar preguntas vacías', () => {
    expect(problemaRepaso([{ pregunta: '', opciones: ['', ''], correcta: 0, explicacion: '' }])).toBe('');
    expect(problemaRepaso([{ pregunta: 'P', opciones: ['a', ''], correcta: 0 }])).toMatch(/dos opciones/);
    expect(problemaRepaso([{ pregunta: 'P', opciones: ['a', 'b', ''], correcta: 2 }])).toMatch(/correcta/);
    expect(problemaRepaso([{ pregunta: '', opciones: ['a', 'b'], correcta: 0 }])).toMatch(/texto de la pregunta/);
    expect(problemaRepaso(PREGUNTAS)).toBe('');
  });
});

describe('Comprueba lo que aprendiste', () => {
  it('no muestra nada sin preguntas', () => {
    const { container } = render(<RepasoLeccion preguntas={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('revisa, explica, cuenta aciertos y deja intentar de nuevo', () => {
    render(<RepasoLeccion preguntas={PREGUNTAS} />);
    const revisar = screen.getByRole('button', { name: 'Revisar respuestas' });
    expect(revisar.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('Una organización'));
    fireEvent.click(screen.getByLabelText('Ninguna'));
    expect(revisar.disabled).toBe(false);
    fireEvent.click(revisar);
    expect(screen.getByText('¡Correcto!')).toBeTruthy();
    expect(screen.getByText('No es correcta.')).toBeTruthy();
    expect(screen.getByText(/Extracorporeal Life Support/)).toBeTruthy();
    expect(screen.getByText('1 de 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Intentar de nuevo/ }));
    expect(screen.getByText('0 de 2 contestadas')).toBeTruthy();
  });
});

function Envoltura() {
  const [repaso, setRepaso] = useState([]);
  return <><EditorRepaso value={repaso} onChange={setRepaso} /><output data-testid="valor">{JSON.stringify(repaso)}</output></>;
}

describe('Editor de preguntas de repaso', () => {
  it('agrega una pregunta, sus opciones y la correcta', () => {
    render(<Envoltura />);
    fireEvent.click(screen.getByRole('button', { name: /Agregar pregunta de repaso/ }));
    fireEvent.change(screen.getByLabelText('Pregunta 1'), { target: { value: '¿Qué es ELSO?' } });
    fireEvent.change(screen.getByLabelText('Opción 1 de la pregunta 1'), { target: { value: 'Un equipo' } });
    fireEvent.change(screen.getByLabelText('Opción 2 de la pregunta 1'), { target: { value: 'Una organización' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar opción/ }));
    fireEvent.change(screen.getByLabelText('Opción 3 de la pregunta 1'), { target: { value: 'Un hospital' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar la opción 2 como correcta' }));
    // Quitar la primera recorre la correcta.
    fireEvent.click(screen.getByRole('button', { name: 'Quitar la opción 1' }));
    expect(JSON.parse(screen.getByTestId('valor').textContent)).toEqual([
      { pregunta: '¿Qué es ELSO?', opciones: ['Una organización', 'Un hospital'], correcta: 0, explicacion: '' },
    ]);
  });
});
