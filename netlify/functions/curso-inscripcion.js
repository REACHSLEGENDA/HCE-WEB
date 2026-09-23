// Inscripción a los cursos del portal.
//
// Todas las altas pasan por aquí y no por el navegador: la tabla de
// inscripciones no acepta escrituras directas, así que nadie puede
// inscribirse solo a un curso de pago editando una petición.
//
// Acciones:
//   gratis          el alumno se inscribe a un curso gratuito
//   checkout        abre el cobro de Stripe de un curso de pago
//   confirmar       al volver de Stripe, verifica el pago e inscribe
//   admin-inscribir un administrador inscribe a alguien (becas, casos manuales)
//   admin-quitar    un administrador da de baja una inscripción
//   admin-inscribir-correos   inscribe una lista de correos pegada de golpe
//   admin-grupo-sincronizar   inscribe a los miembros de un grupo en sus cursos

import { admin, usuarioDesdeToken, adminDesdeToken, json, isConfigured as supabaseListo } from './_supabase.js';
import { getStripe } from './_stripe.js';
import { inscribir, inscribirDesdeSesion, importeEnMoneda, TIPO_COBRO } from './_inscripciones.js';

async function cargarCurso(db, courseId) {
  const { data, error } = await db
    .from('courses')
    .select('id, title, description, image_url, activo, tipo, precio_mxn')
    .eq('id', Number(courseId))
    .single();

  if (error || !data) return null;
  return data;
}

function origenDe(event) {
  return (
    event.headers.origin ||
    (event.headers.referer ? event.headers.referer.split('/').slice(0, 3).join('/') : null) ||
    'https://healthcareexp.com'
  );
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!supabaseListo()) {
    return json(500, { error: 'Las inscripciones no están configuradas en el servidor.' });
  }

  try {
    const cuerpo = JSON.parse(event.body || '{}');
    const { accion } = cuerpo;
    const db = admin();

    // ---- Inscripción masiva y por grupos (administrador) -------------------
    if (accion === 'admin-inscribir-correos' || accion === 'admin-grupo-sincronizar') {
      const administrador = await adminDesdeToken(event.headers);
      if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

      // Pegar una lista de correos (de un hospital, de una generación) e
      // inscribirlos a todos en un curso. Devuelve quién no tiene cuenta, para
      // que el administrador sepa a quién invitar a registrarse.
      if (accion === 'admin-inscribir-correos') {
        const { correos = [], courseId } = cuerpo;
        const curso = await cargarCurso(db, courseId);
        if (!curso) return json(404, { error: 'Ese curso ya no existe.' });

        const buscados = [...new Set(correos.map((c) => String(c).trim().toLowerCase()).filter(Boolean))];
        if (!buscados.length) return json(400, { error: 'No hay correos en la lista.' });

        const { data: perfiles, error } = await db.from('profiles').select('id, email').range(0, 9999);
        if (error) throw new Error(error.message);
        const porCorreo = new Map((perfiles || []).map((p) => [String(p.email || '').toLowerCase(), p.id]));

        const encontrados = buscados.filter((c) => porCorreo.has(c));
        for (const correo of encontrados) {
          await inscribir(db, { userId: porCorreo.get(correo), courseId: curso.id, origen: 'admin' });
        }
        return json(200, {
          ok: true,
          inscritos: encontrados.length,
          sinCuenta: buscados.filter((c) => !porCorreo.has(c)),
        });
      }

      // Inscribe a todos los miembros del grupo en todos sus cursos. Se llama
      // cada vez que cambia el grupo; es idempotente, así que no duplica nada.
      const { grupoId } = cuerpo;
      const [{ data: miembros }, { data: cursos }] = await Promise.all([
        db.from('grupo_miembros').select('user_id').eq('grupo_id', Number(grupoId)),
        db.from('grupo_cursos').select('course_id').eq('grupo_id', Number(grupoId)),
      ]);

      let nuevas = 0;
      for (const m of miembros || []) {
        for (const c of cursos || []) {
          const { data: previa } = await db
            .from('inscripciones')
            .select('id')
            .eq('user_id', m.user_id)
            .eq('course_id', c.course_id)
            .maybeSingle();
          if (previa) continue;
          await inscribir(db, { userId: m.user_id, courseId: c.course_id, origen: 'grupo' });
          nuevas += 1;
        }
      }
      return json(200, { ok: true, nuevas });
    }

    // ---- Acciones de administrador ------------------------------------------
    if (accion === 'admin-inscribir' || accion === 'admin-quitar') {
      const administrador = await adminDesdeToken(event.headers);
      if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

      const { userId, courseId } = cuerpo;
      if (!userId || !courseId) return json(400, { error: 'Falta el alumno o el curso.' });

      if (accion === 'admin-quitar') {
        const { error } = await db
          .from('inscripciones')
          .delete()
          .eq('user_id', userId)
          .eq('course_id', Number(courseId));
        if (error) throw new Error(error.message);
        return json(200, { ok: true });
      }

      const curso = await cargarCurso(db, courseId);
      if (!curso) return json(404, { error: 'Ese curso ya no existe.' });

      await inscribir(db, { userId, courseId: curso.id, origen: 'admin' });
      return json(200, { ok: true });
    }

    // ---- Acciones del alumno ------------------------------------------------
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });

    if (accion === 'confirmar') {
      const { sessionId, moneda = 'mxn' } = cuerpo;
      if (!sessionId) return json(400, { error: 'Falta la referencia del pago.' });

      const { stripe } = getStripe(moneda);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Un pago solo puede inscribir a quien lo hizo.
      if (session?.metadata?.user_id !== user.id) {
        return json(403, { error: 'Ese pago no corresponde a tu cuenta.' });
      }

      if (session.payment_status !== 'paid') {
        return json(409, {
          error: 'Stripe todavía no confirma el pago. Si ya te llegó el cargo, en unos minutos tu curso aparecerá solo.',
          estado: 'pendiente',
        });
      }

      await inscribirDesdeSesion(db, session);
      return json(200, { ok: true, courseId: Number(session.metadata.course_id) });
    }

    const { courseId } = cuerpo;
    if (!courseId) return json(400, { error: 'Falta el curso.' });

    const curso = await cargarCurso(db, courseId);
    if (!curso || curso.activo === false) {
      return json(404, { error: 'Ese curso no está disponible.' });
    }

    // Si ya estaba inscrito no se le cobra de nuevo ni se duplica nada.
    const { data: previa } = await db
      .from('inscripciones')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', curso.id)
      .maybeSingle();

    if (previa) return json(200, { ok: true, yaInscrito: true, courseId: curso.id });

    if (accion === 'gratis') {
      if (curso.tipo === 'pago') {
        return json(402, { error: 'Este curso es de pago.', estado: 'requiere-pago' });
      }

      await inscribir(db, { userId: user.id, courseId: curso.id, origen: 'gratis' });
      return json(200, { ok: true, courseId: curso.id });
    }

    if (accion === 'checkout') {
      if (curso.tipo !== 'pago' || !curso.precio_mxn) {
        return json(400, { error: 'Este curso no tiene precio configurado.' });
      }

      const moneda = cuerpo.moneda === 'usd' ? 'usd' : 'mxn';
      const { stripe, pasarela } = getStripe(moneda);
      const importe = importeEnMoneda(curso.precio_mxn, moneda);
      const origen = origenDe(event);

      const metadata = {
        tipo: TIPO_COBRO,
        course_id: String(curso.id),
        user_id: user.id,
        email: user.email || '',
        moneda,
        pasarela,
        // `curso` es lo que lee el módulo de Pagos del panel para clasificar el
        // cobro; sin él un pago en dólares se confundiría con los de CNADOT.
        curso: curso.title,
      };

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        locale: 'es-419',
        customer_email: user.email || undefined,
        client_reference_id: user.id,
        line_items: [{
          quantity: 1,
          price_data: {
            currency: moneda,
            unit_amount: importe * 100,
            product_data: {
              name: curso.title,
              description: 'Curso en línea · Portal Académico HCE',
              ...(curso.image_url && /^https:\/\//.test(curso.image_url) ? { images: [curso.image_url] } : {}),
            },
          },
        }],
        metadata,
        payment_intent_data: { metadata },
        success_url: `${origen}/dashboard?curso_pago=ok&session_id={CHECKOUT_SESSION_ID}&m=${moneda}`,
        cancel_url: `${origen}/dashboard?curso_pago=cancelado`,
      });

      return json(200, { url: session.url });
    }

    return json(400, { error: 'Acción no reconocida.' });
  } catch (err) {
    console.error('Curso inscripcion error:', err.message);
    return json(500, { error: err.message });
  }
};
