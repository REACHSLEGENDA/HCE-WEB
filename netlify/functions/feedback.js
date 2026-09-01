import { isConfigured, buildAttributes, upsertContact } from './_brevo.js';

// Retroalimentación de talleres. En Mailchimp esta función además aplicaba las
// etiquetas "Retroalimentacion Taller" / "Interesado Programas" y guardaba las
// respuestas como nota; ninguna de las dos tenía automatización asociada.
// El detalle del feedback sigue llegando por Formspree desde el propio formulario,
// así que aquí solo enriquecemos la ficha del contacto en Brevo.
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
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing environment variables' }) };
    }

    await upsertContact(email, buildAttributes(payload));

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Feedback function error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
