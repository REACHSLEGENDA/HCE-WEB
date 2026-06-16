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
    
    // Fetch payment intents representing transactions
    const paymentIntents = await stripe.paymentIntents.list({
      limit: 100,
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
        
        const courseName = pi.metadata?.curso || pi.description || 'Inscripción HCE';
        const courseId = pi.metadata?.course_id || 'general';
        
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
          method
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
