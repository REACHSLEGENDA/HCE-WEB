import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, RefreshCw, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';
import { enlaceTemporal } from '../../lib/lecciones';
import TextoLeccion from '../TextoLeccion';
import './AdminLms.css';

// Revisión de las tareas que entregan los alumnos. Aprobar deja la lección
// completa; pedir corrección la reabre para que el alumno vuelva a entregar.

const ESTADOS = {
  entregada: 'Por revisar',
  aprobada: 'Aprobada',
  rechazada: 'Por corregir',
};

const fecha = (iso) => new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function RevisionTareas({ cursos, perfiles, notificar, onPendientes }) {
  const [entregas, setEntregas] = useState(null);
  const [lecciones, setLecciones] = useState(new Map());
  const [filtro, setFiltro] = useState('entregada');
  const [abierta, setAbierta] = useState(null);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [faltaMigracion, setFaltaMigracion] = useState(false);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('tarea_entregas')
      .select('id, leccion_id, course_id, user_id, texto, archivo_path, estado, comentario, revisada_en, creada_en')
      .order('creada_en', { ascending: false })
      .limit(500);
    if (error) {
      if (esTablaFaltante(error)) setFaltaMigracion(true);
      else notificar(`No se pudieron cargar las tareas: ${error.message}`, 'error');
      setEntregas([]);
      return;
    }
    setEntregas(data || []);

    const ids = [...new Set((data || []).map((e) => e.leccion_id))];
    if (ids.length) {
      const { data: lecs } = await supabase.from('curso_lecciones').select('id, titulo').in('id', ids);
      setLecciones(new Map((lecs || []).map((l) => [l.id, l.titulo])));
    }
    onPendientes?.((data || []).filter((e) => e.estado === 'entregada').length);
  }, [notificar, onPendientes]);

  useEffect(() => { void cargar(); }, [cargar]);

  const perfilDe = useMemo(() => new Map((perfiles || []).map((p) => [p.id, p])), [perfiles]);
  const cursoDe = useMemo(() => new Map((cursos || []).map((c) => [Number(c.id), c])), [cursos]);
  const visibles = (entregas || []).filter((e) => filtro === 'todas' || e.estado === filtro);

  const abrirArchivo = async (ruta) => {
    try {
      const url = await enlaceTemporal('tareas', ruta);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (err) {
      notificar(`No se pudo abrir el archivo: ${err.message}`, 'error');
    }
  };

  const resolver = async (entrega, estado) => {
    if (estado === 'rechazada' && !comentario.trim()) {
      notificar('Escribe qué tiene que corregir: el alumno lo verá en su tarea.', 'error');
      return;
    }
    setGuardando(true);
    try {
      const { error } = await supabase
        .from('tarea_entregas')
        .update({ estado, comentario: comentario.trim() || null, revisada_en: new Date().toISOString() })
        .eq('id', entrega.id);
      if (error) throw error;

      // Pedir corrección reabre la lección: el alumno no puede presentar el
      // examen hasta volver a entregar. Aprobar la deja completa.
      await supabase
        .from('leccion_progreso')
        .update({ completada: estado === 'aprobada' })
        .eq('user_id', entrega.user_id)
        .eq('leccion_id', entrega.leccion_id);

      notificar(estado === 'aprobada' ? 'Tarea aprobada.' : 'Se pidió corrección al alumno.', 'success');
      setAbierta(null);
      setComentario('');
      await cargar();
    } catch (err) {
      notificar(`No se pudo guardar la revisión: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  if (faltaMigracion) {
    return <div className="lms-aviso">Las tareas se activan al correr en Supabase la migración <code>lms-estructura.sql</code>.</div>;
  }

  return (
    <div className="lms-revision">
      <div className="lms-filtros">
        <div className="lms-segmentos" role="group" aria-label="Filtrar tareas">
          {['entregada', 'rechazada', 'aprobada', 'todas'].map((f) => (
            <button key={f} type="button" className={filtro === f ? 'activo' : ''} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {f === 'todas' ? 'Todas' : ESTADOS[f]}
              {f === 'entregada' && entregas ? ` (${entregas.filter((e) => e.estado === 'entregada').length})` : ''}
            </button>
          ))}
        </div>
        <button type="button" className="btn-crm-action outlined" onClick={() => void cargar()}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {entregas === null ? (
        <p className="lms-cargando">Cargando tareas…</p>
      ) : visibles.length === 0 ? (
        <p className="lms-vacio">{filtro === 'entregada' ? 'No hay tareas pendientes de revisar.' : 'No hay tareas en esta vista.'}</p>
      ) : (
        <ul className="lms-entregas">
          {visibles.map((e) => {
            const alumno = perfilDe.get(e.user_id);
            const curso = cursoDe.get(Number(e.course_id));
            const abiertaAhora = abierta === e.id;
            return (
              <li key={e.id} className={`lms-entrega lms-entrega--${e.estado}`}>
                <button type="button" className="lms-entrega-resumen" onClick={() => { setAbierta(abiertaAhora ? null : e.id); setComentario(e.comentario || ''); }}>
                  <span className="lms-entrega-alumno">
                    <strong>{alumno?.nombre_completo || alumno?.email || 'Alumno'}</strong>
                    <small>{curso?.title || `Curso #${e.course_id}`} · {lecciones.get(e.leccion_id) || 'Tarea'}</small>
                  </span>
                  <span className={`lms-estado lms-estado--${e.estado}`}>{ESTADOS[e.estado]}</span>
                  <span className="lms-entrega-fecha">{fecha(e.creada_en)}</span>
                </button>

                {abiertaAhora && (
                  <div className="lms-entrega-detalle">
                    {e.texto ? <TextoLeccion texto={e.texto} /> : <p className="lms-vacio">Sin texto.</p>}
                    {e.archivo_path && (
                      <button type="button" className="btn-crm-action outlined" onClick={() => abrirArchivo(e.archivo_path)}>
                        <ExternalLink size={14} /> Abrir archivo adjunto
                      </button>
                    )}

                    <div className="crm-input-group">
                      <label>Comentario para el alumno</label>
                      <textarea rows="3" className="lms-textarea" value={comentario} onChange={(ev) => setComentario(ev.target.value)}
                        placeholder="Obligatorio si pides corrección. Opcional si la apruebas." />
                    </div>

                    <div className="lms-editor-acciones">
                      <button type="button" className="btn-crm-action outlined" disabled={guardando} onClick={() => resolver(e, 'rechazada')}>
                        <X size={14} /> Pedir corrección
                      </button>
                      <button type="button" className="btn-crm-action solid" disabled={guardando} onClick={() => resolver(e, 'aprobada')}>
                        <Check size={14} /> Aprobar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
