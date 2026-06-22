import Stripe from 'stripe';
import { createHash } from 'crypto';

const MAILCHIMP_TAG = 'CANCELSIM';

async function addMailchimpTag(email, planName, priceMXN) {
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

  // Add note
  await fetch(`${baseUrl}/members/${hash}/notes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      note: `INTERÉS EN SIMULADOR (CARRITO ABANDONADO)\nPLAN: ${planName}\nPRECIO ESTIMADO: $${priceMXN} MXN\nTAG: ${MAILCHIMP_TAG}`,
    }),
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { planId, email = '', promoCode = '' } = JSON.parse(event.body);

    const PLANS = {
      '4m': {
        name: 'ECMO Sim — Plan 4 Meses',
        usd: 250,
      },
      '12m': {
        name: 'ECMO Sim — Plan 12 Meses',
        usd: 700,
      }
    };

    const plan = PLANS[planId];
    if (!plan) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Plan inválido' }) };
    }

    // Process promo code EXPSIM26 (-$50 USD)
    let baseUsd = plan.usd;
    let discountApplied = false;
    if (promoCode && promoCode.trim().toUpperCase() === 'EXPSIM26') {
      baseUsd = Math.max(0, baseUsd - 50);
      discountApplied = true;
    }

    // 1. Fetch dynamic exchange rate
    let usdRate = 18.0; // fallback
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      if (rateRes.ok) {
        const rateData = await rateRes.json();
        if (rateData && rateData.rates && rateData.rates.MXN) {
          usdRate = rateData.rates.MXN;
        }
      }
    } catch (e) {
      console.error("Error fetching live exchange rate:", e);
    }

    // 2. Calculate MXN Price (rounded to nearest integer)
    const finalMXN = Math.round(baseUsd * usdRate);
    const amountCents = finalMXN * 100;

    const lineItems = [
      {
        price_data: {
          currency: 'mxn',
          product_data: {
            name: discountApplied ? `${plan.name} (Descuento Aplicado)` : plan.name,
            description: discountApplied 
              ? `Acceso al Simulador Clínico Virtual ECMO Sim. Descuento especial de $50 USD aplicado con código EXPSIM26. Precio final de $${baseUsd} USD convertido al tipo de cambio actual de $${usdRate.toFixed(2)} MXN/USD.`
              : `Acceso al Simulador Clínico Virtual ECMO Sim por el periodo contratado. Conversión de $${plan.usd} USD al tipo de cambio actual de $${usdRate.toFixed(2)} MXN/USD.`,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }
    ];

    const origin =
      event.headers.origin ||
      (event.headers.referer ? event.headers.referer.split('/').slice(0, 3).join('/') : null) ||
      'https://healthcareexp.com';

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sessionOptions = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/simulador-ecmo-sim?status=success&email=${encodeURIComponent(email)}&plan=${planId}`,
      cancel_url:  `${origin}/simulador-ecmo-sim?status=cancel`,
      locale: 'es-419',
      metadata: {
        plan: planId,
        email,
        usd_rate: usdRate.toString(),
        usd_original: plan.usd.toString(),
        usd_final: baseUsd.toString(),
        promo_applied: discountApplied ? 'EXPSIM26' : 'none',
        total_mxn: finalMXN.toString(),
        curso: 'ECMO Simulador Care',
      },
    };

    if (email) sessionOptions.customer_email = email;

    const session = await stripe.checkout.sessions.create(sessionOptions);

    // Register interest in Mailchimp (non-blocking)
    if (email) {
      addMailchimpTag(email, plan.name, finalMXN).catch((err) =>
        console.error('Mailchimp tag error:', err.message)
      );
    }

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
