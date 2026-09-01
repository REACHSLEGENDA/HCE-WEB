import { LISTS, isConfigured, buildAttributes, upsertContact, addToList, removeFromList } from './_brevo.js';

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
    await addToList(email, LISTS.INSCRITOS_NURSING);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Nursing register error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
