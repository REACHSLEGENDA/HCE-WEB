import { createHash } from 'crypto';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const {
    taller, lugar, nombres, apellidos, estado, pais,
    grado, especialidad, institucion, cargo,
    email, telefono, modalidad,
    satisfaccion, utilidad, organizacion,
    valoroso, mejoras, comentarios,
    interesFuturo, preferenciaContacto, areasInteres,
  } = JSON.parse(event.body);

  const API_KEY     = process.env.MAILCHIMP_API_KEY;
  const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
  const SERVER      = process.env.MAILCHIMP_SERVER;
  const auth        = Buffer.from(`anystring:${API_KEY}`).toString('base64');
  const headers     = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
  const baseUrl     = `https://${SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}`;

  // Tags
  const tags = [
    'Retroalimentacion Taller',
    interesFuturo === 'si' ? 'Interesado Programas' : null,
    preferenciaContacto ? `Contacto: ${preferenciaContacto}` : null,
  ].filter(Boolean);

  // Note con todo el feedback
  const note = [
    `📋 TALLER: ${taller}`,
    `📍 LUGAR: ${lugar}`,
    `🌎 ESTADO/PAÍS: ${estado}, ${pais}`,
    `💼 CARGO: ${cargo}`,
    `🎓 MODALIDAD: ${modalidad}`,
    ``,
    `⭐ SATISFACCIÓN: ${satisfaccion}`,
    `💡 UTILIDAD: ${utilidad}`,
    `📦 ORGANIZACIÓN: ${organizacion}`,
    ``,
    `✅ LO MÁS VALIOSO: ${valoroso}`,
    `🔧 MEJORAS: ${mejoras}`,
    comentarios ? `💬 COMENTARIOS: ${comentarios}` : null,
    ``,
    `📚 ÁREAS DE INTERÉS: ${Array.isArray(areasInteres) ? areasInteres.join(', ') : ''}`,
  ].filter((l) => l !== null).join('\n');

  // Payload usando solo los merge fields que existen en Mailchimp
  const payload = {
    email_address: email,
    status: 'subscribed',
    merge_fields: {
      FNAME:   nombres,
      LNAME:   apellidos,
      PHONE:   telefono,
      MMERGE5: grado,
      MMERGE6: especialidad,
      MMERGE7: institucion,
    },
    tags,
  };

  // 1. Crear o actualizar contacto
  const hash = createHash('md5').update(email.toLowerCase()).digest('hex');

  let response = await fetch(`${baseUrl}/members`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json();
    if (data.title === 'Member Exists') {
      // Actualizar contacto existente
      response = await fetch(`${baseUrl}/members/${hash}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ merge_fields: payload.merge_fields, tags }),
      });
      if (!response.ok) {
        const err = await response.json();
        console.error('PATCH error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.detail }) };
      }
    } else {
      console.error('POST error:', data);
      return { statusCode: 500, body: JSON.stringify({ error: data.detail }) };
    }
  }

  // 2. Agregar nota con el feedback completo
  await fetch(`${baseUrl}/members/${hash}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ note }),
  });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
