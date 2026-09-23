// Webhook de Stripe para los cursos del portal.
//
// Es la red de seguridad del cobro: si el alumno paga y cierra la pestaña
// antes de volver al portal, la confirmación al regresar nunca ocurre. Stripe,
// en cambio, avisa aquí siempre. Con cualquiera de los dos caminos basta.
//
// Hay dos cuentas de Stripe (pesos y dólares) y cada una firma sus avisos con
// su propio secreto, así que se prueba la firma contra los dos.
//
// Solo actúa sobre cobros de cursos del portal; cualquier otro evento o cobro
// (París, Nursing, simulador) se responde con 200 y se ignora.

import Stripe from 'stripe';
import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { inscribirDesdeSesion, TIPO_COBRO } from './_inscripciones.js';

const SECRETOS = [
  process.env.STRIPE_WEBHOOK_SECRET,
  process.env.STRIPE_WEBHOOK_SECRET_2,
].filter(Boolean);

function verificarEvento(cuerpoCrudo, firma) {
  // La verificación no usa la llave secreta, pero la librería pide una para
  // instanciarse.
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_verificacion');

  for (const secreto of SECRETOS) {
    try {
      return stripe.webhooks.constructEvent(cuerpoCrudo, firma, secreto);
    } catch {
      // Firma de la otra cuenta: se prueba el siguiente secreto.
    }
  }
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (SECRETOS.length === 0) {
    console.error('Webhook de Stripe sin STRIPE_WEBHOOK_SECRET configurado.');
    return { statusCode: 500, body: 'Webhook no configurado' };
  }

  // La firma se calcula sobre los bytes exactos que mandó Stripe: cualquier
  // re-serialización del JSON la invalida.
  const cuerpoCrudo = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : event.body || '';

  const firma = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const evento = verificarEvento(cuerpoCrudo, firma);

  if (!evento) {
    return { statusCode: 400, body: 'Firma inválida' };
  }

  const esPagoDeCurso =
    (evento.type === 'checkout.session.completed' ||
      evento.type === 'checkout.session.async_payment_succeeded') &&
    evento.data?.object?.metadata?.tipo === TIPO_COBRO;

  if (!esPagoDeCurso) {
    return { statusCode: 200, body: 'Ignorado' };
  }

  if (!supabaseListo()) {
    // 500 hace que Stripe reintente más tarde en lugar de perder el aviso.
    return { statusCode: 500, body: 'Supabase no configurado' };
  }

  try {
    const inscrito = await inscribirDesdeSesion(admin(), evento.data.object);
    return { statusCode: 200, body: inscrito ? 'Inscrito' : 'Sin pago confirmado' };
  } catch (err) {
    console.error('Stripe webhook error:', err.message);
    return { statusCode: 500, body: 'Error al inscribir' };
  }
};
