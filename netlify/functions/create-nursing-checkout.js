import Stripe from 'stripe';
import { createHash } from 'crypto';

const USD_RATE = 17.5; // 1 USD = 17.5 MXN (source of truth for nursing checkout)

const MAILCHIMP_TAG = 'CANCELNURSING';

const LEGAL_TEXT = '*Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.';

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
      note: `INTERÉS EN ECMO NURSING (CARRITO ABANDONADO)\nPERFIL: ${perfilLabel}\nEXTRAS: ${extrasLabel || 'Ninguno'}\nTAG: ${MAILCHIMP_TAG}`,
    }),
  });
}

const PRICES_MXN = {
  especialista:  5000,
  enfermero:     5000,
  fisioterapeuta: 5000,
  kinesiologo:   5000,
  terapeuta_respiratorio: 5000,
  otro:          5000,
  ecmo_sim:      3500,
};

const PROFILE_LABELS = {
  especialista: 'Médicos (Especialista/Residente)',
  enfermero:    'Enfermero(a)',
  fisioterapeuta: 'Fisioterapeuta',
  kinesiologo:   'Kinesiólogo',
  terapeuta_respiratorio: 'Terapeuta Respiratorio',
  otro:          'Otro Profesional de la Salud',
};

const EXTRA_LABELS = {
  ecmo_sim:     'Módulo adicional: Simulador ECMO SIM',
};

const ALLOWED_EXTRAS = {
  especialista: ['ecmo_sim'],
  enfermero:    ['ecmo_sim'],
  fisioterapeuta: ['ecmo_sim'],
  kinesiologo:   ['ecmo_sim'],
  terapeuta_respiratorio: ['ecmo_sim'],
  otro:          ['ecmo_sim'],
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { perfil, extras = [], moneda = 'mxn', email = '', promoCode = null, customOtro = null } = JSON.parse(event.body);

    if (!PRICES_MXN[perfil]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Perfil inválido' }) };
    }

    const currency = moneda === 'usd' ? 'usd' : 'mxn';
    const activeProfileLabel = (perfil === 'otro' && customOtro) ? `Otro: ${customOtro}` : PROFILE_LABELS[perfil];

    const mxnToUnit = (mxn, isBase = false) => {
      let finalMXN = mxn;
      if (isBase) {
        if (promoCode === 'HCE10MSI') {
          finalMXN = Math.floor(mxn * 0.9);
        } else if (promoCode === 'HCEGRUPOS' || promoCode === 'HCEGRUPOS15') {
          finalMXN = Math.floor(mxn * 0.85);
        }
      }
      const amount = currency === 'usd' ? finalMXN / USD_RATE : finalMXN;
      return Math.round(amount * 100); // cents
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
            name: `Curso ECMO Nursing Care — ${activeProfileLabel}`,
            description: `Healthcare Training Experience · Curso especializado en cuidados de enfermería ECMO. ${LEGAL_TEXT}`,
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

    // Codificar datos del pago en la URL de éxito
    const baseAmount = PRICES_MXN[perfil];
    let discountedBase = baseAmount;
    if (promoCode === 'HCE10MSI') {
      discountedBase = Math.floor(baseAmount * 0.9);
    } else if (promoCode === 'HCEGRUPOS' || promoCode === 'HCEGRUPOS15') {
      discountedBase = Math.floor(baseAmount * 0.85);
    }
    
    const totalMXN = discountedBase + validExtras.reduce((s, e) => s + PRICES_MXN[e], 0);

    const payData = Buffer.from(JSON.stringify({
      email,
      perfilLabel: activeProfileLabel,
      extrasLabel: validExtras.map((e) => EXTRA_LABELS[e]).join(', ') || 'Ninguno',
      moneda: currency,
      total_mxn: totalMXN,
    })).toString('base64url');

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionOptions = {
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/inscripciones-ecmo-nursing?status=success&d=${payData}`,
      cancel_url:  `${origin}/inscripciones-ecmo-nursing?status=cancel`,
      locale: 'es-419',
      custom_text: {
        submit: {
          message: LEGAL_TEXT
        }
      },
      metadata: {
        perfil,
        extras: validExtras.join(','),
        moneda: currency,
        mailchimp_tag: MAILCHIMP_TAG,
        curso: 'ECMO Nursing Care Course',
      },
    };

    const enableInstallments = promoCode === 'HCE10MSI' || promoCode === 'HCEGRUPOS' || promoCode === 'HCEGRUPOS15';

    if (currency === 'mxn') {
      sessionOptions.payment_method_types = ['card'];
      if (enableInstallments) {
        sessionOptions.payment_method_options = {
          card: {
            installments: {
              enabled: true
            }
          }
        };
      }
    } else {
      sessionOptions.automatic_payment_methods = { enabled: true };
    }

    if (email) sessionOptions.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Mailchimp: registrar carrito abandonado (no bloqueante)
    const extrasLabel = validExtras.map((e) => EXTRA_LABELS[e]).join(', ');
    addMailchimpTag(email, activeProfileLabel, extrasLabel).catch((err) =>
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
