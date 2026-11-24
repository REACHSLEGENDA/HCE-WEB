// Editor de texto con formato: pegar desde Word/web y botones de la barra.
import { describe, expect, it } from 'vitest';
import { envolver, htmlAFormato, insertarEnlace, prefijarLineas } from '../src/lib/formatoTexto.js';

describe('Pegar con formato', () => {
  it('convierte títulos, negritas, cursivas, enlaces y listas numeradas', () => {
    const html = `
      <h2>Misión de ELSO</h2>
      <p>ELSO es un <strong>pilar fundamental</strong> en el campo de <em>ECMO</em>.</p>
      <ol>
        <li><b>Estándares de calidad:</b> guías clínicas.</li>
        <li><b>Educación:</b> programas de capacitación.</li>
        <li><b>Investigación:</b> estudios coordinados.</li>
      </ol>
      <ul><li>Uno</li><li>Dos</li></ul>
      <p>Fuente: <a href="https://www.elso.org/aboutus/charter.aspx">ELSO Charter</a></p>`;
    expect(htmlAFormato(html)).toBe([
      '# Misión de ELSO',
      '',
      'ELSO es un **pilar fundamental** en el campo de *ECMO*.',
      '',
      '1. **Estándares de calidad:** guías clínicas.',
      '2. **Educación:** programas de capacitación.',
      '3. **Investigación:** estudios coordinados.',
      '',
      '- Uno',
      '- Dos',
      '',
      'Fuente: [ELSO Charter](https://www.elso.org/aboutus/charter.aspx)',
    ].join('\n'));
  });

  it('entiende las negritas de Google Docs (estilo en un span)', () => {
    expect(htmlAFormato('<p><span style="font-weight:700">Importante</span> texto</p>')).toBe('**Importante** texto');
  });
});

describe('Barra de formato', () => {
  it('envuelve la selección en negritas o pone un ejemplo', () => {
    expect(envolver('hola mundo', 5, 10, '**').texto).toBe('hola **mundo**');
    expect(envolver('hola ', 5, 5, '**', 'texto').texto).toBe('hola **texto**');
  });

  it('numera y quita la numeración de las líneas elegidas', () => {
    const t = 'Uno\nDos\nTres';
    const numerado = prefijarLineas(t, 0, t.length, (i) => `${i + 1}. `, /^\d+[.)]\s+/).texto;
    expect(numerado).toBe('1. Uno\n2. Dos\n3. Tres');
    expect(prefijarLineas(numerado, 0, numerado.length, (i) => `${i + 1}. `, /^\d+[.)]\s+/).texto).toBe(t);
    expect(prefijarLineas('Título', 0, 0, '# ', /^#\s+/).texto).toBe('# Título');
  });

  it('inserta un enlace sobre la selección', () => {
    expect(insertarEnlace('Ver ELSO', 4, 8, 'https://elso.org').texto).toBe('Ver [ELSO](https://elso.org)');
  });
});
