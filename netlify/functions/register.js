import { createHash } from 'crypto';

const MAILCHIMP_TAG = 'ECMOParis2026';
const CANCEL_TAG = 'CANCELPARIS';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const {
      nombres, apellidos, email, telefono,
      pais, estado, grado, especialidad, institucion, cargo,
      perfil, extras, moneda, total_mxn,
    } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    const API_KEY     = process.env.MAILCHIMP_API_KEY;
    const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    const SERVER      = process.env.MAILCHIMP_SERVER;

    if (!API_KEY || !AUDIENCE_ID || !SERVER) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    const auth    = Buffer.from(`anystring:${API_KEY}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
    const baseUrl = `https://${SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}`;
    const hash    = createHash('md5').update(email.toLowerCase()).digest('hex');

    // Upsert contacto con todos los merge fields
    const upsertRes = await fetch(`${baseUrl}/members/${hash}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        email_address: email,
        status_if_new: 'subscribed',   // dispara flujo de bienvenida en Mailchimp
        merge_fields: {
          FNAME:   nombres      || '',
          LNAME:   apellidos    || '',
          PHONE:   telefono     || '',
          MMERGE5: grado        || '',  // Profesión
          MMERGE6: especialidad || '',
          MMERGE7: institucion  || '',
        },
      }),
    });

    const upsertData = await upsertRes.json();
    console.log('Mailchimp upsert:', upsertRes.status, upsertData.id || upsertData.detail);

    // Forzar re-entrada del tag para disparar Customer Journeys
    // Paso 1: Quitar tag de abandono (inactivo) y refrescar tag de éxito
    await fetch(`${baseUrl}/members/${hash}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tags: [
          { name: CANCEL_TAG, status: 'inactive' },
          { name: MAILCHIMP_TAG, status: 'inactive' }
        ],
      }),
    });

    // Paso 2: Pequeña espera para que Mailchimp procese el cambio
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Paso 3: Volver a poner el tag (activo)
    await fetch(`${baseUrl}/members/${hash}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tags: [{ name: MAILCHIMP_TAG, status: 'active' }],
      }),
    });

    // Nota con el detalle completo de la inscripción
    const note = [
      `INSCRIPCIÓN HCE 2026`,
      `PERFIL: ${perfil}`,
      `EXTRAS: ${extras || 'Ninguno'}`,
      `MONEDA: ${(moneda || 'mxn').toUpperCase()}`,
      `TOTAL: $${total_mxn} MXN`,
      `PAÍS: ${pais}, ${estado}`,
      `CARGO: ${cargo}`,
      `TAG: ${MAILCHIMP_TAG}`,
    ].join('\n');

    await fetch(`${baseUrl}/members/${hash}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note }),
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Register function error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
