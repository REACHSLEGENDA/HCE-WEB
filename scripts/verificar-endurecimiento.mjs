// Ejecuta las migraciones reales y prueba RLS con datos sintéticos en memoria.
// Requiere PGlite solo para QA; no se añade al cliente ni al servidor.
// node scripts/verificar-endurecimiento.mjs <ruta al módulo dist/index.js de PGlite>
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(path.resolve(process.argv[2])).href : '@electric-sql/pglite');
const root = fileURLToPath(new URL('../', import.meta.url));
const db = new PGlite();
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role',true) $$;
create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated,service_role;
`);
const files = ['supabase-setup.sql','supabase-portal-fix.sql','supabase/webinars-asistencia.sql',
 'supabase/cursos-inscripciones.sql','supabase/cursos-actividad.sql','supabase/lms-estructura.sql',
 'supabase/lms-enlaces.sql','supabase/cuentas-aprobacion.sql','supabase/lms-evaluaciones.sql',
 'supabase/lms-reglas.sql','supabase/lms-sesiones.sql','supabase/actividad-portal.sql',
 'supabase/notificaciones.sql','supabase/mensajes.sql','supabase/divisiones.sql'];
for (const file of files) {
  try { await db.exec(await fs.readFile(path.join(root,file),'utf8')); }
  catch(e) { console.error('Migración base fallida',file,e.message); throw e; }
}
await db.exec(`grant all on all tables in schema public,storage to authenticated,service_role;
grant usage,select on all sequences in schema public to authenticated,service_role;`);
const migration = await fs.readFile(path.join(root,'supabase/endurecimiento.sql'),'utf8');
await db.exec(migration);
await db.exec(migration);
console.log('PASS migración completa sobre esquema real e idempotencia');
const alumno='00000000-0000-4000-8000-000000000001', admin='00000000-0000-4000-8000-000000000002', otro='00000000-0000-4000-8000-000000000003';
await db.exec(`select set_config('request.jwt.claim.role','service_role',false);
 insert into auth.users(id,email) values ('${alumno}','qa-alumno@example.test'),('${admin}','qa-admin@example.test'),('${otro}','qa-otro@example.test');
 update profiles set aprobado=true,activo=true;
 update profiles set rol='admin' where id='${admin}';
 insert into courses(id,title) values (11,'Curso QA'),(12,'Curso distinto');
 insert into inscripciones(user_id,course_id,origen) values ('${alumno}',11,'admin');
 insert into curso_lecciones(id,course_id,titulo,tipo) values (101,11,'Tarea','tarea'),(102,11,'Video','video'),(103,11,'Examen','examen');
 insert into storage.objects(bucket_id,name) values ('certificates','${otro}/cert.png');
 insert into certificates(user_id,course_id,pdf_url,folio,score,expires_at) values ('${alumno}',11,'','QA-FOL',100,now()-interval '100 days');
 insert into mensajes(id,remitente_id,asunto,cuerpo,destino_tipo) values (100,'${admin}','Mensaje QA','Texto','todos');
 insert into mensaje_destinatarios(mensaje_id,user_id) values (100,'${alumno}'),(100,'${otro}');
`);
async function asUser(id) {
 await db.exec(`reset role; select set_config('request.jwt.claim.role','authenticated',false);
 select set_config('request.jwt.claim.sub','${id}',false); set role authenticated;`);
}
async function fail(sql, label) {
 let failed=false;try{await db.exec(sql)}catch{failed=true}assert.equal(failed,true,label);console.log('PASS',label);
}
async function row(sql){return (await db.query(sql)).rows[0]}
await asUser(alumno);
await fail(`insert into certificates(user_id,course_id,pdf_url,folio,score) values ('${alumno}',12,'','FORGED',100)`, 'certificado falso bloqueado');
await fail(`insert into curso_eventos(user_id,course_id,tipo,datos) values ('${alumno}',11,'examen_enviado','{"aprobado":true,"origen":"servidor"}')`, 'resultado de examen falso bloqueado');
await fail(`insert into tarea_entregas(user_id,leccion_id,course_id,texto) values ('${alumno}',102,11,'No tarea')`, 'entrega en lección incorrecta bloqueada');
await db.exec(`insert into leccion_progreso(user_id,leccion_id,course_id,porcentaje,completada) values ('${alumno}',101,11,100,true),('${alumno}',103,11,100,true)`);
assert.equal((await row('select bool_or(completada) as completa from leccion_progreso')).completa,false);
console.log('PASS avance de tarea/examen manual bloqueado');
await db.exec(`insert into tarea_entregas(id,user_id,leccion_id,course_id,texto,creada_en) values (201,'${alumno}',101,11,'Entrega A',now()-interval '1 minute')`);
assert.equal((await row('select completada,porcentaje from leccion_progreso where leccion_id=101')).completada,true);
console.log('PASS entrega legítima completa tarea vía trigger');
await asUser(admin);
await db.exec(`update tarea_entregas set estado='rechazada' where id=201`);
assert.deepEqual(await row('select completada,porcentaje from leccion_progreso where leccion_id=101'),{completada:false,porcentaje:0});
console.log('PASS rechazo de tarea desmarca y vuelve a 0%');
await asUser(alumno);
await db.exec(`update leccion_progreso set completada=true,porcentaje=100 where leccion_id=101`);
assert.equal((await row('select completada from leccion_progreso where leccion_id=101')).completada,false);
await db.exec(`insert into tarea_entregas(id,user_id,leccion_id,course_id,texto) values (202,'${alumno}',101,11,'Entrega B')`);
assert.equal((await row('select completada from leccion_progreso where leccion_id=101')).completada,true);
await asUser(admin);
await db.exec(`update tarea_entregas set estado='rechazada' where id=201`);
assert.equal((await row('select completada from leccion_progreso where leccion_id=101')).completada,true);
console.log('PASS revisión de entrega anterior conserva última entrega');
await asUser(alumno);
const identidad = await row('select email,created_at from profiles where id=auth.uid()');
await db.exec(`update profiles set email='robado@example.test',created_at=now()+interval '1 year',rol='admin',nombre_completo='Nombre editable' where id=auth.uid()`);
assert.deepEqual(await row('select email,created_at from profiles where id=auth.uid()'),identidad);
assert.equal((await row('select rol,nombre_completo from profiles where id=auth.uid()')).rol,'estudiante');
console.log('PASS identidad/rol protegidos y perfil editable');
const publico=await row(`select * from perfiles_publicos(array['${otro}'::uuid])`);
assert.deepEqual(Object.keys(publico).sort(),['avatar_url','id','nombre','rol']);
assert.equal((await row('select count(*)::int as n from mensaje_destinatarios where mensaje_id=100')).n,1);
console.log('PASS nombres mínimos y privacidad destinatarios');
await fail(`insert into portal_config(clave,valor) values ('mensaje_bienvenida','{}')`,'alumno no cambia configuración');
await fail(`insert into storage.objects(bucket_id,name) values ('certificates','${otro}/falso.png')`,'alumno no sube certificado ajeno');
await db.exec(`delete from storage.objects where bucket_id='certificates' and name='${otro}/cert.png'`);
assert.equal((await row(`select count(*)::int as n from storage.objects where name='${otro}/cert.png'`)).n,1);
await db.exec(`insert into storage.objects(bucket_id,name) values ('certificates','${alumno}/propio.png')`);
console.log('PASS carpeta propia y borrado ajeno bloqueado');
await fail('select acceso_vigente(11,auth.uid())','RPC de acceso ajeno bloqueada');
assert.equal((await row('select esta_inscrito(11) as inscrito')).inscrito,true);
console.log('PASS esta_inscrito conserva funcionamiento');
await asUser(admin);
await db.exec(`insert into portal_config(clave,valor) values ('mensaje_bienvenida','{"texto":"Hola"}')`);
assert.equal((await row('select count(*)::int as n from mensaje_destinatarios where mensaje_id=100')).n,2);
console.log('PASS admin configura y consulta destinatarios');
await db.exec('reset role; select clean_expired_certificates()');
assert.equal((await row("select count(*)::int as n from certificates where folio='QA-FOL'")).n,1);
console.log('PASS certificado histórico preservado');
await db.exec(`update profiles set activo=false where id='${admin}'`);
await asUser(admin);
assert.equal((await row('select es_admin() as administrador,is_admin() as antiguo,cuenta_habilitada() as habilitada')).administrador,false);
await fail(`insert into portal_config(clave,valor) values ('suspendido','{}')`,'admin suspendido no cambia configuración');
await db.exec(`update courses set title='Cambio prohibido' where id=11`);
assert.equal((await row('select title from courses where id=11')).title,'Curso QA');
console.log('PASS admin suspendido pierde escritura directa RLS');

// Cursos por generación (acceso-por-grupo.sql).
const porGrupo = await fs.readFile(path.join(root, 'supabase/acceso-por-grupo.sql'), 'utf8');
await db.exec('reset role');
await db.exec(porGrupo);
await db.exec(porGrupo);
console.log('PASS acceso por grupo aplica e idempotente');
await db.exec(`reset role; select set_config('request.jwt.claim.role','service_role',false);
 insert into courses(id,title) values (13,'Curso por generación'),(14,'Curso inmediato');
 insert into curso_reglas(course_id,modo_acceso) values (13,'grupo');
 insert into inscripciones(user_id,course_id,origen) values ('${otro}',13,'pago'),('${otro}',14,'pago');
 insert into grupos(id,nombre) values (900,'Generación QA');`);
await asUser(otro);
assert.equal((await row('select esta_inscrito(14) as v')).v, true);
assert.equal((await row('select esta_inscrito(13) as v')).v, false);
assert.deepEqual(await row('select modo,con_grupo,abierto from mi_apertura(13)'), { modo: 'grupo', con_grupo: false, abierto: false });
console.log('PASS pagó sin grupo: lugar apartado y curso inmediato intacto');
await db.exec(`reset role; insert into grupo_cursos(grupo_id,course_id,abre_en) values (900,13,now()+interval '3 days');
 insert into grupo_miembros(grupo_id,user_id) values (900,'${otro}');`);
await asUser(otro);
assert.equal((await row('select esta_inscrito(13) as v')).v, false);
const proxima = await row('select con_grupo,abierto,abre_en from mi_apertura(13)');
assert.equal(proxima.con_grupo, true);
assert.equal(proxima.abierto, false);
assert.ok(proxima.abre_en);
console.log('PASS con grupo antes de la fecha: sigue cerrado y conoce su fecha');
await db.exec(`reset role; update grupo_cursos set abre_en=now()-interval '1 hour' where grupo_id=900 and course_id=13;`);
await asUser(otro);
assert.equal((await row('select esta_inscrito(13) as v')).v, true);
assert.equal((await row('select abierto from mi_apertura(13)')).abierto, true);
await fail('select acceso_por_grupo(13,auth.uid())', 'RPC de acceso por grupo ajena bloqueada');
console.log('PASS al llegar la fecha se abre');
await db.exec(`reset role; insert into curso_reglas(course_id,modo_acceso,dias_acceso) values (12,'grupo',5)
   on conflict (course_id) do update set modo_acceso='grupo', dias_acceso=5;
 insert into inscripciones(user_id,course_id,origen,created_at) values ('${otro}',12,'admin',now()-interval '30 days');`);
await asUser(otro);
assert.equal((await row('select esta_inscrito(12) as v')).v, false);
console.log('PASS inscrito a mano entra directo y los días de acceso se respetan');
await db.close();
