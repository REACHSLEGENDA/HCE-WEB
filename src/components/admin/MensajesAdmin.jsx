import React, { useCallback, useEffect, useState } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';
import Mensajes from '../Mensajes';
import './AdminLms.css';

// Mensajes y comunicados en el panel de administración.

const vacio = { id: null, tipo: 'interno', titulo: '', cuerpo: '', enlace: '', activo: true, desde: '', hasta: '' };
const aLocal = (iso) => (iso ? iso.slice(0, 10) : '');

function ComunicadosAdmin({ notificar, confirmar }) {
  const [lista, setLista] = useState(null);
  const [editando, setEditando] = useState(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from('comunicados').select('*').order('creado_en', { ascending: false });
    if (error) { setLista(esTablaFaltante(error) ? 'falta' : []); return; }
    setLista(data || []);
  }, []);

  useEffect(() => {
    let vigente = true;
    supabase.from('comunicados').select('*').order('creado_en', { ascending: false }).then(({ data, error }) => {
      if (!vigente) return;
      setLista(error ? (esTablaFaltante(error) ? 'falta' : []) : data || []);
    });
    return () => { vigente = false; };
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    if (!editando.titulo.trim()) { notificar('Pon el título del comunicado.', 'error'); return; }
    const datos = {
      tipo: editando.tipo,
      titulo: editando.titulo.trim(),
      cuerpo: editando.cuerpo.trim() || null,
      enlace: editando.enlace.trim() || null,
      activo: editando.activo,
      desde: editando.desde ? new Date(`${editando.desde}T00:00:00`).toISOString() : null,
      hasta: editando.hasta ? new Date(`${editando.hasta}T23:59:59`).toISOString() : null,
    };
    const { error } = editando.id
      ? await supabase.from('comunicados').update(datos).eq('id', editando.id)
      : await supabase.from('comunicados').insert([datos]);
    if (error) { notificar(error.message, 'error'); return; }
    notificar('Comunicado guardado.', 'success');
    setEditando(null);
    await cargar();
  };

  const eliminar = async (c) => {
    if (!(await confirmar(`¿Eliminar el comunicado "${c.titulo}"?`, 'Eliminar comunicado'))) return;
    await supabase.from('comunicados').delete().eq('id', c.id);
    await cargar();
  };

  if (lista === 'falta') return <div className="lms-aviso">Los comunicados se activan al correr en Supabase la migración <code>mensajes.sql</code>.</div>;
  if (lista === null) return <p className="lms-cargando">Cargando…</p>;

  return (
    <div className="notif">
      {!editando && (
        <div className="lms-agregar">
          <small className="lms-ayuda" style={{ margin: 0 }}>Internos: arriba del portal de cada alumno. Externos: en la página de inicio, para quien no ha entrado.</small>
          <button type="button" className="btn-crm-action solid" onClick={() => setEditando({ ...vacio })}><Plus size={14} /> Nuevo comunicado</button>
        </div>
      )}
      {editando ? (
        <form className="lms-editor" onSubmit={guardar}>
          <div className="lms-editor-cabecera">
            <h4>{editando.id ? 'Editar comunicado' : 'Nuevo comunicado'}</h4>
            <button type="button" className="icon-action-btn" title="Cancelar" onClick={() => setEditando(null)}><X size={16} /></button>
          </div>
          <div className="lms-fila-campos">
            <div className="crm-input-group">
              <label>Dónde se muestra</label>
              <select value={editando.tipo} onChange={(e) => setEditando({ ...editando, tipo: e.target.value })}>
                <option value="interno">Interno: portal del alumno</option>
                <option value="externo">Externo: página de inicio</option>
              </select>
            </div>
            <div className="crm-input-group">
              <label>Título *</label>
              <input type="text" value={editando.titulo} onChange={(e) => setEditando({ ...editando, titulo: e.target.value })} placeholder="Ya están abiertas las inscripciones de la III generación" />
            </div>
          </div>
          <div className="crm-input-group">
            <label>Texto (opcional)</label>
            <textarea rows="3" className="lms-textarea" value={editando.cuerpo} onChange={(e) => setEditando({ ...editando, cuerpo: e.target.value })} />
          </div>
          <div className="lms-fila-campos">
            <div className="crm-input-group">
              <label>Enlace "Ver más" (opcional)</label>
              <input type="text" value={editando.enlace} onChange={(e) => setEditando({ ...editando, enlace: e.target.value })} placeholder="https://…" />
            </div>
            <div className="crm-input-group lms-campo-corto">
              <label>Desde</label>
              <input type="date" value={editando.desde} onChange={(e) => setEditando({ ...editando, desde: e.target.value })} />
            </div>
            <div className="crm-input-group lms-campo-corto">
              <label>Hasta</label>
              <input type="date" value={editando.hasta} onChange={(e) => setEditando({ ...editando, hasta: e.target.value })} />
            </div>
          </div>
          <label className="lms-check">
            <input type="checkbox" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} />
            Activo
          </label>
          <div className="lms-editor-acciones">
            <button type="button" className="btn-crm-action outlined" onClick={() => setEditando(null)}>Cancelar</button>
            <button type="submit" className="btn-crm-action solid">Guardar</button>
          </div>
        </form>
      ) : lista.length === 0 ? (
        <p className="lms-vacio">No hay comunicados.</p>
      ) : (
        <div className="biblioteca-tabla-scroll">
          <table className="biblioteca-tabla">
            <thead><tr><th>Título</th><th>Dónde</th><th>Vigencia</th><th>Activo</th><th aria-label="Acciones" /></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td className="biblioteca-nombre"><strong>{c.titulo}</strong></td>
                  <td>{c.tipo === 'externo' ? 'Página de inicio' : 'Portal del alumno'}</td>
                  <td>{c.desde || c.hasta ? `${c.desde ? new Date(c.desde).toLocaleDateString('es-MX') : '…'} – ${c.hasta ? new Date(c.hasta).toLocaleDateString('es-MX') : '…'}` : 'Siempre'}</td>
                  <td>{c.activo ? 'Sí' : 'No'}</td>
                  <td>
                    <span className="lms-acciones">
                      <button type="button" className="icon-action-btn edit" title="Editar" onClick={() => setEditando({ ...vacio, ...c, cuerpo: c.cuerpo || '', enlace: c.enlace || '', desde: aLocal(c.desde), hasta: aLocal(c.hasta) })}><Edit size={15} /></button>
                      <button type="button" className="icon-action-btn delete" title="Eliminar" onClick={() => eliminar(c)}><Trash2 size={15} /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MensajesAdmin({ userId, perfiles, cursos, notificar, confirmar }) {
  const [seccion, setSeccion] = useState('mensajes');
  const [grupos, setGrupos] = useState([]);

  useEffect(() => {
    let vigente = true;
    supabase.from('grupos').select('id, nombre').order('nombre').then(({ data }) => { if (vigente) setGrupos(data || []); }, () => {});
    return () => { vigente = false; };
  }, []);

  return (
    <div className="notif">
      <nav className="reporte-pestanas notif-pestanas" role="tablist">
        {[['mensajes', 'Mensajes'], ['comunicados', 'Comunicados']].map(([id, n]) => (
          <button key={id} type="button" role="tab" aria-selected={seccion === id} className={seccion === id ? 'activa' : ''} onClick={() => setSeccion(id)}>{n}</button>
        ))}
      </nav>
      {seccion === 'mensajes'
        ? <Mensajes userId={userId} esAdmin perfiles={perfiles} grupos={grupos} cursos={cursos} notificar={notificar} />
        : <ComunicadosAdmin notificar={notificar} confirmar={confirmar} />}
    </div>
  );
}
