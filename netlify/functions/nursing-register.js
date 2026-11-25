import { LISTS, isConfigured, buildAttributes, upsertContact, addToList, removeFromList } from './_brevo.js';
import { estadoPago } from './_pagos.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    const { email } = payload;

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    if (!isConfigured()) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    // Los atributos van primero: la automatización de bienvenida los usa al
    // renderizar el correo, así que deben existir antes de entrar a la lista.
    await upsertContact(email, buildAttributes(payload));
    await removeFromList(email, LISTS.CARRITO_NURSING);

    // Pago en OXXO o SPEI todavía sin acreditar: los datos quedan guardados y la
    // bienvenida sale cuando llegue el dinero (cobros-seguimiento lo agrega a la
    // lista al mandar el recibo). Se comprueba en Stripe, no en lo que diga la página.
    const pago = payload.sid ? await estadoPago(payload.sid).catch(() => null) : null;
    if (pago?.pendiente && pago.programa === 'nursing') {
      return { statusCode: 200, body: JSON.stringify({ ok: true, pendiente: true }) };
    }

    await addToList(email, LISTS.INSCRITOS_NURSING);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Nursing register error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
