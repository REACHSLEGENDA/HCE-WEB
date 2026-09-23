import React, { useEffect, useState } from 'react';
import { Trophy, Award, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { insigniasDe, REGLAS_PUNTOS } from '../lib/logros';

// Puntos, insignias y tabla de posiciones del alumno.
//
// Todo sale de funciones de Supabase que solo devuelven lo que el alumno puede
// ver: sus propios números y, de los demás, nombre corto y puntos. Quien no
// quiera aparecer en la tabla se oculta con un clic.

export function LogrosVista({ logros, tabla, onCambiarVisibilidad, cambiando }) {
  const insignias = insigniasDe(logros);
  const obtenidas = insignias.filter((i) => i.obtenida).length;

  return (
    <section className="logros-card">
      <header className="logros-cabecera">
        <div>
          <h2><Trophy size={18} /> Tus logros</h2>
          <p>{obtenidas} de {insignias.length} insignias</p>
        </div>
        <div className="logros-puntos">
          <span className="logros-puntos-valor">{Number(logros.puntos || 0).toLocaleString('es-MX')}</span>
          <span className="logros-puntos-etiqueta">
            puntos{logros.posicion ? ` · lugar ${logros.posicion} de ${logros.participantes}` : ''}
          </span>
        </div>
      </header>

      <ul className="logros-insignias">
        {insignias.map((ins) => (
          <li key={ins.id} className={`logros-insignia${ins.obtenida ? ' logros-insignia--obtenida' : ''}`} title={ins.requisito}>
            <span className="logros-insignia-icono" aria-hidden="true">
              {ins.obtenida ? <Award size={20} /> : <Lock size={16} />}
            </span>
            <span className="logros-insignia-nombre">{ins.nombre}</span>
            <span className="logros-insignia-req">{ins.obtenida ? 'Obtenida' : ins.avance || ins.requisito}</span>
          </li>
        ))}
      </ul>

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
