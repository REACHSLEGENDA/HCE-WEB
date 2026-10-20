// "Mis notas" en el aula: apuntes por lección; en un video se guarda el minuto
// y al tocarlo el video salta ahí. Se descargan todas las del curso en PDF.
// Requiere supabase/aula-notas.sql (sin la tabla no se muestra).
import { useEffect, useState } from 'react';
import { Clock, Download, NotebookPen, Pencil, Trash2 } from 'lucide-react';
import { agregarNota, borrarNota, cargarNotas, descargarNotasPdf, editarNota, faltaTablaNotas, formatoMinuto } from '../lib/notas';
import './NotasLeccion.css';

export default function NotasLeccion({ userId, alumno, curso, leccion, lecciones, obtenerSegundo, irASegundo, notificar }) {
  const [notas, setNotas] = useState(null);
  const [falta, setFalta] = useState(false);
  const [texto, setTexto] = useState('');
  const [conMinuto, setConMinuto] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null); // { id, texto }
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!userId || !curso?.id) return undefined;
    let vigente = true;
    cargarNotas(userId, curso.id)
      .then((n) => { if (vigente) setNotas(n); })
      .catch((err) => {
        if (!vigente) return;
        if (faltaTablaNotas(err)) setFalta(true);
        else setNotas([]);
      });
    return () => { vigente = false; };
  }, [userId, curso?.id]);

  if (falta || !leccion || leccion.implicita) return null;

  const esVideo = leccion.tipo === 'video' && typeof obtenerSegundo === 'function';
  const deEstaLeccion = (notas || []).filter((n) => n.leccion_id === leccion.id);

  const guardar = async (e) => {
    e.preventDefault();
    if (!texto.trim() || guardando) return;
    setGuardando(true);
    try {
      const segundo = esVideo && conMinuto ? Math.floor(obtenerSegundo() || 0) : null;
      const nueva = await agregarNota({ userId, courseId: curso.id, leccionId: leccion.id, texto, segundo });
      setNotas((prev) => [...(prev || []), nueva].sort((a, b) => (a.segundo ?? -1) - (b.segundo ?? -1)));
      setTexto('');
    } catch (err) {
      notificar?.(`No se pudo guardar tu nota: ${err.message}. Tu texto sigue aquí.`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const guardarEdicion = async () => {
    if (!editando?.texto.trim()) return;
    try {
      const actualizada = await editarNota(editando.id, editando.texto);
      setNotas((prev) => prev.map((n) => (n.id === actualizada.id ? actualizada : n)));
      setEditando(null);
    } catch (err) {
      notificar?.(`No se pudo guardar el cambio: ${err.message}`, 'error');
    }
  };

  const quitar = async (id) => {
    try {
      await borrarNota(id);
      setNotas((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      notificar?.(`No se pudo borrar la nota: ${err.message}`, 'error');
    }
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarNotasPdf({ curso: curso.title, alumno, lecciones, notas: notas || [] });
    } catch (err) {
      notificar?.(`No se pudo generar el PDF: ${err.message}`, 'error');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <section className="notas-leccion" aria-label="Mis notas de esta lección">
      <header>
        <h3><NotebookPen size={16} aria-hidden="true" /> Mis notas</h3>
        {(notas || []).length > 0 && (
          <button type="button" className="notas-descargar" onClick={descargar} disabled={descargando}>
            <Download size={14} /> {descargando ? 'Generando…' : `Descargar todas (${notas.length})`}
          </button>
        )}
      </header>

      <form onSubmit={guardar} className="notas-form">
        <label htmlFor={`nota-${leccion.id}`} className="notas-sr">Escribe una nota</label>
        <textarea
          id={`nota-${leccion.id}`}
          rows="2"
          maxLength={4000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={esVideo ? 'Escribe lo que quieras recordar de este momento del video…' : 'Escribe lo que quieras recordar de esta lección…'}
        />
        <div className="notas-acciones">
          {esVideo && (
            <label className="notas-minuto">
              <input type="checkbox" checked={conMinuto} onChange={(e) => setConMinuto(e.target.checked)} />
              Guardar el minuto actual del video
            </label>
          )}
          <button type="submit" className="notas-guardar" disabled={!texto.trim() || guardando}>{guardando ? 'Guardando…' : 'Guardar nota'}</button>
        </div>
      </form>

      {notas === null ? <p className="notas-vacio">Cargando tus notas…</p> : deEstaLeccion.length === 0 ? (
        <p className="notas-vacio">Aún no tienes notas en esta lección. Solo tú las ves.</p>
      ) : (
        <ul className="notas-lista">
          {deEstaLeccion.map((n) => (
            <li key={n.id}>
              {n.segundo != null && (
                <button type="button" className="notas-chip" onClick={() => irASegundo?.(n.segundo)} disabled={!esVideo} title={esVideo ? 'Ir a este momento del video' : undefined}>
                  <Clock size={12} /> {formatoMinuto(n.segundo)}
                </button>
              )}
              {editando?.id === n.id ? (
                <div className="notas-edicion">
                  <textarea rows="3" maxLength={4000} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} aria-label="Editar nota" />
                  <div className="notas-acciones">
                    <button type="button" className="notas-secundario" onClick={() => setEditando(null)}>Cancelar</button>
                    <button type="button" className="notas-guardar" onClick={guardarEdicion}>Guardar</button>
                  </div>
                </div>
              ) : (
                <p>{n.texto}</p>
              )}
              {editando?.id !== n.id && (
                <div className="notas-iconos">
                  <button type="button" onClick={() => setEditando({ id: n.id, texto: n.texto })} aria-label="Editar nota"><Pencil size={14} /></button>
                  <button type="button" onClick={() => quitar(n.id)} aria-label="Borrar nota"><Trash2 size={14} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
