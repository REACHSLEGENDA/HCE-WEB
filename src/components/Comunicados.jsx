import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Comunicados.css';

// Comunicados vigentes (ver supabase/mensajes.sql). "interno" en el portal del
// alumno, "externo" en la página de inicio. Cada quien puede cerrar uno y no
// se le vuelve a mostrar en ese navegador.

const CLAVE = 'hce_comunicados_cerrados';

function leerCerrados() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '[]');
  } catch {
    return [];
  }
}

function guardarCerrado(id) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify([...new Set([...leerCerrados(), id])].slice(-50)));
  } catch {
    // Sin almacenamiento, vuelve a aparecer la próxima vez: no pasa nada.
  }
}

export default function Comunicados({ tipo = 'interno' }) {
  const [lista, setLista] = useState([]);
  const [cerrados, setCerrados] = useState(leerCerrados);

  useEffect(() => {
    let vigente = true;
    supabase
      .from('comunicados')
      .select('id, titulo, cuerpo, enlace')
      .eq('tipo', tipo)
      .order('creado_en', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (vigente) setLista(data || []); }, () => {});
    return () => { vigente = false; };
  }, [tipo]);

  const visibles = lista.filter((c) => !cerrados.includes(c.id));
  if (!visibles.length) return null;

  return (
    <div className={`comunicados comunicados--${tipo}`}>
      {visibles.map((c) => (
        <div key={c.id} className="comunicado" role="status">
          <Megaphone size={18} />
          <div className="comunicado-texto">
            <strong>{c.titulo}</strong>
            {c.cuerpo && <span>{c.cuerpo}</span>}
            {c.enlace && /^https?:\/\//.test(c.enlace) && (
              <a href={c.enlace} target="_blank" rel="noopener noreferrer">Ver más</a>
            )}
          </div>
          <button
            type="button"
            aria-label="Cerrar aviso"
            onClick={() => { guardarCerrado(c.id); setCerrados(leerCerrados()); }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
