// OXXO y SPEI: opciones de Stripe, respaldo con tarjeta y estado de la sesión.
import { describe, expect, it, vi } from 'vitest';
import { conPagosDiferidos, crearSesionConPagosDiferidos, metodoDeSesion, sesionPagada, sesionPendiente } from '../netlify/functions/_pagos.js';

describe('Pagos en OXXO y SPEI', () => {
  it('agrega OXXO y SPEI sin perder los meses sin intereses', () => {
    const o = conPagosDiferidos({ payment_method_types: ['card'], payment_method_options: { card: { installments: { enabled: true } } } });
    expect(o.payment_method_types).toEqual(['card', 'oxxo', 'customer_balance']);
    expect(o.payment_method_options.card.installments.enabled).toBe(true);
    expect(o.payment_method_options.oxxo.expires_after_days).toBe(3);
    expect(o.payment_method_options.customer_balance.bank_transfer.type).toBe('mx_bank_transfer');
    expect(o.customer_creation).toBe('always');
  });

  it('si Stripe rechaza uno, ofrece el otro; si rechaza los dos, solo tarjeta', async () => {
    const soloOxxo = vi.fn()
      .mockRejectedValueOnce(new Error('customer_balance is invalid'))
      .mockResolvedValueOnce({ url: 'https://checkout.stripe.com/oxxo' });
    const a = await crearSesionConPagosDiferidos({ checkout: { sessions: { create: soloOxxo } } }, { payment_method_types: ['card'] });
    expect(a.url).toBe('https://checkout.stripe.com/oxxo');
    expect(soloOxxo.mock.calls[1][0].payment_method_types).toEqual(['card', 'oxxo']);
    expect(soloOxxo.mock.calls[1][0].customer_creation).toBeUndefined();

    const ninguno = vi.fn()
      .mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x')).mockRejectedValueOnce(new Error('x'))
      .mockResolvedValueOnce({ url: 'https://checkout.stripe.com/card' });
    const b = await crearSesionConPagosDiferidos({ checkout: { sessions: { create: ninguno } } }, { payment_method_types: ['card'] });
    expect(b.url).toBe('https://checkout.stripe.com/card');
    expect(ninguno.mock.calls[3][0].payment_method_types).toEqual(['card']);
  });

  it('distingue pagado, pendiente y el método', () => {
    const pendienteOxxo = { status: 'complete', payment_status: 'unpaid', payment_intent: { next_action: { oxxo_display_details: {} } } };
    expect(sesionPendiente(pendienteOxxo)).toBe(true);
    expect(sesionPagada(pendienteOxxo)).toBe(false);
    expect(metodoDeSesion(pendienteOxxo)).toBe('oxxo');
    const spei = { status: 'complete', payment_status: 'paid', payment_intent: { payment_method: { type: 'customer_balance' } } };
    expect(sesionPagada(spei)).toBe(true);
    expect(metodoDeSesion(spei)).toBe('spei');
    expect(metodoDeSesion({ status: 'complete', payment_status: 'paid', payment_intent: 'pi_123' })).toBe('tarjeta');
    expect(sesionPendiente({ status: 'open', payment_status: 'unpaid' })).toBe(false);
  });
});
