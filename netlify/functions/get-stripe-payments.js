import Stripe from 'stripe';

export const handler = async (event) => {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  
  if (!stripeSecret) {
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Stripe API key is not configured in Netlify.' })
    };
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const mayFirst2026 = Math.floor(new Date('2026-05-01T00:00:00Z').getTime() / 1000);
    
    // Fetch payment intents with charges expanded so we get billing details (name, email)
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: mayFirst2026 },
      expand: ['data.latest_charge'],
    });

    const payments = paymentIntents.data
      .filter(pi => pi.status === 'succeeded')
      .map(pi => {
        const charge = pi.latest_charge; // expanded object

        // ── Email: try multiple sources in priority order ──────────────────
        const email =
          pi.receipt_email ||
          charge?.billing_details?.email ||
          charge?.receipt_email ||
          pi.metadata?.email ||
          '';

        // ── Name: try billing details first, then metadata ─────────────────
        const name =
          charge?.billing_details?.name ||
          pi.metadata?.customer_name ||
          '';

        const country = charge?.billing_details?.address?.country || '';

        // ── Payment method display ─────────────────────────────────────────
        const cardBrand = charge?.payment_method_details?.card?.brand || 'card';
        const last4     = charge?.payment_method_details?.card?.last4 || '';
        const method    = last4
          ? `${cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)} **** ${last4}`
          : cardBrand;

        // ── Course name — use explicit metadata first ──────────────────────
        let courseName = pi.metadata?.curso || '';

        if (!courseName) {
          // Fallback by mailchimp_tag
          const tag = pi.metadata?.mailchimp_tag;
          if (tag === 'CANCELPARIS') {
            courseName = 'Diploma Internacional París en ECMO';
          } else if (tag === 'CANCELNURSING') {
            courseName = 'ECMO Nursing Care Course';
          } else if (tag === 'CANCELSIM' || pi.metadata?.plan) {
            // ECMO SIM specifically has a `plan` metadata field
            const planId = pi.metadata?.plan;
            courseName = planId === '12m'
              ? 'ECMO SIM — Plan 12 Meses'
              : planId === '4m'
              ? 'ECMO SIM — Plan 4 Meses'
              : 'ECMO SIM: Realidad Clínica';
          } else {
            // Last resort: parse from charge description or use generic
            courseName = charge?.description || pi.description || 'Inscripción HCE';
          }
        }

        const courseId   = pi.metadata?.course_id || 'general';
        const promoCode  = pi.metadata?.promo_code || pi.metadata?.promo_applied || pi.metadata?.coupon || pi.metadata?.code || '';
        const extras     = pi.metadata?.extras || '';
        const amount     = pi.amount / 100;

        return {
          id: pi.id,
          studentName:    name  || 'Invitado HCE',
          studentEmail:   email || 'sin-email@stripe.com',
          studentCountry: country || 'MX',
          courseName,
          courseId,
          extras,
          amount,
          currency: pi.currency.toUpperCase(),
          status: pi.status,
          date: new Date(pi.created * 1000).toISOString(),
          method,
          promoCode,
        };
      });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ payments })
    };

  } catch (err) {
    console.error('Error fetching Stripe payments from API:', err.message);
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
