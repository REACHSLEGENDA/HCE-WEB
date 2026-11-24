// Lectura del alumno y editor con barra de formato.
import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import TextoLeccion, { FuentesLeccion } from '../src/components/TextoLeccion';
import EditorTextoFormato from '../src/components/admin/EditorTextoFormato';

describe('Lectura del alumno', () => {
  it('sigue la numeración aunque haya líneas en blanco y vuelve enlaces las direcciones', () => {
    const { container } = render(<TextoLeccion texto={'1. Estándares\n\n2. Educación\n\n3. Investigación\n\nFuente: https://www.elso.org/aboutus/charter.aspx.\nVer [ELSO](https://www.elso.org)'} />);
    const listas = [...container.querySelectorAll('ol')];
    expect(listas.map((ol) => ol.getAttribute('start'))).toEqual([null, '2', '3']);
    const enlaces = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(enlaces).toEqual(['https://www.elso.org/aboutus/charter.aspx', 'https://www.elso.org']);
  });
});

describe('Fuentes de la lección', () => {
  it('vuelve enlace cada liga, con o sin nombre antes', () => {
    const { container } = render(<FuentesLeccion fuentes={'ELSO Guidelines https://www.elso.org/a.aspx\n\nhttps://www.elso.org/b.aspx https://www.elso.org/c.aspx'} />);
    expect(container.querySelector('h4').textContent).toBe('Fuentes');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect([...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual([
      'https://www.elso.org/a.aspx', 'https://www.elso.org/b.aspx', 'https://www.elso.org/c.aspx',
    ]);
  });
  it('no muestra nada si está vacío', () => {
    const { container } = render(<FuentesLeccion fuentes={'  \n'} />);
    expect(container.innerHTML).toBe('');
  });
});

function Envoltura() {
  const [texto, setTexto] = useState('hola mundo');
  return <><EditorTextoFormato id="t" value={texto} onChange={setTexto} /><output data-testid="valor">{texto}</output></>;
}

describe('Editor con barra de formato', () => {
  it('pone negritas a lo seleccionado y muestra la vista previa', () => {
    render(<Envoltura />);
    const caja = screen.getByRole('textbox');
    caja.setSelectionRange(5, 10);
    fireEvent.click(screen.getByRole('button', { name: /Negritas/ }));
    expect(screen.getByTestId('valor').textContent).toBe('hola **mundo**');
    fireEvent.click(screen.getByRole('tab', { name: /Vista previa/ }));
    expect(screen.getByText('mundo').tagName).toBe('STRONG');
  });
});
