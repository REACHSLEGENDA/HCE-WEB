// Color de letra en lecturas, instrucciones y tareas.
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import TextoLeccion from '../src/components/TextoLeccion';
import { colorear } from '../src/lib/formatoTexto';

describe('Color de letra', () => {
  it('dibuja el texto de color y respeta las negritas por dentro', () => {
    const { container } = render(<TextoLeccion texto={'Tienes {rojo}**40 minutos**{/rojo} y {azul}1 intento{/azul}.'} />);
    const rojo = container.querySelector('.tl-color--rojo');
    expect(rojo.querySelector('strong').textContent).toBe('40 minutos');
    expect(container.querySelector('.tl-color--azul').textContent).toBe('1 intento');
    expect(container.textContent).not.toContain('{');
  });
  it('un color que no existe se queda como texto normal (nada de HTML)', () => {
    const { container } = render(<TextoLeccion texto={'{rosa}hola{/rosa}'} />);
    expect(container.querySelector('.tl-color')).toBeNull();
  });
  it('el botón pone, cambia y quita el color de lo seleccionado', () => {
    const r = colorear('hola mundo', 5, 10, 'verde');
    expect(r.texto).toBe('hola {verde}mundo{/verde}');
    expect(r.texto.slice(r.inicio, r.fin)).toBe('mundo');
    const cambiado = colorear(r.texto, 5, r.texto.length, 'morado');
    expect(cambiado.texto).toBe('hola {morado}mundo{/morado}');
    expect(colorear(cambiado.texto, 5, cambiado.texto.length, '').texto).toBe('hola mundo');
  });
});
