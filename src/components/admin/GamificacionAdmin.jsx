import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';
import { CATEGORIAS, ESCALONES, REGLAS_PUNTOS } from '../../lib/logros';
import './AdminLms.css';

// Ajustes de gamificación: puntos por nivel y recompensas (descuento en los
// cursos de pago al llegar a un nivel).

export default function GamificacionAdmin({ notificar }) {
  const [config, setConfig] = useState(null);
  const [falta, setFalta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    supabase.from('gamificacion_config').select('*').eq('id', 1).maybeSingle().then(({ data, error: err }) => {
      if (!vigente) return;
      if (err) {
        if (esTablaFaltante(err)) setFalta(true);
        // Antes se quedaba en "Cargando…" para siempre.
        else setError(err.message);
        return;
      }
      const base = data || { activo: true, puntos_por_nivel: 200, recompensas: [] };
      setConfig({ ...base, recompensas: Array.isArray(base.recompensas) ? base.recompensas : [] });
    }, (err) => { if (vigente) setError(err?.message || 'Error de conexión'); });
    return () => { vigente = false; };
  }, [recarga]);

  const guardar = async () => {
    setGuardando(true);
    const recompensas = (config.recompensas || [])
      .map((r) => ({ nivel: Math.max(2, Number(r.nivel) || 0), descuento: Math.min(90, Math.max(1, Number(r.descuento) || 0)) }))
      .filter((r) => r.nivel && r.descuento);
    const { error } = await supabase.from('gamificacion_config').upsert([{
      id: 1,
      activo: !!config.activo,
      puntos_por_nivel: Math.max(10, Number(config.puntos_por_nivel) || 200),
      recompensas,
      actualizado_en: new Date().toISOString(),
    }], { onConflict: 'id' });
    setGuardando(false);
    if (error) notificar(error.message, 'error');
    else notificar('Gamificación guardada.', 'success');
  };

  const cambiarRecompensa = (i, campo, valor) => {
    setConfig({ ...config, recompensas: config.recompensas.map((r, j) => (j === i ? { ...r, [campo]: valor } : r)) });
  };

  if (falta) return <div className="lms-aviso">Para niveles y recompensas corre en Supabase la migración <code>gamificacion.sql</code>.</div>;
  if (error) {
    return (
      <div className="lms-aviso">
        No se pudo cargar la gamificación: {error}{' '}
        <button type="button" className="btn-crm-action outlined mini" onClick={() => { setError(null); setRecarga((n) => n + 1); }}>Reintentar</button>
      </div>
    );
  }
  if (!config) return <p className="lms-cargando">Cargando…</p>;

  return (
    <div className="reglas">
      <section className="reglas-grupo">
        <h5>Ajustes</h5>
        <label className="lms-check">
          <input type="checkbox" checked={!!config.activo} onChange={(e) => setConfig({ ...config, activo: e.target.checked })} />
          Recompensas activas (el descuento se aplica solo al pagar)
        </label>
        <label className="crm-input-group reglas-campo">
          <span>Puntos para subir de nivel</span>
          <input type="number" min="10" value={config.puntos_por_nivel} onChange={(e) => setConfig({ ...config, puntos_por_nivel: e.target.value })} />
        </label>
        <small className="lms-ayuda">Todos empiezan en el nivel 1 y suben uno cada {config.puntos_por_nivel || 200} puntos.</small>
      </section>

      <section className="reglas-grupo">
        <h5>Recompensas</h5>
        {(config.recompensas || []).length === 0 && <small className="lms-ayuda" style={{ marginLeft: 0 }}>Sin recompensas. Por ejemplo: nivel 5 → 10% de descuento en cursos de pago.</small>}
        {(config.recompensas || []).map((r, i) => (
          <div key={i} className="gam-recompensa">
            <label className="crm-input-group"><span>Al llegar al nivel</span><input type="number" min="2" value={r.nivel} onChange={(e) => cambiarRecompensa(i, 'nivel', e.target.value)} /></label>
            <label className="crm-input-group"><span>% de descuento</span><input type="number" min="1" max="90" value={r.descuento} onChange={(e) => cambiarRecompensa(i, 'descuento', e.target.value)} /></label>
            <button type="button" className="icon-action-btn delete" title="Quitar" onClick={() => setConfig({ ...config, recompensas: config.recompensas.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
          </div>
        ))}
        <button type="button" className="btn-crm-action outlined mini" style={{ alignSelf: 'flex-start' }} onClick={() => setConfig({ ...config, recompensas: [...(config.recompensas || []), { nivel: 5, descuento: 10 }] })}>
          <Plus size={13} /> Agregar recompensa
        </button>
      </section>

      <section className="reglas-grupo">
        <h5>Cómo se ganan los puntos</h5>
        <ul className="gam-lista">{REGLAS_PUNTOS.map(([r, p]) => <li key={r}><span>{r}</span><strong>+{p}</strong></li>)}</ul>
      </section>

      <section className="reglas-grupo">
        <h5>Insignias ({CATEGORIAS.length} categorías × {ESCALONES.length} niveles)</h5>
        <div className="biblioteca-tabla-scroll">
          <table className="biblioteca-tabla">
            <thead><tr><th>Categoría</th>{ESCALONES.map((e) => <th key={e} className="num">{e}</th>)}</tr></thead>
            <tbody>
              {CATEGORIAS.map((c) => (
                <tr key={c.id}><td><strong>{c.nombre}</strong><small className="lms-ayuda" style={{ display: 'block', margin: 0 }}>{c.unidad}</small></td>{c.metas.map((m) => <td key={m} className="num">{m}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="lms-editor-acciones">
        <button type="button" className="btn-crm-action solid" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </div>
  );
}
