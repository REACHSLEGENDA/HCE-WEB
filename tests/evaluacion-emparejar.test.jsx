// Examen del alumno con respuestas en orden aleatorio y una pregunta de
// emparejar: se muestran revueltas, pero al servidor van los índices
// ORIGINALES. Y el editor: "+ Emparejar", pares y reglas al terminar.
import React, { createRef } from 'react';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { simulado, sesionComo, ALUMNO, ADMIN } from './simulador';
import EvaluacionLeccion from '../src/components/EvaluacionLeccion';
import EditorEvaluacion from '../src/components/admin/EditorEvaluacion';

const EXAMEN = { id: 900, tipo: 'examen', titulo: 'Examen ECMO', contenido: {} };

function prepararExamen(config = {}) {
  simulado.tablas.evaluacion_config = [{ leccion_id: 900, min_aprobacion: 80, aleatorio: false, aleatorio_opciones: true, ...config }];
  simulado.tablas.evaluacion_preguntas = [
    { id: 1, leccion_id: 900, orden: 1, tipo: 'opcion', texto: '¿Qué significa ECMO?', opciones: ['Primera', 'Segunda', 'Tercera'], puntos: 1, obligatoria: true },
    {
      id: 2, leccion_id: 900, orden: 2, tipo: 'emparejar', texto: 'Ordena correctamente los hitos históricos de ECMO',
      opciones: { izquierda: ['1971', '1972', '1975'], derecha: ['Texto C', 'Texto A', 'Texto B'] }, puntos: 1, obligatoria: true,
    },
  ];
  simulado.tablas.evaluacion_intentos = [];
}

const cuerposEnviados = () => globalThis.fetch.mock.calls
  .filter(([url]) => String(url).includes('/.netlify/functions/evaluacion-enviar'))
  .map(([, init]) => JSON.parse(init.body));

// Solo se restaura el azar: los espías de consola de setup.js se quedan.
afterEach(() => { Math.random.mockRestore?.(); });

describe('Examen con respuestas en orden aleatorio y emparejar', () => {
  it('muestra las opciones revueltas y envía los índices originales', async () => {
    sesionComo(ALUMNO);
    prepararExamen();
    // Con 0 fijo, Fisher-Yates deja [0,1,2] como [1,2,0].
    vi.spyOn(Math, 'random').mockReturnValue(0);
    simulado.netlify['evaluacion-enviar'] = {
      ok: true, tipo: 'examen', calificacion: null, mostrarCalificacion: false, aprobado: true, minimo: 80,
      correctas: null, calificables: null, intentosRestantes: null,
      detalle: { 1: { correcta: true }, 2: { correcta: false, correctas: [1, 2, 0] } },
    };
    render(<EvaluacionLeccion leccion={EXAMEN} userId={ALUMNO.id} esAdmin={false} notificar={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Comenzar examen' }));

    // Opción única: se ve primero "Segunda" (índice original 1).
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.closest('label').textContent)).toEqual(['ASegunda', 'BTercera', 'CPrimera']);
    fireEvent.click(radios[0]);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));

    // Emparejar: un selector por año, con las opciones revueltas.
    const s1971 = await screen.findByLabelText('1971');
    expect(within(s1971).getAllByRole('option').map((o) => o.textContent)).toEqual(['Elige su pareja', 'A. Texto A', 'B. Texto B', 'C. Texto C']);
    fireEvent.change(s1971, { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('1972'), { target: { value: '2' } });
    // Sin terminar todos los pares, la pregunta sigue sin contestar.
    fireEvent.click(screen.getByRole('button', { name: /Continuar para enviar/ }));
    expect(await screen.findByText(/falta 1 pregunta/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Contestar las que faltan/ }));
    fireEvent.change(await screen.findByLabelText('1975'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Continuar para enviar/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar examen' }));

    await waitFor(() => expect(cuerposEnviados()).toHaveLength(1));
    expect(cuerposEnviados()[0].respuestas).toEqual({ 1: 1, 2: [1, 2, 0] });

    // Resultado sin calificación: solo aprobado, marcas y la respuesta correcta que mandó el servidor.
    expect(await screen.findByText('¡Aprobaste!')).toBeTruthy();
    expect(screen.queryByText(/%$/)).toBeNull();
    expect(screen.getByText('Correcta')).toBeTruthy();
    expect(screen.getByText('Incorrecta')).toBeTruthy();
    expect(screen.getByText('1971: Texto A')).toBeTruthy();
  });

  it('sin la regla, las opciones salen en su orden y el borrador guarda emparejar', async () => {
    sesionComo(ALUMNO);
    prepararExamen({ aleatorio_opciones: false });
    render(<EvaluacionLeccion leccion={EXAMEN} userId={ALUMNO.id} esAdmin={false} notificar={() => {}} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Comenzar examen' }));
    expect(screen.getAllByRole('radio').map((r) => r.closest('label').textContent)).toEqual(['APrimera', 'BSegunda', 'CTercera']);
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    fireEvent.change(await screen.findByLabelText('1972'), { target: { value: '2' } });
    const clave = Object.keys(localStorage).find((k) => k.startsWith('hce:evaluacion:borrador'));
    expect(JSON.parse(localStorage.getItem(clave)).respuestas).toEqual({ 2: [null, 2, null] });
  });
});

describe('Editor del examen', () => {
  it('agrega una pregunta de emparejar y guarda las reglas al terminar', async () => {
    sesionComo(ADMIN);
    simulado.tablas.evaluacion_config = [{ leccion_id: 900, min_aprobacion: 80, intentos_max: null, mostrar_respuestas: true, aleatorio: false, cuenta_calificacion: true }];
    simulado.tablas.evaluacion_preguntas = [];
    simulado.tablas.evaluacion_claves = [];
    const notificar = vi.fn();
    render(<EditorEvaluacion leccion={EXAMEN} notificar={notificar} confirmar={async () => true} onCerrar={() => {}} />);

    // Sin las columnas nuevas, "mostrar qué contestó bien" se ve como marcas + correctas siempre.
    expect(await screen.findByText('Al terminar el examen, el alumno ve:')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /Si cada respuesta fue correcta/ }).checked).toBe(true);
    expect(screen.getByRole('radio', { name: 'Al terminar sus intentos' }).checked).toBe(true);
    expect(screen.getByRole('button', { name: 'Guardar reglas' }).disabled).toBe(true);

    fireEvent.click(screen.getByRole('radio', { name: 'Solo si aprueba' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Respuestas en orden aleatorio/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar reglas' }));
    await waitFor(() => expect(notificar).toHaveBeenCalledWith('Reglas guardadas.', 'success'));
    const upsertConfig = globalThis.fetch.mock.calls.find(([url, init]) => String(url).includes('/evaluacion_config') && init?.method === 'POST');
    expect(JSON.parse(upsertConfig[1].body)[0]).toMatchObject({ mostrar_correctas: 'al_aprobar', mostrar_marcas: true, aleatorio_opciones: true, mostrar_respuestas: true });

    fireEvent.click(screen.getByRole('button', { name: /Emparejar/ }));
    fireEvent.change(await screen.findByLabelText('Pregunta *'), { target: { value: 'Ordena los hitos' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar par/ }));
    [['1971', 'Texto A'], ['1972', 'Texto B'], ['1975', 'Texto C']].forEach(([izq, der], i) => {
      fireEvent.change(screen.getByLabelText(`Par ${i + 1}, izquierda`), { target: { value: izq } });
      fireEvent.change(screen.getByLabelText(`Par ${i + 1}, derecha`), { target: { value: der } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar pregunta' }));

    await waitFor(() => expect(globalThis.fetch.mock.calls.some(([url]) => String(url).includes('/evaluacion_claves'))).toBe(true));
    const pregunta = JSON.parse(globalThis.fetch.mock.calls.find(([url, init]) => String(url).includes('/evaluacion_preguntas') && init?.method === 'POST')[1].body)[0];
    const clave = JSON.parse(globalThis.fetch.mock.calls.find(([url]) => String(url).includes('/evaluacion_claves'))[1].body)[0];
    expect(pregunta).toMatchObject({ tipo: 'emparejar', texto: 'Ordena los hitos' });
    expect(pregunta.opciones.izquierda).toEqual(['1971', '1972', '1975']);
    expect(pregunta.opciones.derecha).not.toEqual(['Texto A', 'Texto B', 'Texto C']);
    ['Texto A', 'Texto B', 'Texto C'].forEach((t, i) => expect(pregunta.opciones.derecha[clave.correctas[i]]).toBe(t));
  });

  it('agregarPreguntas guarda varias de golpe y no guarda ninguna si una está mal', async () => {
    sesionComo(ADMIN);
    simulado.tablas.evaluacion_config = [{ leccion_id: 900, min_aprobacion: 80 }];
    simulado.tablas.evaluacion_preguntas = [];
    simulado.tablas.evaluacion_claves = [];
    const ref = createRef();
    render(<EditorEvaluacion ref={ref} leccion={EXAMEN} notificar={() => {}} confirmar={async () => true} onCerrar={() => {}} />);
    await screen.findByText('Reglas del examen');
    globalThis.fetch.mockClear();
    const insertadas = () => globalThis.fetch.mock.calls.filter(([url, init]) => String(url).includes('/evaluacion_preguntas') && init?.method === 'POST');

    // Una con problema: no se guarda ninguna.
    await expect(act(() => ref.current.agregarPreguntas([
      { tipo: 'opcion', texto: 'Bien', opciones: ['Sí', 'No'], correctas: [0] },
      { tipo: 'emparejar', texto: 'Un solo par', opciones: [], correctas: [], pares: [{ izquierda: '1971', derecha: 'Texto' }] },
    ]))).rejects.toMatchObject({ errores: [{ fila: 2 }] });
    expect(insertadas()).toHaveLength(0);

    // Todas bien (una sin clave, como las que avisa el importador): se guardan en orden.
    let r;
    await act(async () => {
      r = await ref.current.agregarPreguntas([
        { tipo: 'opcion', texto: 'Primera', opciones: ['Sí', 'No'], correctas: [1] },
        { tipo: 'multiple', texto: 'Sin clave', opciones: ['A', 'B', 'C'], correctas: [] },
        { tipo: 'emparejar', texto: 'Hitos', opciones: [], correctas: [], pares: [{ izquierda: '1971', derecha: 'A' }, { izquierda: '1972', derecha: 'B' }] },
        { tipo: 'abierta', texto: 'Comenta', opciones: [], correctas: [] },
      ]);
    });
    expect(r).toEqual({ agregadas: 4 });
    const cuerpos = insertadas().map(([, init]) => JSON.parse(init.body)[0]);
    expect(cuerpos.map((p) => [p.tipo, p.texto, p.orden])).toEqual([['opcion', 'Primera', 1], ['multiple', 'Sin clave', 2], ['emparejar', 'Hitos', 3], ['abierta', 'Comenta', 4]]);
    expect(cuerpos[2].opciones.izquierda).toEqual(['1971', '1972']);
  });
});
