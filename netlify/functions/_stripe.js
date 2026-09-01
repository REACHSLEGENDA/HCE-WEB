// Selector de pasarela de Stripe para las funciones de Netlify.
//
// La cuenta 1 (STRIPE_SECRET_KEY) cobra en pesos: es la pasarela nacional.
// La cuenta 2 (STRIPE_SECRET_KEY_2) cobra en dólares: ahí caen todos los pagos
// del extranjero. La moneda la elige el alumno en el formulario y viaja en el
// payload como `moneda`.
//
// Si la cuenta 2 no está configurada en Netlify, el cobro NO se cae: se va por
// la cuenta 1 y queda avisado en los logs de la función.

import Stripe from 'stripe';

export const esUSD = (moneda) => String(moneda || '').toLowerCase() === 'usd';

export function getStripe(moneda) {
  const usd = esUSD(moneda);
  const keyUSD = process.env.STRIPE_SECRET_KEY_2;
  const keyMXN = process.env.STRIPE_SECRET_KEY;

  if (usd && !keyUSD) {
    console.warn('STRIPE_SECRET_KEY_2 no está configurada: el cobro en USD se va por la pasarela nacional.');
  }

  const key = usd ? (keyUSD || keyMXN) : keyMXN;
  if (!key) throw new Error('Falta configurar STRIPE_SECRET_KEY en Netlify.');

  return {
    stripe: new Stripe(key),
    // Para la metadata del cobro: distingue en qué cuenta acabó cayendo.
    pasarela: usd && keyUSD ? 'usd' : 'mxn',
  };
}
