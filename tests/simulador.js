// Supabase y Netlify simulados para las pruebas de humo.
//
// Se reemplaza `fetch` (lo usa supabase-js por dentro y las llamadas a
// /.netlify/functions), así que las pantallas corren su código real contra
// datos falsos. Entiende lo básico de PostgREST: filtros eq/in, offset/limit,
// .single()/.maybeSingle(), conteos con head:true y llamadas rpc.

export const URL_SUPABASE = 'https://prueba.supabase.co';

const ahora = new Date();
const hace = (dias) => new Date(ahora.getTime() - dias * 86400000).toISOString();
const en = (dias) => new Date(ahora.getTime() + dias * 86400000).toISOString();

export const ALUMNO = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'alumno@prueba.test',
  user_metadata: { nombre_completo: 'Alumna de Prueba' },
};
export const ADMIN = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'admin@prueba.test',
  user_metadata: { nombre_completo: 'Admin de Prueba' },
};

const perfil = (u, rol) => ({
  id: u.id, email: u.email, nombre_completo: u.user_metadata.nombre_completo, rol,
  activo: true, aprobado: true, telefono: '5555555555', pais: 'México', estado: 'CDMX',
  grado: 'Licenciatura', especialidad: 'Enfermería', institucion: 'Hospital de Prueba', cargo: 'Enfermera',
  avatar_url: null, zona_horaria: 'America/Mexico_City', created_at: hace(90),
});

export const CURSO = {
  id: 7, title: 'ECMO básico de prueba', description: 'Curso de prueba para las pruebas de humo.',
  duracion: '10 horas', modalidad: 'En línea', requisitos: 'Ninguno', image_url: '/assets/curso.jpg',
  image: '/assets/curso.jpg', link: '', youtube_video_id: 'dQw4w9WgXcQ', certificado_template_url: '',
  certificado_x: 300, certificado_y: 400, certificado_font_size: 40, min_aprobacion: 80, activo: true,
  category_id: 1, tipo: 'gratis', precio_mxn: null, vigencia_meses: null, created_at: hace(30),
};

export function datosBase() {
  const pAlumno = perfil(ALUMNO, 'estudiante');
  const pAdmin = perfil(ADMIN, 'admin');
  return {
    profiles: [pAlumno, pAdmin],
    courses: [CURSO, { ...CURSO, id: 8, title: 'Curso de pago de prueba', tipo: 'pago', precio_mxn: 1500, activo: false }],
    categories: [{ id: 1, name: 'ECMO', nombre: 'ECMO' }],
    questions: [{ id: 1, course_id: 7, question_text: '¿Pregunta de prueba?', options: ['Sí', 'No'], correct_option_index: 0 }],
    curso_lecciones: [
      { id: 101, course_id: 7, orden: 1, titulo: 'Módulo I', tipo: 'seccion', descripcion: '', duracion_min: null, obligatoria: false },
      { id: 102, course_id: 7, orden: 2, titulo: 'Introducción en video', tipo: 'video', descripcion: 'Video', duracion_min: 10, obligatoria: true },
      { id: 103, course_id: 7, orden: 3, titulo: 'Lectura de apoyo', tipo: 'texto', descripcion: 'Lectura', duracion_min: 5, obligatoria: true },
      { id: 104, course_id: 7, orden: 4, titulo: 'Tarea final', tipo: 'tarea', descripcion: 'Sube tu tarea', duracion_min: 15, obligatoria: true },
    ],
    leccion_contenido: [
      { leccion_id: 102, youtube_video_id: 'dQw4w9WgXcQ', archivo_path: null, texto: null, enlace: null },
      { leccion_id: 103, youtube_video_id: null, archivo_path: null, texto: '<p>Texto de la lectura.</p>', enlace: null },
      { leccion_id: 104, youtube_video_id: null, archivo_path: null, texto: 'Instrucciones de la tarea.', enlace: null },
    ],
    leccion_progreso: [{ user_id: ALUMNO.id, course_id: 7, leccion_id: 102, porcentaje: 100, completada: true }],
    inscripciones: [{ id: 1, user_id: ALUMNO.id, course_id: 7, created_at: hace(10) }],
    student_progress: [{ user_id: ALUMNO.id, course_id: 7, watch_percent: 40, completed: false, updated_at: hace(1) }],
    certificates: [{ id: 1, user_id: ALUMNO.id, course_id: 7, folio: 'FOL-123456', score: 90, issued_at: hace(2), created_at: hace(2), certificado_url: null }],
    curso_reglas: [],
    curso_contenido: [{ course_id: 7, youtube_video_id: 'dQw4w9WgXcQ' }],
    webinars: [{ id: 1, titulo: 'Webinar de prueba', title: 'Webinar de prueba', fecha: en(5), activo: true, slug: 'webinar-prueba' }],
    portal_config: [],
    grupos: [], grupo_cursos: [], grupo_miembros: [], divisiones: [], division_cursos: [],
    notificaciones: [], comunicados: [], mensajes: [], mensaje_destinatarios: [],
    solicitudes_inscripcion: [], tarea_entregas: [], student_activity: [], actividad_portal: [],
    form_submissions: [], facturacion_requests: [], facturacion_files: [], testimonials: [],
    classroom_comments: [], curso_archivos: [], sesiones_clase: [], curso_sesiones: [],
    evaluacion_preguntas: [], evaluacion_config: [], evaluacion_intentos: [], webinar_registros: [],
    errores_cliente: [],
  };
}

export const rpcBase = () => ({
  perfiles_publicos: [],
  mi_apertura: [],
  mis_logros: [],
  tabla_posiciones: [],
  lugares_ocupados: [],
  preguntas_admin: [],
});

// Estado mutable que cada prueba puede ajustar.
export const simulado = {
  tablas: datosBase(),
  rpc: rpcBase(),
  netlify: {}, // { 'nombre-funcion': objeto | (req) => objeto }
  peticiones: [],
};

export function reiniciarSimulado() {
  simulado.tablas = datosBase();
  simulado.rpc = rpcBase();
  simulado.netlify = {};
  simulado.peticiones = [];
}

// ---- AuthContext simulado --------------------------------------------------
export const authSimulado = { valor: null };

export function sesionComo(usuario) {
  const tablas = simulado.tablas;
  const perfilUsuario = usuario ? tablas.profiles.find((p) => p.id === usuario.id) : null;
  const noop = async () => ({ error: null });
  authSimulado.valor = {
    user: usuario,
    profile: perfilUsuario,
    loading: false,
    sessionRecoveryRequired: null,
    signUp: noop,
    login: noop,
    logout: noop,
    retrySessionRecovery: noop,
    resetPassword: noop,
    updateProfile: async () => ({ error: null, data: perfilUsuario }),
    updateUserMetadata: noop,
    refetchProfile: async () => perfilUsuario,
  };
}

// ---- fetch simulado --------------------------------------------------------
const respuesta = (cuerpo, { status = 200, headers = {} } = {}) => new Response(
  cuerpo === undefined ? null : JSON.stringify(cuerpo),
  { status, headers: { 'Content-Type': 'application/json', ...headers } },
);

function filtrar(filas, params) {
  let lista = [...filas];
  for (const [col, valor] of params.entries()) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(col)) continue;
    if (col === 'or' || col === 'and') continue;
    const tieneCol = (f) => Object.prototype.hasOwnProperty.call(f, col);
    if (valor.startsWith('eq.')) {
      const v = valor.slice(3);
      lista = lista.filter((f) => !tieneCol(f) || String(f[col]) === v);
    } else if (valor.startsWith('in.(')) {
      const vs = valor.slice(4, -1).split(',').map((s) => s.replace(/^"|"$/g, ''));
      lista = lista.filter((f) => !tieneCol(f) || vs.includes(String(f[col])));
    } else if (valor === 'is.null') {
      lista = lista.filter((f) => !tieneCol(f) || f[col] == null);
    }
  }
  const offset = Number(params.get('offset') || 0);
  const limit = params.get('limit') != null ? Number(params.get('limit')) : undefined;
  return lista.slice(offset, limit != null ? offset + limit : undefined);
}

async function leerCuerpo(init) {
  if (!init?.body || typeof init.body !== 'string') return null;
  try { return JSON.parse(init.body); } catch { return null; }
}

function cabecera(init, nombre) {
  const h = init?.headers;
  if (!h) return '';
  if (typeof h.get === 'function') return h.get(nombre) || '';
  const clave = Object.keys(h).find((k) => k.toLowerCase() === nombre.toLowerCase());
  return clave ? h[clave] : '';
}

export async function fetchSimulado(entrada, init = {}) {
  const urlTexto = typeof entrada === 'string' ? entrada : entrada?.url || String(entrada);
  const url = new URL(urlTexto, 'http://localhost');
  const metodo = (init.method || (typeof entrada === 'object' && entrada?.method) || 'GET').toUpperCase();
  simulado.peticiones.push({ metodo, url: url.pathname + url.search });

  // Funciones de Netlify.
  if (url.pathname.startsWith('/.netlify/functions/')) {
    const nombre = url.pathname.split('/').pop();
    const def = simulado.netlify[nombre];
    const cuerpo = typeof def === 'function' ? def({ metodo, url, cuerpo: await leerCuerpo(init) }) : def;
    return respuesta(cuerpo ?? { ok: true });
  }

  if (!urlTexto.startsWith(URL_SUPABASE)) {
    // Cualquier otro servicio externo (geo, YouTube, etc.): vacío.
    return respuesta({});
  }

  // Auth.
  if (url.pathname.startsWith('/auth/v1/')) {
    if (url.pathname.endsWith('/user')) {
      const u = authSimulado.valor?.user;
      return u ? respuesta(u) : respuesta({ message: 'sin sesión' }, { status: 401 });
    }
    return respuesta({});
  }

  // Storage.
  if (url.pathname.startsWith('/storage/v1/')) {
    if (url.pathname.includes('/sign/')) return respuesta({ signedURL: '/archivo-firmado' });
    return respuesta([]);
  }

  // RPC.
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const nombre = url.pathname.split('/').pop();
    if (!(nombre in simulado.rpc)) {
      return respuesta({ code: 'PGRST202', message: `Could not find the function public.${nombre}` }, { status: 404 });
    }
    const def = simulado.rpc[nombre];
    return respuesta(typeof def === 'function' ? def(await leerCuerpo(init)) : def);
  }

  // Tablas.
  if (url.pathname.startsWith('/rest/v1/')) {
    const tabla = url.pathname.slice('/rest/v1/'.length);
    const filas = simulado.tablas[tabla];
    if (!filas) {
      return respuesta({ code: '42P01', message: `relation "public.${tabla}" does not exist` }, { status: 404 });
    }
    const prefer = cabecera(init, 'Prefer');
    const accept = cabecera(init, 'Accept');

    if (metodo === 'GET' || metodo === 'HEAD') {
      const lista = filtrar(filas, url.searchParams);
      const total = filtrar(filas, new URLSearchParams([...url.searchParams].filter(([k]) => k !== 'offset' && k !== 'limit'))).length;
      const headers = /count=/.test(prefer) ? { 'Content-Range': `0-${Math.max(lista.length - 1, 0)}/${total}` } : {};
      if (metodo === 'HEAD') return new Response(null, { status: 200, headers });
      if (accept.includes('vnd.pgrst.object')) {
        if (lista.length !== 1) {
          return respuesta({ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned', details: `The result contains ${lista.length} rows` }, { status: 406 });
        }
        return respuesta(lista[0], { headers });
      }
      return respuesta(lista, { headers });
    }

    // Escrituras: se devuelve lo enviado (no se guarda).
    const cuerpo = await leerCuerpo(init);
    const filasEnviadas = Array.isArray(cuerpo) ? cuerpo : cuerpo ? [{ ...filas[0], ...cuerpo }] : [];
    if (accept.includes('vnd.pgrst.object')) return respuesta(filasEnviadas[0] || {}, { status: 201 });
    return respuesta(/return=representation/.test(prefer) ? filasEnviadas : undefined, { status: /return=representation/.test(prefer) ? 201 : 204 });
  }

  return respuesta({});
}
