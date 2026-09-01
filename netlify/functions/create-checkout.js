import { getStripe } from './_stripe.js';
import { LISTS, isConfigured, upsertContact, addToList } from './_brevo.js';

const USD_RATE = 17; // 1 USD = 17 MXN (server-side source of truth)

const LEGAL_TEXT = '*Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.';

// Carrito abandonado: el contacto entra a la lista de recuperación de Brevo.
// La automatización espera una hora y comprueba si sigue en la lista antes de
// enviarle nada, así que basta con sacarlo de ella cuando complete el pago.
async function registrarCarritoAbandonado(email) {
  if (!isConfigured() || !email) return;
  await upsertContact(email);
  await addToList(email, LISTS.CARRITO_PARIS);
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

    const now = new Date();
    const isPerfuweekValid = now >= new Date('2026-05-06T00:00:00-06:00') && now <= new Date('2026-05-10T23:59:59-06:00');

    const mxnToUnit = (mxn, isBase = false) => {
      let finalMXN = mxn;
      if (isBase) {
        if (promoCode === 'HCEPRACTICA26') {
          finalMXN = 18500;
        } else if (promoCode === 'HCE-INERPARIS2026') {
          finalMXN = Math.floor(mxn * 0.7);
        } else if (promoCode === 'HCE10MSI') {
          finalMXN = Math.floor(mxn * 0.9);
        } else if (promoCode === 'HCEGRUPOS' || promoCode === 'HCEGRUPOS15') {
          finalMXN = Math.floor(mxn * 0.85);
        } else if (promoCode === 'PERFUWEEK' && isPerfuweekValid) {
          finalMXN = Math.floor(mxn * 0.85);
        }
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
            description: `Healthcare Training Experience · Programa de formación clínica avanzada. ${LEGAL_TEXT}`,
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
    let discountedBase = baseAmount;
    if (promoCode === 'HCEPRACTICA26') {
      discountedBase = 18500;
    } else if (promoCode === 'HCE-INERPARIS2026') {
      discountedBase = Math.floor(baseAmount * 0.7);
    } else if (promoCode === 'HCE10MSI') {
      discountedBase = Math.floor(baseAmount * 0.9);
    } else if (promoCode === 'HCEGRUPOS' || promoCode === 'HCEGRUPOS15') {
      discountedBase = Math.floor(baseAmount * 0.85);
    } else if (promoCode === 'PERFUWEEK' && isPerfuweekValid) {
      discountedBase = Math.floor(baseAmount * 0.85);
    }
    
    const totalMXN = discountedBase + validExtras.reduce((s, e) => s + PRICES_MXN[e], 0);

    const payData = Buffer.from(JSON.stringify({
      email,
      perfilLabel: PROFILE_LABELS[perfil],
      extrasLabel: validExtras.map((e) => EXTRA_LABELS[e]).join(', ') || 'Ninguno',
      moneda: currency,
      total_mxn: totalMXN,
    })).toString('base64url');

    const { stripe, pasarela } = getStripe(currency);

    const sessionOptions = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/inscripciones-diploma-paris-ecmo?status=success&d=${payData}`,
      cancel_url:  `${origin}/inscripciones-diploma-paris-ecmo?status=cancel`,
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
        pasarela,
        curso: 'Paris International Diploma in ECMO',
      },
    };

    const enableInstallments = promoCode === 'HCEMS' || promoCode === 'HCEMESES' || promoCode === 'HCE10MSI' || promoCode === 'HCEGRUPOS' || promoCode === 'HCEGRUPOS15';

    if (currency === 'mxn' && enableInstallments) {
      sessionOptions.payment_method_options = {
        card: {
          installments: {
            enabled: true
          }
        }
      };
    }

    if (email) sessionOptions.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Brevo: registrar carrito abandonado (no bloquea la respuesta si falla)
    registrarCarritoAbandonado(email).catch((err) =>
      console.error('Brevo carrito abandonado error:', err.message)
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
