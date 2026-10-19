// Confirmación compartida por el regreso de Checkout y el webhook firmado.
import { LISTS, isConfigured, upsertContact, addToList, enviarCorreo } from './_brevo.js';
import { plantillaHce } from './_notificaciones.js';
import { correosAvisoAdmin } from './_admins.js';

export const TIPO_ALUMNI = 'alumni_pass';
export const PRECIOS_ALUMNI = { presencial: 7000, virtual: 4000 };
export const GRABACIONES_ALUMNI = 1299;
export const importeAlumni = (mxn, moneda) => moneda === 'usd' ? Math.ceil(mxn / 17.5) : mxn;
export const totalAlumni = (modalidad, grabaciones, moneda) =>
  importeAlumni(PRECIOS_ALUMNI[modalidad], moneda) + (grabaciones ? importeAlumni(GRABACIONES_ALUMNI, moneda) : 0);

const escapar = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function confirmarAlumniDesdeSesion(db, sesion, { exigirCorreo = false } = {}) {
  if (sesion?.metadata?.tipo !== TIPO_ALUMNI || sesion.payment_status !== 'paid') return null;
  const id = Number(sesion.metadata.registro_id);
  const modalidad = sesion.metadata.modalidad;
  const grabaciones = sesion.metadata.grabaciones === 'si';
  const moneda = sesion.currency;
  if (!Number.isSafeInteger(id) || id <= 0 || !Object.hasOwn(PRECIOS_ALUMNI, modalidad)
    || !['mxn', 'usd'].includes(moneda)
    || sesion.amount_total !== totalAlumni(modalidad, grabaciones, moneda) * 100) {
    throw new Error('El importe o los datos del pago no corresponden al Alumni Pass. Contacta al equipo.');
  }
  const { data: registro, error } = await db.from('alumni_pass_registros').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!registro) throw new Error('No encontramos la solicitud de este pago.');
  if (registro.stripe_session_id !== sesion.id
    && (!registro.checkout_intento || registro.checkout_intento !== sesion.metadata.intento)) {
    throw new Error('El pago no corresponde al enlace de esta solicitud.');
  }
  if (registro.pagado && registro.stripe_session_id !== sesion.id) throw new Error('La solicitud ya tiene otro pago registrado. Contacta al equipo.');
  let actual = registro;
  if (!registro.pagado) {
    let escritura = db.from('alumni_pass_registros').update({
      pagado: true, pagado_en: new Date().toISOString(), folio: `AP26-${String(id).padStart(4, '0')}`,
      stripe_session_id: sesion.id, modalidad, grabaciones, moneda, importe: sesion.amount_total / 100,
    }).eq('id', id).eq('pagado', false);
    escritura = registro.checkout_intento ? escritura.eq('checkout_intento', registro.checkout_intento) : escritura.eq('stripe_session_id', sesion.id);
    const { data, error: fallo } = await escritura.select('*').maybeSingle();
    if (fallo) throw new Error(fallo.message);
    if (data) actual = data;
    else {
      const otra = await db.from('alumni_pass_registros').select('*').eq('id', id).single();
      if (otra.error || !otra.data?.pagado || otra.data.stripe_session_id !== sesion.id) throw new Error('No se pudo confirmar el registro del pago. Vuelve a intentar.');
      actual = otra.data;
    }
  }

  // Si falla Brevo, el pago se conserva. Stripe reintenta; el panel también
  // permite reintentar sin volver a cobrar ni generar otro folio.
  let avisoCorreo = '';
  try {
    if (!isConfigured()) throw new Error('El envío de correos no está configurado.');
    if (!actual.brevo_sincronizado_en) {
      const [nombre, ...apellidos] = actual.nombre.trim().split(/\s+/);
      const apellido = actual.nombres ? [actual.apellido_paterno, actual.apellido_materno].filter(Boolean).join(' ') : apellidos.join(' ');
      await upsertContact(actual.email, {
        FIRSTNAME: actual.nombres || nombre, ...(apellido ? { LASTNAME: apellido } : {}),
        ALUMNI_MODALIDAD: modalidad === 'presencial' ? 'Presencial' : 'Virtual (streaming en vivo)',
        ALUMNI_GRABACIONES: grabaciones ? 'Incluidas por 1 mes' : 'No incluidas', ALUMNI_FOLIO: actual.folio,
      });
      await addToList(actual.email, LISTS.ALUMNI_PASS);
      const fecha = new Date().toISOString();
      const guardado = await db.from('alumni_pass_registros').update({ brevo_sincronizado_en: fecha }).eq('id', id);
      if (guardado.error) throw new Error(guardado.error.message);
      actual = { ...actual, brevo_sincronizado_en: fecha };
    }
    if (!actual.aviso_pago_en) {
      const para = await correosAvisoAdmin(db);
      if (para.length) await enviarCorreo({ para, asunto: `Alumni Pass pagado: ${actual.nombre} (${actual.folio})`,
        claveIdempotencia: `alumni-pago-${sesion.id}`,
        html: plantillaHce(`<p>Se confirmó el pago de <strong>${escapar(actual.nombre)}</strong>.</p><p>Folio: ${escapar(actual.folio)}<br>Modalidad: ${escapar(modalidad)}<br>Importe: ${actual.importe} ${moneda.toUpperCase()}</p>`, { boton: 'Ver en el panel', enlace: 'https://healthcareexp.com/admin' }),
      });
      const fecha = new Date().toISOString();
      const guardado = await db.from('alumni_pass_registros').update({ aviso_pago_en: fecha }).eq('id', id);
      if (guardado.error) throw new Error(guardado.error.message);
      actual = { ...actual, aviso_pago_en: fecha };
    }
  } catch (err) {
    console.error('Alumni Pass: pago confirmado, aviso pendiente:', err.message);
    avisoCorreo = actual.brevo_sincronizado_en ? 'El aviso al equipo está pendiente.' : 'Tu pago está confirmado. El envío del pase por correo está pendiente; conserva tu folio.';
    if (exigirCorreo) throw err;
  }

  // Invitación al portal (una vez). Si falla, el pago y el pase no se afectan.
  try {
    actual = await invitarAlPortal(db, actual);
  } catch (err) {
    console.error('Alumni Pass: invitación al portal pendiente:', err.message);
  }
  return { registro: actual, correoEnviado: !!actual.brevo_sincronizado_en, avisoCorreo };
}

const SITIO = 'https://healthcareexp.com';
const conceptoAlumni = (r) => `Alumni Pass · Step 1 Refresher (${r.modalidad === 'presencial' ? 'presencial' : 'virtual'}${r.grabaciones ? ' + grabaciones' : ''})`;

/** Enlace a /facturacion con concepto, monto y folio ya puestos (sin datos personales). */
export function enlaceFacturaAlumni(r) {
  const params = {
    concepto: conceptoAlumni(r),
    monto: `${Number(r.importe || 0).toLocaleString('es-MX')} ${String(r.moneda || 'mxn').toUpperCase()}`,
    folio: r.folio || '',
  };
  return `${SITIO}/facturacion?${Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&')}`;
}

/**
 * Le da acceso al portal de HCE a quien pagó su Alumni Pass:
 *   - sin cuenta: se le crea (ya aprobada, con sus datos) y le llega un correo
 *     de HCE con el enlace para crear su contraseña;
 *   - con cuenta: le llega un correo para entrar con la que ya tiene.
 * En los dos casos el correo trae el botón de factura. Se manda una sola vez
 * (portal_invitado_en, supabase/alumni-pass-portal.sql).
 */
async function invitarAlPortal(db, r) {
  if (!r?.pagado || r.portal_invitado_en || !db.auth?.admin?.generateLink || !isConfigured()) return r;
  if (!('portal_invitado_en' in r)) return r; // falta correr la migración
  const email = String(r.email || '').trim().toLowerCase();
  if (!email) return r;

  // Se aparta antes: si la página y Stripe confirman a la vez, solo uno invita.
  const fecha = new Date().toISOString();
  const { data: apartado, error: errApartar } = await db.from('alumni_pass_registros')
    .update({ portal_invitado_en: fecha }).eq('id', r.id).is('portal_invitado_en', null).select('id').maybeSingle();
  if (errApartar) throw new Error(errApartar.message);
  if (!apartado) return r;
  try {
    return await mandarInvitacion(db, r, email, fecha);
  } catch (err) {
    await db.from('alumni_pass_registros').update({ portal_invitado_en: null }).eq('id', r.id);
    throw err;
  }
}

async function mandarInvitacion(db, r, email, fecha) {

  const { data: existente, error: errPerfil } = await db.from('profiles').select('id').ilike('email', email).maybeSingle();
  if (errPerfil) throw new Error(errPerfil.message);

  let modo = 'existente';
  let enlace = `${SITIO}/login`;
  if (!existente) {
    const nombre = r.nombres ? [r.nombres, r.apellido_paterno, r.apellido_materno].filter(Boolean).join(' ') : r.nombre;
    const { data: link, error: errLink } = await db.auth.admin.generateLink({
      type: 'invite',
      email,
      options: { redirectTo: `${SITIO}/restablecer-contrasena?bienvenida=1`, data: { nombre_completo: nombre } },
    });
    if (errLink || !link?.properties?.action_link) throw new Error(errLink?.message || 'No se pudo crear el acceso.');
    modo = 'nueva';
    enlace = link.properties.action_link;
    const datos = {
      email, nombre_completo: nombre, rol: 'estudiante',
      ...(r.telefono ? { telefono: r.telefono } : {}),
      ...(r.pais ? { pais: r.pais } : {}),
      ...(r.especialidad ? { especialidad: r.especialidad } : {}),
      ...(r.hospital ? { institucion: r.hospital } : {}),
      aprobado: true, aprobado_en: new Date().toISOString(), activo: true,
    };
    const userId = link.user?.id;
    if (userId) {
      const res = await db.from('profiles').update(datos).eq('id', userId).select('id').maybeSingle();
      if (!res.error && !res.data) await db.from('profiles').insert([{ id: userId, ...datos }]);
    }
  }

  const factura = enlaceFacturaAlumni(r);
  const p = (html) => `<p style="margin:0 0 16px;line-height:1.7;color:#334155;font-size:15px;">${html}</p>`;
  const cuerpo = modo === 'nueva'
    ? p(`Hola ${escapar(r.nombres || String(r.nombre || '').split(/\s+/)[0] || '')}:`)
      + p(`Tu Alumni Pass (folio <strong>${escapar(r.folio)}</strong>) ya está pagado. Te creamos tu acceso al <strong>portal académico de HCE</strong>, donde verás tus cursos, certificados, avisos y, si las incluiste, tus grabaciones.`)
      + p('Usa el botón para crear tu contraseña. Si el enlace ya venció, entra a healthcareexp.com/login y elige "¿Olvidaste tu contraseña?" con este mismo correo.')
      + p(`¿Necesitas factura? <a href="${escapar(factura)}" style="color:#005fe6;font-weight:600;">Solicítala aquí</a>: el concepto, el monto y el folio ya van llenos.`)
    : p(`Hola ${escapar(r.nombres || String(r.nombre || '').split(/\s+/)[0] || '')}:`)
      + p(`Tu Alumni Pass (folio <strong>${escapar(r.folio)}</strong>) ya está pagado. Entra al portal académico de HCE con tu cuenta de siempre para ver tus cursos, certificados y avisos. Si no recuerdas tu contraseña, elige "¿Olvidaste tu contraseña?" con este mismo correo.`)
      + p(`¿Necesitas factura? <a href="${escapar(factura)}" style="color:#005fe6;font-weight:600;">Solicítala aquí</a>: el concepto, el monto y el folio ya van llenos.`);
  await enviarCorreo({
    para: [email],
    asunto: modo === 'nueva' ? 'Tu acceso al portal de HCE' : 'Tu Alumni Pass ya está en tu portal de HCE',
    claveIdempotencia: `alumni-portal-${r.id}`,
    html: plantillaHce(cuerpo, { boton: modo === 'nueva' ? 'Crear mi contraseña' : 'Entrar a mi portal', enlace }),
  });

  const { error: errGuardar } = await db.from('alumni_pass_registros').update({ portal_modo: modo }).eq('id', r.id);
  if (errGuardar) console.error('Alumni Pass: no se guardó el tipo de invitación:', errGuardar.message);
  return { ...r, portal_invitado_en: fecha, portal_modo: modo };
}
