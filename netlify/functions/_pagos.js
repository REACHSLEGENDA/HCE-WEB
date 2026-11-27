// Pagos que se acreditan después: OXXO (ficha en efectivo) y SPEI
// (transferencia, en Stripe "customer_balance" con mx_bank_transfer).
//
// En esos casos Stripe da la sesión por terminada (status 'complete') pero con
// payment_status 'unpaid' hasta que llega el dinero: la ficha de OXXO vence en
// 3 días y la transferencia se acredita cuando el banco la manda. Mientras
// tanto, el alumno no está pagado: no recibe la bienvenida ni el recibo, y
// tampoco el correo de carrito abandonado (ya hizo su parte).

import { getStripe } from './_stripe.js';

// Solo existen en pesos (cuenta nacional).
export const DIAS_FICHA_OXXO = 3;

/** Opciones de Stripe Checkout para ofrecer OXXO y/o SPEI además de tarjeta. */
export function conPagosDiferidos(opciones, metodos = ['oxxo', 'customer_balance']) {
  const extra = {};
  if (metodos.includes('oxxo')) extra.oxxo = { expires_after_days: DIAS_FICHA_OXXO };
  if (metodos.includes('customer_balance')) {
    extra.customer_balance = { funding_type: 'bank_transfer', bank_transfer: { type: 'mx_bank_transfer' } };
  }
  return {
    ...opciones,
    payment_method_types: ['card', ...metodos],
    payment_method_options: { ...(opciones.payment_method_options || {}), ...extra },
    // SPEI necesita un cliente en Stripe para asignarle su CLABE.
    ...(metodos.includes('customer_balance') ? { customer_creation: 'always' } : {}),
  };
}

/**
 * Crea la sesión con OXXO y SPEI. Si la cuenta de Stripe no tiene activado
 * alguno, prueba con el otro solo y al final solo con tarjeta: el cobro nunca
 * se cae. El aviso en los registros dice cuál rechazó Stripe.
 */
export async function crearSesionConPagosDiferidos(stripe, opciones) {
  for (const metodos of [['oxxo', 'customer_balance'], ['oxxo'], ['customer_balance']]) {
    try {
      return await stripe.checkout.sessions.create(conPagosDiferidos(opciones, metodos));
    } catch (err) {
      console.warn(`Stripe no aceptó ${metodos.join(' + ')}:`, err.message);
    }
  }
  return stripe.checkout.sessions.create(opciones);
}

export const sesionPendiente = (s) => s?.status === 'complete' && s?.payment_status === 'unpaid';
export const sesionPagada = (s) => s?.status === 'complete' && s?.payment_status !== 'unpaid';

/** 'oxxo' | 'spei' | 'tarjeta' según cómo pagó (o va a pagar) la sesión. */
export function metodoDeSesion(s) {
  const pi = typeof s?.payment_intent === 'object' ? s.payment_intent : null;
  const tipo = (typeof pi?.payment_method === 'object' && pi.payment_method?.type)
    || (pi?.next_action?.oxxo_display_details ? 'oxxo' : null)
    || (pi?.next_action?.display_bank_transfer_instructions ? 'customer_balance' : null);
  if (tipo === 'oxxo') return 'oxxo';
  if (tipo === 'customer_balance') return 'spei';
  return 'tarjeta';
}

export const NOMBRE_METODO = { oxxo: 'Efectivo en OXXO (Stripe)', spei: 'Transferencia SPEI (Stripe)', tarjeta: 'Tarjeta (Stripe)' };

const ID_SESION = /^cs_(live|test)_[A-Za-z0-9]+$/;

/**
 * Estado del pago de una sesión de Checkout, buscándola en las dos cuentas.
 * Devuelve null si el id no es válido o no existe.
 */
export async function estadoPago(sid) {
  if (!ID_SESION.test(String(sid || ''))) return null;
  const cuentas = [];
  if (process.env.STRIPE_SECRET_KEY) cuentas.push('mxn');
  if (process.env.STRIPE_SECRET_KEY_2) cuentas.push('usd');
  for (const moneda of cuentas) {
    try {
      const { stripe } = getStripe(moneda);
      const s = await stripe.checkout.sessions.retrieve(sid, { expand: ['payment_intent.payment_method'] });
      const pi = typeof s.payment_intent === 'object' ? s.payment_intent : null;
      return {
        programa: s.metadata?.programa || null,
        email: String(s.customer_details?.email || s.customer_email || '').trim().toLowerCase(),
        pagado: sesionPagada(s),
        pendiente: sesionPendiente(s),
        metodo: metodoDeSesion(s),
        // Para volver a ver la ficha de OXXO o los datos de la transferencia.
        instrucciones: pi?.next_action?.oxxo_display_details?.hosted_voucher_url
          || pi?.next_action?.display_bank_transfer_instructions?.hosted_instructions_url
          || null,
      };
    } catch (err) {
      if (err?.code !== 'resource_missing' && err?.statusCode !== 404) throw err;
    }
  }
  return null;
}
