import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { normalizar, validarPerfil, valoresIniciales, guardarPerfil, CAMPOS_NUEVOS } from '../src/lib/perfilAlumno';
import { ALUMNO, simulado, sesionComo } from './simulador';
import CampanitaAvisos from '../src/components/CampanitaAvisos';
import * as avisos from '../src/lib/avisosPortal';

describe('Perfil y avisos del alumno', () => {
  it('valida datos fiscales completos y normaliza sin perder ceros del CP', () => {
    const f = valoresIniciales({ nombre_completo: 'Ana María López', telefono: '+52 5555555555', pais: 'México' }, ALUMNO);
    expect(validarPerfil(f)).toEqual({});
    f.rfc = normalizar('rfc', 'gomc-800101 ab1');
    f.codigo_postal_fiscal = normalizar('codigo_postal_fiscal', '01 234');
    expect(f.rfc).toBe('GOMC800101AB1');
    expect(f.codigo_postal_fiscal).toBe('01234');
    expect(validarPerfil(f)).toHaveProperty('razon_social');
    Object.assign(f, { razon_social: 'ANA MARÍA LÓPEZ', regimen_fiscal: '605', uso_cfdi: 'G03', cedula_profesional: '1234567' });
    expect(validarPerfil(f)).toEqual({});
    f.cedula_profesional = 'ABC';
    expect(validarPerfil(f)).toHaveProperty('cedula_profesional');
  });

  it('sin migración guarda lo compatible y mantiene pendientes los campos nuevos', async () => {
    const valores = valoresIniciales({ nombre_completo: 'Ana María López', telefono: '5555555555', cedula_profesional: '1234567' }, ALUMNO);
    const updateProfile = vi.fn().mockRejectedValueOnce({ code: 'PGRST204' }).mockResolvedValue({});
    const updateUserMetadata = vi.fn().mockResolvedValue({});
    const r = await guardarPerfil({ valores, updateProfile, updateUserMetadata });
    expect(r.pendientes).toEqual(['cedula_profesional']);
    expect(Object.keys(updateProfile.mock.calls[1][0]).some(c => CAMPOS_NUEVOS.includes(c))).toBe(false);
    expect(updateUserMetadata).toHaveBeenCalledOnce();
  });

  it('un fallo de red al guardar no se oculta ni degrada a un guardado parcial', async () => {
    const updateProfile = vi.fn().mockRejectedValue(new Error('Sin red'));
    await expect(guardarPerfil({ valores: {}, updateProfile, updateUserMetadata: vi.fn() })).rejects.toThrow('Sin red');
    expect(updateProfile).toHaveBeenCalledOnce();
  });

  it('la campana marca todo, revierte si falla y admite la tabla todavía ausente', async () => {
    sesionComo(ALUMNO);
    simulado.tablas.notificaciones_portal = [{ id: 3, user_id: ALUMNO.id, titulo: 'Tu curso abrió', tipo: 'curso_abierto', creada_en: new Date().toISOString(), leida: false }];
    const marcar = vi.spyOn(avisos, 'marcarAvisosLeidos').mockRejectedValueOnce(new Error('Sin red')).mockResolvedValue();
    try {
      const vista = render(<CampanitaAvisos userId={ALUMNO.id} />);
      await waitFor(() => expect(screen.getByRole('button', { name: 'Avisos: 1 sin leer' })).toBeTruthy());
      fireEvent.click(screen.getByRole('button', { name: 'Avisos: 1 sin leer' }));
      fireEvent.click(screen.getByRole('button', { name: /Marcar todo como leído/ }));
      await screen.findByRole('alert');
      expect(screen.getByRole('button', { name: 'Avisos: 1 sin leer' })).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Marcar todo como leído/ }));
      await waitFor(() => expect(screen.queryByRole('button', { name: 'Avisos: 1 sin leer' })).toBeNull());
      expect(marcar).toHaveBeenCalledWith(ALUMNO.id);
      vista.unmount();
      delete simulado.tablas.notificaciones_portal;
      render(<CampanitaAvisos userId={ALUMNO.id} derivados={[{ id: 'cert-1', texto: 'Tu certificado está listo' }]} />);
      fireEvent.click(screen.getByRole('button', { name: 'Avisos: 1 sin leer' }));
      await screen.findByText('Tu certificado está listo');
      await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
      expect(screen.queryByRole('alert')).toBeNull();
    } finally { marcar.mockRestore(); }
  });
});
