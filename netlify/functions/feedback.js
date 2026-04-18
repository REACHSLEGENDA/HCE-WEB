import { createHash } from 'crypto';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const {
      taller, lugar, nombres, apellidos, estado, pais,
      grado, especialidad, institucion, cargo,
      email, telefono, modalidad,
      satisfaccion, utilidad, organizacion,
      valoroso, mejoras, comentarios,
      interesFuturo, preferenciaContacto, areasInteres,
    } = body;

    const API_KEY     = process.env.MAILCHIMP_API_KEY;
    const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
    const SERVER      = process.env.MAILCHIMP_SERVER;

    // Verificar que las variables de entorno existen
    if (!API_KEY || !AUDIENCE_ID || !SERVER) {
      console.error('ENV VARS MISSING:', { API_KEY: !!API_KEY, AUDIENCE_ID: !!AUDIENCE_ID, SERVER: !!SERVER });
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing environment variables' }) };
    }

    const auth    = Buffer.from(`anystring:${API_KEY}`).toString('base64');
    const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
    const baseUrl = `https://${SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}`;
    const hash    = createHash('md5').update(email.toLowerCase()).digest('hex');

    const tags = [
      'Retroalimentacion Taller',
      interesFuturo === 'si' ? 'Interesado Programas' : null,
      preferenciaContacto ? `Contacto: ${preferenciaContacto}` : null,
    ].filter(Boolean);

    const note = [
      `TALLER: ${taller}`,
      `LUGAR: ${lugar}`,
      `ESTADO/PAÍS: ${estado}, ${pais}`,
      `CARGO: ${cargo}`,
      `MODALIDAD: ${modalidad}`,
      `SATISFACCIÓN: ${satisfaccion}`,
      `UTILIDAD: ${utilidad}`,
      `ORGANIZACIÓN: ${organizacion}`,
      `LO MÁS VALIOSO: ${valoroso}`,
      `MEJORAS: ${mejoras}`,
      comentarios ? `COMENTARIOS: ${comentarios}` : null,
      `ÁREAS: ${Array.isArray(areasInteres) ? areasInteres.join(', ') : ''}`,
    ].filter(Boolean).join('\n');

    const memberPayload = {
      email_address: email,
      status: 'subscribed',
      merge_fields: {
        FNAME:   nombres   || '',
        LNAME:   apellidos || '',
        PHONE:   telefono  || '',
        MMERGE5: grado     || '',
        MMERGE6: especialidad || '',
        MMERGE7: institucion  || '',
      },
      tags,
    };

    console.log('Sending to Mailchimp:', JSON.stringify({ email, SERVER, AUDIENCE_ID: AUDIENCE_ID.slice(0,4) + '***' }));

    // Intentar crear contacto
    let res = await fetch(`${baseUrl}/members`, {
      method: 'POST',
      headers,
      body: JSON.stringify(memberPayload),
    });

    let resData = await res.json();
    console.log('Mailchimp POST status:', res.status, JSON.stringify(resData).slice(0, 200));

    if (!res.ok) {
      if (resData.title === 'Member Exists') {
        // Actualizar contacto existente
        const patchRes = await fetch(`${baseUrl}/members/${hash}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ merge_fields: memberPayload.merge_fields }),
        });
        const patchData = await patchRes.json();
        console.log('Mailchimp PATCH status:', patchRes.status, JSON.stringify(patchData).slice(0, 200));
        if (!patchRes.ok) {
          return { statusCode: 500, body: JSON.stringify({ error: patchData.detail || 'PATCH failed' }) };
        }
      } else {
        return { statusCode: 500, body: JSON.stringify({ error: resData.detail || resData.title || 'POST failed' }) };
      }
    }

    // Agregar tags por separado (más confiable)
    await fetch(`${baseUrl}/members/${hash}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tags: tags.map((name) => ({ name, status: 'active' })) }),
    });

    // Agregar nota con el feedback
    const noteRes = await fetch(`${baseUrl}/members/${hash}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note }),
    });
    console.log('Note status:', noteRes.status);

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Function crash:', err.message, err.stack);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
