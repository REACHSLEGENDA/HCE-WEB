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
//   admin-solicitud-resolver  aprueba o rechaza una solicitud de inscripción
//
// Antes de inscribir o cobrar se revisan las reglas del curso (lms-reglas.sql):
// visibilidad, cupo, prerrequisitos y solicitud de inscripción.

import { admin, usuarioDesdeToken, adminDesdeToken, cuentaHabilitada, esEsquemaFaltante, registrarAccionAdmin, json, isConfigured as supabaseListo } from './_supabase.js';
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

// Reglas del curso; sin la migración (o sin fila) no hay restricciones.
async function cargarReglas(db, courseId) {
  const { data, error } = await db.from('curso_reglas').select('*').eq('course_id', courseId).maybeSingle();
  if (error) {
    if (esEsquemaFaltante(error)) return null;
    throw new Error(error.message);
  }
  return data;
}

// Revisa si el alumno puede inscribirse. Devuelve null si puede, o la respuesta
// de error que hay que dar.
async function revisarReglas(db, curso, reglas, userId) {
  if (!reglas) return null;

  if (reglas.oculto_catalogo) {
    return json(403, { error: 'Este curso se asigna por invitación. Escríbenos si te interesa.', estado: 'solo-invitacion' });
  }

  if (reglas.cupo) {
    const { count } = await db.from('inscripciones').select('id', { count: 'exact', head: true }).eq('course_id', curso.id);
    if ((count || 0) >= reglas.cupo) {
      return json(409, { error: 'Este curso ya no tiene lugares disponibles.', estado: 'cupo-lleno' });
    }
  }

  const requeridos = (reglas.prerrequisitos || []).map(Number).filter((id) => id && id !== curso.id);
  if (requeridos.length) {
    const { data: certs } = await db.from('certificates').select('course_id').eq('user_id', userId).in('course_id', requeridos);
    const tiene = new Set((certs || []).map((c) => Number(c.course_id)));
    const faltan = requeridos.filter((id) => !tiene.has(id));
    if (faltan.length) {
      const { data: nombres } = await db.from('courses').select('id, title').in('id', faltan);
      const lista = (nombres || []).map((c) => c.title).join(', ');
      return json(409, {
        error: `Antes de este curso necesitas terminar: ${lista || 'otro curso'}.`,
        estado: 'prerrequisitos',
        faltan,
      });
    }
  }
  return null;
}

// Recompensa por nivel (gamificacion.sql): el mayor % de descuento que el
// alumno ya se ganó con sus puntos. Sin la migración, no hay descuento.
async function descuentoPorNivel(db, userId) {
  try {
    const [{ data: config }, { data: puntos, error }] = await Promise.all([
      db.from('gamificacion_config').select('activo, puntos_por_nivel, recompensas').eq('id', 1).maybeSingle(),
      db.rpc('puntos_de_usuario', { p_user: userId }),
    ]);
    if (error || !config?.activo) return 0;
    const nivel = Math.floor((Number(puntos) || 0) / Math.max(1, config.puntos_por_nivel || 200)) + 1;
    return (Array.isArray(config.recompensas) ? config.recompensas : [])
      .filter((r) => Number(r.nivel) > 0 && nivel >= Number(r.nivel))
      .reduce((m, r) => Math.max(m, Math.min(90, Number(r.descuento) || 0)), 0);
  } catch {
    return 0;
  }
}

// Supabase devuelve como máximo 1000 filas por consulta: se pide por páginas
// (con orden estable) hasta traerlo todo.
async function traerTodo(armarConsulta) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await armarConsulta().range(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

// Corre las altas de 10 en 10 en paralelo: una por una, una lista grande
// pasaba el límite de 10 segundos de Netlify.
async function enLotes(lista, fn, tamano = 10) {
  const resultados = [];
  for (let i = 0; i < lista.length; i += tamano) {
    resultados.push(...await Promise.all(lista.slice(i, i + tamano).map(fn)));
  }
  return resultados;
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

        const perfiles = await traerTodo(() => db.from('profiles').select('id, email').order('id'));
        const porCorreo = new Map(perfiles.map((p) => [String(p.email || '').toLowerCase(), p.id]));

        // Sin correo por cada alta: en una lista grande serían cientos de
        // envíos y la función no alcanzaría a terminar.
        const encontrados = buscados.filter((c) => porCorreo.has(c));
        await enLotes(encontrados, (correo) =>
          inscribir(db, { userId: porCorreo.get(correo), courseId: curso.id, origen: 'admin', avisar: false }));
        return json(200, {
          ok: true,
          inscritos: encontrados.length,
          sinCuenta: buscados.filter((c) => !porCorreo.has(c)),
        });
      }

      // Inscribe a todos los miembros del grupo en todos sus cursos. Se llama
      // cada vez que cambia el grupo; es idempotente, así que no duplica nada.
      const { grupoId } = cuerpo;
      const [miembros, cursos] = await Promise.all([
        traerTodo(() => db.from('grupo_miembros').select('user_id').eq('grupo_id', Number(grupoId)).order('user_id')),
        traerTodo(() => db.from('grupo_cursos').select('course_id').eq('grupo_id', Number(grupoId)).order('course_id')),
      ]);

      // Las inscripciones que ya existen se traen de una vez (por tandas de
      // alumnos) en lugar de preguntar par por par.
      const idsAlumnos = [...new Set((miembros || []).map((m) => m.user_id))];
      const idsCursos = [...new Set((cursos || []).map((c) => c.course_id))];
      const existentes = new Set();
      if (idsAlumnos.length && idsCursos.length) {
        for (let i = 0; i < idsAlumnos.length; i += 100) {
          const tanda = idsAlumnos.slice(i, i + 100);
          const filas = await traerTodo(() => db.from('inscripciones').select('id, user_id, course_id')
            .in('user_id', tanda).in('course_id', idsCursos).order('id'));
          filas.forEach((f) => existentes.add(`${f.user_id}:${f.course_id}`));
        }
      }
      const pendientes = [];
      for (const userId of idsAlumnos) {
        for (const courseId of idsCursos) {
          if (!existentes.has(`${userId}:${courseId}`)) pendientes.push({ userId, courseId });
        }
      }
      const altas = await enLotes(pendientes, (p) =>
        inscribir(db, { userId: p.userId, courseId: p.courseId, origen: 'grupo', avisar: false }));
      const nuevas = altas.filter((a) => a?.nueva).length;
      return json(200, { ok: true, nuevas });
    }

    // ---- Solicitudes de inscripción (administrador) --------------------------
    if (accion === 'admin-solicitud-resolver') {
      const administrador = await adminDesdeToken(event.headers);
      if (!administrador) return json(403, { error: 'Solo un administrador puede hacer esto.' });

      const { solicitudId, aprobar } = cuerpo;
      const { data: solicitud } = await db.from('solicitudes_inscripcion').select('*').eq('id', Number(solicitudId)).maybeSingle();
      if (!solicitud) return json(404, { error: 'Esa solicitud ya no existe.' });

      if (aprobar) await inscribir(db, { userId: solicitud.user_id, courseId: solicitud.course_id, origen: 'admin' });
      await registrarAccionAdmin({ adminId: administrador.id, accion: aprobar ? 'solicitud_aprobada' : 'solicitud_rechazada', objetivoUserId: solicitud.user_id, courseId: solicitud.course_id });
      const { error } = await db
        .from('solicitudes_inscripcion')
        .update({ estado: aprobar ? 'aprobada' : 'rechazada', resuelta_en: new Date().toISOString() })
        .eq('id', solicitud.id);
      if (error) throw new Error(error.message);
      return json(200, { ok: true });
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
        await registrarAccionAdmin({ adminId: administrador.id, accion: 'baja_curso', objetivoUserId: userId, courseId: Number(courseId) });
        return json(200, { ok: true });
      }

      const curso = await cargarCurso(db, courseId);
      if (!curso) return json(404, { error: 'Ese curso ya no existe.' });

      await inscribir(db, { userId, courseId: curso.id, origen: 'admin' });
      await registrarAccionAdmin({ adminId: administrador.id, accion: 'inscripcion_admin', objetivoUserId: userId, courseId: curso.id });
      return json(200, { ok: true });
    }

    // ---- Acciones del alumno ------------------------------------------------
    const user = await usuarioDesdeToken(event.headers);
    if (!user) return json(401, { error: 'Tu sesión expiró. Vuelve a entrar al portal.' });

    const cuenta = await cuentaHabilitada(user.id);
    if (!cuenta.habilitada) return json(403, { error: cuenta.error, estado: 'cuenta-no-habilitada' });

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

    const reglas = await cargarReglas(db, curso.id);
    if (accion === 'gratis' || accion === 'checkout') {
      const rechazo = await revisarReglas(db, curso, reglas, user.id);
      if (rechazo) return rechazo;
    }

    if (accion === 'gratis') {
      if (curso.tipo === 'pago') {
        return json(402, { error: 'Este curso es de pago.', estado: 'requiere-pago' });
      }

      // Con solicitud de inscripción, el alumno queda en espera hasta que un
      // administrador la apruebe.
      if (reglas?.requiere_solicitud) {
        const { error } = await db
          .from('solicitudes_inscripcion')
          .upsert([{ user_id: user.id, course_id: curso.id, estado: 'pendiente', creada_en: new Date().toISOString(), resuelta_en: null }], { onConflict: 'user_id,course_id' });
        if (error) throw new Error(error.message);
        return json(200, { ok: true, estado: 'solicitud-enviada', courseId: curso.id });
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
      const descuento = await descuentoPorNivel(db, user.id);
      const precioFinal = descuento ? Math.round(curso.precio_mxn * (1 - descuento / 100)) : curso.precio_mxn;
      const importe = importeEnMoneda(precioFinal, moneda);
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
        ...(descuento ? { descuento_nivel: String(descuento) } : {}),
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
              name: descuento ? `${curso.title} (${descuento}% de descuento por tu nivel)` : curso.title,
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
