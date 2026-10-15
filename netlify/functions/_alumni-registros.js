// Copias de la SOLICITUD. La lista de pases pagados de Brevo se maneja aparte.
import { isConfigured, upsertContact } from './_brevo.js';

export const FORM_ALUMNI = 'xdeapenv';
export const NOMBRE_FORM_ALUMNI = 'Alumni Pass · Solicitud Step 1 Refresher';

export function payloadSolicitudAlumni(r) {
  return {
    _subject: `Solicitud Alumni Pass: ${r.nombre}`,
    registro_alumni_id: r.id, referencia_solicitud: r.solicitud_clave || `ALUMNI-${r.id}`,
    formulario: NOMBRE_FORM_ALUMNI, nombre: r.nombre, email: r.email,
    telefono: r.telefono, ciudad: r.ciudad, pais: r.pais,
    hospital: r.hospital, especialidad: r.especialidad,
    modalidad: r.modalidad === 'presencial' ? 'Presencial' : 'Virtual',
    grabaciones: r.grabaciones ? 'Solicita grabaciones por 1 mes' : 'Sin grabaciones',
    estado: 'Solicitud recibida; requiere revisión antes de pagar',
    diploma: 'Documento privado. Consultar Ventas → Alumni Pass en el panel HCE.',
    panel_revision: 'https://healthcareexp.com/admin',
    fecha_solicitud: r.creado_en,
  };
}

const estadoFormspree = r => r.formspree_enviado_en ? 'enviado' : r.formspree_estado || 'pendiente';
export function estadoRegistrosAlumni(r) {
  return { formulario: !!r.formulario_registrado_en, brevo: !!r.brevo_solicitud_en,
    formspree: estadoFormspree(r),
    pendientes: !r.formulario_registrado_en || !r.brevo_solicitud_en || !r.formspree_enviado_en };
}

export async function sincronizarRegistrosAlumni(db, registro, { reintentar = false } = {}) {
  try { return await sincronizar(db, registro, reintentar); }
  catch (err) {
    console.error('Alumni Pass: solicitud guardada, sincronización interrumpida:', err.message);
    return { integraciones: { ...estadoRegistrosAlumni(registro), pendientes: true },
      avisoRegistros: 'La solicitud está guardada en Alumni Pass. No se pudo completar la sincronización; revisa los estados desde el panel.' };
  }
}

async function sincronizar(db, registro, reintentar) {
  let r = { ...registro };
  const problemas = [];
  async function guardar(cambios) {
    const { error } = await db.from('alumni_pass_registros').update(cambios).eq('id', r.id);
    if (error) throw new Error(error.message);
    r = { ...r, ...cambios };
  }
  async function copiaPanel() {
    const id = r.formulario_id;
    if (!id) throw new Error('La solicitud no tiene referencia para el panel de formularios.');
    const { error } = await db.from('form_submissions').upsert({
      id, form_id: FORM_ALUMNI, form_name: NOMBRE_FORM_ALUMNI,
      sender_name: r.nombre, sender_email: r.email,
      ...(r.creado_en ? { created_at: r.creado_en } : {}),
      payload: { ...payloadSolicitudAlumni(r), _integraciones: {
        formspree: estadoFormspree(r), brevo: r.brevo_solicitud_en ? 'enviado' : 'pendiente',
      } },
    }, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    if (!r.formulario_registrado_en) await guardar({ formulario_registrado_en: new Date().toISOString() });
  }
  // El panel no depende de que Formspree o Brevo respondan.
  try { await copiaPanel(); } catch (err) { problemas.push('Panel de formularios: ' + err.message); }
  if (!r.brevo_solicitud_en) {
    try {
      if (!isConfigured()) throw new Error('Brevo no está configurado.');
      const [nombre, ...resto] = r.nombre.trim().split(/\s+/);
      await upsertContact(r.email, { FIRSTNAME: nombre, ...(resto.length ? { LASTNAME: resto.join(' ') } : {}),
        TELEFONO: r.telefono, PAIS: r.pais, INSTITUCION: r.hospital, ESPECIALIDAD: r.especialidad }, { signal: AbortSignal.timeout(6000) });
      // No se agrega a la lista de pagados: eso dispararía un pase antes del cobro.
      await guardar({ brevo_solicitud_en: new Date().toISOString() });
    } catch (err) { problemas.push('Contacto Brevo: ' + err.message); }
  }
  const estado = estadoFormspree(r);
  const vencido = !r.formspree_intentado_en || Date.now() - new Date(r.formspree_intentado_en).getTime() > 60000;
  if (estado === 'pendiente' || (reintentar && estado !== 'enviado' && (estado !== 'enviando' || vencido))) {
    const intento = crypto.randomUUID();
    let claim = db.from('alumni_pass_registros').update({
      formspree_estado: 'enviando', formspree_intento: intento,
      formspree_intentado_en: new Date().toISOString(), formspree_error: null,
    }).eq('id', r.id).eq('formspree_estado', r.formspree_estado || 'pendiente');
    claim = r.formspree_intento ? claim.eq('formspree_intento', r.formspree_intento) : claim.is('formspree_intento', null);
    const tomado = await claim.select('*').maybeSingle();
    if (tomado.error) problemas.push('No se pudo preparar el envío a Formspree.');
    else if (tomado.data) {
      r = tomado.data;
      let resultado;
      try {
        const respuesta = await fetch(`https://formspree.io/f/${FORM_ALUMNI}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payloadSolicitudAlumni(r)), signal: AbortSignal.timeout(8000),
        });
        const datos = await respuesta.json().catch(() => null);
        if (!respuesta.ok || datos?.ok !== true) {
          resultado = { formspree_estado: respuesta.status >= 400 && respuesta.status < 500 ? 'error' : 'sin_confirmar',
            formspree_error: `Formspree no confirmó la recepción (HTTP ${respuesta.status}). Revisa el buzón antes de reintentar.` };
        } else resultado = { formspree_estado: 'enviado', formspree_enviado_en: new Date().toISOString(), formspree_error: null };
      } catch {
        // Una desconexión puede ocurrir después de que el proveedor lo guarde.
        // No repetir automáticamente: el administrador verifica antes de reenviar.
        resultado = { formspree_estado: 'sin_confirmar', formspree_error: 'No se pudo confirmar la recepción en Formspree. Revisa su buzón antes de reintentar para evitar duplicados.' };
      }
      const guardado = await db.from('alumni_pass_registros').update(resultado).eq('id', r.id).eq('formspree_intento', intento);
      if (guardado.error) problemas.push('No se pudo guardar el estado de Formspree.');
      else r = { ...r, ...resultado };
    } else {
      const actual = await db.from('alumni_pass_registros').select('*').eq('id', r.id).single();
      if (!actual.error && actual.data) r = actual.data;
    }
  }
  try { await copiaPanel(); } catch (err) { problemas.push('Panel de formularios: ' + err.message); }
  if (problemas.length) console.error('Alumni Pass: registros pendientes:', problemas.join(' | '));
  const integraciones = estadoRegistrosAlumni(r);
  return { integraciones, avisoRegistros: integraciones.pendientes
    ? 'La solicitud está guardada en Alumni Pass. Hay registros externos pendientes; revisa sus estados y reintenta desde el panel.' : '' };
}
