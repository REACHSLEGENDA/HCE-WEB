import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Upload, Trash2, ExternalLink, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
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
  const [fallidos, setFallidos] = useState([]);
  const [errorCarga, setErrorCarga] = useState('');
  const entradaRef = useRef(null);
  const refrescarLecciones = useCallback(async () => {
    const { data, error } = await supabase.from('curso_lecciones').select('id, orden, titulo, tipo').eq('course_id', courseId).neq('tipo', 'seccion').order('orden').order('id');
    if (error) { notificar(`No se pudieron actualizar las clases: ${error.message}`, 'error'); return; }
    setLecciones(data || []);
  }, [courseId, notificar]);

  const cargar = useCallback(async () => {
    try {
      const [lista, { data: lecs, error: errorLecciones }] = await Promise.all([
        cargarBiblioteca(courseId),
        supabase.from('curso_lecciones').select('id, orden, titulo').eq('course_id', courseId).neq('tipo', 'seccion').order('orden').order('id'),
      ]);
      if (errorLecciones) throw errorLecciones;
      if (lista === null) { setFaltaMigracion(true); return; }
      setArchivos(lista);
      setErrorCarga('');
      setLecciones(lecs || []);
    } catch (err) {
      notificar(`No se pudo cargar la biblioteca: ${err.message}`, 'error');
      setArchivos([]);
      setErrorCarga(err.message);
    }
  }, [courseId, notificar]);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      cargarBiblioteca(courseId),
      supabase.from('curso_lecciones').select('id, orden, titulo').eq('course_id', courseId).neq('tipo', 'seccion').order('orden').order('id'),
    ]).then(([lista, { data: lecs, error: errorLecciones }]) => {
      if (!vigente) return;
      if (errorLecciones) throw errorLecciones;
      if (lista === null) { setFaltaMigracion(true); return; }
      setArchivos(lista);
      setLecciones(lecs || []);
    }).catch((err) => {
      if (!vigente) return;
      if (esTablaFaltante(err)) setFaltaMigracion(true);
      else { notificar(`No se pudo cargar la biblioteca: ${err.message}`, 'error'); setArchivos([]); setErrorCarga(err.message); }
    });
    return () => { vigente = false; };
  }, [courseId, notificar]);

  const subir = async (lista) => {
    if (subiendo) return;
    const elegidos = [...lista];
    if (!elegidos.length) return;
    const grandes = elegidos.filter((f) => f.size > LIMITE_MB * 1024 * 1024);
    const validos = elegidos.filter((f) => f.size <= LIMITE_MB * 1024 * 1024);
    // Lo que no se pudo subir se queda en una lista con su motivo; los que
    // fallaron por la conexión o el servidor se pueden reintentar.
    const nuevosFallidos = grandes.map((archivo) => ({ archivo, motivo: `Pesa más de ${LIMITE_MB} MB.`, reintentable: false }));
    setFallidos([]);

    let listos = 0;
    for (const [i, archivo] of validos.entries()) {
      setSubiendo({ actual: i + 1, total: validos.length, nombre: archivo.name, listos });
      const limpio = archivo.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const ruta = `${courseId}/${Date.now()}_${limpio}`;
      const { error: errSubida } = await supabase.storage.from(BUCKET_BIBLIOTECA).upload(ruta, archivo, { contentType: archivo.type || undefined });
      if (errSubida) {
        nuevosFallidos.push({ archivo, motivo: `No se pudo subir: ${errSubida.message}`, reintentable: true });
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
        nuevosFallidos.push({ archivo, motivo: `No se pudo registrar: ${error.message}`, reintentable: true });
        continue;
      }
      listos += 1;
    }
    setSubiendo(null);
    setFallidos(nuevosFallidos);
    if (entradaRef.current) entradaRef.current.value = '';
    if (listos) notificar(`${listos} archivo(s) agregados a la biblioteca.`, 'success');
    if (nuevosFallidos.length) notificar(`${nuevosFallidos.length} archivo(s) no se agregaron. Revisa la lista bajo la zona de carga.`, 'error');
    await cargar();
  };

  // El arrastre sale de la zona solo cuando el puntero deja la zona completa
  // (no al pasar sobre el texto o el icono que tiene dentro).
  const alSalirArrastre = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setArrastrando(false);
  };
  const alSoltar = (e) => {
    e.preventDefault();
    setArrastrando(false);
    if (subiendo) return;
    if (!e.dataTransfer.files?.length) { notificar('Suelta archivos de tu computadora (no carpetas ni enlaces).', 'error'); return; }
    void subir(e.dataTransfer.files);
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
        className={`biblioteca-subir${arrastrando ? ' arrastrando' : ''}${subiendo ? ' ocupada' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); if (!subiendo) setArrastrando(true); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = subiendo ? 'none' : 'copy'; }}
        onDragLeave={alSalirArrastre}
        onDrop={alSoltar}
      >
        <input ref={entradaRef} type="file" multiple hidden onChange={(e) => void subir(e.target.files)} />
        {subiendo ? (
          <div className="biblioteca-progreso" role="status" aria-live="polite">
            <div className="biblioteca-progreso-texto">
              <Loader2 size={16} className="lms-girando" aria-hidden="true" />
              <span>Subiendo {subiendo.actual} de {subiendo.total}: <strong>{subiendo.nombre}</strong></span>
            </div>
            <div className="biblioteca-barra" role="progressbar" aria-valuemin={0} aria-valuemax={subiendo.total} aria-valuenow={subiendo.actual - 1} aria-label="Avance de la carga">
              <span style={{ width: `${Math.round(((subiendo.actual - 1) / subiendo.total) * 100)}%` }} />
            </div>
          </div>
        ) : (
          <>
            <span className="biblioteca-subir-icono" aria-hidden="true"><Upload size={20} /></span>
            <div className="biblioteca-subir-texto">
              <strong>{arrastrando ? 'Suelta los archivos para subirlos' : 'Arrastra archivos aquí'}</strong>
              <span>
                Máx. {LIMITE_MB} MB cada uno.
                {filtroLeccion && filtroLeccion !== 'general'
                  ? ' Quedarán ligados a la clase elegida en el filtro.'
                  : ' Quedan en la biblioteca general; luego puedes ligarlos a una clase.'}
              </span>
            </div>
            <button type="button" className="btn-crm-action outlined" onClick={() => entradaRef.current?.click()}>
              <Upload size={14} /> Elegir archivos
            </button>
          </>
        )}
      </div>

      {fallidos.length > 0 && !subiendo && (
        <div className="biblioteca-fallidos" role="alert">
          <div className="biblioteca-fallidos-cabecera">
            <AlertTriangle size={16} aria-hidden="true" />
            <strong>{fallidos.length} {fallidos.length === 1 ? 'archivo no se agregó' : 'archivos no se agregaron'}</strong>
            <span className="biblioteca-fallidos-acciones">
              {fallidos.some((f) => f.reintentable) && (
                <button type="button" className="btn-crm-action outlined mini" onClick={() => subir(fallidos.filter((f) => f.reintentable).map((f) => f.archivo))}>
                  <RefreshCw size={12} /> Reintentar
                </button>
              )}
              <button type="button" className="btn-crm-action outlined mini" onClick={() => setFallidos([])}>Descartar</button>
            </span>
          </div>
          <ul>
            {fallidos.map((f, i) => (
              <li key={`${f.archivo.name}-${i}`}><strong>{f.archivo.name}</strong> <span>{f.motivo}</span></li>
            ))}
          </ul>
        </div>
      )}

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

      {errorCarga && archivos.length === 0 ? (
        <p className="lms-aviso lms-aviso--error" role="alert">
          No se pudo cargar la biblioteca: {errorCarga}{' '}
          <button type="button" className="btn-crm-action outlined mini" onClick={() => cargar()}><RefreshCw size={12} /> Reintentar</button>
        </p>
      ) : visibles.length === 0 ? (
        <p className="lms-vacio">{archivos.length ? 'Ningún archivo coincide con la búsqueda.' : 'Todavía no hay archivos. Arrástralos a la zona de arriba o usa "Elegir archivos".'}</p>
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
