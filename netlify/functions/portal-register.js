import { LISTS, isConfigured, buildAttributes, upsertContact, addToList, enviarCorreo } from './_brevo.js';
import { admin, isConfigured as supabaseListo } from './_supabase.js';
import { notificar } from './_notificaciones.js';

// Alta en el Portal Académico. Se llama desde AuthContext.signUp, justo después
// de que Supabase crea la cuenta. Entrar a la lista dispara en Brevo el correo
// de bienvenida con la ficha de perfil del alumno.
//
// Además avisa a los administradores que hay una cuenta nueva esperando acceso
// a sus cursos (si está configurada AVISO_REGISTROS_PARA).

const escapar = (texto) => String(texto || '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

// Solo se avisa de cuentas reales y recién creadas que siguen pendientes: esta
// función es pública y así nadie la usa para llenar de correos a los admins.
async function cuentaPendienteNueva(email) {
  if (!supabaseListo()) return null;
  const { data, error } = await admin()
    .from('profiles')
    .select('id, nombre_completo, email, telefono, institucion, pais, especialidad, cargo, created_at, aprobado')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();
  if (error || !data || data.aprobado !== false) return null;
  const minutos = (Date.now() - new Date(data.created_at).getTime()) / 60000;
  return minutos >= 0 && minutos <= 15 ? data : null;
}

async function avisarAdministradores(email) {
  const para = (process.env.AVISO_REGISTROS_PARA || '').split(',').map((c) => c.trim()).filter(Boolean);
  if (!para.length) return;

  // El perfil lo crea Supabase al registrarse; se le da un momento.
  let cuenta = await cuentaPendienteNueva(email);
  if (!cuenta) {
    await new Promise((r) => setTimeout(r, 2000));
    cuenta = await cuentaPendienteNueva(email);
  }
  if (!cuenta) return;

  const fila = (etiqueta, valor) => (valor ? `<p style="margin:4px 0"><strong>${etiqueta}:</strong> ${escapar(valor)}</p>` : '');
  await enviarCorreo({
    para,
    asunto: `Nueva cuenta por activar: ${cuenta.nombre_completo || cuenta.email}`,
    html: `
      <p>Una persona nueva se registró en el portal. Ya puede entrar, pero sus cursos quedan cerrados hasta que le des acceso y le asignes su grupo.</p>
      ${fila('Nombre', cuenta.nombre_completo)}
      ${fila('Correo', cuenta.email)}
      ${fila('Institución', cuenta.institucion)}
      ${fila('País', cuenta.pais)}
      <p style="margin-top:18px"><a href="https://healthcareexp.com/admin">Abrir el panel para activarla</a> (Alumnos → Cuentas por activar).</p>
    `,
  });
}

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const payload = JSON.parse(event.body);
    const email = String(payload.email || '').trim().toLowerCase();

    if (!email) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email requerido' }) };
    }

    if (!isConfigured()) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing env vars' }) };
    }

    // Esta ruta es pública (el registro puede exigir confirmar el correo).
    // Solo una cuenta real recién creada puede disparar la bienvenida. Los
    // atributos salen de su perfil; el cuerpo no puede pisar otro contacto.
    let perfil = await cuentaPendienteNueva(email);
    if (!perfil) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      perfil = await cuentaPendienteNueva(email);
    }
    if (!perfil) return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    const partes = String(perfil.nombre_completo || '').trim().split(/\s+/);
    await upsertContact(email, buildAttributes({
      ...perfil,
      nombres: partes[0],
      apellidos: partes.slice(1).join(' '),
      // Estado y grado no están en el perfil: son del propio registro recién creado.
      estado: typeof payload.estado === 'string' ? payload.estado.slice(0, 80) : undefined,
      grado: typeof payload.grado === 'string' ? payload.grado.slice(0, 80) : undefined,
    }));
    await addToList(email, LISTS.PORTAL);

    try {
      await avisarAdministradores(String(email).trim());
      // Notificación configurable "registro nuevo" (bienvenida o aviso a admins).
      await notificar(admin(), 'registro_nuevo', { userId: perfil.id, clave: `registro:${perfil.id}` });
    } catch (err) {
      // El alta en Brevo ya se hizo; el aviso a los admins es secundario.
      console.error('Aviso de registro a administradores:', err.message);
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };

  } catch (err) {
    console.error('Portal register error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
