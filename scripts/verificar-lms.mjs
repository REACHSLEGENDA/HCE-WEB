// Pruebas de regresión del servidor sin red, pagos ni datos reales.
// Ejecutar: node --experimental-vm-modules scripts/verificar-lms.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { traerTodo } from '../netlify/functions/_consultas.js';
import { ventana, partirNombre } from '../netlify/functions/_sesiones.js';

function base() {
  return { usuario: { id: 'alumno' }, habilitada: true, vigente: true, tablas: {
    profiles: [{ id: 'alumno', rol: 'estudiante', email: 'qa@example.test' }],
    courses: [{ id: 11, title: 'Curso QA', min_aprobacion: 80, vigencia_meses: 12 }],
    inscripciones: [{ id: 1, user_id: 'alumno', course_id: 11 }],
    curso_reglas: [{ course_id: 11, regla_finalizacion: 'examen_final', porcentaje_finalizacion: 100 }],
    curso_lecciones: [{ id: 101, course_id: 11, tipo: 'video', obligatoria: true }],
    leccion_progreso: [{ user_id: 'alumno', leccion_id: 101, course_id: 11, completada: true }],
    questions: [{ id: 1, course_id: 11, correct_option_index: 0 }, { id: 2, course_id: 11, correct_option_index: 0 }],
    curso_eventos: [], certificates: [], evaluacion_intentos: [],
  }, fallos: {}, llamadas: [], archivos: [] };
}

function database(s) {
  let siguienteId = 500;
  const valor = (fila, col) => col.includes('->>') ? fila[col.split('->>')[0]]?.[col.split('->>')[1]] : fila[col];
  return { from(tabla) {
    let operacion = 'select', valores, individuales = false, desde = 0, hasta = Infinity, opciones = {};
    const filtros = [], orden = [];
    const q = {
      select(_cols, opts = {}) { opciones = opts; return q; },
      insert(v) { operacion = 'insert'; valores = v; return q; },
      upsert(v) { operacion = 'upsert'; valores = v; return q; },
      update(v) { operacion = 'update'; valores = v; return q; },
      delete() { operacion = 'delete'; return q; },
      eq(k,v) { filtros.push(r => String(valor(r,k)) === String(v)); return q; },
      neq(k,v) { filtros.push(r => valor(r,k) !== v); return q; },
      in(k,v) { filtros.push(r => v.includes(valor(r,k))); return q; },
      not(k,_op,v) { filtros.push(r => valor(r,k) !== v); return q; },
      gte(k,v) { filtros.push(r => valor(r,k) >= v); return q; },
      order(k,opts={}) { orden.push([k,opts.ascending !== false]); return q; },
      range(a,b) { desde=a; hasta=b; return q; },
      limit(n) { hasta=n-1; return q; },
      maybeSingle() { individuales=true; return q; },
      single() { individuales=true; return q; },
      then(resolve,reject) {
        try {
          s.llamadas.push({ tabla, operacion, valores });
          const fallo = s.fallos[`${tabla}:${operacion}`];
          if (fallo) {
            if (fallo.veces !== undefined && --fallo.veces === 0) delete s.fallos[`${tabla}:${operacion}`];
            return Promise.resolve({ data:null,error:{code:fallo.code || 'XX000',message:'Falla simulada'} }).then(resolve,reject);
          }
          const todos = s.tablas[tabla] ||= [];
          let filas = todos.filter(r => filtros.every(f => f(r)));
          if (operacion === 'insert' || operacion === 'upsert') {
            filas = (Array.isArray(valores) ? valores : [valores]).map(v => {
              const previo = operacion === 'upsert' ? todos.find(r =>
                r.user_id === v.user_id && r.leccion_id === v.leccion_id) : null;
              if (previo) { Object.assign(previo,v); return previo; }
              const fila = { id: ++siguienteId, created_at: new Date().toISOString(), ...v };
              todos.push(fila); return fila;
            });
          } else if (operacion === 'update') filas.forEach(r => Object.assign(r,valores));
          else if (operacion === 'delete') s.tablas[tabla] = todos.filter(r => !filas.includes(r));
          for (const [col,asc] of orden.slice().reverse()) filas.sort((a,b) => (valor(a,col)>valor(b,col)?1:valor(a,col)<valor(b,col)?-1:0)*(asc?1:-1));
          const count = filas.length;
          filas = filas.slice(desde,hasta+1);
          return Promise.resolve({data:opciones.head?null:individuales?(filas[0]||null):filas,error:null,count}).then(resolve,reject);
        } catch(e) { return Promise.reject(e).then(resolve,reject); }
      },
    }; return q;
  }, storage: { from(bucket) { return {
    list: async (_carpeta,{search}) => ({data:s.archivos.filter(a=>a.bucket===bucket&&a.ruta.endsWith('/'+search)).map(a=>({name:search})),error:null}),
    getPublicUrl: ruta => ({data:{publicUrl:`https://qa.invalid/${bucket}/${ruta}`}}),
    copy: async (_desde,hacia) => { s.archivos.push({bucket,ruta:hacia}); return {error:null}; },
    remove: async rutas => { s.archivos=s.archivos.filter(a=>a.bucket!==bucket||!rutas.includes(a.ruta)); return {error:null}; },
  }; } } };
}

async function handler(nombre,s) {
  const db = database(s);
  const context = vm.createContext({ console:{error(){},log(){}}, Response, Buffer, process:{env:{}}, setTimeout, AbortSignal });
  const mocks = {
    './_supabase.js': { admin:()=>db, isConfigured:()=>true,
      usuarioDesdeToken:async()=>s.usuario, adminDesdeToken:async()=>s.administrador || null,
      cuentaHabilitada:async()=>({habilitada:s.habilitada,error:'Cuenta en revisión'}),
      accesoVigente:async()=>({vigente:s.vigente,error:'Acceso vencido'}),
      esEsquemaFaltante:e=>['42P01','42703','PGRST205'].includes(e?.code),
      registrarAccionAdmin:async()=>{}, json:(statusCode,body)=>({statusCode,body:JSON.stringify(body)}), },
    './_notificaciones.js': {notificar:async()=>({enviadas:0})},
    './_zoom.js': {isConfigured:()=>false,agregarRegistrante:async()=>({}),obtenerReunion:async()=>({}),configurarRegistroPortal:async()=>({})},
    './_sesiones.js': {ventana,partirNombre,fechaMexico:()=> 'Fecha QA',sincronizar:async()=>({corrio:false}),cargarSesion:async()=>s.datosSesion},
    './_consultas.js': {traerTodo, comprobar:async q=>{const r=await q;if(r.error)throw new Error(r.error.message);return r.data;}},
  };
  const code=await fs.readFile(new URL(`../netlify/functions/${nombre}.js`,import.meta.url),'utf8');
  const mod=new vm.SourceTextModule(code,{context});
  await mod.link(spec=>{
    const values=mocks[spec]; if(!values)throw new Error(`Import sin mock ${spec}`);
    return new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v] of Object.entries(values))this.setExport(k,v);},{context});
  });
  await mod.evaluate();return mod.namespace.handler;
}
const event=body=>({httpMethod:'POST',headers:{authorization:'Bearer qa'},body:JSON.stringify(body)});
const body=r=>JSON.parse(r.body);
async function check(nombre,fn){await fn();console.log('PASS',nombre);}

await check('examen no reutiliza respuesta de otra pregunta',async()=>{
  const s=base(), fn=await handler('examen-calificar',s);
  const r=await fn(event({courseId:11,respuestas:{1:0}}));
  assert.equal(r.statusCode,200); assert.equal(body(r).calificacion,50); assert.equal(body(r).aprobado,false);
});
await check('examen ignora secciones y respeta mínimo cero',async()=>{
  const s=base();s.tablas.courses[0].min_aprobacion=0;s.tablas.curso_lecciones.push({id:102,course_id:11,tipo:'seccion',obligatoria:true});
  const r=await (await handler('examen-calificar',s))(event({courseId:11,respuestas:{}}));
  assert.equal(r.statusCode,200);assert.equal(body(r).minimo,0);
});
await check('examen no devuelve éxito si falla guardar intento',async()=>{
  const s=base();s.fallos['curso_eventos:insert']={};
  assert.equal((await (await handler('examen-calificar',s))(event({courseId:11,respuestas:{1:0,2:0}}))).statusCode,500);
});
await check('examen limita intentos recientes y acceso vencido',async()=>{
  const s=base();s.tablas.curso_eventos=[{id:1,user_id:'alumno',course_id:11,tipo:'examen_enviado',creado_en:new Date().toISOString()}];
  assert.equal((await (await handler('examen-calificar',s))(event({courseId:11}))).statusCode,429);
  s.vigente=false;assert.equal((await (await handler('examen-calificar',s))(event({courseId:11}))).statusCode,403);
});
await check('certificado exige resultado servidor incluso con regla lecciones',async()=>{
  const s=base();s.tablas.curso_reglas[0].regla_finalizacion='lecciones';
  const r=await (await handler('certificado-emitir',s))(event({accion:'emitir',courseId:11}));
  assert.equal(r.statusCode,409);assert.equal(body(r).estado,'examen-pendiente');
});
await check('certificado emite nota real y reintento conserva folio',async()=>{
  const s=base();s.tablas.curso_eventos=[{id:1,user_id:'alumno',course_id:11,tipo:'examen_enviado',datos:{aprobado:true,calificacion:95,origen:'servidor'}}];
  const fn=await handler('certificado-emitir',s), r=await fn(event({accion:'emitir',courseId:11}));
  assert.equal(r.statusCode,200);assert.equal(body(r).certificado.score,95);
  const segunda=await fn(event({accion:'emitir',courseId:11}));
  assert.equal(body(segunda).nuevo,false);assert.equal(body(segunda).certificado.folio,body(r).certificado.folio);assert.equal(s.tablas.certificates.length,1);
});
await check('certificado nunca omite requisitos ante error de consulta',async()=>{
  const s=base();s.fallos['curso_lecciones:select']={};
  assert.equal((await (await handler('certificado-emitir',s))(event({accion:'emitir',courseId:11}))).statusCode,500);
});
await check('certificado rechaza imagen de otro alumno',async()=>{
  const s=base();s.tablas.certificates=[{id:9,user_id:'alumno',course_id:11}];
  const fn=await handler('certificado-emitir',s);
  assert.equal((await fn(event({accion:'imagen',certificadoId:9,ruta:'otro/falso.png'}))).statusCode,400);
  s.archivos=[{bucket:'certificates',ruta:'alumno/real.png'}];
  assert.equal((await fn(event({accion:'imagen',certificadoId:9,ruta:'alumno/real.png'}))).statusCode,200);
});
await check('evaluación recupera avance tras fallo sin duplicar intento',async()=>{
  const s=base();s.tablas.curso_lecciones=[{id:101,course_id:11,tipo:'examen'}];
  s.tablas.evaluacion_config=[{leccion_id:101,min_aprobacion:80}];
  s.tablas.evaluacion_preguntas=[{id:20,leccion_id:101,tipo:'opcion',texto:'QA',opciones:['Sí','No'],puntos:1,obligatoria:true}];
  s.tablas.evaluacion_claves=[{pregunta_id:20,correctas:[0]}];s.tablas.leccion_progreso=[];
  s.fallos['leccion_progreso:upsert']={veces:1};
  const fn=await handler('evaluacion-enviar',s);
  assert.equal((await fn(event({leccionId:101,respuestas:{20:0}}))).statusCode,500);
  assert.equal(s.tablas.evaluacion_intentos.length,1);
  const reintento=await fn(event({leccionId:101,respuestas:{20:0}}));
  assert.equal(body(reintento).estado,'ya-aprobado');assert.equal(s.tablas.leccion_progreso[0].completada,true);assert.equal(s.tablas.evaluacion_intentos.length,1);
});
await check('copia fallida elimina solo el curso recién creado',async()=>{
  const s=base();s.administrador={id:'admin'};s.fallos['questions:insert']={};
  const r=await (await handler('curso-clonar',s))(event({accion:'clonar',courseId:11}));
  assert.equal(r.statusCode,500);assert.deepEqual(s.tablas.courses.map(c=>c.id),[11]);
});
await check('paginación servidor conserva 2301 filas',async()=>{
  const s=base();s.tablas.courses=Array.from({length:2301},(_,i)=>({id:i+1}));
  const db=database(s);assert.equal((await traerTodo(()=>db.from('courses').select('id').order('id'))).length,2301);
});
await check('registro posterior a asistencia manual recupera enlace sin borrar asistencia',async()=>{
  const s=base();s.datosSesion={leccion:{id:101,course_id:11,tipo:'sesion'},
    sesion:{inicia_en:new Date(Date.now()+3600000).toISOString(),duracion_min:60},
    secretos:{enlace_respaldo:'https://qa.invalid/zoom'}};
  s.tablas.sesion_registros=[{id:77,user_id:'alumno',leccion_id:101,join_url:null,asistio:true}];
  const fn=await handler('sesion-clase',s);
  assert.equal(body(await fn(event({accion:'estado',leccionId:101}))).registrado,false);
  const r=await fn(event({accion:'registrar',leccionId:101}));assert.equal(r.statusCode,200);
  assert.equal(body(r).registrado,true);assert.equal(body(r).asistio,true);assert.equal(s.tablas.sesion_registros.length,1);
  assert.equal(s.tablas.sesion_registros[0].join_url,'https://qa.invalid/zoom');
});
