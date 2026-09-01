import Stripe from 'stripe';
import { LISTS, isConfigured, upsertContact, addToList } from './_brevo.js';

// Carrito abandonado: el contacto entra a la lista de recuperación de Brevo.
// La automatización espera una hora y comprueba si sigue en la lista antes de
// enviarle nada, así que basta con sacarlo de ella cuando complete el pago.
async function registrarCarritoAbandonado(email) {
  if (!isConfigured() || !email) return;
  await upsertContact(email);
  await addToList(email, LISTS.CARRITO_SIM);
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
        curso: 'ECMO SIM: Realidad Clínica',
      },
    };

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
