import { LISTS, isConfigured, buildAttributes, upsertContact, addToList, removeFromList } from './_brevo.js';

// Esta función atiende dos páginas distintas: la inscripción completa al Paris
// Diploma y la de "Sólo Step 1". Cada una manda su propio `tag` en el payload,
// que es lo que decide a qué lista —y por tanto a qué correo— va el inscrito.
// Ambas comparten el carrito abandonado de Paris (#9).
const LISTA_POR_TAG = {
  ECMOParis2026:      LISTS.INSCRITOS_PARIS,
  ECMOParisStep12026: LISTS.STEP1_PARIS,
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    const { email, tag } = payload;

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    if (!isConfigured()) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    // 1. Atributos primero: la automatización de bienvenida los usa al renderizar
    //    el correo, así que deben existir antes de que el contacto entre a la lista.
    await upsertContact(email, buildAttributes(payload));

    // 2. Sale del carrito abandonado para que su automatización de recuperación,
    //    que a la hora comprueba si sigue en la lista, ya no le envíe nada.
    await removeFromList(email, LISTS.CARRITO_PARIS);

    // 3. Entrar a la lista de inscritos dispara el correo de confirmación.
    //    Si llegara un tag desconocido, cae en la inscripción completa.
    await addToList(email, LISTA_POR_TAG[tag] || LISTS.INSCRITOS_PARIS);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Register function error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
