// Seguimiento de pagos (cada hora). Revisa directamente en Stripe, en las dos
// cuentas (pesos y dólares), así que NO depende del webhook ni de ninguna
// automatización de Brevo: los correos salen por el envío transaccional.
//
//   recibo        pago completado: recibo con folio y botón "Solicitar
//                 factura" con concepto, monto y folio ya puestos
//   carrito       empezó a pagar y no terminó (después de 1 hora): un solo
//                 correo para retomar su inscripción
//   pago_fallido  igual, pero el banco rechazó la tarjeta: se lo decimos y le
//                 sugerimos otra tarjeta o la otra moneda
//   promo         el precio especial de un programa termina en 48 horas: aviso
//                 a quien empezó a pagar ese programa y no terminó
//   resumen       al equipo (admins + academia@): quién no terminó, para
//                 darle seguimiento por WhatsApp
//
// Solo se procesan cobros con `metadata.programa` (todos los creados desde
// el 15 de octubre de 2026); Alumni Pass tiene sus propios correos.
// Nada se manda dos veces: cada correo se aparta antes en `cobros_avisos`
// (supabase/correos-mejoras.sql). Sin esa tabla no se envía nada.

import { getStripe } from './_stripe.js';
import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { enviarCorreo, isConfigured as brevoListo } from './_brevo.js';
import { plantillaHce } from './_notificaciones.js';
import { correosAvisoAdmin } from './_admins.js';
import { promoPorTerminar } from './_promos.js';

const SITIO = 'https://healthcareexp.com';
const HORA = 3600 * 1000;
const MAX_CORREOS = 25; // por ejecución, para no pasar el límite de tiempo

const PROGRAMAS = {
  step1: { nombre: 'Step 1 · Paris International Diploma in ECMO', pagina: '/inscripciones-step1' },
  paris: { nombre: 'Paris International Diploma in ECMO', pagina: '/inscripciones-diploma-paris-ecmo' },
  step2: { nombre: 'Step 2 · Paris ECMO Simulation Course', pagina: '/inscripcion-step2-privada-2026' },
  nursing: { nombre: 'ECMO Nursing Care Course', pagina: '/inscripciones-ecmo-nursing' },
  sim: { nombre: 'ECMO Sim', pagina: '/simulador-ecmo-sim' },
  curso: { nombre: 'Curso en línea', pagina: '/dashboard?tab=explore' },
};

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p = (html) => `<p style="margin:0 0 16px;line-height:1.7;color:#334155;font-size:15px;">${html}</p>`;
const fechaMx = (ms) => new Date(ms).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dinero = (centavos, moneda) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: String(moneda || 'mxn').toUpperCase() }).format((centavos || 0) / 100);

const correoDe = (s) => String(s.customer_details?.email || s.customer_email || s.metadata?.email || '').trim().toLowerCase();
const nombreDe = (s) => String(s.customer_details?.name || '').split(/\s+/)[0] || '';
const folioDe = (s) => `HCE-${String(s.id).slice(-8).toUpperCase()}`;
const programaDe = (s) => PROGRAMAS[s.metadata?.programa] ? s.metadata.programa : null;
const nombrePrograma = (s) => (s.metadata?.programa === 'curso' && s.metadata?.curso) || PROGRAMAS[programaDe(s)]?.nombre || 'tu programa';

// Las dos cuentas de Stripe (si solo hay una llave, es la misma cuenta).
function cuentas() {
  const lista = [];
  if (process.env.STRIPE_SECRET_KEY) lista.push(getStripe('mxn').stripe);
  if (process.env.STRIPE_SECRET_KEY_2) lista.push(getStripe('usd').stripe);
  return lista;
}

async function sesionesRecientes(stripe, desde) {
  const lista = [];
  for await (const s of stripe.checkout.sessions.list({ created: { gte: Math.floor(desde / 1000) }, limit: 100, expand: ['data.payment_intent'] })) {
    lista.push(s);
    if (lista.length >= 1000) break;
  }
  return lista;
}

// ¿Ya pagó este programa (en cualquier cuenta, en cualquier fecha)?
async function yaPago(stripes, email, programa) {
  for (const stripe of stripes) {
    const { data } = await stripe.checkout.sessions.list({ customer_details: { email }, limit: 30 });
    if (data.some((s) => s.status === 'complete' && s.payment_status !== 'unpaid' && s.metadata?.programa === programa)) return true;
  }
  return false;
}

// Aparta el envío. false si ya existía (otra ejecución lo mandó).
async function apartar(db, fila) {
  const { error } = await db.from('cobros_avisos').insert([fila]);
  if (!error) return true;
  if (error.code === '23505') return false;
  throw new Error(error.message);
}

async function liberar(db, clave) {
  await db.from('cobros_avisos').delete().eq('clave', clave);
}

// ---- Correos -----------------------------------------------------------------

function correoRecibo(s) {
  const programa = nombrePrograma(s);
  const monto = dinero(s.amount_total, s.currency);
  const folio = folioDe(s);
  const detalle = [s.metadata?.perfil, s.metadata?.extras && s.metadata.extras !== 'Ninguno' ? `Extras: ${s.metadata.extras}` : '']
    .filter(Boolean).join(' · ');
  const factura = `${SITIO}/facturacion?${new URLSearchParams({ concepto: programa, monto: `${monto} ${String(s.currency).toUpperCase()}`, folio })}`;
  const filas = [
    ['Folio', folio],
    ['Programa', programa],
    ...(detalle ? [['Detalle', detalle]] : []),
    ['Importe', `${monto} ${String(s.currency).toUpperCase()}`],
    ['Fecha', fechaMx((s.created || Date.now() / 1000) * 1000)],
    ['Método', 'Tarjeta (Stripe)'],
  ];
  const tabla = `<table style="width:100%;border-collapse:collapse;margin:0 0 20px;font-size:14px;">${filas.map(([k, v]) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#64748b;width:35%;">${esc(k)}</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:600;">${esc(v)}</td></tr>`).join('')}</table>`;
  const nombre = nombreDe(s);
  const html = p(`${nombre ? `Hola ${esc(nombre)}:` : 'Hola:'}`)
    + p(`Recibimos tu pago. Este es tu recibo; guárdalo para cualquier aclaración.`)
    + tabla
    + p(`¿Necesitas factura? Usa el botón: el concepto, el monto y el folio ya van llenos; solo agrega tus datos fiscales.`)
    + p(`Los siguientes pasos de tu inscripción te llegan en otro correo. Dudas: WhatsApp +52 56 5927 1906 o academia@healthcareexp.com.`);
  return {
    asunto: `Recibo de pago ${folio} · ${programa}`,
    html: plantillaHce(html, { boton: 'Solicitar factura', enlace: factura }),
  };
}

function correoCarrito(s, { fallido }) {
  const programa = nombrePrograma(s);
  const pagina = `${SITIO}${PROGRAMAS[programaDe(s)].pagina}`;
  const nombre = nombreDe(s);
  const saludo = p(nombre ? `Hola ${esc(nombre)}:` : 'Hola:');
  const cuerpo = fallido
    ? p(`Intentaste inscribirte a <strong>${esc(programa)}</strong>, pero tu banco no autorizó el cargo, así que <strong>no se te cobró nada</strong>.`)
      + p('Suele resolverse así: intenta con otra tarjeta, avisa a tu banco que es una compra en línea, o paga en la otra moneda (pesos o dólares).')
    : p(`Vimos que empezaste tu inscripción a <strong>${esc(programa)}</strong> y no se completó. Tu lugar todavía está disponible.`)
      + p('Si tuviste algún problema con el pago o tienes dudas, respóndenos por WhatsApp al +52 56 5927 1906 y te ayudamos.');
  const cierre = p('<span style="color:#94a3b8;font-size:13px;">Si ya no te interesa, ignora este mensaje: no te volveremos a escribir sobre esta inscripción.</span>');
  return {
    asunto: fallido ? `Tu pago para ${programa} no se completó` : `Tu lugar en ${programa} sigue disponible`,
    html: plantillaHce(saludo + cuerpo + cierre, { boton: fallido ? 'Intentar de nuevo' : 'Terminar mi inscripción', enlace: pagina }),
  };
}

function correoPromo(programa, termina) {
  const datos = PROGRAMAS[programa];
  return {
    asunto: `Último aviso: el precio especial de ${datos.nombre} termina pronto`,
    html: plantillaHce(
      p('Hola:')
      + p(`Empezaste tu inscripción a <strong>${esc(datos.nombre)}</strong>. Te avisamos que el precio especial termina el <strong>${esc(fechaMx(termina.getTime()))}</strong> (hora del centro de México).`)
      + p('Después de esa fecha se cobra el precio regular.')
      + p('<span style="color:#94a3b8;font-size:13px;">Si ya no te interesa, ignora este mensaje.</span>'),
      { boton: 'Inscribirme ahora', enlace: `${SITIO}${datos.pagina}` },
    ),
  };
}

// ---- Tarea -------------------------------------------------------------------

export default async () => {
  if (!supabaseListo() || !brevoListo()) return new Response('Sin configurar', { status: 200 });
  const stripes = cuentas();
  if (!stripes.length) return new Response('Sin Stripe', { status: 200 });

  const db = admin();
  // Sin la tabla no se manda nada (no habría forma de evitar repetidos).
  const { error: sinTabla } = await db.from('cobros_avisos').select('clave').limit(1);
  if (sinTabla) {
    console.error('cobros-seguimiento: falta correr supabase/correos-mejoras.sql:', sinTabla.message);
    return new Response('Falta la tabla cobros_avisos', { status: 200 });
  }

  const ahora = Date.now();
  const resumen = { recibos: 0, carritos: 0, fallidos: 0, promos: 0 };
  const paraEquipo = [];
  let enviados = 0;

  const vistas = new Map();
  for (const stripe of stripes) {
    for (const s of await sesionesRecientes(stripe, ahora - 72 * HORA)) {
      if (programaDe(s) && !vistas.has(s.id)) vistas.set(s.id, s);
    }
  }
  const sesiones = [...vistas.values()].sort((a, b) => a.created - b.created);
  const pagada = (s) => s.status === 'complete' && s.payment_status !== 'unpaid';
  const pagaron = new Set(sesiones.filter(pagada).map((s) => `${correoDe(s)}:${programaDe(s)}`));

  // 1. Recibos.
  for (const s of sesiones.filter((x) => pagada(x) && x.amount_total > 0)) {
    if (enviados >= MAX_CORREOS) break;
    const email = correoDe(s);
    if (!email) continue;
    const clave = `recibo:${s.id}`;
    if (!(await apartar(db, { clave, tipo: 'recibo', email, programa: programaDe(s), session_id: s.id }))) continue;
    try {
      await enviarCorreo({ para: [email], ...correoRecibo(s), claveIdempotencia: clave });
      resumen.recibos += 1;
      enviados += 1;
    } catch (err) {
      console.error('Recibo', s.id, err.message);
      await liberar(db, clave); // se reintenta en la siguiente hora
    }
  }

  // 2. Carritos abandonados y pagos rechazados (una vez por persona y
  //    programa cada 7 días).
  const pendientes = new Map();
  for (const s of sesiones) {
    if (pagada(s) || ahora - s.created * 1000 < HORA) continue;
    const email = correoDe(s);
    if (!email || pagaron.has(`${email}:${programaDe(s)}`)) continue;
    pendientes.set(`${email}:${programaDe(s)}`, s); // queda el intento más reciente
  }
  for (const [par, s] of pendientes) {
    if (enviados >= MAX_CORREOS) break;
    const email = correoDe(s);
    const programa = programaDe(s);
    const { data: previos } = await db.from('cobros_avisos').select('clave')
      .eq('email', email).eq('programa', programa).in('tipo', ['carrito', 'pago_fallido'])
      .gte('creado_en', new Date(ahora - 7 * 24 * HORA).toISOString()).limit(1);
    if (previos?.length) continue;
    if (await yaPago(stripes, email, programa)) continue;
    const fallido = Boolean(s.payment_intent?.last_payment_error);
    const tipo = fallido ? 'pago_fallido' : 'carrito';
    const clave = `${tipo}:${par}:${s.id}`;
    if (!(await apartar(db, { clave, tipo, email, programa, session_id: s.id }))) continue;
    try {
      await enviarCorreo({ para: [email], ...correoCarrito(s, { fallido }), claveIdempotencia: clave });
      resumen[fallido ? 'fallidos' : 'carritos'] += 1;
      enviados += 1;
      paraEquipo.push({ email, nombre: s.customer_details?.name || '', programa: nombrePrograma(s), monto: dinero(s.amount_total, s.currency), fallido });
    } catch (err) {
      console.error('Carrito', s.id, err.message);
      await liberar(db, clave);
    }
  }

  // 3. Fin del precio especial: a quien abandonó ese programa en los últimos 30 días.
  for (const programa of Object.keys(PROGRAMAS)) {
    const promo = promoPorTerminar(programa, new Date(ahora));
    if (!promo) continue;
    const { data: interesados } = await db.from('cobros_avisos').select('email')
      .eq('programa', programa).in('tipo', ['carrito', 'pago_fallido'])
      .gte('creado_en', new Date(ahora - 30 * 24 * HORA).toISOString());
    for (const email of [...new Set((interesados || []).map((x) => x.email))]) {
      if (enviados >= MAX_CORREOS) break;
      if (await yaPago(stripes, email, programa)) continue;
      const clave = `promo:${promo.etiqueta}:${email}`;
      if (!(await apartar(db, { clave, tipo: 'promo', email, programa }))) continue;
      try {
        await enviarCorreo({ para: [email], ...correoPromo(programa, promo.termina), claveIdempotencia: clave });
        resumen.promos += 1;
        enviados += 1;
      } catch (err) {
        console.error('Promo', email, err.message);
        await liberar(db, clave);
      }
    }
  }

  // 4. Resumen al equipo (solo si hubo carritos o pagos rechazados nuevos).
  if (paraEquipo.length) {
    const filas = paraEquipo.map((x) => `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${esc(x.nombre || '—')}<br><a href="mailto:${esc(x.email)}">${esc(x.email)}</a></td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${esc(x.programa)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${esc(x.monto)}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${x.fallido ? 'Tarjeta rechazada' : 'No terminó'}</td></tr>`).join('');
    try {
      await enviarCorreo({
        para: await correosAvisoAdmin(db),
        asunto: `Pagos sin terminar: ${paraEquipo.length} ${paraEquipo.length === 1 ? 'persona' : 'personas'}`,
        html: plantillaHce(
          p('Estas personas empezaron a pagar y no terminaron. Ya les llegó un correo para retomar; un mensaje por WhatsApp suele cerrar la venta.')
          + `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px;"><tr style="text-align:left;color:#64748b;"><th style="padding:8px;">Persona</th><th style="padding:8px;">Programa</th><th style="padding:8px;">Importe</th><th style="padding:8px;">Qué pasó</th></tr>${filas}</table>`,
          { boton: 'Ver pagos en el panel', enlace: `${SITIO}/admin` },
        ),
      });
    } catch (err) {
      console.error('Resumen de carritos:', err.message);
    }
  }

  console.log('Seguimiento de cobros:', JSON.stringify(resumen));
  return new Response(JSON.stringify(resumen), { status: 200, headers: { 'Content-Type': 'application/json' } });
};

// Cada hora, al minuto 15.
export const config = { schedule: '15 * * * *' };
