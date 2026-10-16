/* global process */
// Seguimiento de pagos con Stripe, base y correo simulados: recibo, carrito
// abandonado, pago rechazado, sin repetidos y sin tabla no manda nada.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const falso = vi.hoisted(() => ({ sesiones: [], tabla: [], sinTabla: false, enviar: vi.fn(), porCorreo: vi.fn() }));

vi.mock('../netlify/functions/_stripe.js', () => ({
  getStripe: () => ({
    stripe: {
      checkout: {
        sessions: {
          list: (params) => {
            if (params.customer_details) return Promise.resolve({ data: falso.porCorreo(params.customer_details.email) || [] });
            return (async function* lista() { for (const s of falso.sesiones) yield s; }());
          },
        },
      },
    },
  }),
}));

// Tabla cobros_avisos en memoria con lo que usa la función.
function consulta() {
  const filtros = [];
  let limite = Infinity;
  const q = {
    select: () => q,
    eq: (c, v) => { filtros.push((f) => f[c] === v); return q; },
    in: (c, vs) => { filtros.push((f) => vs.includes(f[c])); return q; },
    gte: (c, v) => { filtros.push((f) => f[c] >= v); return q; },
    limit: (n) => { limite = n; return q; },
    then: (ok) => ok(falso.sinTabla
      ? { data: null, error: { code: '42P01', message: 'no existe' } }
      : { data: falso.tabla.filter((f) => filtros.every((fn) => fn(f))).slice(0, limite), error: null }),
    insert: async ([fila]) => {
      if (falso.tabla.some((f) => f.clave === fila.clave)) return { error: { code: '23505' } };
      falso.tabla.push({ ...fila, creado_en: new Date().toISOString() });
      return { error: null };
    },
    delete: () => ({ eq: async (c, v) => { falso.tabla = falso.tabla.filter((f) => f[c] !== v); return { error: null }; } }),
  };
  return q;
}
vi.mock('../netlify/functions/_supabase.js', () => ({ isConfigured: () => true, admin: () => ({ from: () => consulta() }) }));
vi.mock('../netlify/functions/_brevo.js', () => ({ enviarCorreo: falso.enviar, isConfigured: () => true }));
vi.mock('../netlify/functions/_notificaciones.js', () => ({ plantillaHce: (html, { boton, enlace }) => `${html}[${boton}](${enlace})` }));
vi.mock('../netlify/functions/_admins.js', () => ({ correosAvisoAdmin: async () => ['admin@prueba.test', 'academia@healthcareexp.com'] }));

import tarea from '../netlify/functions/cobros-seguimiento.js';

const hace = (horas) => Math.floor((Date.now() - horas * 3600 * 1000) / 1000);
const sesion = (id, extra) => ({
  id, created: hace(3), currency: 'mxn', amount_total: 1000000, status: 'expired', payment_status: 'unpaid',
  customer_details: { email: 'ana@prueba.test', name: 'Ana López' }, metadata: { programa: 'step1', perfil: 'Médicos Especialistas' },
  payment_intent: null, ...extra,
});

describe('Seguimiento de pagos (recibo y carrito abandonado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Fecha fija sin promociones vigentes (la de Step 1 terminó el 15 de octubre).
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-20T12:00:00-06:00'));
    process.env.STRIPE_SECRET_KEY = 'sk_prueba';
    delete process.env.STRIPE_SECRET_KEY_2;
    falso.tabla = [];
    falso.sinTabla = false;
    falso.enviar.mockResolvedValue({});
    falso.porCorreo.mockReturnValue([]);
  });

  it('manda el recibo con factura prellenada una sola vez', async () => {
    falso.sesiones = [sesion('cs_pagada_12345678', { status: 'complete', payment_status: 'paid' })];
    await tarea();
    await tarea();
    expect(falso.enviar).toHaveBeenCalledTimes(1);
    const correo = falso.enviar.mock.calls[0][0];
    expect(correo.para).toEqual(['ana@prueba.test']);
    expect(correo.asunto).toContain('Recibo de pago HCE-12345678');
    expect(correo.html).toContain('/facturacion?');
    expect(correo.html).toContain('folio=HCE-12345678');
    expect(correo.html).not.toContain('ana@prueba.test'); // sin datos personales en el enlace
  });

  it('avisa del carrito abandonado una vez y resume al equipo', async () => {
    falso.sesiones = [sesion('cs_abandonada')];
    await tarea();
    await tarea();
    const alAlumno = falso.enviar.mock.calls.filter(([c]) => c.para[0] === 'ana@prueba.test');
    expect(alAlumno).toHaveLength(1);
    expect(alAlumno[0][0].asunto).toContain('sigue disponible');
    expect(alAlumno[0][0].html).toContain('/inscripciones-step1');
    const alEquipo = falso.enviar.mock.calls.filter(([c]) => c.para.includes('academia@healthcareexp.com'));
    expect(alEquipo).toHaveLength(1);
  });

  it('si el banco rechazó la tarjeta, lo dice', async () => {
    falso.sesiones = [sesion('cs_rechazada', { payment_intent: { last_payment_error: { code: 'card_declined' } } })];
    await tarea();
    expect(falso.enviar.mock.calls[0][0].asunto).toContain('no se completó');
  });

  it('no molesta a quien ya pagó, ni a quien apenas está pagando', async () => {
    falso.sesiones = [
      sesion('cs_1', {}),
      sesion('cs_2', { status: 'complete', payment_status: 'paid', created: hace(2) }),
      sesion('cs_3', { created: hace(0.2), customer_details: { email: 'beto@prueba.test' } }),
    ];
    await tarea();
    const asuntos = falso.enviar.mock.calls.map(([c]) => c.asunto);
    expect(asuntos.some((a) => a.includes('sigue disponible'))).toBe(false);
    expect(asuntos.filter((a) => a.includes('Recibo'))).toHaveLength(1);
  });

  it('no avisa si ya pagó el programa en otra fecha', async () => {
    falso.sesiones = [sesion('cs_vieja')];
    falso.porCorreo.mockReturnValue([{ status: 'complete', payment_status: 'paid', metadata: { programa: 'step1' } }]);
    await tarea();
    expect(falso.enviar).not.toHaveBeenCalled();
  });

  it('sin la tabla no manda nada', async () => {
    falso.sinTabla = true;
    falso.sesiones = [sesion('cs_x', { status: 'complete', payment_status: 'paid' })];
    await tarea();
    expect(falso.enviar).not.toHaveBeenCalled();
  });

  afterEach(() => vi.useRealTimers());

  it('avisa que el precio especial termina a quien no terminó de pagar', async () => {
    vi.setSystemTime(new Date('2026-10-15T08:00:00-06:00')); // la promo de Step 1 termina esa noche
    falso.sesiones = [sesion('cs_promo')];
    await tarea();
    await tarea();
    const asuntos = falso.enviar.mock.calls.filter(([c]) => c.para[0] === 'ana@prueba.test').map(([c]) => c.asunto);
    expect(asuntos.filter((a) => a.includes('precio especial'))).toHaveLength(1);
  });

  it('ignora cobros sin programa (anteriores o de Alumni Pass)', async () => {
    falso.sesiones = [sesion('cs_alumni', { metadata: { tipo: 'alumni_pass' }, status: 'complete', payment_status: 'paid' })];
    await tarea();
    expect(falso.enviar).not.toHaveBeenCalled();
  });
});
