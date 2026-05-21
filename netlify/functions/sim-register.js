import { createHash } from 'crypto';

const MAILCHIMP_TAG = 'ECMOSIM';
const CANCEL_TAG = 'CANCELSIM';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, planId } = JSON.parse(event.body);

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    const PLANS = {
      '4m': 'ECMO Sim — Plan 4 Meses ($250 USD)',
      '12m': 'ECMO Sim — Plan 12 Meses ($700 USD)'
    };

    const planName = PLANS[planId] || planId;

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

    // 1. Quitar tag de abandono y de exito vieja para forzar re-entrada
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

    // 2. Espera de 1.5s
    await new Promise(resolve => setTimeout(resolve, 1500));

    // 3. Agregar tag de exito activa
    await fetch(`${baseUrl}/members/${hash}/tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        tags: [{ name: MAILCHIMP_TAG, status: 'active' }],
      }),
    });

    // 4. Agregar nota de pago completado
    const note = [
      `COMPRA EXITOSA - SIMULADOR ECMO`,
      `PLAN: ${planName}`,
      `STATUS: COMPLETADO`,
      `TAG: ${MAILCHIMP_TAG}`,
    ].join('\n');

    await fetch(`${baseUrl}/members/${hash}/notes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note }),
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Sim Register function error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
