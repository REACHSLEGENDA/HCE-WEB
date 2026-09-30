import React, { useEffect, useState } from 'react';
import { Trophy, Award, Lock, Eye, EyeOff, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { insigniasPorCategoria, totalInsignias, nivelDe, recompensasDe, REGLAS_PUNTOS } from '../lib/logros';

// Puntos, insignias y tabla de posiciones del alumno.
//
// Todo sale de funciones de Supabase que solo devuelven lo que el alumno puede
// ver: sus propios números y, de los demás, nombre corto y puntos. Quien no
// quiera aparecer en la tabla se oculta con un clic.

export function LogrosVista({ logros, tabla, onCambiarVisibilidad, cambiando }) {
  const categorias = insigniasPorCategoria(logros);
  const obtenidas = totalInsignias(categorias);
  const nivel = nivelDe(logros.puntos, logros.puntos_por_nivel);
  const recompensas = recompensasDe(logros.recompensas, nivel.nivel);

  return (
    <section className="logros-card">
      <header className="logros-cabecera">
        <div>
          <h2><Trophy size={18} /> Tus logros</h2>
          <p>{obtenidas} de {categorias.length * 8} insignias</p>
        </div>
        <div className="logros-puntos">
          <span className="logros-puntos-valor">{Number(logros.puntos || 0).toLocaleString('es-MX')}</span>
          <span className="logros-puntos-etiqueta">
            puntos{logros.posicion ? ` · lugar ${logros.posicion} de ${logros.participantes}` : ''}
          </span>
        </div>
      </header>

      <div className="logros-nivel">
        <span className="logros-nivel-numero">Nivel {nivel.nivel}</span>
        <span className="logros-nivel-barra" aria-hidden="true"><span style={{ width: `${(nivel.enNivel / nivel.paso) * 100}%` }} /></span>
        <span className="logros-nivel-falta">{nivel.paraSiguiente} pts para el nivel {nivel.nivel + 1}</span>
      </div>

      <ul className="logros-insignias">
        {categorias.map((c) => (
          <li
            key={c.id}
            className={`logros-insignia${c.alcanzados ? ' logros-insignia--obtenida' : ''}`}
            title={c.siguiente != null ? `Siguiente: ${c.siguienteNombre} con ${c.siguiente} ${c.unidad}` : 'Nivel máximo'}
          >
            <span className="logros-insignia-icono" aria-hidden="true">
              {c.alcanzados ? <Award size={20} /> : <Lock size={16} />}
            </span>
            <span className="logros-insignia-nombre">{c.nombre}</span>
            <span className="logros-insignia-escalon">{c.escalon || 'Sin empezar'}</span>
            <span className="logros-escalones" aria-label={`${c.alcanzados} de 8`}>
              {c.metas.map((m, i) => <span key={m} className={i < c.alcanzados ? 'lleno' : ''} />)}
            </span>
            <span className="logros-insignia-req">
              {c.siguiente != null ? `${Math.min(c.valor, c.siguiente)} de ${c.siguiente} ${c.unidad}` : 'Nivel máximo'}
            </span>
          </li>
        ))}
      </ul>

      {recompensas.length > 0 && (
        <div className="logros-recompensas">
          <h3><Gift size={16} /> Recompensas</h3>
          <ul>
            {recompensas.map((r) => (
              <li key={r.nivel} className={r.alcanzada ? 'alcanzada' : ''}>
                <span>Nivel {r.nivel}</span>
                <strong>{r.descuento}% de descuento en cursos de pago</strong>
                <small>{r.alcanzada ? '✓ Ya la tienes: se aplica sola al pagar' : `Te faltan ${Math.max(0, (r.nivel - 1) * nivel.paso - Number(logros.puntos || 0))} pts`}</small>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="logros-inferior">
        <div className="logros-tabla">
          <h3>Tabla de posiciones</h3>
          {tabla.length === 0 ? (
            <p className="logros-nota">Todavía nadie suma puntos. Completa una lección y estrena la tabla.</p>
          ) : (
            <ol>
              {tabla.map((fila) => (
                <li key={`${fila.posicion}-${fila.nombre}`} className={fila.soy_yo ? 'logros-yo' : ''}>
                  <span className="logros-pos">{fila.posicion}</span>
                  <span className="logros-nombre">{fila.soy_yo ? `${fila.nombre} (tú)` : fila.nombre}</span>
                  <span className="logros-pts">{Number(fila.puntos).toLocaleString('es-MX')}</span>
                </li>
              ))}
            </ol>
          )}
          <button type="button" className="logros-visibilidad" onClick={onCambiarVisibilidad} disabled={cambiando}>
            {logros.mostrar_en_ranking ? <EyeOff size={14} /> : <Eye size={14} />}
            {logros.mostrar_en_ranking ? 'Ocultarme de la tabla' : 'Aparecer en la tabla'}
          </button>
        </div>

        <div className="logros-reglas">
          <h3>Cómo se ganan</h3>
          <ul>
            {REGLAS_PUNTOS.map(([regla, pts]) => (
              <li key={regla}><span>{regla}</span><strong>+{pts}</strong></li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default function LogrosAlumno({ userId }) {
  const [logros, setLogros] = useState(null);
  const [tabla, setTabla] = useState([]);
  const [cambiando, setCambiando] = useState(false);

  useEffect(() => {
    if (!userId) return undefined;
    let vigente = true;
    Promise.all([supabase.rpc('mis_logros'), supabase.rpc('tabla_posiciones', { limite: 5 })])
      .then(([mios, posiciones]) => {
        // Antes de la migración las funciones no existen: la tarjeta no aparece.
        if (!vigente || mios.error) return;
        setLogros(mios.data);
        setTabla(posiciones.error ? [] : posiciones.data || []);
      });
    return () => { vigente = false; };
  }, [userId]);

  const cambiarVisibilidad = async () => {
    setCambiando(true);
    const nuevo = !logros.mostrar_en_ranking;
    const { error } = await supabase.from('profiles').update({ mostrar_en_ranking: nuevo }).eq('id', userId);
    if (!error) {
      const [mios, posiciones] = await Promise.all([supabase.rpc('mis_logros'), supabase.rpc('tabla_posiciones', { limite: 5 })]);
      if (!mios.error) setLogros(mios.data);
      setTabla(posiciones.error ? [] : posiciones.data || []);
    }
    setCambiando(false);
  };

  if (!logros) return null;
  return <LogrosVista logros={logros} tabla={tabla} onCambiarVisibilidad={cambiarVisibilidad} cambiando={cambiando} />;
}
