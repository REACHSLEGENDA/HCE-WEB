import Stripe from 'stripe';
import { createHash } from 'crypto';

const USD_RATE = 17; // 1 USD = 17 MXN (server-side source of truth)

const MAILCHIMP_TAG = 'ECMOParis2026';

async function addMailchimpTag(email, perfilLabel, extrasLabel) {
  const API_KEY     = process.env.MAILCHIMP_API_KEY;
  const AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;
  const SERVER      = process.env.MAILCHIMP_SERVER;
  if (!API_KEY || !AUDIENCE_ID || !SERVER || !email) return;

  const auth    = Buffer.from(`anystring:${API_KEY}`).toString('base64');
  const headers = { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' };
  const baseUrl = `https://${SERVER}.api.mailchimp.com/3.0/lists/${AUDIENCE_ID}`;
  const hash    = createHash('md5').update(email.toLowerCase()).digest('hex');

  // Upsert member
  await fetch(`${baseUrl}/members/${hash}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      email_address: email,
      status_if_new: 'subscribed',
    }),
  });

  // Apply tag
  await fetch(`${baseUrl}/members/${hash}/tags`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      tags: [{ name: MAILCHIMP_TAG, status: 'active' }],
    }),
  });

  // Add note with inscription details
  await fetch(`${baseUrl}/members/${hash}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      note: `INSCRIPCIÓN HCE\nPERFIL: ${perfilLabel}\nEXTRAS: ${extrasLabel || 'Ninguno'}\nTAG: ${MAILCHIMP_TAG}`,
    }),
  });
}

const PRICES_MXN = {
  especialista:  39000,
  residente:     37000,
  enfermero:     37000,
  ecmo_sim:       3500,
  ecmo_nursing:   3500,
};

const PROFILE_LABELS = {
  especialista: 'Médicos Especialistas',
  residente:    'Médicos Residentes',
  enfermero:    'Enfermeros y Otros Profesionales',
};

const EXTRA_LABELS = {
  ecmo_sim:     'Módulo adicional: Simulador ECMO SIM',
  ecmo_nursing: 'Módulo adicional: ECMO Nursing Care Course',
};

const ALLOWED_EXTRAS = {
  especialista: ['ecmo_sim'],
  residente:    ['ecmo_sim'],
  enfermero:    ['ecmo_sim', 'ecmo_nursing'],
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { perfil, extras = [], moneda = 'mxn', email = '', promoCode = null } = JSON.parse(event.body);

    if (!PRICES_MXN[perfil]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Perfil inválido' }) };
    }

    const currency = moneda === 'usd' ? 'usd' : 'mxn';

    const mxnToUnit = (mxn, isBase = false) => {
      let finalMXN = mxn;
      if (isBase && promoCode === 'HCE-INERPARIS2026') {
        finalMXN = Math.floor(mxn * 0.7);
      }
      const amount = currency === 'usd' ? finalMXN / USD_RATE : finalMXN;
      return Math.round(amount * 100); // centavos / cents
    };

    // Validate extras server-side
    const validExtras = extras.filter(
      (e) => ALLOWED_EXTRAS[perfil]?.includes(e) && PRICES_MXN[e]
    );

    const lineItems = [
      {
        price_data: {
          currency,
          product_data: {
            name: `Inscripción HCE — ${PROFILE_LABELS[perfil]}`,
            description: 'Healthcare Training Experience · Programa de formación clínica avanzada. *Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.',
          },
          unit_amount: mxnToUnit(PRICES_MXN[perfil], true),
        },
        quantity: 1,
      },
      ...validExtras.map((id) => ({
        price_data: {
          currency,
          product_data: {
            name: EXTRA_LABELS[id],
          },
          unit_amount: mxnToUnit(PRICES_MXN[id]),
        },
        quantity: 1,
      })),
    ];

    const origin =
      event.headers.origin ||
      (event.headers.referer ? event.headers.referer.split('/').slice(0, 3).join('/') : null) ||
      'https://hce-web.netlify.app';

    // Codificar datos del pago en la URL de éxito para no depender de localStorage
    const baseAmount = PRICES_MXN[perfil];
    const discountedBase = promoCode === 'HCE-INERPARIS2026' ? Math.floor(baseAmount * 0.7) : baseAmount;
    const totalMXN = discountedBase + validExtras.reduce((s, e) => s + PRICES_MXN[e], 0);

    const payData = Buffer.from(JSON.stringify({
      email,
      perfilLabel: PROFILE_LABELS[perfil],
      extrasLabel: validExtras.map((e) => EXTRA_LABELS[e]).join(', ') || 'Ninguno',
      moneda: currency,
      total_mxn: totalMXN,
    })).toString('base64url');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionOptions = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/inscripciones-diploma-paris-ecmo?status=success&d=${payData}`,
      cancel_url:  `${origin}/inscripciones-diploma-paris-ecmo?status=cancel`,
      locale: 'es-419',
      custom_text: {
        submit: {
          message: '*Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana. El acceso a las videolecciones será durante la duración completa del curso (4 semanas) y durante un periodo de gracia de 15 dias más.'
        }
      },
      metadata: {
        perfil,
        extras: validExtras.join(','),
        moneda: currency,
        mailchimp_tag: MAILCHIMP_TAG,
      },
    };

    if (email) sessionOptions.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Mailchimp: aplicar tag ECMOParis2026 (no bloquea la respuesta si falla)
    const extrasLabel = validExtras.map((e) => EXTRA_LABELS[e]).join(', ');
    addMailchimpTag(email, PROFILE_LABELS[perfil], extrasLabel).catch((err) =>
      console.error('Mailchimp tag error:', err.message)
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
