import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Upload, Trash2, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  cargarBiblioteca,
  abrirArchivoBiblioteca,
  formatoTamano,
  formatoArchivo,
  BUCKET_BIBLIOTECA,
} from '../../lib/lecciones';
import { esTablaFaltante } from '../../lib/cursos';
import './AdminLms.css';

// Biblioteca de archivos del curso: se suben varios de golpe, se ligan a una
// clase (aparecen dentro de esa lección) y se decide si los alumnos los ven.

const LIMITE_MB = 50;
const fecha = (iso) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });

export default function BibliotecaCurso({ courseId, notificar, confirmar }) {
  const [archivos, setArchivos] = useState(null);
  const [lecciones, setLecciones] = useState([]);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [filtroLeccion, setFiltroLeccion] = useState('');
  const [subiendo, setSubiendo] = useState(null);
  const [arrastrando, setArrastrando] = useState(false);
  const entradaRef = useRef(null);
  const refrescarLecciones = useCallback(async () => {
    const { data, error } = await supabase.from('curso_lecciones').select('id, orden, titulo, tipo').eq('course_id', courseId).neq('tipo', 'seccion').order('orden').order('id');
    if (error) { notificar(`No se pudieron actualizar las clases: ${error.message}`, 'error'); return; }
    setLecciones(data || []);
  }, [courseId, notificar]);

  const cargar = useCallback(async () => {
    try {
      const [lista, { data: lecs }] = await Promise.all([
        cargarBiblioteca(courseId),
        supabase.from('curso_lecciones').select('id, orden, titulo').eq('course_id', courseId).neq('tipo', 'seccion').order('orden').order('id'),
      ]);
      if (lista === null) { setFaltaMigracion(true); return; }
      setArchivos(lista);
      setLecciones(lecs || []);
    } catch (err) {
      notificar(`No se pudo cargar la biblioteca: ${err.message}`, 'error');
      setArchivos([]);
    }
  }, [courseId, notificar]);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      cargarBiblioteca(courseId),
      supabase.from('curso_lecciones').select('id, orden, titulo').eq('course_id', courseId).neq('tipo', 'seccion').order('orden').order('id'),
    ]).then(([lista, { data: lecs }]) => {
      if (!vigente) return;
      if (lista === null) { setFaltaMigracion(true); return; }
      setArchivos(lista);
      setLecciones(lecs || []);
    }).catch((err) => {
      if (!vigente) return;
      if (esTablaFaltante(err)) setFaltaMigracion(true);
      else { notificar(`No se pudo cargar la biblioteca: ${err.message}`, 'error'); setArchivos([]); }
    });
    return () => { vigente = false; };
  }, [courseId, notificar]);

  const subir = async (lista) => {
    const elegidos = [...lista];
    if (!elegidos.length) return;
    const grandes = elegidos.filter((f) => f.size > LIMITE_MB * 1024 * 1024);
    if (grandes.length) notificar(`Se omitieron ${grandes.length} archivo(s) de más de ${LIMITE_MB} MB.`, 'error');
    const validos = elegidos.filter((f) => f.size <= LIMITE_MB * 1024 * 1024);

    let listos = 0;
    for (const archivo of validos) {
      setSubiendo(`${listos + 1} de ${validos.length}: ${archivo.name}`);
      const limpio = archivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const ruta = `${courseId}/${Date.now()}_${limpio}`;
      const { error: errSubida } = await supabase.storage.from(BUCKET_BIBLIOTECA).upload(ruta, archivo, { contentType: archivo.type || undefined });
      if (errSubida) {
        notificar(`No se pudo subir ${archivo.name}: ${errSubida.message}`, 'error');
        continue;
      }
      const { error } = await supabase.from('curso_archivos').insert([{
        course_id: courseId,
        leccion_id: filtroLeccion && filtroLeccion !== 'general' ? Number(filtroLeccion) : null,
        nombre: archivo.name,
        ruta,
        tamano: archivo.size,
        tipo: archivo.type || null,
      }]);
      if (error) {
        await supabase.storage.from(BUCKET_BIBLIOTECA).remove([ruta]);
        notificar(`No se pudo registrar ${archivo.name}: ${error.message}`, 'error');
        continue;
      }
      listos += 1;
    }
    setSubiendo(null);
    if (entradaRef.current) entradaRef.current.value = '';
    if (listos) notificar(`${listos} archivo(s) agregados a la biblioteca.`, 'success');
    await cargar();
  };

  const actualizar = async (archivo, cambios) => {
    setArchivos((l) => l.map((a) => (a.id === archivo.id ? { ...a, ...cambios } : a)));
    const { error } = await supabase.from('curso_archivos').update(cambios).eq('id', archivo.id);
    if (error) {
      notificar(`No se pudo guardar: ${error.message}`, 'error');
      await cargar();
    }
  };

  const eliminar = async (archivo) => {
    const mensaje = `¿Eliminar "${archivo.nombre}" de la biblioteca? Los alumnos dejarán de verlo.`;
    const ok = confirmar ? await confirmar(mensaje, 'Eliminar archivo') : window.confirm(mensaje);
    if (!ok) return;
    const { error } = await supabase.from('curso_archivos').delete().eq('id', archivo.id);
    if (error) { notificar(`No se pudo eliminar: ${error.message}`, 'error'); return; }
    await supabase.storage.from(BUCKET_BIBLIOTECA).remove([archivo.ruta]);
    setArchivos((l) => l.filter((a) => a.id !== archivo.id));
  };

  const abrir = async (archivo) => {
    try { await abrirArchivoBiblioteca(archivo); } catch (err) { notificar(`No se pudo abrir: ${err.message}`, 'error'); }
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return (archivos || []).filter((a) => {
      if (q && !a.nombre.toLowerCase().includes(q)) return false;
      if (filtroLeccion === 'general') return !a.leccion_id;
      if (filtroLeccion) return String(a.leccion_id) === filtroLeccion;
      return true;
    });
  }, [archivos, busqueda, filtroLeccion]);

  if (faltaMigracion) {
    return <div className="lms-aviso">Para usar la biblioteca de archivos corre en Supabase la migración <code>lms-biblioteca.sql</code>.</div>;
  }
  if (archivos === null) return <p className="lms-cargando">Cargando biblioteca…</p>;

  return (
    <div className="biblioteca">
      <div
        className={`biblioteca-subir ${arrastrando ? 'arrastrando' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(e) => { e.preventDefault(); setArrastrando(false); void subir(e.dataTransfer.files); }}
      >
        <Upload size={18} />
        {subiendo ? (
          <span>Subiendo {subiendo}…</span>
        ) : (
          <span>
            Arrastra archivos aquí o{' '}
            <label className="biblioteca-elegir">
              elígelos
              <input ref={entradaRef} type="file" multiple onChange={(e) => void subir(e.target.files)} />
            </label>
            {' '}(máx. {LIMITE_MB} MB c/u).
            {filtroLeccion && filtroLeccion !== 'general'
              ? ' Quedarán ligados a la clase elegida en el filtro.'
              : ' Quedan en la biblioteca general; luego puedes ligarlos a una clase.'}
          </span>
        )}
      </div>

      <div className="biblioteca-filtros">
        <label className="biblioteca-buscar">
          <Search size={14} />
          <input type="search" aria-label="Buscar archivo en biblioteca" placeholder="Buscar archivo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <select value={filtroLeccion} onFocus={refrescarLecciones} onChange={(e) => setFiltroLeccion(e.target.value)} aria-label="Filtrar por clase">
          <option value="">Todos los archivos ({archivos.length})</option>
          <option value="general">Solo biblioteca general</option>
          {lecciones.map((l, i) => <option key={l.id} value={String(l.id)}>{i + 1}. {l.titulo}</option>)}
        </select>
      </div>

      {visibles.length === 0 ? (
        <p className="lms-vacio">{archivos.length ? 'Ningún archivo coincide con la búsqueda.' : 'La biblioteca de este curso está vacía.'}</p>
      ) : (
        <div className="biblioteca-tabla-scroll">
          <table className="biblioteca-tabla">
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Clase</th>
                <th>Formato</th>
                <th className="num">Tamaño</th>
                <th>Subido</th>
                <th>Compartido</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {visibles.map((a) => (
                <tr key={a.id}>
                  <td className="biblioteca-nombre">
                    <button type="button" className="biblioteca-enlace" onClick={() => abrir(a)} title="Abrir">
                      {a.nombre} <ExternalLink size={12} />
                    </button>
                  </td>
                  <td>
                    <select value={a.leccion_id ? String(a.leccion_id) : ''} onFocus={refrescarLecciones} onChange={(e) => actualizar(a, { leccion_id: e.target.value ? Number(e.target.value) : null })} aria-label={`Clase de ${a.nombre}`}>
                      <option value="">Biblioteca general</option>
                      {lecciones.map((l, i) => <option key={l.id} value={String(l.id)}>{i + 1}. {l.titulo}</option>)}
                    </select>
                  </td>
                  <td>{formatoArchivo(a)}</td>
                  <td className="num">{formatoTamano(a.tamano)}</td>
                  <td>{fecha(a.subido_en)}</td>
                  <td>
                    <label className="biblioteca-interruptor" title={a.compartido ? 'Los alumnos inscritos lo ven' : 'Solo lo ven los administradores'}>
                      <input type="checkbox" checked={a.compartido} onChange={(e) => actualizar(a, { compartido: e.target.checked })} />
                      <span aria-hidden="true" />
                      <span className="sr-only">{a.compartido ? 'Compartido' : 'Oculto'}</span>
                    </label>
                  </td>
                  <td>
                    <button type="button" className="icon-action-btn delete" title="Eliminar" onClick={() => eliminar(a)}><Trash2 size={15} /></button>
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
