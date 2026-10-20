// /classroom/sin-conexion: los materiales que el alumno guardó en este
// dispositivo (PDFs, archivos y lecturas). Funciona sin internet: no pide
// sesión y está dentro del alcance del service worker del aula.
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, FileText, Trash2, WifiOff, X } from 'lucide-react';
import TextoLeccion from '../components/TextoLeccion';
import { borrarMaterial, formatoTamano, listarMateriales } from '../lib/sinConexion';
import { useSEO } from '../hooks/useSEO';
import './SinConexion.css';

export default function SinConexion() {
  useSEO({ title: 'Materiales sin conexión', noindex: true });
  const [materiales, setMateriales] = useState(null);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null); // { material, url }
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));

  useEffect(() => {
    listarMateriales()
      .then((m) => setMateriales(m.sort((a, b) => String(b.guardadoEn).localeCompare(String(a.guardadoEn)))))
      .catch((err) => { setError(err.message); setMateriales([]); });
    const cambia = () => setEnLinea(navigator.onLine);
    window.addEventListener('online', cambia);
    window.addEventListener('offline', cambia);
    return () => { window.removeEventListener('online', cambia); window.removeEventListener('offline', cambia); };
  }, []);

  // Libera el enlace del archivo abierto al cerrarlo.
  useEffect(() => () => { if (abierto?.url) URL.revokeObjectURL(abierto.url); }, [abierto]);

  const porCurso = useMemo(() => {
    const mapa = new Map();
    for (const m of materiales || []) {
      if (!mapa.has(m.curso)) mapa.set(m.curso, []);
      mapa.get(m.curso).push(m);
    }
    return [...mapa.entries()];
  }, [materiales]);

  const abrirMaterial = (m) => {
    if (m.tipo === 'texto') { setAbierto({ material: m, url: '' }); return; }
    if (!m.blob) return;
    const url = URL.createObjectURL(m.blob);
    if (m.blob.type === 'application/pdf') setAbierto({ material: m, url });
    else {
      const a = document.createElement('a');
      a.href = url;
      a.download = m.nombre || 'material';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }
  };

  const quitar = async (m) => {
    await borrarMaterial(m.id);
    setMateriales((prev) => prev.filter((x) => x.id !== m.id));
    if (abierto?.material.id === m.id) setAbierto(null);
  };

  const total = (materiales || []).reduce((s, m) => s + (m.tamano || 0), 0);

  return (
    <main className="sc">
      <header className="sc-cabeza">
        <a href="/dashboard" className="sc-volver"><ArrowLeft size={16} /> Mi portal</a>
        {!enLinea && <span className="sc-estado"><WifiOff size={14} /> Sin conexión</span>}
      </header>
      <h1>Materiales sin conexión</h1>
      <p className="sc-nota">Lo que guardaste en este dispositivo desde el aula. Se puede ver sin internet. {total ? `Ocupa ${formatoTamano(total)}.` : ''}</p>

      {error && <p className="sc-aviso" role="alert">{error}</p>}

      {abierto && (
        <section className="sc-visor" aria-label={abierto.material.titulo}>
          <header>
            <strong>{abierto.material.titulo}</strong>
            <button type="button" onClick={() => setAbierto(null)} aria-label="Cerrar"><X size={18} /></button>
          </header>
          {abierto.material.tipo === 'texto'
            ? <div className="sc-lectura"><TextoLeccion texto={abierto.material.texto} /></div>
            : <iframe src={abierto.url} title={abierto.material.titulo} className="sc-pdf" />}
        </section>
      )}

      {materiales === null ? <p className="sc-nota">Cargando…</p> : !materiales.length ? (
        <div className="sc-vacio">
          <WifiOff size={28} aria-hidden="true" />
          <p>Todavía no guardas nada. En el aula, en una lectura o un documento, toca <strong>«Guardar sin conexión»</strong>.</p>
        </div>
      ) : porCurso.map(([curso, lista]) => (
        <section key={curso} className="sc-curso">
          <h2>{curso}</h2>
          <ul>
            {lista.map((m) => (
              <li key={m.id}>
                <button type="button" className="sc-abrir" onClick={() => abrirMaterial(m)}>
                  {m.tipo === 'texto' ? <BookOpen size={18} aria-hidden="true" /> : <FileText size={18} aria-hidden="true" />}
                  <span><strong>{m.titulo}</strong><small>{m.tipo === 'texto' ? 'Lectura' : m.nombre} · {formatoTamano(m.tamano)}</small></span>
                </button>
                <button type="button" className="sc-borrar" onClick={() => quitar(m)} aria-label={`Quitar ${m.titulo} de este dispositivo`}><Trash2 size={16} /></button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
