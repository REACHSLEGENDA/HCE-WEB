// Devuelve el país desde el que llega la visita, para preseleccionar la moneda
// en las páginas de inscripción.
//
// IMPORTANTE: esto NO decide la pasarela. La cuenta de Stripe la elige
// `_stripe.js` a partir de la moneda que el alumno tiene seleccionada, que es
// un valor explícito y visible. La geolocalización solo cambia el valor por
// defecto: alguien de fuera de México ve dólares desde el inicio, pero puede
// cambiarlo con un clic. Enrutar por IP fallaría con VPN de hospital o con un
// mexicano de viaje.
//
// Usa el formato moderno de Netlify Functions (export default) porque el
// `context.geo` no llega en la firma clásica `handler(event)` que usan las
// demás funciones de este proyecto.
export default async (req, context) => {
  const code = context?.geo?.country?.code || null;

  return new Response(
    JSON.stringify({
      country: code,
      // 'mxn' para México y para cuando no se pudo determinar el país: es el
      // mercado principal y el default más seguro.
      moneda: code && code !== 'MX' ? 'usd' : 'mxn',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Que no se cachee entre visitantes distintos.
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    }
  );
};
