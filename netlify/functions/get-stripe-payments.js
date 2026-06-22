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
    
    // Fetch payment intents representing transactions from May 2026 onwards
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
      created: { gte: mayFirst2026 }
    });

    const payments = paymentIntents.data
      .filter(pi => pi.status === 'succeeded')
      .map(pi => {
        const amount = pi.amount / 100;
        const email = pi.receipt_email || pi.charges?.data?.[0]?.billing_details?.email || '';
        const name = pi.charges?.data?.[0]?.billing_details?.name || '';
        const country = pi.charges?.data?.[0]?.billing_details?.address?.country || '';
        
        const brand = pi.charges?.data?.[0]?.payment_method_details?.card?.brand || 'card';
        const last4 = pi.charges?.data?.[0]?.payment_method_details?.card?.last4 || '';
        const method = last4 ? `${brand.charAt(0).toUpperCase() + brand.slice(1)} **** ${last4}` : brand;
        
        let courseName = pi.metadata?.curso || pi.description || 'Inscripción HCE';
        
        // Fallback for older transactions using mailchimp_tag or plan metadata
        if (courseName === 'Inscripción HCE' || !courseName) {
          const tag = pi.metadata?.mailchimp_tag;
          if (tag === 'CANCELPARIS') {
            courseName = 'ECMO París';
          } else if (tag === 'CANCELNURSING') {
            courseName = 'ECMO Nursing Care';
          } else if (pi.metadata?.plan) {
            courseName = 'ECMO Simulador Care';
          }
        }

        const courseId = pi.metadata?.course_id || 'general';
        const promoCode = pi.metadata?.promo_code || pi.metadata?.coupon || pi.metadata?.code || '';
        
        return {
          id: pi.id,
          studentName: name || 'Invitado HCE',
          studentEmail: email || 'sin-email@stripe.com',
          studentCountry: country || 'MX',
          courseName,
          courseId,
          amount,
          currency: pi.currency.toUpperCase(),
          status: pi.status,
          date: new Date(pi.created * 1000).toISOString(),
          method,
          promoCode
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
