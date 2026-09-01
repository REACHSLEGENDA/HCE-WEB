import { LISTS, isConfigured, buildAttributes, upsertContact, addToList } from './_brevo.js';

// Alta en el Portal Académico. Se llama desde AuthContext.signUp, justo después
// de que Supabase crea la cuenta. Entrar a la lista dispara en Brevo el correo
// de bienvenida con la ficha de perfil del alumno.
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

    await upsertContact(email, buildAttributes(payload));
    await addToList(email, LISTS.PORTAL);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Portal register error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
