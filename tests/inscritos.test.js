// Reporte de inscritos: extras, % de descuento, factura y becas.
import { describe, expect, it } from 'vitest';
import { filasInscritos, porcentajeDescuento, precioRegular, resumenPorEntrenamiento } from '../src/lib/inscritos.js';

const pago = (p) => ({ status: 'succeeded', date: '2026-11-14T10:00:00Z', studentName: 'Ana', studentEmail: 'ana@x.test', currency: 'MXN', ...p });

describe('Reporte de inscritos', () => {
  it('calcula el % contra el precio regular, en pesos y en dólares', () => {
    expect(porcentajeDescuento(precioRegular('nursing', 'Enfermero(a)', {}, 'MXN'), 4000)).toBe(20);
    expect(porcentajeDescuento(precioRegular('nursing', 'Enfermero(a)', {}, 'USD'), 200)).toBe(20);
    expect(porcentajeDescuento(precioRegular('step1', 'especialista', {}, 'MXN'), 8000)).toBe(20);
    expect(porcentajeDescuento(precioRegular('step1', 'especialista', {}, 'MXN'), 10000)).toBe(0);
    // Con simulador: el descuento es sobre el curso (10,000), no sobre el pedido.
    expect(porcentajeDescuento(precioRegular('step1', 'especialista', { simulador: true }, 'MXN'), 10500)).toBe(30);
  });

  it('cruza pago, registro y factura por correo y marca extras y descuento', () => {
    const filas = filasInscritos({
      pagos: [pago({ programa: 'nursing', courseName: 'ECMO Nursing Care Course', amount: 7500, extras: 'ecmo_sim', promoCode: 'BUENFIN20' })],
      registros: [{ formId: 'xpqenabk', senderEmail: 'ANA@x.test', payload: { nombres: 'Ana', apellidos: 'López', pais: 'México', institucion: 'INER', telefono: '+52 55' } }],
      facturas: [{ correo: 'ana@x.test', rfc: 'LOAA800101XXX' }],
    });
    expect(filas).toHaveLength(1);
    expect(filas[0]).toMatchObject({ entrenamiento: 'ECMO Nursing', nombre: 'Ana López', institucion: 'INER', simulador: true, descuento: true, porcentaje: 20, codigo: 'BUENFIN20', factura: true, facturaRfc: 'LOAA800101XXX' });
  });

  it('incluye becas y transferencias del registro, y no cuenta códigos "none"', () => {
    const filas = filasInscritos({
      pagos: [pago({ programa: 'step1', amount: 10000, promoCode: 'none', studentEmail: 'b@x.test' })],
      registros: [{ formId: 'xpqenabk', senderEmail: 'beca@x.test', date: '2026-11-10', payload: { nombres: 'Beto', total_mxn: 0, promoCode: 'BECANURSING26' } }],
    });
    const regular = filas.find((f) => f.correo === 'b@x.test');
    expect(regular).toMatchObject({ descuento: false, porcentaje: 0, codigo: '', factura: false });
    const beca = filas.find((f) => f.correo === 'beca@x.test');
    expect(beca).toMatchObject({ programa: 'nursing', porcentaje: 100, codigo: 'BECANURSING26', origen: 'Beca o transferencia' });
    const resumen = resumenPorEntrenamiento(filas);
    expect(resumen.find((r) => r.programa === 'nursing')).toMatchObject({ inscritos: 1, descuento: 1 });
  });
});
