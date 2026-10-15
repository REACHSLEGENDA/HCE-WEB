// Migración y permisos reales de Alumni Pass sobre PostgreSQL en memoria.
// node scripts/verificar-alumni-sql.mjs <ruta a @electric-sql/pglite/dist/index.js>
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : '@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    create function public.es_admin() returns boolean language sql stable as $$ select current_setting('qa.admin',true) = 'si' $$;
    create table public.form_submissions(id uuid primary key default gen_random_uuid(),form_id text not null,form_name text not null,sender_name text not null,sender_email text not null,payload jsonb not null,created_at timestamptz not null default now());
    alter table public.form_submissions enable row level security;
    grant select on public.form_submissions to authenticated;
    create policy "admin lee formularios" on public.form_submissions for select to authenticated using(public.es_admin());
    grant usage on schema public,storage to anon,authenticated,service_role;
  `);
  const sql = await fs.readFile(new URL('../supabase/alumni-pass.sql',import.meta.url),'utf8');
  await db.exec(sql); await db.exec(sql);
  const ampliacion = await fs.readFile(new URL('../supabase/alumni-pass-datos-diploma.sql',import.meta.url),'utf8');
  await db.exec(ampliacion);await db.exec(ampliacion);
  const columnas=(await db.query("select column_name from information_schema.columns where table_schema='public' and table_name='alumni_pass_registros'")).rows.map(r=>r.column_name);
  for(const nombre of ['nombres','apellido_paterno','apellido_materno','edicion_diploma'])assert.ok(columnas.includes(nombre));
  console.log('PASS migración completa ejecutada dos veces');
  await db.exec(`insert into public.alumni_pass_registros(email,nombre,modalidad,diploma_path,revision,pagado)
    select 'qa'||n||'@example.test','Solicitud '||n,'presencial','qa/diploma.pdf','aprobado',n<=29 from generate_series(1,32) n;`);
  const reservar = id => db.query(`select public.alumni_reservar_pago($1,'presencial','mxn',false) as r`,[id]);
  const r = (await reservar(30)).rows[0].r;
  assert.ok(r.formulario_id);assert.equal(r.formspree_estado,'pendiente');
  assert.equal((await db.query('select count(distinct formulario_id)::int as n from alumni_pass_registros')).rows[0].n,32);
  assert.ok(r.checkout_intento); assert.equal((await reservar(30)).rows[0].r.checkout_intento,r.checkout_intento);
  await assert.rejects(reservar(31),/ALUMNI_AGOTADO/);
  console.log('PASS último lugar reservado una vez; siguiente comprador bloqueado');
  await db.query('select public.alumni_liberar_pago($1,$2)',[30,'00000000-0000-4000-8000-000000000000']);
  await assert.rejects(reservar(31),/ALUMNI_AGOTADO/);
  await db.query('select public.alumni_liberar_pago($1,$2)',[30,r.checkout_intento]);
  const siguiente = (await reservar(31)).rows[0].r;
  assert.ok(siguiente.checkout_intento);
  console.log('PASS solo el intento correcto puede liberar el lugar');
  await db.exec(`update alumni_pass_registros set checkout_reservado_hasta=now()-interval '1 minute' where id=31;`);
  assert.ok((await reservar(32)).rows[0].r.checkout_intento);
  console.log('PASS una reserva vencida libera el cupo');
  await assert.rejects(reservar(1),/disponible para pago/);
  await db.exec(`update alumni_pass_registros set revision='pendiente' where id=30;`);
  await assert.rejects(reservar(30),/disponible para pago/);
  console.log('PASS ni pagados ni solicitudes pendientes pueden reservar');
  await db.exec('set role anon;');
  await assert.rejects(reservar(30),/permission denied/);
  await assert.rejects(db.query('select * from alumni_pass_registros'),/permission denied/);
  await db.exec('reset role; set role authenticated;');
  await assert.rejects(reservar(30),/permission denied/);
  assert.equal((await db.query('select count(*)::int as n from alumni_pass_registros')).rows[0].n,0);
  await db.exec("select set_config('qa.admin','si',false);");
  assert.equal((await db.query('select count(*)::int as n from alumni_pass_registros')).rows[0].n,32);
  console.log('PASS RPC solo servidor; solicitudes privadas salvo administradores');
  await db.exec('reset role; set role service_role;');
  const formulario=(await db.query(`select formulario_id from alumni_pass_registros where id=31`)).rows[0].formulario_id;
  for(let n=0;n<2;n++)await db.query(`insert into public.form_submissions(id,form_id,form_name,sender_name,sender_email,payload)
    values($1,'xdeapenv','Alumni Pass','Ana','qa@example.test','{}') on conflict(id) do update set payload=excluded.payload`,[formulario]);
  assert.equal((await db.query('select count(*)::int as n from form_submissions')).rows[0].n,1);
  await db.exec("reset role; select set_config('qa.admin','no',false); set role authenticated;");
  assert.equal((await db.query('select count(*)::int as n from form_submissions')).rows[0].n,0);
  await db.exec('reset role; set role service_role;');
  console.log('PASS copia general de formularios idempotente por servidor y privada para el alumno');
  assert.ok((await db.query(`select public.alumni_reservar_pago(31,'virtual','usd',true) as r`)).rows[0].r.checkout_intento);
  console.log('PASS servicio puede reservar modalidad virtual sin consumir cupos presenciales');
} finally { await db.close(); }
