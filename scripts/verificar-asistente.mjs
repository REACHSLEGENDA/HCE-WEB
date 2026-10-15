// Revisión del asistente (ChatBot): flujos, base de conocimiento, pantallas y búsqueda.
// node scripts/verificar-asistente.mjs
import assert from 'node:assert/strict';
import { FLUJOS, ACCIONES_FLUJO, FLUJOS_RAIZ } from '../src/data/asistenteFlujos.js';
import { BASE_CONOCIMIENTO, entradaPorId, entradasPara } from '../src/data/asistenteConocimiento.js';
import { PANTALLAS_ADMIN, PANTALLAS_ALUMNO, PANTALLA_AULA, PANTALLA_ACCESO, detectarPantalla, describirPantalla } from '../src/data/asistenteContexto.js';
import { buscar, normalizar } from '../src/data/asistenteBuscar.js';
import { resolverDuda, usarProveedorRespuestas } from '../src/data/asistenteMotor.js';

let pruebas = 0;
const prueba = async (nombre, fn) => {
  try { await fn(); pruebas++; console.log('  ✓', nombre); }
  catch (e) { console.error('  ✗', nombre, '\n   ', e.message); process.exitCode = 1; }
};

console.log('Flujos');
await prueba('cada botón apunta a un flujo o acción que existe', () => {
  const rotos = [];
  for (const [clave, f] of Object.entries(FLUJOS)) {
    assert.ok(f.text, `${clave} sin texto`);
    for (const b of f.buttons || []) {
      if (b.next && b.next !== 'home_portal' && !FLUJOS[b.next]) rotos.push(`${clave} → ${b.next}`);
      if (b.action && !ACCIONES_FLUJO.includes(b.action)) rotos.push(`${clave} → acción ${b.action}`);
      if (!b.next && !b.action) rotos.push(`${clave} → "${b.label}" sin destino`);
    }
  }
  assert.deepEqual(rotos, []);
});
await prueba('no hay flujos huérfanos (todos se alcanzan desde un inicio o desde la base)', () => {
  const alcanzados = new Set();
  const pila = [...FLUJOS_RAIZ, ...BASE_CONOCIMIENTO.map((e) => e.flujo).filter(Boolean)];
  while (pila.length) {
    const c = pila.pop();
    if (alcanzados.has(c) || !FLUJOS[c]) continue;
    alcanzados.add(c);
    for (const b of FLUJOS[c].buttons || []) if (b.next && b.next !== 'home_portal') pila.push(b.next);
  }
  const huerfanos = Object.keys(FLUJOS).filter((c) => !alcanzados.has(c));
  assert.deepEqual(huerfanos, []);
});
await prueba('los flujos citados por la base existen', () => {
  const faltan = BASE_CONOCIMIENTO.filter((e) => e.flujo && !FLUJOS[e.flujo]).map((e) => e.id);
  assert.deepEqual(faltan, []);
});

console.log('Base de conocimiento');
const tabsDe = { admin: PANTALLAS_ADMIN, alumno: PANTALLAS_ALUMNO };
await prueba('ids únicos y campos mínimos', () => {
  const vistos = new Set();
  for (const e of BASE_CONOCIMIENTO) {
    assert.ok(!vistos.has(e.id), `id repetido ${e.id}`);
    vistos.add(e.id);
    assert.ok(e.titulo, `${e.id} sin título`);
    assert.ok(e.roles?.length, `${e.id} sin roles`);
    assert.ok(e.texto || e.pasos?.length || e.casos?.length || e.flujo, `${e.id} sin contenido`);
  }
});
await prueba('"Llévame ahí" solo apunta a pestañas que existen', () => {
  const malos = BASE_CONOCIMIENTO.filter((e) => e.ir && !e.ir.ruta && !tabsDe[e.ir.zona]?.[e.ir.tab]).map((e) => `${e.id} → ${e.ir.zona}:${e.ir.tab}`);
  assert.deepEqual(malos, []);
});
await prueba('ninguna entrada de alumno lleva al panel de administración', () => {
  const malos = BASE_CONOCIMIENTO.filter((e) => e.ir?.zona === 'admin' && !e.roles.every((r) => r === 'admin')).map((e) => e.id);
  assert.deepEqual(malos, []);
});
await prueba('las pantallas citadas existen', () => {
  const validas = new Set(['aula', 'acceso', 'publico', ...Object.keys(PANTALLAS_ADMIN).map((t) => `admin:${t}`), ...Object.keys(PANTALLAS_ALUMNO).map((t) => `alumno:${t}`)]);
  const malos = BASE_CONOCIMIENTO.flatMap((e) => (e.pantallas || []).filter((p) => !validas.has(p)).map((p) => `${e.id} → ${p}`));
  assert.deepEqual(malos, []);
});
await prueba('las acciones de cada pantalla existen y son de su rol', () => {
  const malos = [];
  const revisar = (nombre, pantalla, rol) => {
    assert.ok(pantalla.acciones.length >= 1 && pantalla.acciones.length <= 5, `${nombre}: 1 a 5 acciones`);
    for (const id of pantalla.acciones) {
      const e = entradaPorId(id);
      if (!e) malos.push(`${nombre} → ${id} no existe`);
      else if (!e.roles.includes(rol)) malos.push(`${nombre} → ${id} no es de ${rol}`);
    }
  };
  Object.entries(PANTALLAS_ADMIN).forEach(([t, p]) => revisar(`admin:${t}`, p, 'admin'));
  Object.entries(PANTALLAS_ALUMNO).forEach(([t, p]) => revisar(`alumno:${t}`, p, 'alumno'));
  revisar('aula', PANTALLA_AULA, 'alumno');
  revisar('acceso', PANTALLA_ACCESO, 'publico');
  assert.deepEqual(malos, []);
});
await prueba('relacionados existen', () => {
  const malos = BASE_CONOCIMIENTO.flatMap((e) => (e.relacionados || []).filter((r) => !entradaPorId(r)).map((r) => `${e.id} → ${r}`));
  assert.deepEqual(malos, []);
});

console.log('Contexto');
await prueba('detecta pantalla por ruta, pestaña y rol', () => {
  assert.equal(detectarPantalla({ pathname: '/admin', rol: 'admin', tabAdmin: 'courses' }).clave, 'admin:courses');
  assert.equal(detectarPantalla({ pathname: '/admin', rol: 'admin', tabAdmin: 'inventada' }).clave, 'admin:dashboard');
  assert.equal(detectarPantalla({ pathname: '/dashboard', rol: 'alumno', tabAlumno: 'certificates' }).nombre, 'Certificados');
  assert.equal(detectarPantalla({ pathname: '/dashboard', rol: 'alumno', tabAlumno: null }).clave, 'alumno:dashboard');
  assert.deepEqual(detectarPantalla({ pathname: '/dashboard', rol: 'admin', tabAlumno: 'courses' }).roles, ['alumno', 'admin']);
  assert.equal(detectarPantalla({ pathname: '/classroom/12', rol: 'alumno' }).zona, 'aula');
  assert.equal(detectarPantalla({ pathname: '/login' }).zona, 'acceso');
  assert.equal(detectarPantalla({ pathname: '/paris-diploma-ecmo' }).zona, 'publico');
  assert.equal(describirPantalla(detectarPantalla({ pathname: '/admin', rol: 'admin', tabAdmin: 'grupos' })), 'Grupos (panel de administración)');
});
await prueba('un alumno no encuentra temas del panel de administración', () => {
  assert.ok(entradasPara(['alumno']).every((e) => !e.roles.every((r) => r === 'admin')));
});

console.log('Búsqueda');
const alumno = detectarPantalla({ pathname: '/dashboard', rol: 'alumno', tabAlumno: 'dashboard' });
const admin = detectarPantalla({ pathname: '/admin', rol: 'admin', tabAdmin: 'dashboard' });
const publico = detectarPantalla({ pathname: '/' });
const casos = [
  [alumno, 'no puedo entrar a mi curso', 'p-no-entro-curso'],
  [alumno, 'No pùedo entar a mi curzo', 'p-no-entro-curso'],
  [alumno, 'no me deja acceder a la clase', 'p-no-entro-curso'],
  [alumno, 'dice lugar apartado', 'p-no-entro-curso'],
  [alumno, 'no veo mi certificado', 'p-sin-certificado'],
  [alumno, 'donde esta mi constancia', 'p-sin-certificado'],
  [alumno, 'pagué y no aparece mi curso', 'p-pague-sin-curso'],
  [alumno, 'ya pague y no sale el curso', 'p-pague-sin-curso'],
  [alumno, 'no me llega el correo', 'p-correo-no-llega'],
  [alumno, 'el video no carga', 'p-video-no-carga'],
  [alumno, 'olvidé mi contraseña', 'p-olvide-contrasena'],
  [alumno, 'cambiar a modo oscuro', 'guia-alumno-tema'],
  [alumno, 'necesito factura', 'f-factura'],
  [alumno, 'se me acabaron los intentos', 'p-sin-intentos'],
  [admin, 'cómo aprobar una cuenta', 'guia-admin-activar-cuentas'],
  [admin, 'como poner fecha de inicio a un grupo', 'a-fecha-inicio-grupo'],
  [admin, 'cómo activar un curso', 'a-activar-curso'],
  [admin, 'un alumno no ve su curso', 'a-alumno-no-ve-curso'],
  [admin, 'cómo revisar tareas', 'guia-admin-tareas'],
  [admin, 'Alumni Pass: aceptar solicitud', 'a-alumni-aceptar'],
  [admin, 'cómo reenviar enlace de pago', 'a-reenviar-enlace-pago'],
  [admin, 'reenviar la liga de pago', 'a-reenviar-enlace-pago'],
  [admin, 'reiniciar examen de un alumno', 'a-reiniciar-examen'],
  [publico, 'precio del simulador', 'flujo-ecmo_sim'],
  [publico, 'quiero hablar con un asesor', 'flujo-contacto'],
];
for (const [pantalla, pregunta, esperado] of casos) {
  await prueba(`${pantalla.zona}: "${pregunta}" → ${esperado}`, async () => {
    const r = await resolverDuda(pregunta, pantalla);
    const primero = r.tipo === 'respuesta' ? r.entrada.id : r.tipo === 'resultados' ? r.resultados[0].id : null;
    const top = buscar(pregunta, entradasPara(pantalla.roles), { pantalla: pantalla.clave }).map((x) => `${x.entrada.id}:${x.puntaje}`).join(', ');
    assert.equal(primero, esperado, `obtuve ${r.tipo} ${primero} · ${top}`);
  });
}
await prueba('lo que no tiene que ver no responde nada', async () => {
  assert.equal((await resolverDuda('receta de pastel de chocolate', alumno)).tipo, 'sin-resultados');
  assert.equal((await resolverDuda('?? !!', alumno)).tipo, 'sin-resultados');
});
await prueba('normaliza acentos y mayúsculas', () => {
  assert.equal(normalizar('¿Cómo ACTIVO un Curso?'), 'como activo un curso');
});
await prueba('un proveedor externo (IA) puede responder sin cambiar la interfaz, y si falla se usa la búsqueda local', async () => {
  let recibido = null;
  usarProveedorRespuestas(async (datos) => { recibido = datos; return { tipo: 'respuesta', texto: 'Hola', fuentes: ['p-no-entro-curso'] }; });
  const r = await resolverDuda('no puedo entrar a mi curso', alumno);
  assert.equal(r.entrada.texto, 'Hola');
  assert.equal(r.otras[0].id, 'p-no-entro-curso');
  assert.deepEqual(Object.keys(recibido.contexto).sort(), ['nombre', 'roles', 'tab', 'zona']);
  usarProveedorRespuestas(async () => { throw new Error('caído'); });
  assert.equal((await resolverDuda('no puedo entrar a mi curso', alumno)).entrada.id, 'p-no-entro-curso');
  usarProveedorRespuestas(null);
});

console.log(`\n${pruebas} pruebas OK${process.exitCode ? ' · HAY FALLAS' : ''}`);
