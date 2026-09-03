import { getStripe } from './_stripe.js';
import { precioConPromo, habilitaMeses } from './_promos.js';
import { LISTS, isConfigured, upsertContact, addToList } from './_brevo.js';

const USD_RATE = 17.5; // 1 USD = 17.5 MXN (source of truth for nursing checkout)

const LEGAL_TEXT = '*Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.';

// Carrito abandonado: el contacto entra a la lista de recuperación de Brevo.
// La automatización espera una hora y comprueba si sigue en la lista antes de
// enviarle nada, así que basta con sacarlo de ella cuando complete el pago.
async function registrarCarritoAbandonado(email) {
  if (!isConfigured() || !email) return;
  await upsertContact(email);
  await addToList(email, LISTS.CARRITO_NURSING);
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

    const now = new Date();

    const mxnToUnit = (mxn, isBase = false) => {
      // El descuento sale del catálogo compartido, nunca de una lista local.
      const finalMXN = isBase ? precioConPromo(mxn, promoCode, 'nursing', now) : mxn;
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
    const discountedBase = precioConPromo(baseAmount, promoCode, 'nursing', now);
    
    const totalMXN = discountedBase + validExtras.reduce((s, e) => s + PRICES_MXN[e], 0);

    const payData = Buffer.from(JSON.stringify({
      email,
      perfilLabel: activeProfileLabel,
      extrasLabel: validExtras.map((e) => EXTRA_LABELS[e]).join(', ') || 'Ninguno',
      moneda: currency,
      total_mxn: totalMXN,
    })).toString('base64url');

    const { stripe, pasarela } = getStripe(currency);

    const sessionOptions = {
      payment_method_types: ['card'],
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
        curso: 'ECMO Nursing Care Course',
        perfil: activeProfileLabel,
        extras: validExtras.join(', '),
        email,
        promo_applied: promoCode || 'none',
        total_mxn: totalMXN.toString(),
        moneda: currency,
        pasarela,
      },
      payment_intent_data: {
        metadata: {
          curso: 'ECMO Nursing Care Course',
          perfil: activeProfileLabel,
          extras: validExtras.join(', '),
          email,
          promo_applied: promoCode || 'none',
          total_mxn: totalMXN.toString(),
          moneda: currency,
          pasarela,
        }
      }
    };

    const enableInstallments = habilitaMeses(promoCode, 'nursing', now);

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

    // Brevo: registrar carrito abandonado (no bloqueante)
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
