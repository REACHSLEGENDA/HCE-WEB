// Sin red, cuentas reales ni cobros. Ejecutar con --experimental-vm-modules.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { LISTS } from '../netlify/functions/_brevo.js';
import { EDICIONES_ALUMNI } from '../src/data/alumniPass.js';

const clon = v => structuredClone(v);
function base() {
  return { filas: [{ id: 1, nombre: 'Ana López', email: 'qa@example.test', telefono: '5555555555', ciudad: 'CDMX', pais: 'México', hospital: 'Hospital QA', especialidad: 'Perfusión', modalidad: 'presencial', grabaciones: false, revision: 'aprobado', pagado: false, token: '00000000-0000-4000-8000-000000000001', diploma_path: 'qa/diploma.pdf' }],
    archivos: [], sesiones: {}, claves: {}, enviados: [], contactos: [], listas: [], formularios: [], formspree: [], fallarCorreo: false, fallarLista: false, administrador: true };
}
function database(s) {
  return { from(tabla) {
    let op = 'select', valores, individual = false, opciones = {};
    const filtros = [];
    const q = {
      select(_c, o = {}) { opciones = o; return q; }, insert(v) { op = 'insert'; valores = v; return q; },
      upsert(v) { op = 'upsert'; valores = v; return q; },
      update(v) { op = 'update'; valores = v; return q; },
      eq(k,v) { filtros.push(r => r[k] === v); return q; },
      is(k,v) { filtros.push(r => v === null ? r[k] == null : r[k] === v); return q; },
      not(k,_op,v) { filtros.push(r => v === null ? r[k] != null : r[k] !== v); return q; },
      gt(k,v) { filtros.push(r => r[k] > v); return q; }, gte(k,v) { filtros.push(r => r[k] >= v); return q; },
      order() { return q; }, limit() { return q; }, maybeSingle() { individual = true; return q; }, single() { individual = true; return q; },
      then(resolve, reject) { return (async () => {
        if (tabla === 'profiles') return { data: [{ email: 'admin@example.test' }], error: null };
        const todos = tabla === 'form_submissions' ? s.formularios : s.filas;
        let filas = todos.filter(r => filtros.every(f => f(r)));
        if (tabla === 'form_submissions' && s.fallarFormularios) return { data: null, error: { message: 'Panel no disponible' } };
        if (op === 'insert') {
          if (s.filas.some(r => r.solicitud_clave && r.solicitud_clave === valores[0].solicitud_clave)) return { data: null, error: { code: '23505', message: 'Duplicado' } };
          filas = valores.map(v => ({ id: s.filas.length + 1, pagado: false, revision: 'pendiente', formspree_estado: 'pendiente', formulario_id: randomUUID(), creado_en: new Date().toISOString(), ...clon(v) }));
          s.filas.push(...filas);
        }
        if (op === 'upsert') {
          const previo = todos.find(r => r.id === valores.id);
          if (previo) { Object.assign(previo,clon(valores)); filas=[previo]; }
          else { const nueva=clon(valores); todos.push(nueva); filas=[nueva]; }
        }
        if (op === 'update') {
          if (s.fallarGuardado && valores.stripe_session_id && !valores.pagado) { s.fallarGuardado = false; return { error: { message: 'Fallo de escritura' }, data: null }; }
          filas.forEach(r => Object.assign(r, valores));
        }
        return { data: opciones.head ? null : clon(individual ? filas[0] || null : filas), count: filas.length, error: null };
      })().then(resolve,reject); },
    }; return q;
  }, storage: { from() { return {
    upload: async ruta => { s.archivos.push(ruta); return { error: null }; },
    remove: async rutas => { s.archivos = s.archivos.filter(r => !rutas.includes(r)); return {}; },
    createSignedUrl: async ruta => ({ data: { signedUrl: 'https://qa.invalid/' + ruta } }),
  }; } },
  async rpc(nombre, args) {
    const r = s.filas.find(r => r.id === args.p_id);
    if (nombre === 'alumni_liberar_pago') {
      if (!r.pagado && r.checkout_intento === args.p_intento) Object.assign(r, { checkout_intento: null, stripe_session_id: null, checkout_reservado_hasta: new Date().toISOString() });
      return { error: null };
    }
    if (s.agotado) return { error: { message: 'ALUMNI_AGOTADO' } };
    if (!r.checkout_intento) Object.assign(r, { checkout_intento: randomUUID(), checkout_creado_en: new Date().toISOString(), checkout_reservado_hasta: new Date(Date.now()+35*60000).toISOString(), checkout_modalidad: args.p_modalidad, checkout_moneda: args.p_moneda, checkout_grabaciones: args.p_grabaciones });
    return { data: clon(r), error: null };
  } };
}

async function entorno(s) {
  const db = database(s);
  const context = vm.createContext({ console: { error() {}, log() {} }, Buffer, AbortSignal, crypto: { randomUUID }, process: { env: { STRIPE_WEBHOOK_SECRET: 'qa' } },
    fetch: async (url,opts) => {
      assert.equal(url,'https://formspree.io/f/xdeapenv'); assert.equal(opts.headers.Accept,'application/json');
      s.formspree.push(JSON.parse(opts.body));
      if(s.fallarFormspree==='red')throw Error('Desconexión');
      return {ok:!s.fallarFormspree,status:s.fallarFormspree==='http'?422:200,json:async()=>{if(s.fallarFormspree==='html')throw Error('No es JSON');return s.fallarFormspree?{errors:[{message:'Fallo de prueba'}]}:{ok:true};}};
    },
  });
  const stripe = { checkout: { sessions: {
    retrieve: async id => { if (!s.sesiones[id]) throw Error('Sesión inexistente'); return clon(s.sesiones[id]); },
    expire: async id => { s.sesiones[id].status = 'expired'; return clon(s.sesiones[id]); },
    create: async (params, opts) => {
      if (s.claves[opts.idempotencyKey]) { assert.equal(s.claves[opts.idempotencyKey].params, JSON.stringify(params)); return clon(s.sesiones[s.claves[opts.idempotencyKey].id]); }
      const id = 'cs_qa_' + (Object.keys(s.sesiones).length + 1);
      const sesion = { id, status: 'open', payment_status: 'unpaid', url: 'https://checkout.stripe.test/' + id, metadata: params.metadata, currency: params.line_items[0].price_data.currency, amount_total: params.line_items.reduce((a,l) => a + l.price_data.unit_amount, 0) };
      s.sesiones[id] = clon(sesion); s.claves[opts.idempotencyKey] = { id, params: JSON.stringify(params) }; return sesion;
    },
  } } };
  const mocks = {
    '../../src/data/alumniPass.js': { EDICIONES_ALUMNI },
    './_stripe.js': { getStripe: () => ({ stripe, pasarela: 'qa' }) },
    './_supabase.js': { admin: () => db, adminDesdeToken: async () => s.administrador ? { id: 'admin' } : null,
      isConfigured: () => true, registrarAccionAdmin: async () => {}, json: (statusCode, body) => ({ statusCode, body: JSON.stringify(body) }) },
    './_brevo.js': { LISTS, isConfigured: () => true,
      enviarCorreo: async mensaje => { if (s.fallarCorreo) throw Error('Brevo no disponible'); s.enviados.push(clon(mensaje)); },
      upsertContact: async (...args) => { if(s.fallarContacto)throw Error('Contacto no disponible');s.contactos.push(clon(args)); },
      addToList: async (...args) => { if (s.fallarLista) throw Error('Lista no disponible'); s.listas.push(clon(args)); },
    },
    './_notificaciones.js': { plantillaHce: contenido => contenido },
    './_inscripciones.js': { TIPO_COBRO: 'curso_portal', inscribirDesdeSesion: async () => { s.inscripciones = (s.inscripciones || 0) + 1; return true; } },
    'stripe': { default: class { constructor() { this.webhooks = { constructEvent: (body, firma) => { if (firma !== 'qa-valida') throw Error('Firma inválida'); return JSON.parse(body); } }; } } },
  };
  const cache = new Map();
  async function cargar(archivo) {
    if (cache.has(archivo)) return cache.get(archivo);
    const mod = new vm.SourceTextModule(await fs.readFile(new URL('../netlify/functions/'+archivo, import.meta.url), 'utf8'), { context });
    cache.set(archivo,mod);
    await mod.link(async spec => {
      if (['./_alumni-pass.js','./_alumni-registros.js'].includes(spec)) return cargar(spec.slice(2));
      if (!mocks[spec]) throw Error('Falta mock: '+spec);
      const valores = mocks[spec];
      return new vm.SyntheticModule(Object.keys(valores), function() { for (const [k,v] of Object.entries(valores)) this.setExport(k,v); }, { context });
    });
    return mod;
  }
  const endpoint = await cargar('alumni-pass.js'); await endpoint.evaluate();
  const webhook = await cargar('stripe-webhook.js'); await webhook.evaluate();
  return { endpoint: endpoint.namespace.handler, webhook: webhook.namespace.handler, db,
    confirmar: cache.get('_alumni-pass.js').namespace.confirmarAlumniDesdeSesion };
}
const evento = cuerpo => ({ httpMethod: 'POST', headers: {}, body: JSON.stringify(cuerpo) });
const body = r => JSON.parse(r.body);
const opciones = s => ({ accion: 'pagar', token: s.filas[0].token, modalidad: 'presencial', moneda: 'usd', grabaciones: true });
const solicitud = () => ({ accion:'solicitar', solicitudClave:randomUUID(), nombre:'Ana López', email:'ana@example.test', telefono:'5555555555', ciudad:'CDMX', pais:'México', hospital:'Hospital QA', especialidad:'Perfusión', modalidad:'virtual', acepta:true, diploma:{tipo:'application/pdf',base64:Buffer.from('%PDF QA').toString('base64')} });
async function cobro(s,e) { assert.equal((await e.endpoint(evento(opciones(s)))).statusCode,200); const sesion=Object.values(s.sesiones)[0]; sesion.payment_status='paid'; sesion.status='complete'; return clon(sesion); }
let pruebas = 0;
async function check(nombre,fn) { await fn(); console.log('PASS',nombre); pruebas++; }

await check('solicitud completa se guarda una sola vez al reintentar', async () => {
  const s=base(), e=await entorno(s), d={ accion:'solicitar', solicitudClave:randomUUID(), nombre:'Ana López', email:'ana@example.test', telefono:'5555555555', ciudad:'CDMX', pais:'México', hospital:'Hospital QA', especialidad:'Perfusión', modalidad:'virtual', acepta:true, diploma:{tipo:'application/pdf',base64:Buffer.from('%PDF QA').toString('base64')} };
  assert.equal((await e.endpoint(evento(d))).statusCode,200); assert.equal((await e.endpoint(evento(d))).statusCode,200);
  assert.equal(s.filas.length,2); assert.equal(s.archivos.length,1); assert.equal(s.enviados.length,2);
  assert.equal(s.formularios.length,1);assert.equal(s.formspree.length,1);assert.equal(s.contactos.length,1);assert.equal(s.listas.length,0);
  assert.equal(s.formularios[0].form_id,'xdeapenv');assert.equal(s.formularios[0].payload._integraciones.formspree,'enviado');
  const externo=s.formspree[0];assert.equal(externo.hospital,'Hospital QA');assert.equal(externo.ciudad,'CDMX');
  assert.ok(!JSON.stringify(externo).includes(s.filas[1].token));assert.ok(!('diploma_path' in externo));assert.ok(!('base64' in externo));
});
await check('nombres compuestos, apellidos y edición se guardan y llegan al panel, Formspree y Brevo', async () => {
  const s=base(),e=await entorno(s),d={...solicitud(),nombre:'No usar',nombres:'Ana María',apellido_paterno:'López',apellido_materno:'Pérez',edicion_diploma:'Marzo 2025 INER'};
  assert.equal((await e.endpoint(evento(d))).statusCode,200);
  const r=s.filas[1];assert.equal(r.nombre,'Ana María López Pérez');assert.equal(r.nombres,'Ana María');assert.equal(r.apellido_paterno,'López');assert.equal(r.apellido_materno,'Pérez');assert.equal(r.edicion_diploma,d.edicion_diploma);
  for(const payload of [s.formularios[0].payload,s.formspree[0]]){assert.equal(payload.nombres,'Ana María');assert.equal(payload.apellido_materno,'Pérez');assert.equal(payload.edicion_diploma,d.edicion_diploma);}
  assert.equal(s.contactos[0][1].FIRSTNAME,'Ana María');assert.equal(s.contactos[0][1].LASTNAME,'López Pérez');assert.equal(s.listas.length,0);
  r.revision='aprobado';s.filas=[r];const pago=await cobro(s,e);const confirmado=await e.confirmar(e.db,pago);assert.ok(confirmado);
  const contacto=s.contactos.at(-1)[1];assert.equal(contacto.FIRSTNAME,'Ana María');assert.equal(contacto.LASTNAME,'López Pérez');assert.equal(s.listas[0][1],20);
});
await check('edición y apellido paterno se validan; apellido materno es opcional', async () => {
  const s=base(),e=await entorno(s),d={...solicitud(),nombres:'Ana María',apellido_paterno:'López',apellido_materno:'',edicion_diploma:'Chile 2025 INT'};
  for(const faltante of [{edicion_diploma:''},{edicion_diploma:'Otra edición'},{apellido_paterno:''}])assert.equal((await e.endpoint(evento({...d,...faltante}))).statusCode,400);
  assert.equal(s.archivos.length,0);assert.equal((await e.endpoint(evento(d))).statusCode,200);assert.equal(s.filas[1].nombre,'Ana María López');
});
await check('Formspree falla sin perder solicitud ni registro en el panel; reintento solo de pendientes',async()=>{
  const s=base(),e=await entorno(s),d=solicitud();s.fallarFormspree='http';
  const r=body(await e.endpoint(evento(d)));assert.equal(r.ok,true);assert.equal(r.integraciones.formspree,'error');assert.ok(r.avisoRegistros);assert.equal(s.formularios.length,1);assert.equal(s.filas.length,2);assert.equal(s.contactos.length,1);
  await e.endpoint(evento(d));assert.equal(s.formspree.length,1);
  s.fallarFormspree=false;const retry=body(await e.endpoint(evento({accion:'sincronizar-registros',id:2})));assert.equal(retry.integraciones.pendientes,false);
  assert.equal(s.formspree.length,2);assert.equal(s.contactos.length,1);assert.equal(s.formularios.length,1);
  await e.endpoint(evento({accion:'sincronizar-registros',id:2}));assert.equal(s.formspree.length,2);
});
await check('HTML o desconexión no son recepción confirmada y no se repiten automáticamente',async()=>{
  for(const fallo of ['html','red']){const s=base(),e=await entorno(s),d=solicitud();s.fallarFormspree=fallo;
    const r=body(await e.endpoint(evento(d)));assert.equal(r.integraciones.formspree,'sin_confirmar');await e.endpoint(evento(d));assert.equal(s.formspree.length,1);
  }
});
await check('fallos de Brevo o del panel permiten recuperación sin duplicar Formspree',async()=>{
  for(const fallo of ['fallarContacto','fallarFormularios']){const s=base(),e=await entorno(s);s[fallo]=true;
    const r=body(await e.endpoint(evento(solicitud())));assert.equal(r.integraciones.formspree,'enviado');assert.ok(r.integraciones.pendientes);
    s[fallo]=false;const retry=body(await e.endpoint(evento({accion:'sincronizar-registros',id:2})));assert.equal(retry.integraciones.pendientes,false);assert.equal(s.formspree.length,1);assert.equal(s.formularios.length,1);assert.equal(s.listas.length,0);
  }
});
await check('peticiones simultáneas de la misma solicitud solo envían una copia a Formspree',async()=>{
  const s=base(),e=await entorno(s),d=solicitud();const resultados=await Promise.all([e.endpoint(evento(d)),e.endpoint(evento(d))]);
  assert.ok(resultados.every(r=>r.statusCode===200));assert.equal(s.filas.length,2);assert.equal(s.formularios.length,1);assert.equal(s.formspree.length,1);
  s.administrador=false;assert.equal((await e.endpoint(evento({accion:'sincronizar-registros',id:2}))).statusCode,403);
});
await check('no permite pagar una solicitud sin aprobación ni administrar sin sesión', async () => {
  const s=base(),e=await entorno(s);s.filas[0].revision='pendiente';
  assert.equal((await e.endpoint(evento(opciones(s)))).statusCode,409); assert.equal(Object.keys(s.sesiones).length,0);
  s.administrador=false;assert.equal((await e.endpoint(evento({accion:'aprobar',id:1}))).statusCode,403);
});
await check('aprobación persiste y devuelve fallo de correo sin éxito falso', async () => {
  const s=base(),e=await entorno(s);s.filas[0].revision='pendiente';s.fallarCorreo=true;
  const r=await e.endpoint(evento({accion:'aprobar',id:1}));assert.equal(r.statusCode,200);assert.equal(body(r).correoEnviado,false);assert.equal(s.filas[0].revision,'aprobado');
  s.fallarCorreo=false;const reintento=body(await e.endpoint(evento({accion:'aprobar',id:1})));assert.equal(reintento.correoEnviado,true);assert.ok(s.filas[0].correo_enlace_en);
});
await check('total USD con grabaciones es 475 y reintentos reutilizan Checkout', async () => {
  const s=base(),e=await entorno(s);
  const primero=await e.endpoint(evento(opciones(s)));const segundo=await e.endpoint(evento(opciones(s)));
  assert.equal(body(primero).url,body(segundo).url);assert.equal(Object.keys(s.sesiones).length,1);assert.equal(Object.values(s.sesiones)[0].amount_total,47500);
});
await check('dos peticiones simultáneas comparten la clave del mismo cobro', async () => {
  const s=base(),e=await entorno(s);await Promise.all([e.endpoint(evento(opciones(s))),e.endpoint(evento(opciones(s)))]);assert.equal(Object.keys(s.sesiones).length,1);
});
await check('cambiar modalidad cierra el cobro anterior y guarda lo realmente pagado', async () => {
  const s=base(),e=await entorno(s);await e.endpoint(evento(opciones(s)));
  const r=await e.endpoint(evento({...opciones(s),modalidad:'virtual',grabaciones:false}));assert.equal(r.statusCode,200);assert.equal(s.sesiones.cs_qa_1.status,'expired');
  s.sesiones.cs_qa_2.payment_status='paid';s.sesiones.cs_qa_2.status='complete';
  await e.confirmar(e.db,clon(s.sesiones.cs_qa_2));assert.equal(s.filas[0].modalidad,'virtual');assert.equal(s.filas[0].importe,229);assert.equal(s.filas[0].grabaciones,false);
});
await check('fallo al guardar Checkout no entrega enlace y expira la sesión', async () => {
  const s=base(),e=await entorno(s);s.fallarGuardado=true;
  assert.equal((await e.endpoint(evento(opciones(s)))).statusCode,500);assert.equal(s.sesiones.cs_qa_1.status,'expired');
});
await check('webhook confirma sin regreso del alumno y repetidos no duplican el pase', async () => {
  const s=base(),e=await entorno(s),sesion=await cobro(s,e);
  const ev={httpMethod:'POST',headers:{'stripe-signature':'qa-valida'},body:JSON.stringify({type:'checkout.session.completed',data:{object:sesion}})};
  assert.equal((await e.webhook(ev)).statusCode,200);assert.equal((await e.webhook(ev)).statusCode,200);
  assert.equal(s.filas[0].pagado,true);assert.equal(s.filas[0].folio,'AP26-0001');assert.equal(s.listas.length,1);assert.equal(s.enviados.length,1);
  assert.deepEqual(s.listas[0],[s.filas[0].email,20]);
  assert.equal((await e.endpoint(evento({accion:'confirmar',sessionId:sesion.id,moneda:'usd'}))).statusCode,200);assert.equal(s.listas.length,1);
});
await check('pago se conserva cuando falla Brevo y el webhook permite recuperarlo', async () => {
  const s=base(),e=await entorno(s),sesion=await cobro(s,e);s.fallarLista=true;
  const ev={httpMethod:'POST',headers:{'stripe-signature':'qa-valida'},body:JSON.stringify({type:'checkout.session.completed',data:{object:sesion}})};
  assert.equal((await e.webhook(ev)).statusCode,500);assert.equal(s.filas[0].pagado,true);assert.ok(!s.filas[0].brevo_sincronizado_en);
  const r=body(await e.endpoint(evento({accion:'confirmar',sessionId:sesion.id,moneda:'usd'})));assert.equal(r.correoEnviado,false);assert.ok(r.avisoCorreo);
  s.fallarLista=false;assert.equal((await e.webhook(ev)).statusCode,200);assert.equal(s.listas.length,1);assert.ok(s.filas[0].brevo_sincronizado_en);
});
await check('firma falsa, pago pendiente, importe incorrecto y sesión ajena no confirman', async () => {
  const s=base(),e=await entorno(s),sesion=await cobro(s,e);const mensaje={type:'checkout.session.completed',data:{object:sesion}};
  assert.equal((await e.webhook({httpMethod:'POST',headers:{'stripe-signature':'falsa'},body:JSON.stringify(mensaje)})).statusCode,400);
  assert.equal(await e.confirmar(e.db,{...sesion,payment_status:'unpaid'}),null);
  await assert.rejects(e.confirmar(e.db,{...sesion,amount_total:1}));await assert.rejects(e.confirmar(e.db,{...sesion,id:'cs_ajena',metadata:{...sesion.metadata,intento:randomUUID()}}));assert.equal(s.filas[0].pagado,false);
});
await check('rechazar cierra Checkout y no permite revertir un pago confirmado', async () => {
  const s=base(),e=await entorno(s);await e.endpoint(evento(opciones(s)));
  assert.equal((await e.endpoint(evento({accion:'rechazar',id:1,notas:'Documento incorrecto'}))).statusCode,200);assert.equal(s.sesiones.cs_qa_1.status,'expired');
  const s2=base(),e2=await entorno(s2);await cobro(s2,e2);
  assert.equal((await e2.endpoint(evento({accion:'rechazar',id:1}))).statusCode,500);assert.equal(s2.filas[0].pagado,true);assert.equal(s2.filas[0].revision,'aprobado');
});
await check('webhook conserva los pagos de cursos y rechaza JSON malformado', async () => {
  const s=base(),e=await entorno(s);
  assert.equal((await e.webhook({httpMethod:'POST',headers:{'stripe-signature':'qa-valida'},body:JSON.stringify({type:'checkout.session.completed',data:{object:{metadata:{tipo:'curso_portal'}}}})})).statusCode,200);assert.equal(s.inscripciones,1);
  assert.equal((await e.endpoint({httpMethod:'POST',headers:{},body:'{'})).statusCode,400);
});
console.log(`${pruebas}/${pruebas} regresiones Alumni Pass correctas.`);
