// Divisiones → "Marca y acceso" (como las Divisiones de TalentLMS): dirección
// propia, logo, color, catálogo, inscripción automática y registro por enlace.
// Requiere supabase/divisiones-marca.sql.
import { useState } from 'react';
import { Copy, ExternalLink, ImagePlus, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const SITIO = 'https://healthcareexp.com';
const SLUG_VALIDO = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;
const faltaMigracion = (error) => ['42703', 'PGRST204'].includes(error?.code);

const aSlug = (texto) => String(texto || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export default function DivisionMarca({ division, notificar, onGuardada }) {
  const [datos, setDatos] = useState(() => ({
    slug: division.slug || aSlug(division.nombre),
    dominio: division.dominio || '',
    logo_url: division.logo_url || '',
    color: division.color || '#005fe6',
    bienvenida: division.bienvenida || '',
    catalogo: division.catalogo || 'propio',
    inscripcion_auto: division.inscripcion_auto ?? true,
    registro_abierto: division.registro_abierto ?? true,
    aprobacion_auto: division.aprobacion_auto ?? true,
  }));
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [falta, setFalta] = useState(false);
  const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const slugOk = SLUG_VALIDO.test(datos.slug);
  const enlace = `${SITIO}/login?division=${datos.slug}`;
  const subdominio = `https://${datos.slug}.healthcareexp.com`;

  const copiar = async (texto) => {
    try { await navigator.clipboard.writeText(texto); notificar('Copiado.', 'success'); } catch { notificar('No se pudo copiar; selecciónalo a mano.', 'error'); }
  };

  const subirLogo = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(archivo.type)) { notificar('Usa una imagen PNG, JPG, WEBP o SVG.', 'error'); return; }
    if (archivo.size > 2 * 1024 * 1024) { notificar('El logo debe pesar menos de 2 MB.', 'error'); return; }
    setSubiendo(true);
    try {
      const ext = (archivo.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
      const ruta = `${division.id}/logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('divisiones').upload(ruta, archivo, { contentType: archivo.type, upsert: false });
      if (error) throw error;
      cambiar('logo_url', supabase.storage.from('divisiones').getPublicUrl(ruta).data.publicUrl);
      notificar('Logo listo. Guarda los cambios para aplicarlo.', 'success');
    } catch (err) {
      notificar(/bucket/i.test(err.message || '') ? 'Falta correr supabase/divisiones-marca.sql (bucket de logos).' : `No se pudo subir el logo: ${err.message}`, 'error');
    } finally {
      setSubiendo(false);
    }
  };

  const guardar = async () => {
    if (!slugOk) { notificar('La dirección solo puede tener minúsculas, números y guiones.', 'error'); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(datos.color)) { notificar('El color debe ser un código como #005fe6.', 'error'); return; }
    setGuardando(true);
    const cambios = {
      ...datos,
      dominio: datos.dominio.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null,
      logo_url: datos.logo_url || null,
      bienvenida: datos.bienvenida.trim() || null,
    };
    const { error } = await supabase.from('divisiones').update(cambios).eq('id', division.id);
    setGuardando(false);
    if (error) {
      if (faltaMigracion(error)) { setFalta(true); return; }
      notificar(error.code === '23505' ? 'Esa dirección o dominio ya lo usa otra división.' : error.message, 'error');
      return;
    }
    notificar('Marca y acceso guardados.', 'success');
    onGuardada?.({ ...division, ...cambios });
  };

  if (falta) return <div className="lms-aviso">Para usar la marca y el acceso de las divisiones corre en Supabase <code>supabase/divisiones-marca.sql</code> y vuelve a intentar.</div>;

  return (
    <div className="dm">
      <section className="dm-bloque">
        <h5>Cómo se ve</h5>
        <div className="dm-vista" style={{ '--dm-color': datos.color }}>
          {datos.logo_url ? <img src={datos.logo_url} alt={`Logo de ${division.nombre}`} /> : <strong>{division.nombre}</strong>}
          <span className="dm-vista-boton">Entrar a mis cursos</span>
          <small>con tecnología de HCE</small>
        </div>
        <div className="dm-fila">
          <label className="btn-crm-action outlined mini dm-subir">
            <ImagePlus size={14} /> {subiendo ? 'Subiendo…' : datos.logo_url ? 'Cambiar logo' : 'Subir logo'}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={subirLogo} disabled={subiendo} />
          </label>
          {datos.logo_url && <button type="button" className="btn-crm-action outlined mini" onClick={() => cambiar('logo_url', '')}>Quitar logo</button>}
          <label className="dm-color">
            Color principal
            <input type="color" value={datos.color} onChange={(e) => cambiar('color', e.target.value)} />
            <input type="text" value={datos.color} onChange={(e) => cambiar('color', e.target.value)} maxLength={7} aria-label="Código del color" />
          </label>
        </div>
        <label className="dm-campo">
          Mensaje de bienvenida en la entrada (opcional)
          <textarea rows="2" maxLength={240} value={datos.bienvenida} onChange={(e) => cambiar('bienvenida', e.target.value)} placeholder={`Ej. Programa de formación continua de ${division.nombre}.`} />
        </label>
      </section>

      <section className="dm-bloque">
        <h5>Dirección y registro</h5>
        <label className="dm-campo">
          Nombre corto para su dirección
          <div className="dm-prefijo"><input type="text" value={datos.slug} onChange={(e) => cambiar('slug', aSlug(e.target.value))} aria-invalid={!slugOk} /><span>.healthcareexp.com</span></div>
          {!slugOk && <small className="dm-error">Solo minúsculas, números y guiones.</small>}
        </label>
        <div className="dm-enlace">
          <div><strong>Enlace de registro</strong> (funciona ya, sin configurar nada):<br /><code>{enlace}</code></div>
          <div className="dm-fila">
            <button type="button" className="btn-crm-action outlined mini" onClick={() => copiar(enlace)} disabled={!slugOk}><Copy size={13} /> Copiar</button>
            <a className="btn-crm-action outlined mini" href={enlace} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Probar</a>
          </div>
        </div>
        <label className="dm-check"><input type="checkbox" checked={datos.registro_abierto} onChange={(e) => cambiar('registro_abierto', e.target.checked)} /> Quien se registra por su enlace o dirección entra a esta división</label>
        <label className="dm-check"><input type="checkbox" checked={datos.aprobacion_auto} onChange={(e) => cambiar('aprobacion_auto', e.target.checked)} /> Aprobar su cuenta automáticamente (sin esperar a que la actives)</label>
        <label className="dm-campo">
          Dominio propio de la institución (opcional)
          <input type="text" value={datos.dominio} onChange={(e) => cambiar('dominio', e.target.value)} placeholder="cursos.hospitalx.com" />
        </label>
        <details className="dm-pasos">
          <summary>Activar su dirección propia (opcional, una vez por división)</summary>
          <p className="dm-pasos-intro">
            El <strong>enlace de registro</strong> de arriba ya funciona. Esto solo hace falta si quieres que la institución
            entre por <strong>{slugOk ? `${datos.slug}.healthcareexp.com` : 'su subdominio'}</strong>{datos.dominio ? <> o por <strong>{datos.dominio}</strong></> : null}.
            Primero <strong>guarda</strong> esta pantalla.
          </p>
          <ol>
            <li>
              <strong>Netlify:</strong> entra al proyecto <code>hce-web</code> → <em>Domain management</em> → <em>Add a domain</em> → escribe
              <span className="dm-copiable"><code>{datos.slug}.healthcareexp.com</code><button type="button" onClick={() => copiar(`${datos.slug}.healthcareexp.com`)} disabled={!slugOk} aria-label="Copiar subdominio"><Copy size={12} /></button></span>
              y confirma. {datos.dominio ? <>Repite con <code>{datos.dominio}</code>.</> : null}
            </li>
            <li>
              <strong>DNS:</strong> Netlify te dirá si hace falta. Si el DNS de healthcareexp.com lo maneja Netlify, se configura solo.
              Si está en otro lado (GoDaddy, Cloudflare…), crea un registro:
              <span className="dm-registro">Tipo <code>CNAME</code> · Nombre <code>{datos.slug}</code> · Destino <span className="dm-copiable"><code>hce-web.netlify.app</code><button type="button" onClick={() => copiar('hce-web.netlify.app')} aria-label="Copiar destino"><Copy size={12} /></button></span></span>
              {datos.dominio ? <>Para <code>{datos.dominio}</code>, la institución crea en su DNS un <code>CNAME</code> con ese mismo destino.</> : null}
            </li>
            <li>
              <strong>Supabase:</strong> <code>https://*.healthcareexp.com/**</code> ya está en Redirect URLs, no hagas nada.
              {datos.dominio ? <> Solo agrega <code>{`https://${datos.dominio}/**`}</code> para su dominio propio.</> : null}
            </li>
            <li>
              <strong>Prueba:</strong> en 10 a 30 minutos (lo que tarda el certificado de seguridad) abre
              <a href={subdominio} target="_blank" rel="noreferrer"> {subdominio}</a>: debe aparecer la entrada con su logo.
            </li>
          </ol>
        </details>
      </section>

      <section className="dm-bloque">
        <h5>Cursos</h5>
        <label className="dm-check"><input type="radio" name="catalogo" checked={datos.catalogo === 'propio'} onChange={() => cambiar('catalogo', 'propio')} /> Sus alumnos solo ven los cursos de esta división</label>
        <label className="dm-check"><input type="radio" name="catalogo" checked={datos.catalogo === 'propio_y_hce'} onChange={() => cambiar('catalogo', 'propio_y_hce')} /> Ven los cursos de la división y también el catálogo general de HCE</label>
        <label className="dm-check"><input type="checkbox" checked={datos.inscripcion_auto} onChange={(e) => cambiar('inscripcion_auto', e.target.checked)} /> Inscribir automáticamente a sus alumnos en los cursos de la división</label>
        <small className="lms-ayuda" style={{ marginLeft: 0 }}>Los cursos que marques en la pestaña Cursos son exclusivos de esta división: los alumnos de otras no los ven ni pueden inscribirse.</small>
      </section>

      <button type="button" className="btn-crm-action solid" onClick={guardar} disabled={guardando}><Save size={15} /> {guardando ? 'Guardando…' : 'Guardar marca y acceso'}</button>
    </div>
  );
}
