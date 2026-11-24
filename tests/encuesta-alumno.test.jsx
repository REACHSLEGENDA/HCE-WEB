// Encuesta del alumno: sin botón "Revisar" en el mapa, pasa sola al envío al
// contestar todo y avisa que salir sin enviar no la guarda.
import React, { createRef } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { simulado, sesionComo, ALUMNO } from './simulador';
import EvaluacionLeccion from '../src/components/EvaluacionLeccion';

describe('Encuesta del alumno', () => {
  it('pasa sola a la pantalla de envío y avisa al salir sin enviar', async () => {
    sesionComo(ALUMNO);
    simulado.tablas.evaluacion_config = [{ leccion_id: 900, aleatorio: false }];
    simulado.tablas.evaluacion_preguntas = [
      { id: 1, leccion_id: 900, orden: 0, tipo: 'opcion', texto: '¿Tienes experiencia en ECMO?', opciones: ['Sí', 'No'], puntos: 1, obligatoria: true },
      { id: 2, leccion_id: 900, orden: 1, tipo: 'escala', texto: '¿Qué tan útil te parece?', opciones: ['Nada', 'Poco', 'Regular', 'Útil', 'Muy útil'], puntos: 1, obligatoria: true },
    ];
    simulado.tablas.evaluacion_intentos = [];
    const ref = createRef();
    render(<EvaluacionLeccion ref={ref} leccion={{ id: 900, tipo: 'encuesta', contenido: {} }} userId={ALUMNO.id} esAdmin={false} notificar={() => {}} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Responder encuesta' }));
    expect(screen.queryByRole('button', { name: /^Revisar$/ })).toBeNull();

    fireEvent.click(screen.getByLabelText(/Sí/));
    fireEvent.click(screen.getByRole('button', { name: /Siguiente/ }));
    fireEvent.click(await screen.findByText('Muy útil'));

    expect(await screen.findByRole('button', { name: 'Enviar encuesta' })).toBeTruthy();
    expect(screen.getByText(/se guardan solo al dar clic/)).toBeTruthy();
    expect(ref.current.estadoSalida()).toMatchObject({ sinEnviar: true, tipo: 'encuesta' });

    fireEvent.click(screen.getByRole('button', { name: 'Salir sin enviar' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/no se guardará/));
  });
});
