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
  const url         = `https://${SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}/members`;

  const payload = {
    email_address: email,
    status: 'subscribed',
    merge_fields: {
      FNAME: nombres,    LNAME: apellidos,
      TALLER: taller,    LUGAR: lugar,
      ESTADO: estado,    PAIS: pais,
      GRADO: grado,      ESPEC: especialidad,
      INST: institucion, CARGO: cargo,
      TELEFONO: telefono, MODALIDAD: modalidad,
      SATISFAC: satisfaccion, UTILIDAD: utilidad,
      ORGANIZ: organizacion,  VALOROSO: valoroso,
      MEJORAS: mejoras,  COMMENTS: comentarios || '',
      CONTACTO: preferenciaContacto,
      AREAS: Array.isArray(areasInteres) ? areasInteres.join(', ') : '',
    },
    tags: ['Retroalimentacion Taller', interesFuturo === 'si' ? 'Interesado Programas' : ''].filter(Boolean),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  const data = await response.json();

  if (data.title === 'Member Exists') {
    const hash = createHash('md5').update(email.toLowerCase()).digest('hex');
    await fetch(`${url}/${hash}`, {
      method: 'PATCH',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ merge_fields: payload.merge_fields }),
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  console.error('Mailchimp error:', data);
  return { statusCode: 500, body: JSON.stringify({ error: data.detail }) };
};
