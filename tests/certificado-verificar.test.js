import { describe, it, expect, vi } from 'vitest';
import { consultarFolio, normalizarFolio, folioValido, estadoVigencia, handler } from '../netlify/functions/certificado-verificar';

function base(...resultados) {
  const limit = vi.fn();
  resultados.forEach(r => limit.mockResolvedValueOnce(r));
  const consulta = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(), limit };
  return { from: vi.fn(() => consulta), consulta };
}

describe('Verificación pública de certificados', () => {
  it('normaliza el folio y rechaza valores que no corresponden a un certificado', async () => {
    expect(normalizarFolio(' #fol 123456 ')).toBe('FOL-123456');
    expect(folioValido(normalizarFolio('123456'))).toBe(true);
    expect(folioValido('../../profiles')).toBe(false);
    expect((await handler({ httpMethod: 'GET', queryStringParameters: { folio: '../../profiles' } })).statusCode).toBe(400);
  });
  it('solo devuelve titular, curso, fechas, vigencia y folio, aunque la base incluya otros datos', async () => {
    const db = base({ data: [{ folio: 'FOL-123456', created_at: '2026-10-15', profiles: { nombre_completo: 'Ana López', email: 'privado@prueba.test', rfc: 'privado' }, courses: [{ title: 'ECMO' }], score: 95, pdf_url: 'privada', user_id: 'privado' }] });
    const r = await consultarFolio(db, 'FOL-123456');
    expect(r).toEqual({ folio: 'FOL-123456', titular: 'Ana López', curso: 'ECMO', emitido_en: '2026-10-15', vigencia: { estado: 'permanente', hasta: null } });
    expect(db.consulta.eq).toHaveBeenCalledWith('folio', 'FOL-123456');
  });
  it('tolera el esquema sin vigencia y distingue folio inexistente de error de red', async () => {
    const db = base({ error: { code: '42703', message: 'vigente_hasta does not exist' } }, { data: [] });
    expect(await consultarFolio(db, 'FOL-000000')).toBeNull();
    expect(db.consulta.limit).toHaveBeenCalledTimes(2);
    await expect(consultarFolio(base({ error: { message: 'Sin red' } }), 'FOL-000000')).rejects.toThrow('Sin red');
  });
  it('calcula la vigencia incluyendo el instante de vencimiento', () => {
    const ahora = new Date('2026-10-15T12:00:00Z');
    expect(estadoVigencia(null, ahora).estado).toBe('permanente');
    expect(estadoVigencia('2026-10-16T12:00:00Z', ahora).estado).toBe('vigente');
    expect(estadoVigencia(ahora, ahora).estado).toBe('vencido');
  });
});
