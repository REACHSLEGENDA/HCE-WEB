import React, { useCallback, useEffect, useState } from 'react';
import { Edit, Plus, Send, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';
import './AdminLms.css';

// Notificaciones automáticas por evento: el administrador arma cada correo,
// lo activa o lo apaga, y ve el historial de envíos.

const EVENTOS = {
  registro_nuevo: 'Registro nuevo en el portal',
  cuenta_activada: 'Cuenta activada (acceso y grupo asignados)',
  inscrito_curso: 'Inscrito a un curso',
  sesion_registro: 'Se registró a una sesión en vivo',
  sesion_recordatorio: '1 hora antes de una sesión en vivo',
  examen_aprobado: 'Aprobó un examen',
  tarea_revisada: 'Su tarea fue revisada',
  curso_completado: 'Terminó un curso (certificado emitido)',
  mensaje_nuevo: 'Recibió un mensaje en el portal',
};

// Variables disponibles en cada evento, además de {nombre}, {curso}, {enlace}.
const VARIABLES = {
  registro_nuevo: ['alumno', 'correo_alumno', 'portal'],
  cuenta_activada: ['acceso', 'grupo', 'cursos', 'portal'],
  inscrito_curso: ['curso', 'enlace'],
  sesion_registro: ['sesion', 'fecha', 'curso', 'enlace'],
  sesion_recordatorio: ['sesion', 'fecha', 'curso', 'enlace'],
  examen_aprobado: ['examen', 'calificacion', 'curso', 'enlace'],
  tarea_revisada: ['tarea', 'estado', 'comentario', 'curso', 'enlace'],
  curso_completado: ['curso', 'calificacion', 'folio', 'portal'],
  mensaje_nuevo: ['remitente', 'asunto', 'portal'],
};

const PLANTILLAS = {
  cuenta_activada: ['¡Tu cuenta en HCE ya está activa!', 'Hola {nombre}:\n\nTu cuenta ya tiene acceso. {acceso}\n\nYa puedes entrar a tu portal y empezar.'],
  inscrito_curso: ['Ya estás inscrito en {curso}', 'Hola {nombre}:\n\nYa tienes acceso a {curso}. Puedes empezar cuando quieras:\n{enlace}'],
  sesion_registro: ['Registro confirmado: {sesion}', 'Hola {nombre}:\n\nQuedaste registrado a {sesion}, el {fecha}.\n\nPara entrar, abre la lección en tu aula: el botón "Unirse" se activa 15 minutos antes.\n{enlace}'],
  sesion_recordatorio: ['En 1 hora empieza {sesion}', 'Hola {nombre}:\n\nTe recordamos que {sesion} empieza el {fecha}.\n\nEntra desde tu aula con el botón "Unirse":\n{enlace}'],
  examen_aprobado: ['¡Aprobaste {examen}!', 'Hola {nombre}:\n\n¡Felicidades! Aprobaste {examen} de {curso} con {calificacion}.\n\nSigue con tu curso: {enlace}'],
  tarea_revisada: ['Tu tarea {tarea} fue revisada', 'Hola {nombre}:\n\nTu tarea {tarea} quedó {estado}.\n\n{comentario}\n\nRevísala en tu aula: {enlace}'],
  curso_completado: ['¡Terminaste {curso}!', 'Hola {nombre}:\n\n¡Felicidades por terminar {curso}! Tu certificado (folio {folio}) ya está en la pestaña Certificados de tu portal:\n{portal}'],
  mensaje_nuevo: ['Tienes un mensaje nuevo: {asunto}', 'Hola {nombre}:\n\n{remitente} te escribió en el portal de HCE: "{asunto}".\n\nLéelo en tu bandeja de mensajes: {portal}'],
  registro_nuevo: ['Bienvenido al portal de HCE', 'Hola {nombre}:\n\nGracias por registrarte en el portal académico de Healthcare Training Experience.\n\n{portal}'],
};

const vacia = (evento = 'inscrito_curso') => ({
  id: null,
  nombre: '',
  evento,
  course_id: '',
  destinatario: 'alumno',
  asunto: PLANTILLAS[evento][0],
  cuerpo: PLANTILLAS[evento][1],
  activo: true,
});

async function llamarPrueba(notificacionId) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/notificacion-prueba', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify({ notificacionId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo mandar la prueba.');
  return data;
}

export default function NotificacionesAdmin({ cursos, notificar, confirmar }) {
  const [pestana, setPestana] = useState('lista');
  const [lista, setLista] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('notificaciones').select('*').order('evento').order('nombre');
    if (error) {
      if (esTablaFaltante(error)) setFaltaMigracion(true);
      else notificar(`No se pudieron cargar: ${error.message}`, 'error');
      setLista([]);
      return;
    }
    setLista(data || []);
  }, [notificar]);

  const cargarHistorial = useCallback(async () => {
    const { data } = await supabase
      .from('notificaciones_enviadas')
      .select('id, notificacion_id, email, enviado_en, error')
      .order('enviado_en', { ascending: false })
      .limit(200);
    setHistorial(data || []);
  }, []);

  useEffect(() => {
    let vigente = true;
    supabase.from('notificaciones').select('*').order('evento').order('nombre').then(({ data, error }) => {
      if (!vigente) return;
      if (error) { if (esTablaFaltante(error)) setFaltaMigracion(true); setLista([]); return; }
      setLista(data || []);
    });
    return () => { vigente = false; };
  }, []);

  useEffect(() => {
    if (pestana !== 'historial') return undefined;
    let vigente = true;
    supabase.from('notificaciones_enviadas').select('id, notificacion_id, email, enviado_en, error')
      .order('enviado_en', { ascending: false }).limit(200)
      .then(({ data }) => { if (vigente) setHistorial(data || []); });
    return () => { vigente = false; };
  }, [pestana]);

  const guardar = async (e) => {
    e.preventDefault();
    if (!editando.nombre.trim() || !editando.asunto.trim() || !editando.cuerpo.trim()) {
      notificar('Pon nombre, asunto y texto.', 'error');
      return;
    }
    setGuardando(true);
    const datos = {
      nombre: editando.nombre.trim(),
      evento: editando.evento,
      course_id: editando.course_id ? Number(editando.course_id) : null,
      destinatario: editando.destinatario,
      asunto: editando.asunto.trim(),
      cuerpo: editando.cuerpo,
      activo: editando.activo,
      actualizado_en: new Date().toISOString(),
    };
    const { error } = editando.id
      ? await supabase.from('notificaciones').update(datos).eq('id', editando.id)
      : await supabase.from('notificaciones').insert([datos]);
    setGuardando(false);
    if (error) { notificar(`No se pudo guardar: ${error.message}`, 'error'); return; }
    notificar('Notificación guardada.', 'success');
    setEditando(null);
    await cargar();
  };

  const alternar = async (n) => {
    setLista((l) => l.map((x) => (x.id === n.id ? { ...x, activo: !x.activo } : x)));
    const { error } = await supabase.from('notificaciones').update({ activo: !n.activo }).eq('id', n.id);
    if (error) { notificar(error.message, 'error'); await cargar(); }
  };

  const eliminar = async (n) => {
    if (!(await confirmar(`¿Eliminar la notificación "${n.nombre}"?`, 'Eliminar notificación'))) return;
    const { error } = await supabase.from('notificaciones').delete().eq('id', n.id);
    if (error) { notificar(error.message, 'error'); return; }
    await cargar();
  };

  const probar = async (n) => {
    try {
      const r = await llamarPrueba(n.id);
      notificar(`Prueba enviada a ${r.email}.`, 'success');
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  if (faltaMigracion) {
    return <div className="lms-aviso">Para las notificaciones corre en Supabase la migración <code>notificaciones.sql</code>.</div>;
  }

  const nombreDe = (id) => lista?.find((n) => n.id === id)?.nombre || 'Notificación eliminada';

  return (
    <div className="notif">
      <nav className="reporte-pestanas notif-pestanas" role="tablist">
        {[['lista', 'Notificaciones'], ['historial', 'Historial']].map(([id, n]) => (
          <button key={id} type="button" role="tab" aria-selected={pestana === id} className={pestana === id ? 'activa' : ''} onClick={() => setPestana(id)}>{n}</button>
        ))}
      </nav>

      {pestana === 'lista' && !editando && (
        <>
          <div className="lms-agregar">
            <small className="lms-ayuda" style={{ margin: 0 }}>Se mandan por Brevo con el diseño de HCE, desde el remitente de tu cuenta. Cada aviso llega una sola vez por persona y hecho.</small>
            <button type="button" className="btn-crm-action solid" onClick={() => setEditando(vacia())}><Plus size={14} /> Añadir notificación</button>
          </div>
          {lista === null ? <p className="lms-cargando">Cargando…</p> : lista.length === 0 ? (
            <p className="lms-vacio">Todavía no hay notificaciones. Crea la primera: por ejemplo, "Inscrito a un curso".</p>
          ) : (
            <div className="biblioteca-tabla-scroll">
              <table className="biblioteca-tabla">
                <thead><tr><th>Nombre</th><th>Evento</th><th>Destinatario</th><th>Activa</th><th aria-label="Acciones" /></tr></thead>
                <tbody>
                  {lista.map((n) => (
                    <tr key={n.id}>
                      <td className="biblioteca-nombre"><strong>{n.nombre}</strong>{n.course_id ? <small className="lms-ayuda" style={{ display: 'block', margin: 0 }}>{cursos.find((c) => Number(c.id) === n.course_id)?.title}</small> : null}</td>
                      <td>{EVENTOS[n.evento]}</td>
                      <td>{n.destinatario === 'admins' ? 'Administradores' : 'Usuario relacionado'}</td>
                      <td>
                        <label className="biblioteca-interruptor" title={n.activo ? 'Activa' : 'Inactiva'}>
                          <input type="checkbox" checked={n.activo} onChange={() => alternar(n)} />
                          <span aria-hidden="true" />
                          <span className="sr-only">{n.activo ? 'Activa' : 'Inactiva'}</span>
                        </label>
                      </td>
                      <td>
                        <span className="lms-acciones">
                          <button type="button" className="icon-action-btn" title="Mandarme una prueba" onClick={() => probar(n)}><Send size={15} /></button>
                          <button type="button" className="icon-action-btn edit" title="Editar" onClick={() => setEditando({ ...n, course_id: n.course_id ?? '' })}><Edit size={15} /></button>
                          <button type="button" className="icon-action-btn delete" title="Eliminar" onClick={() => eliminar(n)}><Trash2 size={15} /></button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {pestana === 'lista' && editando && (
        <form className="lms-editor" onSubmit={guardar}>
          <div className="lms-editor-cabecera">
            <h4>{editando.id ? 'Editar notificación' : 'Nueva notificación'}</h4>
            <button type="button" className="icon-action-btn" title="Cancelar" onClick={() => setEditando(null)}><X size={16} /></button>
          </div>
          <div className="lms-fila-campos">
            <div className="crm-input-group">
              <label>Nombre (solo para ti) *</label>
              <input type="text" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} placeholder="Registro CNADOT" />
            </div>
            <div className="crm-input-group">
              <label>Evento</label>
              <select
                value={editando.evento}
                onChange={(e) => {
                  const evento = e.target.value;
                  // Si no se ha escrito nada propio, se cambia también la plantilla.
                  const sinCambios = !editando.id && editando.asunto === PLANTILLAS[editando.evento][0] && editando.cuerpo === PLANTILLAS[editando.evento][1];
                  setEditando({ ...editando, evento, ...(sinCambios ? { asunto: PLANTILLAS[evento][0], cuerpo: PLANTILLAS[evento][1] } : {}) });
                }}
              >
                {Object.entries(EVENTOS).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="lms-fila-campos">
            <div className="crm-input-group">
              <label>Destinatario</label>
              <select value={editando.destinatario} onChange={(e) => setEditando({ ...editando, destinatario: e.target.value })}>
                <option value="alumno">Usuario relacionado (el alumno)</option>
                <option value="admins">Administradores</option>
              </select>
            </div>
            <div className="crm-input-group">
              <label>Solo para el curso</label>
              <select value={editando.course_id} onChange={(e) => setEditando({ ...editando, course_id: e.target.value })}>
                <option value="">Cualquier curso</option>
                {cursos.filter((c) => !isNaN(Number(c.id))).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>
          <div className="crm-input-group">
            <label>Asunto *</label>
            <input type="text" value={editando.asunto} onChange={(e) => setEditando({ ...editando, asunto: e.target.value })} />
          </div>
          <div className="crm-input-group">
            <label>Texto del correo *</label>
            <textarea rows="9" className="lms-textarea" value={editando.cuerpo} onChange={(e) => setEditando({ ...editando, cuerpo: e.target.value })} />
            <small>
              Variables: {['nombre', ...VARIABLES[editando.evento]].map((v) => <code key={v} style={{ marginRight: 6 }}>{`{${v}}`}</code>)}
              Línea en blanco para separar párrafos; los enlaces quedan activos solos.
            </small>
          </div>
          <label className="lms-check">
            <input type="checkbox" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} />
            Activa
          </label>
          <div className="lms-editor-acciones">
            <button type="button" className="btn-crm-action outlined" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn-crm-action solid" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
          </div>
        </form>
      )}

      {pestana === 'historial' && (
        historial === null ? <p className="lms-cargando">Cargando…</p> : historial.length === 0 ? <p className="lms-vacio">Todavía no se ha enviado ninguna.</p> : (
          <div className="biblioteca-tabla-scroll">
            <table className="biblioteca-tabla">
              <thead><tr><th>Fecha</th><th>Notificación</th><th>Para</th><th>Resultado</th></tr></thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.enviado_en).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{nombreDe(h.notificacion_id)}</td>
                    <td>{h.email}</td>
                    <td>{h.error ? <span className="lms-alerta" title={h.error}>Falló</span> : 'Enviada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      {pestana === 'historial' && <button type="button" className="btn-crm-action outlined" onClick={cargarHistorial}>Actualizar</button>}
    </div>
  );
}
