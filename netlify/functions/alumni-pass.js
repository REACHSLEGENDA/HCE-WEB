// Alumni Pass: Step 1 Refresher (28 y 29 de octubre de 2026).
//
// Flujo: el exalumno SOLICITA (datos + foto de su diploma de Step 1, sin
// pagar) → al equipo le llega un correo con todo → en el panel lo acepta o lo
// rechaza → si lo acepta, le llega por correo su ENLACE DE PAGO personal
// (healthcareexp.com/alumni-pass-step1?pago=<token>) → paga en Stripe → al
// volver se confirma, recibe folio y entra a la lista de Brevo que manda su pase.
//
// Acciones (POST, JSON con `accion`):
//   cupo         pública: lugares presenciales que quedan.
//   solicitar    pública: guarda la solicitud y avisa al equipo y al exalumno.
//   pago-info    pública (con token): resumen para la página de pago.
//   pagar        pública (con token de una solicitud aceptada): crea el cobro.
//   confirmar    pública: verifica el pago de Stripe y emite el folio.
//   listar       admin: solicitudes con enlace temporal a cada diploma.
//   aprobar      admin: acepta y manda el enlace de pago (o lo reenvía).
//   rechazar     admin: rechaza y avisa con el motivo.
//   pendiente    admin: regresa una solicitud a "por revisar".
//
// El precio se decide AQUÍ; la página solo lo muestra (supabase/alumni-pass.sql).

import { getStripe } from './_stripe.js';
import { admin, adminDesdeToken, json, isConfigured as supabaseListo, registrarAccionAdmin } from './_supabase.js';
import { isConfigured as brevoListo, enviarCorreo } from './_brevo.js';
import { plantillaHce } from './_notificaciones.js';
import { confirmarAlumniDesdeSesion, enlaceFacturaAlumni, PRECIOS_ALUMNI, GRABACIONES_ALUMNI, importeAlumni, totalAlumni } from './_alumni-pass.js';
import { sincronizarRegistrosAlumni } from './_alumni-registros.js';
import { EDICIONES_ALUMNI } from '../../src/data/alumniPass.js';
import { correosAvisoAdmin } from './_admins.js';

const SITIO = 'https://healthcareexp.com';
const PAGINA = `${SITIO}/alumni-pass-step1`;
const PRECIOS_MXN = PRECIOS_ALUMNI;
const GRABACIONES_MXN = GRABACIONES_ALUMNI;
const CUPO_PRESENCIAL = 30;
// 26 oct 2026: se quitó la modalidad virtual. Nadie puede pedirla ni
// pagarla; quien ya pagó virtual conserva su pase. Debe coincidir con
// VIRTUAL_CERRADA de src/pages/AlumniPass.jsx.
const VIRTUAL_CERRADA = true;
const ERROR_VIRTUAL = 'La modalidad virtual ya no está disponible. Elige la modalidad presencial.';
// Un lugar presencial queda apartado mientras su cobro de Stripe sigue abierto.
const APARTADO_MIN = 35;
const BUCKET = 'alumni-diplomas';
const TIPOS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };
const MAX_BYTES = 4 * 1024 * 1024;

const ETIQUETA = { presencial: 'Presencial', virtual: 'Virtual (streaming en vivo)' };

const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const importeEn = importeAlumni;
const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p = (html) => `<p style="margin:0 0 16px;line-height:1.7;color:#475569;font-size:15px;">${html}</p>`;
const saludo = (nombre) => `<p style="margin:0 0 16px;line-height:1.7;color:#1e293b;font-size:16px;">Hola <strong>${escapar(String(nombre).split(/\s+/)[0])}</strong>:</p>`;
const fila = (etiqueta, valor) => (valor
  ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap;vertical-align:top;">${escapar(etiqueta)}</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600;">${escapar(valor)}</td></tr>`
  : '');
const tabla = (filas) => `<table style="width:100%;margin:0 0 20px;border-collapse:collapse;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;" cellpadding="0" cellspacing="0"><tr><td style="padding:14px 18px;"><table style="width:100%;border-collapse:collapse;">${filas.join('')}</table></td></tr></table>`;

async function correo(para, asunto, contenido, boton) {
  if (!brevoListo() || !para?.length) return false;
  try {
    await enviarCorreo({ para, asunto, html: plantillaHce(contenido, boton) });
    return true;
  } catch (err) {
    console.error(`Alumni Pass: no se pudo enviar "${asunto}":`, err.message);
    return false;
  }
}

const correosAdmins = (db) => correosAvisoAdmin(db);

async function lugaresPresenciales(db) {
  const desde = new Date(Date.now() - APARTADO_MIN * 60 * 1000).toISOString();
  const [{ count: pagados, error: e1 }, { count: apartados, error: e2 }, { count: anteriores, error: e3 }] = await Promise.all([
    db.from('alumni_pass_registros').select('id', { count: 'exact', head: true })
      .eq('modalidad', 'presencial').eq('pagado', true),
    db.from('alumni_pass_registros').select('id', { count: 'exact', head: true })
      .eq('checkout_modalidad', 'presencial').eq('pagado', false)
      .gt('checkout_reservado_hasta', new Date().toISOString()),
    // Compatibilidad con sesiones creadas antes de las reservas atómicas.
    db.from('alumni_pass_registros').select('id', { count: 'exact', head: true })
      .eq('modalidad', 'presencial').eq('pagado', false).not('stripe_session_id', 'is', null)
      .is('checkout_intento', null)
      .gte('pago_enviado_en', desde),
  ]);
  if (e1 || e2 || e3) throw new Error((e1 || e2 || e3).message);
  const ocupados = (pagados || 0) + (apartados || 0) + (anteriores || 0);
  return { total: CUPO_PRESENCIAL, ocupados, pagados: pagados || 0, restantes: Math.max(0, CUPO_PRESENCIAL - ocupados) };
}

// ---- Solicitud --------------------------------------------------------------

async function solicitar(db, cuerpo) {
  const clave = texto(cuerpo.solicitudClave, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clave)) return json(400, { error: 'Recarga la página e intenta enviar tu solicitud de nuevo.' });
  const d = {
    nombre: texto(cuerpo.nombre, 120),
    nombres: texto(cuerpo.nombres, 80),
    apellido_paterno: texto(cuerpo.apellido_paterno, 80),
    apellido_materno: texto(cuerpo.apellido_materno, 80),
    edicion_diploma: texto(cuerpo.edicion_diploma, 80),
    email: texto(cuerpo.email, 160).toLowerCase(),
    telefono: texto(cuerpo.telefono, 40),
    ciudad: texto(cuerpo.ciudad, 80),
    pais: texto(cuerpo.pais, 80),
    hospital: texto(cuerpo.hospital, 160),
    especialidad: texto(cuerpo.especialidad, 120),
  };
  const modalidad = cuerpo.modalidad === 'presencial' ? 'presencial' : cuerpo.modalidad === 'virtual' ? 'virtual' : null;
  const grabaciones = cuerpo.grabaciones === true;
  const diploma = cuerpo.diploma || {};

  // Conserva compatibilidad con formularios abiertos antes de esta publicación.
  const separado = ['nombres', 'apellido_paterno', 'apellido_materno', 'edicion_diploma'].some((k) => Object.hasOwn(cuerpo, k));
  if (separado) {
    if (d.nombres.length < 2 || d.apellido_paterno.length < 2) return json(400, { error: 'Completa tu nombre y apellido paterno.' });
    if (!EDICIONES_ALUMNI.includes(d.edicion_diploma)) return json(400, { error: 'Selecciona la edición en la que tomaste el diploma.' });
    d.nombre = [d.nombres, d.apellido_paterno, d.apellido_materno].filter(Boolean).join(' ');
  }

  if (!d.nombre || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json(400, { error: 'Escribe tu nombre completo y un correo válido.' });
  if (d.telefono.replace(/\D/g, '').length < 8 || [d.ciudad, d.pais, d.hospital, d.especialidad].some(v => v.length < 2)) return json(400, { error: 'Completa teléfono con lada, ciudad, país, hospital y especialidad.' });
  if (!modalidad) return json(400, { error: 'Elige la modalidad: presencial o virtual.' });
  if (modalidad === 'virtual' && VIRTUAL_CERRADA) return json(409, { error: ERROR_VIRTUAL, estado: 'virtual-cerrada' });
  if (cuerpo.acepta !== true) return json(400, { error: 'Debes aceptar el aviso de privacidad.' });
  const previa = await db.from('alumni_pass_registros').select('*').eq('solicitud_clave', clave).maybeSingle();
  if (previa.error) throw new Error(previa.error.message);
  if (previa.data) return json(200, { ok: true, id: previa.data.id, repetida: true, ...await sincronizarRegistrosAlumni(db, previa.data) });
  const ext = TIPOS[diploma.tipo];
  if (!ext || !diploma.base64) return json(400, { error: 'Sube la foto o copia de tu diploma de Step 1 (JPG, PNG, WEBP o PDF).' });
  const archivo = Buffer.from(String(diploma.base64), 'base64');
  if (!archivo.length || archivo.length > MAX_BYTES) return json(400, { error: 'El archivo del diploma debe pesar menos de 4 MB.' });

  const ruta = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { error: errSubida } = await db.storage.from(BUCKET).upload(ruta, archivo, { contentType: diploma.tipo, upsert: false });
  if (errSubida) throw new Error(`No se pudo guardar el diploma: ${errSubida.message}`);

  const { data: registro, error } = await db.from('alumni_pass_registros').insert([{
    ...d,
    solicitud_clave: clave,
    telefono: d.telefono || null,
    modalidad, grabaciones,
    diploma_path: ruta,
    token: crypto.randomUUID(),
  }]).select('*').single();
  if (error) {
    await db.storage.from(BUCKET).remove([ruta]).catch(() => {});
    if (error.code === '23505') {
      const otra = await db.from('alumni_pass_registros').select('*').eq('solicitud_clave', clave).maybeSingle();
      if (otra.data) return json(200, { ok: true, id: otra.data.id, repetida: true, ...await sincronizarRegistrosAlumni(db, otra.data) });
    }
    throw new Error(error.message);
  }

  const registros = await sincronizarRegistrosAlumni(db, registro);

  // Aviso al equipo con todos los datos y el diploma (enlace válido 7 días).
  const { data: firmado } = await db.storage.from(BUCKET).createSignedUrl(ruta, 7 * 24 * 60 * 60);
  const destinatarios = await correosAdmins(db).catch(err => { console.error('Alumni Pass: destinatarios pendientes:', err.message); return []; });
  const avisoEquipo = await correo(destinatarios, `Nueva solicitud Alumni Pass: ${d.nombre}`, [
    p('Llegó una nueva solicitud para el <strong>Alumni Pass · Step 1 Refresher</strong> (28 y 29 de octubre). Revisa su diploma y acéptala o recházala desde el panel.'),
    tabla([
      fila('Nombre', d.nombre), fila('Correo', d.email), fila('Teléfono', d.telefono),
      fila('Edición del diploma', d.edicion_diploma),
      fila('Ciudad', d.ciudad), fila('País', d.pais), fila('Hospital', d.hospital),
      fila('Especialidad', d.especialidad), fila('Modalidad', ETIQUETA[modalidad]),
      fila('Grabaciones', grabaciones ? 'Le interesan (+$1,299)' : 'No'),
    ]),
    firmado?.signedUrl ? p(`<a href="${escapar(firmado.signedUrl)}" style="color:#0ea5e9;font-weight:600;">Ver su diploma de Step 1</a> (enlace válido 7 días; en el panel siempre está disponible).`) : '',
  ].join(''), { boton: 'Revisar en el panel', enlace: `${SITIO}/admin` });

  // Acuse para el exalumno.
  const acuseEnviado = await correo([d.email], 'Recibimos tu solicitud del Alumni Pass', [
    saludo(d.nombre),
    p('Recibimos tu solicitud para el <strong>Alumni Pass · Step 1 Refresher</strong> del Diploma Internacional de París en ECMO (28 y 29 de octubre de 2026).'),
    p('Nuestro equipo validará tu diploma de Step 1. En cuanto quede aprobado te enviaremos por correo tu <strong>enlace de pago personal</strong> para asegurar tu lugar.'),
    tabla([fila('Modalidad', ETIQUETA[modalidad]), fila('Grabaciones', grabaciones ? 'Con grabaciones por 1 mes (+$1,299 MXN)' : 'Sin grabaciones')]),
    p('Si tienes alguna duda, responde a este correo.'),
  ].join(''));

  return json(200, { ok: true, id: registro.id, acuseEnviado, avisoEquipo, ...registros });
}

// ---- Pago ------------------------------------------------------------------

async function porToken(db, token) {
  const t = texto(token, 80);
  if (!/^[0-9a-f-]{36}$/i.test(t)) return null;
  const { data, error } = await db.from('alumni_pass_registros').select('*').eq('token', t).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function pagoInfo(db, cuerpo) {
  const r = await porToken(db, cuerpo.token);
  if (!r) return json(404, { error: 'Este enlace de pago no es válido. Revisa el correo que te enviamos o escríbenos.' });
  if (r.revision !== 'aprobado') return json(409, { error: 'Tu solicitud todavía no está aprobada. Te avisaremos por correo.', estado: r.revision });
  const cupo = await lugaresPresenciales(db);
  return json(200, {
    nombre: r.nombre, email: r.email, modalidad: r.modalidad, grabaciones: r.grabaciones,
    pagado: r.pagado, folio: r.folio, presencial: cupo,
    factura: r.pagado ? enlaceFacturaAlumni(r) : '', portal: r.portal_modo || (r.portal_invitado_en ? 'enviada' : ''),
    correoEnviado: !!r.brevo_sincronizado_en,
    avisoCorreo: r.pagado && !r.brevo_sincronizado_en ? 'Tu pago está confirmado. El envío del pase por correo está pendiente; conserva tu folio.' : '',
    precios: { ...PRECIOS_MXN, grabaciones: GRABACIONES_MXN },
  });
}

function resumenConfirmado(resultado) {
  const r = resultado.registro;
  return { folio: r.folio, nombre: r.nombre, modalidad: r.modalidad,
    grabaciones: r.grabaciones, email: r.email,
    correoEnviado: resultado.correoEnviado, avisoCorreo: resultado.avisoCorreo,
    factura: enlaceFacturaAlumni(r), portal: r.portal_modo || (r.portal_invitado_en ? 'enviada' : '') };
}

async function cerrarCheckout(db, r) {
  if (r.stripe_session_id) {
    const { stripe } = getStripe(r.checkout_moneda || r.moneda);
    const sesion = await stripe.checkout.sessions.retrieve(r.stripe_session_id);
    if (sesion.payment_status === 'paid') {
      await confirmarAlumniDesdeSesion(db, sesion);
      throw new Error('Esta solicitud ya tiene un pago confirmado. Recarga el panel.');
    }
    if (sesion.status === 'open') await stripe.checkout.sessions.expire(sesion.id);
    if (sesion.status === 'complete') throw new Error('El pago está procesándose. Espera su confirmación antes de cambiar la solicitud.');
  }
  if (r.checkout_intento) {
    const liberada = await db.rpc('alumni_liberar_pago', { p_id: r.id, p_intento: r.checkout_intento });
    if (liberada.error) throw new Error(liberada.error.message);
  } else if (r.stripe_session_id) {
    const liberada = await db.from('alumni_pass_registros').update({ stripe_session_id: null }).eq('id', r.id).eq('stripe_session_id', r.stripe_session_id).eq('pagado', false);
    if (liberada.error) throw new Error(liberada.error.message);
  }
}

async function pagar(db, cuerpo) {
  const r = await porToken(db, cuerpo.token);
  if (!r) return json(404, { error: 'Este enlace de pago no es válido.' });
  if (r.revision !== 'aprobado') return json(409, { error: 'Tu solicitud todavía no está aprobada.' });
  if (r.pagado) return json(409, { error: 'Este Alumni Pass ya está pagado. Recarga la página para ver tu pase.', estado: 'pagado' });
  const modalidad = cuerpo.modalidad;
  const grabaciones = cuerpo.grabaciones === true;
  const moneda = cuerpo.moneda;
  if (!Object.hasOwn(PRECIOS_MXN, modalidad) || !['mxn', 'usd'].includes(moneda)) return json(400, { error: 'Selecciona una modalidad y moneda válidas.' });
  if (modalidad === 'virtual' && VIRTUAL_CERRADA) return json(409, { error: ERROR_VIRTUAL, estado: 'virtual-cerrada' });
  if (r.stripe_session_id) {
    const { stripe: anterior } = getStripe(r.checkout_moneda || r.moneda);
    const abierta = await anterior.checkout.sessions.retrieve(r.stripe_session_id);
    if (abierta.payment_status === 'paid') {
      await confirmarAlumniDesdeSesion(db, abierta);
      return json(409, { error: 'Tu pago ya está confirmado. Recarga la página para ver tu pase.', estado: 'pagado' });
    }
    if (abierta.status === 'complete') return json(409, { error: 'Tu pago se está procesando; espera su confirmación.' });
    const mismosDatos = abierta.metadata?.modalidad === modalidad && abierta.metadata?.grabaciones === (grabaciones ? 'si' : 'no') && abierta.currency === moneda;
    if (abierta.status === 'open' && mismosDatos) return json(200, { url: abierta.url });
    await cerrarCheckout(db, r);
  }
  const { stripe, pasarela } = getStripe(moneda);
  const { data: reserva, error: errReserva } = await db.rpc('alumni_reservar_pago', {
    p_id: r.id, p_modalidad: modalidad, p_moneda: moneda, p_grabaciones: grabaciones,
  });
  if (errReserva) {
    if (/ALUMNI_AGOTADO/.test(errReserva.message)) return json(409, { error: VIRTUAL_CERRADA ? 'Los lugares presenciales se agotaron.' : 'Los lugares presenciales se agotaron. Puedes elegir la modalidad virtual.', estado: 'agotado' });
    throw new Error(errReserva.message);
  }
  if (!reserva?.checkout_intento) throw new Error('No se pudo preparar tu pago. Vuelve a intentar.');
  if (reserva.checkout_modalidad !== modalidad || reserva.checkout_moneda !== moneda || reserva.checkout_grabaciones !== grabaciones) {
    return json(409, { error: 'Ya se está preparando otro pago para esta solicitud. Espera un momento y vuelve a intentar.' });
  }
  const lineas = [{
    price_data: { currency: moneda,
      product_data: { name: 'Alumni Pass · Step 1 Refresher — ' + ETIQUETA[modalidad], description: 'Diploma Internacional de París en ECMO · 28 y 29 de octubre de 2026 · Exclusivo para exalumnos.' },
      unit_amount: importeEn(PRECIOS_MXN[modalidad], moneda) * 100 }, quantity: 1,
  }];
  if (grabaciones) lineas.push({ price_data: { currency: moneda, product_data: { name: 'Grabaciones de las ponencias (1 mes en el campus virtual)' }, unit_amount: importeEn(GRABACIONES_MXN, moneda) * 100 }, quantity: 1 });
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'], line_items: lineas, mode: 'payment', customer_email: r.email, locale: 'es-419',
    expires_at: Math.floor(new Date(reserva.checkout_creado_en).getTime() / 1000) + 34 * 60,
    success_url: PAGINA + '?status=success&session_id={CHECKOUT_SESSION_ID}&m=' + moneda,
    cancel_url: PAGINA + '?pago=' + r.token + '&status=cancel',
    metadata: { tipo: 'alumni_pass', registro_id: String(r.id), intento: reserva.checkout_intento,
      modalidad, grabaciones: grabaciones ? 'si' : 'no', moneda, pasarela, curso: 'Alumni Pass — Step 1 Refresher (París)' },
  }, { idempotencyKey: 'alumni-' + r.id + '-' + reserva.checkout_intento });
  const guardado = await db.from('alumni_pass_registros').update({
    stripe_session_id: session.id, pago_enviado_en: new Date().toISOString(),
  }).eq('id', r.id).eq('checkout_intento', reserva.checkout_intento).eq('pagado', false).eq('revision', 'aprobado').select('id').maybeSingle();
  if (guardado.error || !guardado.data) {
    // No se entrega un cobro que no haya quedado asociado al registro.
    // Si no se logra expirar, conservamos la reserva y la clave para reintentar.
    try {
      await stripe.checkout.sessions.expire(session.id);
      await db.rpc('alumni_liberar_pago', { p_id: r.id, p_intento: reserva.checkout_intento });
    } catch (err) { console.error('Alumni Pass: cobro pendiente de recuperación:', err.message); }
    throw new Error('No se pudo guardar el enlace de pago. Intenta de nuevo; no vuelvas a pagar si ya hiciste un cargo.');
  }
  return json(200, { url: session.url, total: totalAlumni(modalidad, grabaciones, moneda) });
}

async function confirmar(db, cuerpo) {
  const sessionId = texto(cuerpo.sessionId, 200);
  if (!sessionId.startsWith('cs_')) return json(400, { error: 'Falta el comprobante del pago.' });
  const { stripe } = getStripe(cuerpo.moneda === 'usd' ? 'usd' : 'mxn');
  const sesion = await stripe.checkout.sessions.retrieve(sessionId);
  if (sesion.metadata?.tipo !== 'alumni_pass') return json(400, { error: 'Ese pago no es de un Alumni Pass.' });
  const resultado = await confirmarAlumniDesdeSesion(db, sesion);
  if (!resultado) return json(409, { error: 'El pago todavía no aparece como completado. Si ya pagaste, espera un momento y vuelve a intentar.', estado: 'pendiente' });
  return json(200, resumenConfirmado(resultado));
}

// ---- Panel -----------------------------------------------------------------

async function aprobar(db, id, administrador) {
  const { data: r, error } = await db.from('alumni_pass_registros').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!r) return json(404, { error: 'Esa solicitud ya no existe.' });
  if (r.pagado) return json(409, { error: 'Esta solicitud ya está pagada.' });
  const token = r.token || crypto.randomUUID();
  const enlace = `${PAGINA}?pago=${token}`;
  const ahora = new Date().toISOString();
  const { error: errUpd } = await db.from('alumni_pass_registros')
    .update({ revision: 'aprobado', token, revisado_en: r.revisado_en || ahora }).eq('id', id);
  if (errUpd) throw new Error(errUpd.message);

  const total = PRECIOS_MXN[r.modalidad] + (r.grabaciones ? GRABACIONES_MXN : 0);
  const correoEnviado = await correo([r.email], '¡Tu Alumni Pass fue aprobado! Completa tu inscripción', [
    saludo(r.nombre),
    p('Validamos tu diploma de Step 1: <strong>tu solicitud para el Alumni Pass · Step 1 Refresher fue aprobada</strong>. Para asegurar tu lugar, completa tu pago con tu enlace personal.'),
    tabla([
      fila('Modalidad', ETIQUETA[r.modalidad]),
      fila('Grabaciones', r.grabaciones ? 'Por 1 mes (+$1,299 MXN)' : 'Sin grabaciones (puedes agregarlas al pagar)'),
      fila('Total', `$${total.toLocaleString('es-MX')} MXN`),
      fila('Fechas', '28 y 29 de octubre de 2026'),
    ]),
    p(r.modalidad === 'presencial' ? 'Los lugares presenciales son limitados (30) y se asignan conforme se completa el pago.' : 'Al pagar recibirás tu pase con folio por correo.'),
  ].join(''), { boton: 'Pagar mi Alumni Pass', enlace });

  if (correoEnviado) {
    const guardado = await db.from('alumni_pass_registros').update({ correo_enlace_en: ahora }).eq('id', id);
    if (guardado.error) console.error('Alumni Pass: fecha del correo pendiente:', guardado.error.message);
  }

  await registrarAccionAdmin({ adminId: administrador.id, accion: 'alumni_pass_aprobado', detalle: { id } });
  return json(200, { ok: true, enlace, correoEnviado });
}

async function rechazar(db, id, notas, administrador) {
  const { data: r, error } = await db.from('alumni_pass_registros').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!r) return json(404, { error: 'Esa solicitud ya no existe.' });
  if (r.pagado) return json(409, { error: 'Esta solicitud ya está pagada: no se puede rechazar desde aquí.' });
  await cerrarCheckout(db, r);
  const { error: errUpd } = await db.from('alumni_pass_registros')
    .update({ revision: 'rechazado', notas: notas || null, revisado_en: new Date().toISOString() }).eq('id', id);
  if (errUpd) throw new Error(errUpd.message);
  const correoEnviado = await correo([r.email], 'Sobre tu solicitud del Alumni Pass', [
    saludo(r.nombre),
    p('Gracias por tu interés en el <strong>Alumni Pass · Step 1 Refresher</strong>. Por ahora no pudimos aprobar tu solicitud.'),
    notas ? p(`<strong>Motivo:</strong> ${escapar(notas)}`) : '',
    p('Si crees que se trata de un error o quieres enviarnos otro documento, responde a este correo y lo revisamos.'),
  ].join(''));
  await registrarAccionAdmin({ adminId: administrador.id, accion: 'alumni_pass_rechazado', detalle: { id } });
  return json(200, { ok: true, correoEnviado });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!supabaseListo()) return json(500, { error: 'El registro no está configurado en el servidor.' });

  try {
    let cuerpo;
    try { cuerpo = JSON.parse(event.body || '{}'); }
    catch { return json(400, { error: 'La solicitud no tiene un formato válido.' }); }
    if (!cuerpo || typeof cuerpo !== 'object' || Array.isArray(cuerpo)) return json(400, { error: 'Solicitud inválida.' });
    const db = admin();

    if (cuerpo.accion === 'cupo') return json(200, { presencial: await lugaresPresenciales(db) });
    if (cuerpo.accion === 'solicitar') return await solicitar(db, cuerpo);
    if (cuerpo.accion === 'pago-info') return await pagoInfo(db, cuerpo);
    if (cuerpo.accion === 'pagar') return await pagar(db, cuerpo);
    if (cuerpo.accion === 'confirmar') return await confirmar(db, cuerpo);

    const administrador = await adminDesdeToken(event.headers);
    if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });
    const id = Number(cuerpo.id);
    if (cuerpo.accion !== 'listar' && (!Number.isSafeInteger(id) || id <= 0)) return json(400, { error: 'Selecciona una solicitud válida.' });

    if (cuerpo.accion === 'listar') {
      const { data, error } = await db.from('alumni_pass_registros').select('*').order('creado_en', { ascending: false }).limit(1000);
      if (error) throw new Error(error.message);
      const registros = await Promise.all((data || []).map(async (r) => {
        const { data: firmado } = await db.storage.from(BUCKET).createSignedUrl(r.diploma_path, 60 * 60);
        return { ...r, diploma_url: firmado?.signedUrl || null, enlace_pago: r.token ? `${PAGINA}?pago=${r.token}` : null };
      }));
      return json(200, { registros, presencial: await lugaresPresenciales(db) });
    }
    if (cuerpo.accion === 'aprobar') return await aprobar(db, id, administrador);
    if (cuerpo.accion === 'sincronizar-registros') {
      const { data: r, error } = await db.from('alumni_pass_registros').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      const resultado = await sincronizarRegistrosAlumni(db, r, { reintentar: true });
      await registrarAccionAdmin({ adminId: administrador.id, accion: 'alumni_registros_reintentados', detalle: { id } });
      return json(200, { ok: true, ...resultado });
    }
    if (cuerpo.accion === 'rechazar') return await rechazar(db, id, texto(cuerpo.notas, 500), administrador);
    if (cuerpo.accion === 'reenviar-pase') {
      const { data: r, error } = await db.from('alumni_pass_registros').select('*').eq('id', id).single();
      if (error) throw new Error(error.message);
      if (!r.pagado || !r.stripe_session_id) return json(409, { error: 'Esta solicitud todavía no tiene un pago confirmado.' });
      const { stripe } = getStripe(r.moneda);
      const resultado = await confirmarAlumniDesdeSesion(db, await stripe.checkout.sessions.retrieve(r.stripe_session_id));
      if (!resultado) return json(409, { error: 'Stripe todavía no confirma el pago.' });
      return json(200, { ok: true, correoEnviado: resultado.correoEnviado, avisoCorreo: resultado.avisoCorreo });
    }
    if (cuerpo.accion === 'pendiente') {
      const actual = await db.from('alumni_pass_registros').select('*').eq('id', id).single();
      if (actual.error) throw new Error(actual.error.message);
      if (actual.data.pagado) return json(409, { error: 'Una solicitud pagada no puede regresar a revisión.' });
      await cerrarCheckout(db, actual.data);
      const { error } = await db.from('alumni_pass_registros').update({ revision: 'pendiente' }).eq('id', id).eq('pagado', false);
      if (error) throw new Error(error.message);
      return json(200, { ok: true });
    }
    return json(400, { error: 'Acción desconocida.' });
  } catch (err) {
    console.error('Alumni Pass:', err.message);
    return json(500, { error: err.message });
  }
};
