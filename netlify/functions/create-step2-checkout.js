import { getStripe } from './_stripe.js';
import { respuestaCierreParis } from './_cierres.js';

/* ---------------------------------------------------------------------------
 * Cobro de Step 2 (práctico) para inscripciones por enlace privado.
 *
 * No es una página pública: el enlace se manda a mano a quien va a entrar al
 * Step 2, así que esta función es deliberadamente más corta que la de Step 1.
 *
 * Diferencias con create-step1-checkout.js, todas a propósito:
 *
 *  - Precio fijo. No pasa por el catálogo de promociones: los descuentos
 *    automáticos están atados al programa 'step1' y aplicarlos aquí cobraría
 *    de menos sin que nadie lo pidiera.
 *  - Sin carrito abandonado. Quien recibe este enlace ya habló con HCE;
 *    meterlo a la lista de recuperación le mandaría un correo de "dejaste algo
 *    pendiente" que no viene al caso.
 *  - Sin meses sin intereses, que hoy solo habilitan códigos que ya no existen.
 *
 * Al pagar regresa a la misma página con status=success, que es donde vive su
 * formulario de registro.
 * ------------------------------------------------------------------------ */

const USD_RATE = 17.5; // Debe coincidir con USD_RATE de la página: es lo que ve el alumno.

const LEGAL_TEXT = '*Al contratar nuestros programas, es necesario firmar el acuerdo de términos de servicio y confidencialidad. El acceso a nuestros programas es individual y cualquier infracción a los términos de derechos de autor resultará en la expulsión irrevocable del alumno del nuestros programas sin posibilidad a reembolso de la matrícula, así como del proceso legal por infringir las normas de derechos de autor según la Ley Mexicana.';

// Este es el precio que se COBRA. La página solo lo muestra: si los dos no
// coinciden, la pantalla promete una cosa y Stripe cobra otra.
const PRICES_MXN = {
  especialista: 39000,
};

const PROFILE_LABELS = {
  especialista: 'Médicos Especialistas',
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  // Inscripciones de París cerradas (ver _cierres.js).
  const cierre = respuestaCierreParis();
  if (cierre) return cierre;

  try {
    const { perfil, moneda = 'mxn', email = '' } = JSON.parse(event.body);

    if (!PRICES_MXN[perfil]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Perfil inválido' }) };
    }

    const currency = moneda === 'usd' ? 'usd' : 'mxn';
    const baseMXN = PRICES_MXN[perfil];

    // En USD se cobra el dólar entero hacia arriba, igual que lo redondea la página.
    const importe = currency === 'usd' ? Math.ceil(baseMXN / USD_RATE) : baseMXN;

    const origin =
      event.headers.origin ||
      (event.headers.referer ? event.headers.referer.split('/').slice(0, 3).join('/') : null) ||
      'https://hce-web.netlify.app';

    // Los datos del pago viajan en la URL de éxito para no depender de
    // localStorage; el formulario los decodifica igual que en Step 1.
    const payData = Buffer.from(JSON.stringify({
      email,
      perfilLabel: PROFILE_LABELS[perfil],
      extrasLabel: 'Ninguno',
      moneda: currency,
      total_mxn: baseMXN,
    })).toString('base64url');

    const { stripe, pasarela } = getStripe(currency);

    const sessionOptions = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: `Step 2 Práctico — ${PROFILE_LABELS[perfil]}`,
              description: `Healthcare Training Experience · Programa de formación clínica avanzada. ${LEGAL_TEXT}`,
            },
            unit_amount: Math.round(importe * 100), // centavos / cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/inscripcion-step2-privada-2026?status=success&d=${payData}`,
      cancel_url:  `${origin}/inscripcion-step2-privada-2026?status=cancel`,
      locale: 'es-419',
      custom_text: {
        submit: { message: LEGAL_TEXT },
      },
      metadata: {
        programa: 'step2', // lo usa cobros-seguimiento (recibo y carrito abandonado)
        perfil,
        extras: '',
        moneda: currency,
        pasarela,
        promo: 'none',
        // El panel agrupa por este campo; el sufijo distingue el práctico.
        curso: 'Paris International Diploma in ECMO — Step 2',
      },
    };

    if (email) sessionOptions.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionOptions);

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error('Stripe checkout error (step 2):', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
