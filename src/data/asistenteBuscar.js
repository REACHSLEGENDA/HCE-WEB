/* ---------------------------------------------------------------------------
 * Búsqueda de dudas sin IA: difusa, sin acentos y con sinónimos.
 *
 * "no puedo entrar a mi curso", "no me deja acceder a la clase" y
 * "no pudo entar al curzo" llevan a la misma entrada. Cada palabra de la
 * pregunta se compara con las de cada entrada por:
 *   - igualdad o misma raíz (quitando plurales y terminaciones comunes),
 *   - prefijo (≥ 4 letras: "certif" → "certificado"),
 *   - error de dedo (distancia de edición 1, o 2 en palabras largas),
 *   - sinónimo ("constancia" ≈ "certificado", "liga" ≈ "enlace").
 * El título y las frases clave pesan más que los pasos. Las entradas de la
 * pantalla actual reciben un empujón.
 * ------------------------------------------------------------------------ */

export function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\*\*/g, ' ')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const VACIAS = new Set(('a al ante con de del el la las lo los un una unos unas y o u e en es ' +
  'mi mis me te tu tus su sus se que como para por con sin sobre ya hay muy mas pero ' +
  'cual cuales donde cuando quien esta este esto estos estas eso ese esa ahi aqui ' +
  'yo le les nos hola buenas buenos dias tardes noches favor gracias porfa porfavor quiero ' +
  'necesito puedo podria hacer hago tengo tiene debo ser fue era son soy estoy algo alguien').split(' '));
// "puedo" y "tengo" son vacías, pero "no" no: distingue problemas de guías.
VACIAS.delete('no');

// Grupos de sinónimos: la primera palabra es la canónica.
const SINONIMOS = [
  ['curso', 'clase', 'materia', 'diplomado', 'modulo', 'capacitacion', 'programa'],
  ['entrar', 'acceder', 'acceso', 'ingresar', 'abrir', 'abre', 'entro', 'deja', 'login'],
  ['certificado', 'constancia', 'diploma', 'titulo', 'reconocimiento'],
  ['pago', 'pagar', 'pague', 'pagado', 'compra', 'comprar', 'compre', 'cobro', 'cobraron', 'cargo', 'tarjeta', 'stripe'],
  ['correo', 'email', 'mail', 'gmail', 'outlook', 'buzon'],
  ['video', 'youtube', 'vimeo', 'reproductor', 'grabacion'],
  ['carga', 'cargar', 'reproduce', 'funciona', 'sirve', 'trabado', 'traba', 'congela'],
  ['examen', 'evaluacion', 'prueba', 'test', 'quiz', 'cuestionario'],
  ['tarea', 'entrega', 'actividad', 'trabajo'],
  ['contrasena', 'password', 'clave', 'contra'],
  ['aprobar', 'activar', 'autorizar', 'aceptar', 'habilitar', 'validar', 'dar'],
  ['cuenta', 'usuario', 'registro', 'perfil'],
  ['ver', 'veo', 'aparece', 'aparecen', 'sale', 'muestra', 'encuentro', 'hallo', 've'],
  ['grupo', 'generacion', 'cohorte'],
  ['fecha', 'inicio', 'inicia', 'empieza', 'arranca', 'apertura'],
  ['alumno', 'estudiante', 'participante', 'inscrito', 'alumna'],
  ['inscribir', 'inscripcion', 'inscribo', 'matricular', 'matricula', 'registrar', 'agregar'],
  ['descargar', 'bajar', 'imprimir', 'pdf'],
  ['enlace', 'link', 'liga', 'url'],
  ['reenviar', 'reenvio', 'mandar', 'enviar', 'envio'],
  ['zoom', 'vivo', 'reunion', 'sesion', 'videollamada'],
  ['revision', 'pendiente', 'espera', 'aprobacion', 'revisar'],
  ['vencido', 'vencio', 'expiro', 'caduco', 'termino', 'vigencia'],
  ['llega', 'llego', 'recibi', 'recibo', 'recibido'],
  ['olvide', 'olvido', 'recuerdo', 'perdi', 'recuperar', 'restablecer'],
  ['factura', 'facturar', 'cfdi', 'rfc', 'fiscal'],
  ['nota', 'calificacion', 'calificaciones', 'puntaje', 'resultado', 'saque'],
  ['webinar', 'webinario', 'seminario', 'conferencia'],
  ['crear', 'nuevo', 'nueva', 'alta', 'hacer'],
  ['avance', 'progreso', 'porcentaje', 'guarda', 'marca', 'completada'],
  ['celular', 'telefono', 'movil', 'app', 'aplicacion', 'iphone', 'android'],
  ['tema', 'oscuro', 'claro', 'apariencia', 'colores'],
  ['horario', 'hora', 'horas', 'zona'],
  ['intento', 'intentos', 'oportunidad', 'repetir', 'reiniciar'],
  ['alumni', 'refresher'],
];

const CANONICA = new Map();
for (const grupo of SINONIMOS) for (const palabra of grupo) if (!CANONICA.has(palabra)) CANONICA.set(palabra, grupo[0]);

// Raíz sencilla: quita plurales y algunas terminaciones verbales comunes.
export function raiz(palabra) {
  let p = palabra;
  if (p.length > 5) p = p.replace(/(aciones|iciones|amiento|imiento)$/, '');
  if (p.length > 4) p = p.replace(/(es|s)$/, '');
  if (p.length > 5) p = p.replace(/(ando|iendo|ado|ido|ada|ida|ar|er|ir)$/, '');
  return p;
}

function distancia(a, b, tope) {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let previa = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    let minimo = i;
    for (let j = 1; j <= b.length; j++) {
      fila[j] = Math.min(previa[j] + 1, fila[j - 1] + 1, previa[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (fila[j] < minimo) minimo = fila[j];
    }
    if (minimo > tope) return tope + 1;
    previa = fila;
  }
  return previa[b.length];
}

export function palabras(texto) {
  return normalizar(texto).split(' ').filter((p) => p && !VACIAS.has(p));
}

// Canónica de una palabra, tolerando errores de dedo contra el diccionario.
const DICCIONARIO = [...CANONICA.keys()];
const cacheCanonica = new Map();
function canonica(palabra) {
  if (cacheCanonica.has(palabra)) return cacheCanonica.get(palabra);
  let c = CANONICA.get(palabra) || CANONICA.get(raiz(palabra)) || null;
  if (!c && palabra.length >= 5) {
    const tope = palabra.length >= 8 ? 2 : 1;
    const cercana = DICCIONARIO.find((d) => d.length >= 4 && distancia(palabra, d, tope) <= tope);
    if (cercana) c = CANONICA.get(cercana);
  }
  cacheCanonica.set(palabra, c);
  return c;
}

// ¿Qué tan parecidas son dos palabras? 1 = iguales, 0 = nada.
function parecido(a, b) {
  if (a === b) return 1;
  const ra = raiz(a), rb = raiz(b);
  if (ra === rb) return 0.95;
  const corta = ra.length <= rb.length ? ra : rb;
  const larga = corta === ra ? rb : ra;
  if (corta.length >= 4 && larga.startsWith(corta)) return 0.85;
  if (Math.min(a.length, b.length) >= 5) {
    const tope = Math.min(a.length, b.length) >= 8 ? 2 : 1;
    if (distancia(a, b, tope) <= tope) return 0.8;
  }
  const ca = canonica(a), cb = canonica(b);
  if (ca && ca === cb) return 0.75;
  return 0;
}

// Índice de una entrada: palabras con su peso según dónde aparecen.
const cacheIndice = new WeakMap();
function indice(entrada) {
  if (cacheIndice.has(entrada)) return cacheIndice.get(entrada);
  const pesos = new Map();
  const sumar = (texto, peso) => {
    for (const p of palabras(texto)) if ((pesos.get(p) || 0) < peso) pesos.set(p, peso);
  };
  sumar(entrada.titulo, 3);
  (entrada.claves || []).forEach((c) => sumar(c, 3));
  sumar(entrada.texto, 1.5);
  (entrada.pasos || []).forEach((p) => sumar(p, 1));
  (entrada.casos || []).forEach((c) => { sumar(c.si, 1.5); sumar(c.entonces, 1); });
  sumar(entrada.nota, 0.8);
  sumar(entrada.cuerpo, 0.8);
  const frases = [entrada.titulo, ...(entrada.claves || [])].map(normalizar).filter(Boolean);
  const resultado = { pesos: [...pesos.entries()], frases };
  cacheIndice.set(entrada, resultado);
  return resultado;
}

/**
 * Busca la pregunta en las entradas.
 * @param {string} pregunta
 * @param {object[]} entradas  ya filtradas por rol
 * @param {{ pantalla?: string, limite?: number }} opciones
 * @returns {{ entrada: object, puntaje: number }[]} de mejor a peor
 */
export function buscar(pregunta, entradas, { pantalla = null, limite = 5 } = {}) {
  const consulta = palabras(pregunta);
  const frase = normalizar(pregunta);
  if (!consulta.length) return [];

  const resultados = [];
  for (const entrada of entradas) {
    const { pesos, frases } = indice(entrada);
    let suma = 0;
    let encontradas = 0;
    for (const q of consulta) {
      // "no" solo cuenta si la entrada también habla en negativo.
      const valorPalabra = q === 'no' ? 0.4 : 1;
      let mejor = 0;
      for (const [p, peso] of pesos) {
        const s = parecido(q, p);
        if (s > 0 && s * peso > mejor) mejor = s * peso;
        if (mejor >= 3) break;
      }
      if (mejor > 0) encontradas += valorPalabra;
      suma += mejor * valorPalabra;
    }
    const totalConsulta = consulta.reduce((t, q) => t + (q === 'no' ? 0.4 : 1), 0);
    const cobertura = encontradas / totalConsulta;
    if (cobertura < 0.34) continue;
    let puntaje = (suma / totalConsulta) * (0.5 + cobertura);
    // La frase completa dentro del título o de una clave vale mucho.
    if (frase.length >= 6 && frases.some((f) => f.includes(frase) || (f.length >= 8 && frase.includes(f)))) puntaje += 2;
    // «Cómo activar un curso» conserva el mismo sentido que «activar curso».
    // La coincidencia del título/frase pesa más que palabras dispersas en pasos.
    const nucleo = consulta.join(' ');
    if (nucleo.length >= 6 && frases.some((f) => palabras(f).join(' ') === nucleo)) puntaje += 2;
    if (pantalla && entrada.pantallas?.includes(pantalla)) puntaje *= 1.15;
    if (entrada.tipo === 'problema' && consulta.includes('no')) puntaje *= 1.1;
    resultados.push({ entrada, puntaje: Math.round(puntaje * 100) / 100 });
  }
  return resultados
    .filter((r) => r.puntaje >= 1.2)
    .sort((a, b) => b.puntaje - a.puntaje)
    .slice(0, limite);
}

/** Sugerencias mientras se escribe: solo títulos, más permisivo. */
export function sugerir(texto, entradas, opciones = {}) {
  if (normalizar(texto).length < 3) return [];
  return buscar(texto, entradas, { ...opciones, limite: 3 });
}
