// Revisión con datos sintéticos y todas las peticiones externas interceptadas.
// node scripts/verificar-alumni-ui.mjs <paquete playwright> <carpeta capturas>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const salida = path.resolve(process.argv[3] || path.join(process.env.TEMP || '.', 'hce-alumni-capturas'));
await fs.mkdir(salida, { recursive: true });
const temporalHtml = path.resolve('.qa-alumni.html'), temporalJsx = path.resolve('src/qa-alumni-ui.jsx');
// No sobrescribir archivos de otra revisión en curso.
for (const p of [temporalHtml,temporalJsx]) { try { await fs.access(p); throw Error('Ya existe '+p); } catch(e) { if(e.code!=='ENOENT')throw e; } }
await fs.writeFile(temporalHtml,'<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/src/qa-alumni-ui.jsx"></script></body></html>');
await fs.writeFile(temporalJsx,`import React from 'react';import{createRoot}from'react-dom/client';import{useState}from'react';import{BrowserRouter}from'react-router-dom';import{ supabase }from'./lib/supabase';import Admin from'./components/admin/AlumniPassAdmin';import General from'./pages/AdminDashboard';import{NotificationProvider}from'./context/NotificationContext';import './index.css';import './pages/AdminDashboard.css';supabase.auth.getSession=async()=>({data:{session:{access_token:'qa'}}});function App(){const[msg,setMsg]=useState('');if(new URLSearchParams(location.search).has('formularios')){localStorage.setItem('adminActiveTab','payments');return <BrowserRouter><NotificationProvider><General/></NotificationProvider></BrowserRouter>}return <BrowserRouter><div className="admin-layout" data-theme={new URLSearchParams(location.search).get('theme')||'light'} style={{display:'block',padding:16}}><h1 style={{fontSize:24,marginBottom:20}}>Solicitudes · Alumni Pass</h1><p role="status">{msg}</p><Admin confirmar={async()=>true} notificar={setMsg}/></div></BrowserRouter>}createRoot(document.getElementById('root')).render(<App/>);`);
let server, browser;
const errores=[];
let pruebas=0;
const cupo={total:30,ocupados:2,pagados:2,restantes:28};
const pase={nombre:'Ana López',email:'ana@example.test',modalidad:'presencial',grabaciones:true,folio:'AP26-0001',pagado:true,correoEnviado:true};
const registros=[
  {id:1,nombre:'Ana López',email:'ana@example.test',telefono:'+52 5555555555',especialidad:'Perfusión',hospital:'Hospital General de Prueba',ciudad:'Ciudad de México',pais:'México',modalidad:'presencial',grabaciones:true,revision:'pendiente',pagado:false,creado_en:'2026-10-14T18:00:00Z',diploma_url:'https://qa.invalid/diploma.pdf'},
  {id:2,nombre:'María Hernández',email:'maria@example.test',especialidad:'Medicina crítica',hospital:'Centro de Cardiología',ciudad:'Guadalajara',pais:'México',modalidad:'virtual',grabaciones:false,revision:'aprobado',pagado:false,correo_enlace_en:'2026-10-14T18:00:00Z',enlace_pago:'https://healthcareexp.com/alumni-pass-step1?pago=qa',creado_en:'2026-10-14T18:00:00Z'},
  {id:3,nombre:'Luis García',email:'luis@example.test',especialidad:'Enfermería',hospital:'Hospital QA',ciudad:'Monterrey',pais:'México',modalidad:'presencial',grabaciones:true,revision:'aprobado',pagado:true,moneda:'mxn',importe:8299,folio:'AP26-0003',creado_en:'2026-10-14T18:00:00Z',pagado_en:'2026-10-14T18:00:00Z'},
];
let solicitado=0, cuerpos=[], fallaPago=false, cupoAgotado=false;
try {
  server=await createServer({server:{host:'127.0.0.1',port:5187,strictPort:true},define:{'import.meta.env.VITE_SUPABASE_URL':JSON.stringify('https://qa.supabase.test'),'import.meta.env.VITE_SUPABASE_ANON_KEY':JSON.stringify('qa-public-key')}});
  await server.listen();
  browser=await chromium.launch({headless:true,executablePath:process.env.HCE_QA_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('hce_cookie_consent','{"necessary":true}'));
  await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    const responder=(body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname.startsWith('/.netlify/functions/')) {
      if(!url.pathname.endsWith('/alumni-pass'))return responder({moneda:'mxn'});
      const d=route.request().postDataJSON();cuerpos.push(d);
      if(d.accion==='cupo')return responder({presencial:cupo});
      if(d.accion==='pago-info') {
        if(d.token==='rechazado')return responder({error:'Tu solicitud todavía no está aprobada.'},409);
        if(d.token==='pagado')return responder({...pase,presencial:cupo});
        return responder({nombre:pase.nombre,email:pase.email,modalidad:'presencial',grabaciones:false,pagado:false,presencial:{...cupo,restantes:cupoAgotado?0:28}});
      }
      if(d.accion==='solicitar'){solicitado++;await new Promise(r=>setTimeout(r,300));return responder({ok:true,id:100,acuseEnviado:false,avisoEquipo:true});}
      if(d.accion==='pagar')return responder({error:fallaPago?'Fallo de prueba. Tus datos se conservan.':'Pago simulado: no se realizó ningún cargo.'},500);
      if(d.accion==='confirmar')return responder({...pase,correoEnviado:false,avisoCorreo:'Tu pago está confirmado. El envío del pase por correo está pendiente; conserva tu folio.'});
      if(d.accion==='listar')return responder({registros,presencial:cupo});
      if(d.accion==='aprobar'){registros.find(r=>r.id===d.id).revision='aprobado';return responder({ok:true,correoEnviado:false});}
      if(d.accion==='rechazar'){registros.find(r=>r.id===d.id).revision='rechazado';return responder({ok:true,correoEnviado:true});}
      if(d.accion==='reenviar-pase'){registros.find(r=>r.id===d.id).brevo_sincronizado_en=new Date().toISOString();return responder({ok:true,correoEnviado:true});}
      if(d.accion==='sincronizar-registros'){
        Object.assign(registros.find(r=>r.id===d.id),{formulario_registrado_en:new Date().toISOString(),formspree_enviado_en:new Date().toISOString(),formspree_estado:'enviado',brevo_solicitud_en:new Date().toISOString()});
        return responder({ok:true,integraciones:{formulario:true,formspree:'enviado',brevo:true,pendientes:false}});
      }
      return responder({ok:true});
    }
    if(url.origin==='http://127.0.0.1:5187')return route.continue();
    if(url.hostname==='qa.supabase.test'){if(url.pathname.endsWith('/form_submissions'))return responder([{id:'00000000-0000-4000-8000-000000000010',form_id:'xdeapenv',form_name:'Alumni Pass · Solicitud Step 1 Refresher',sender_name:'Ana López',sender_email:'ana@example.test',created_at:'2026-10-14T18:00:00Z',payload:{registro_alumni_id:1,nombre:'Ana López',hospital:'Hospital QA',ciudad:'CDMX',_integraciones:{formspree:'enviado',brevo:'enviado'}}}]);return responder([]);}
    if(route.request().resourceType()==='stylesheet')return route.fulfill({contentType:'text/css',body:''});
    return route.abort();
  });
  const page=await context.newPage();page.on('pageerror',e=>errores.push(e.message));
  async function check(nombre,fn){await fn();pruebas++;console.log('PASS',nombre);}
  async function ancho(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Página desbordada');}
  async function ir(query=''){await page.goto('http://127.0.0.1:5187/alumni-pass-step1'+query);await page.locator('.ap-pagina').waitFor();}
  await check('formulario público a 375/1280 px sin desbordamientos',async()=>{
    for(const width of [375,1280]){await page.setViewportSize({width,height:900});await ir();await page.getByRole('button',{name:'Enviar mi solicitud',exact:true}).waitFor();await ancho();await page.screenshot({path:path.join(salida,`alumni-solicitud-${width}.png`),fullPage:true});}
  });
  await check('datos incompletos no se envían; archivo inválido se explica',async()=>{
    await page.getByRole('button',{name:'Enviar mi solicitud',exact:true}).click();assert.equal(solicitado,0);await page.getByText('Escribe tu nombre o nombres como aparecen en tu diploma.').waitFor();
    await page.getByLabel('Subir diploma de Step 1').setInputFiles({name:'diploma.txt',mimeType:'text/plain',buffer:Buffer.from('qa')});await page.getByRole('alert').filter({hasText:'El diploma debe ser una foto'}).waitFor();
  });
  await check('solicitud completa con PDF bloquea doble envío y muestra acuse fallido',async()=>{
    await page.locator('.ap-chips').getByRole('button',{name:'Virtual',exact:true}).click();
    for(const [name,value]of Object.entries({nombres:'Ana María',apellido_paterno:'López',apellido_materno:'Pérez',email:'ana@example.test',telefono:'+52 5555555555',especialidad:'Perfusión',hospital:'Hospital QA',ciudad:'CDMX'}))await page.locator(`input[name="${name}"]`).fill(value);
    const pais=page.locator('select[name="pais"]');assert.ok(await pais.locator('option').count()>25);
    await pais.selectOption('Otro país');await page.getByRole('textbox',{name:'Especifica tu país *',exact:true}).fill('Japón');
    await pais.selectOption('México');assert.equal(await page.locator('input[name="pais_otro"]').count(),0);
    const edicion=page.locator('select[name="edicion_diploma"]');assert.deepEqual(await edicion.locator('option').allTextContents(),['Selecciona tu edición','Septiembre 2024 INC','Marzo 2025 INER','Chile 2025 INT']);await edicion.selectOption('Marzo 2025 INER');
    assert.equal(await page.getByText(/Quedan \d+ de/).count(),0);assert.equal(await page.getByText(/firmado por los profesores/).count(),0);
    await page.getByLabel('Subir diploma de Step 1').setInputFiles({name:'diploma.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\nQA')});
    await page.getByRole('checkbox',{name:/Acepto/}).check();
    await page.getByRole('button',{name:'Enviar mi solicitud',exact:true}).click();
    await page.getByRole('button',{name:'Enviando tu solicitud…'}).waitFor();assert.equal(await page.locator('input[name="nombres"]').isDisabled(),true);assert.equal(await edicion.isDisabled(),true);
    await page.getByText('Tu solicitud sí quedó guardada, pero no pudimos enviar el acuse por correo. No necesitas registrarte otra vez.').waitFor();assert.equal(solicitado,1);
    const d=cuerpos.find(d=>d.accion==='solicitar');assert.ok(d.solicitudClave);assert.equal(d.hospital,'Hospital QA');assert.ok(d.diploma.base64);
    assert.equal(d.nombres,'Ana María');assert.equal(d.apellido_paterno,'López');assert.equal(d.apellido_materno,'Pérez');assert.equal(d.edicion_diploma,'Marzo 2025 INER');assert.equal(d.pais,'México');
  });
  await check('pago aprobado USD coincide con total 475 y conserva opciones ante error',async()=>{
    await page.setViewportSize({width:375,height:900});await ir('?pago=aprobado');await page.getByRole('button',{name:'Dólares (USD)'}).click();await page.getByRole('checkbox').check();
    assert.equal(await page.locator('.ap-total strong').innerText(),'US$475');fallaPago=true;
    await page.getByRole('button',{name:'Pagar mi Alumni Pass',exact:true}).click();await page.getByRole('alert').filter({hasText:'Fallo de prueba'}).waitFor();assert.equal(await page.getByRole('checkbox').isChecked(),true);await ancho();await page.screenshot({path:path.join(salida,'alumni-pago-375.png'),fullPage:true});
  });
  await check('agotado permite virtual; rechazado y regreso sin referencia muestran explicación',async()=>{
    cupoAgotado=true;await ir('?pago=aprobado');await page.getByRole('button',{name:/Presencial ·/}).waitFor();assert.equal(await page.getByRole('button',{name:/Presencial ·/}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:/Virtual ·/}).getAttribute('aria-pressed'),'true');
    await ir('?pago=rechazado');await page.getByRole('alert').filter({hasText:'todavía no está aprobada'}).waitFor();
    await ir('?status=success');await page.getByText(/Falta la referencia del pago/).waitFor();await ancho();
  });
  await check('pago confirmado muestra folio aunque el correo esté pendiente',async()=>{
    await ir('?status=success&session_id=cs_qa&m=mxn');await page.getByText('AP26-0001',{exact:true}).first().waitFor();await page.getByText(/El envío del pase por correo está pendiente/).waitFor();await ancho();
  });
  await check('panel real con datos ficticios a 375/1280 y claro/oscuro',async()=>{
    for(const width of [375,1280])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5187/.qa-alumni.html?theme='+theme);await page.getByRole('button',{name:/Aceptar y enviar enlace/}).waitFor();await ancho();
      await page.screenshot({path:path.join(salida,`alumni-panel-${width}-${theme}.png`),fullPage:true});
    }
  });
  await check('rechazo se puede cancelar; fallo de correo al aceptar queda visible',async()=>{
    await page.getByRole('button',{name:'Rechazar',exact:true}).click();await page.getByRole('textbox',{name:'Motivo del rechazo (se incluirá en el correo)'}).waitFor();await page.getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Confirmar rechazo',exact:true}).count(),0);
    await page.getByRole('button',{name:/Aceptar y enviar enlace/}).click();await page.getByRole('status').filter({hasText:'no se pudo enviar el correo'}).first().waitFor();
    await page.getByRole('button',{name:/Aceptados sin pagar/}).click();await page.getByText('Sin envío confirmado: reenvía o copia el enlace').waitFor();await ancho();
  });
  await check('recuperar avisos de un pagado no vuelve a cobrar; exportación disponible',async()=>{
    await page.locator('.alumni-filtros').getByRole('button',{name:/^Pagados/}).click();await page.getByRole('button',{name:'Reintentar avisos pendientes'}).click();await page.getByText('Envío registrado en Brevo',{exact:true}).waitFor();
    const descargar=page.waitForEvent('download');await page.getByRole('button',{name:'Exportar',exact:true}).click();const archivo=await descargar;assert.equal(archivo.suggestedFilename(),'Alumni_Pass_Step1.csv');
    assert.equal(cuerpos.filter(d=>d.accion==='pagar').length,1);
  });
  await check('el panel recupera registros externos pendientes y muestra las recepciones confirmadas',async()=>{
    await page.getByRole('button',{name:'Reintentar registros pendientes',exact:true}).click();
    await page.getByText('Recepción confirmada',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Reintentar registros pendientes',exact:true}).count(),0);
    assert.equal(cuerpos.filter(d=>d.accion==='sincronizar-registros').length,1);
    await ancho();
  });
  await check('registro aparece en el panel general de Formularios y se filtra como Alumni Pass',async()=>{
    for(const width of [375,1280]){
      await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5187/.qa-alumni.html?formularios=1');
      await page.getByRole('button',{name:'Formularios',exact:true}).click();
      const filtro=page.locator('select').filter({has:page.locator('option[value="xdeapenv"]')});await filtro.selectOption('xdeapenv');
      await page.getByText('Solicitud guardada',{exact:true}).waitFor();await page.getByText('ana@example.test',{exact:true}).first().waitFor();
      await ancho();await page.screenshot({path:path.join(salida,'alumni-formularios-'+width+'.png'),fullPage:true});
    }
  });
  assert.deepEqual(errores,[]);console.log(`${pruebas}/${pruebas} pruebas UI correctas. Capturas: ${salida}`);
} finally {
  await browser?.close();await server?.close();
  await fs.unlink(temporalHtml).catch(()=>{});await fs.unlink(temporalJsx).catch(()=>{});
}
