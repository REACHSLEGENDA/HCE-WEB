import { getStripe } from './_stripe.js';
import { precioConPromo, habilitaMeses, promoAutomatica } from './_promos.js';
import { LISTS, isConfigured, upsertContact, addToList } from './_brevo.js';

const USD_RATE = 17.5; // Debe coincidir con USD_RATE de la página de inscripción: es lo que ve el alumno.

const LEGAL_TEXT = '*Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.';

// Carrito abandonado: el contacto entra a la lista de recuperación de Brevo.
// La automatización espera una hora y comprueba si sigue en la lista antes de
// enviarle nada, así que basta con sacarlo de ella cuando complete el pago.
async function registrarCarritoAbandonado(email) {
  if (!isConfigured() || !email) return;
  await upsertContact(email);
  await addToList(email, LISTS.CARRITO_PARIS);
}

// El 26 de agosto de 2026 la pagina paso a $10,000 parejo para los tres
// perfiles, pero este archivo se quedo en 19,500 / 18,500: la pantalla decia
// diez mil y Stripe cobraba diecinueve mil quinientos. Este es el precio que
// se cobra; la pagina solo lo muestra.
const PRICES_MXN = {
  especialista:  10000,
  residente:     10000,
  enfermero:     10000,
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

    const mxnToUnit = (mxn, isBase = false) => {
      // El descuento sale del catálogo compartido, nunca de una lista local.
      const finalMXN = isBase ? precioConPromo(mxn, promoCode, 'step1', now) : mxn;
      // En USD se cobra el dólar entero hacia arriba, igual que lo redondea la página.
      const amount = currency === 'usd' ? Math.ceil(finalMXN / USD_RATE) : finalMXN;
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
            name: `Step 1 Teórico — ${PROFILE_LABELS[perfil]}`,
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
    const discountedBase = precioConPromo(baseAmount, promoCode, 'step1', now);
    
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
        // Para que en el panel se distinga una venta con promo directa de una
        // a precio regular, aunque el alumno no haya escrito codigo.
        promo: promoCode || promoAutomatica('step1', now)?.etiqueta || 'none',
        curso: 'Paris International Diploma in ECMO',
      },
    };

    const enableInstallments = habilitaMeses(promoCode, 'step1', now);

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
