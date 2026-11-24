// Pantalla del reporte de inscritos: se monta con datos de prueba y cruza la
// factura que viene de Supabase (simulado).
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { simulado, sesionComo, ADMIN } from './simulador';
import ReporteInscritos from '../src/components/admin/ReporteInscritos';

describe('Reporte de inscritos (pantalla)', () => {
  it('muestra el resumen por entrenamiento, el descuento y la factura', async () => {
    sesionComo(ADMIN);
    simulado.tablas.facturacion_requests = [{ id: 1, correo: 'ana@x.test', rfc: 'LOAA800101XXX', created_at: new Date().toISOString() }];
    render(
      <ReporteInscritos
        pagos={[{ id: 'pi_1', status: 'succeeded', date: new Date().toISOString(), programa: 'nursing', courseName: 'ECMO Nursing Care Course', studentName: 'Ana López', studentEmail: 'ana@x.test', currency: 'MXN', amount: 4000, promoCode: 'BUENFIN20' }]}
        registros={[]}
      />,
    );
    expect(await screen.findByText('1')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    expect(screen.getByText('BUENFIN20')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('LOAA800101XXX')).toBeTruthy());
    expect(screen.getByRole('button', { name: /Descargar Excel/ })).toBeTruthy();
  });
});
