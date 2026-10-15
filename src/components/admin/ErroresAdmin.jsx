import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Copy, RefreshCw, Undo2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './AdminLms.css';
import './ErroresAdmin.css';

// Sistema -> Errores: fallas que vieron los usuarios en su navegador, agrupadas
// por huella (mensaje + primera línea del stack + ruta). Las escribe
// netlify/functions/reportar-error.js; aquí solo se leen y se marcan resueltas.

const FALTA_TABLA = ['42P01', 'PGRST205', 'PGRST204', '42703'];
const FILTROS = [['pendientes', 'Pendientes'], ['resueltos', 'Resueltos'], ['todos', 'Todos']];
const ORIGEN = { render: 'Al dibujar la pantalla', error: 'Error de la página', promesa: 'Operación sin terminar' };

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

function hace(iso) {
  if (!iso) return '—';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const horas = Math.round(min / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias < 30 ? `hace ${dias} d` : fecha(iso);
}

export default function ErroresAdmin({ notificar }) {
  const [errores, setErrores] = useState(null);
  const [perfiles, setPerfiles] = useState({});
  const [estado, setEstado] = useState({ cargando: false, error: '', faltaTabla: false });
  const [filtro, setFiltro] = useState('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(null);
  const [ocupado, setOcupado] = useState(null);

  const cargar = useCallback(async () => {
    setEstado({ cargando: true, error: '', faltaTabla: false });
    const { data, error } = await supabase
      .from('errores_cliente')
      .select('*')
      .order('ultima_vez', { ascending: false })
      .limit(300);
    if (error) {
      setEstado({ cargando: false, error: error.message, faltaTabla: FALTA_TABLA.includes(error.code) });
      return;
    }
    const lista = data || [];
    setErrores(lista);
    setEstado({ cargando: false, error: '', faltaTabla: false });
    const ids = [...new Set(lista.map((e) => e.ultimo_user_id).filter(Boolean))];
    if (ids.length) {
      const { data: filas } = await supabase.from('profiles').select('id, nombre_completo, email').in('id', ids);
      setPerfiles(Object.fromEntries((filas || []).map((p) => [p.id, p])));
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const conteo = useMemo(() => {
    const lista = errores || [];
    const pendientes = lista.filter((e) => !e.resuelto).length;
    return { pendientes, resueltos: lista.length - pendientes, todos: lista.length };
  }, [errores]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (errores || []).filter((e) => {
      if (filtro === 'pendientes' && e.resuelto) return false;
      if (filtro === 'resueltos' && !e.resuelto) return false;
      if (!texto) return true;
      return [e.mensaje, e.ruta, e.navegador, e.version].some((v) => String(v || '').toLowerCase().includes(texto));
    });
  }, [errores, filtro, busqueda]);

  const marcar = async (e, resuelto) => {
    setOcupado(e.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const cambios = resuelto
        ? { resuelto: true, resuelto_en: new Date().toISOString(), resuelto_por: session?.user?.id || null }
        : { resuelto: false, resuelto_en: null, resuelto_por: null };
      const { error } = await supabase.from('errores_cliente').update(cambios).eq('id', e.id);
      if (error) throw error;
      setErrores((prev) => prev.map((x) => (x.id === e.id ? { ...x, ...cambios } : x)));
      notificar?.(resuelto ? 'Marcado como resuelto. Si vuelve a ocurrir, te llegará otro aviso.' : 'El error volvió a pendientes.', 'success');
    } catch (err) {
      notificar?.(`No se pudo actualizar: ${err.message}`, 'error');
    } finally {
      setOcupado(null);
    }
  };

  const copiar = async (e) => {
    const texto = [e.mensaje, `Ruta: ${e.ruta || '—'}`, `Versión: ${e.version || '—'}`, `Navegador: ${e.navegador || '—'}`, '', e.stack || '', e.componente ? `\nComponentes:${e.componente}` : ''].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      notificar?.('Detalle copiado.', 'success');
    } catch {
      notificar?.('No se pudo copiar; selecciona el texto a mano.', 'error');
    }
  };

  if (estado.faltaTabla) {
    return (
      <div className="settings-card errores-aviso">
        <AlertTriangle size={20} aria-hidden="true" />
        <div>
          <p><strong>Falta activar el registro de errores.</strong></p>
          <p>Corre en Supabase (SQL Editor) el archivo <code>supabase/errores.sql</code>. Mientras tanto, los errores se siguen avisando por correo y quedan en el registro de Netlify.</p>
          <button type="button" className="btn-crm-action outlined" onClick={cargar}><RefreshCw size={14} /> Ya lo corrí, revisar de nuevo</button>
        </div>
      </div>
    );
  }

  if (estado.error) {
    return (
      <div className="settings-card">
        <p className="lms-aviso lms-aviso--error" role="alert">No se pudieron cargar los errores: {estado.error}</p>
        <button type="button" className="btn-crm-action outlined" onClick={cargar}><RefreshCw size={14} /> Reintentar</button>
      </div>
    );
  }

  if (!errores) return <p className="lms-cargando" role="status">Cargando errores…</p>;

  return (
    <div className="errores-admin">
      <p className="errores-intro">
        Fallas que vieron los usuarios en su navegador. Cada error nuevo te llega por correo; si sigue ocurriendo, como máximo un aviso por hora.
        Márcalo como resuelto cuando se publique la corrección: si vuelve a aparecer, se reabre solo.
      </p>

      <div className="alumni-barra">
        <div className="alumni-filtros" role="group" aria-label="Filtrar errores">
          {FILTROS.map(([id, texto]) => (
            <button key={id} type="button" className={filtro === id ? 'activo' : ''} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {texto} <span className="alumni-num">{conteo[id]}</span>
            </button>
          ))}
        </div>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por mensaje, pantalla o navegador…" aria-label="Buscar error" />
        <button type="button" className="btn-crm-action outlined" onClick={cargar} disabled={estado.cargando}>
          <RefreshCw size={14} /> {estado.cargando ? 'Actualizando…' : 'Actualizar'}
        </button>
      </div>

      {visibles.length === 0 ? (
        <p className="lms-vacio">
          {errores.length === 0
            ? 'No se ha reportado ningún error. Cuando alguien vea una falla, aparecerá aquí y te llegará un correo.'
            : filtro === 'pendientes' ? 'Sin errores pendientes. Todo en orden.' : 'No hay errores en este filtro.'}
        </p>
      ) : (
        <ul className="errores-lista">
          {visibles.map((e) => {
            const expandido = abierto === e.id;
            const persona = e.ultimo_user_id ? perfiles[e.ultimo_user_id] : null;
            return (
              <li key={e.id} className={`settings-card errores-item${e.resuelto ? ' errores-item--resuelto' : ''}`}>
                <div className="errores-cabeza">
                  <p className="errores-mensaje">{e.mensaje}</p>
                  <span className={`errores-veces${e.veces >= 10 ? ' errores-veces--alto' : ''}`} title="Veces que ocurrió">
                    {e.veces} {e.veces === 1 ? 'vez' : 'veces'}
                  </span>
                </div>
                <dl className="errores-datos">
                  <div><dt>Pantalla</dt><dd><code>{e.ruta || '—'}</code></dd></div>
                  <div><dt>Último</dt><dd title={fecha(e.ultima_vez)}>{hace(e.ultima_vez)}</dd></div>
                  <div><dt>Navegador</dt><dd>{e.navegador || '—'}</dd></div>
                  <div><dt>Estado</dt><dd>{e.resuelto ? `Resuelto ${fecha(e.resuelto_en)}` : 'Pendiente'}</dd></div>
                </dl>
                <div className="alumni-acciones">
                  <button type="button" className="btn-crm-action outlined" aria-expanded={expandido} aria-controls={`error-detalle-${e.id}`}
                    onClick={() => setAbierto(expandido ? null : e.id)}>
                    {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {expandido ? 'Ocultar detalle' : 'Ver detalle'}
                  </button>
                  {e.resuelto ? (
                    <button type="button" className="btn-crm-action outlined" disabled={ocupado !== null} onClick={() => marcar(e, false)}><Undo2 size={14} /> Regresar a pendientes</button>
                  ) : (
                    <button type="button" className="btn-crm-action solid" disabled={ocupado !== null} onClick={() => marcar(e, true)}>
                      <Check size={14} /> {ocupado === e.id ? 'Guardando…' : 'Marcar como resuelto'}
                    </button>
                  )}
                </div>
                {expandido && (
                  <div className="errores-detalle" id={`error-detalle-${e.id}`}>
                    <dl className="errores-datos">
                      <div><dt>Tipo</dt><dd>{ORIGEN[e.origen] || e.origen || '—'}</dd></div>
                      <div><dt>Primera vez</dt><dd>{fecha(e.primera_vez)}</dd></div>
                      <div><dt>Versión</dt><dd><code>{e.version || '—'}</code></dd></div>
                      <div><dt>Última cuenta</dt><dd>{persona ? `${persona.nombre_completo || 'Sin nombre'} (${persona.email || 's/correo'})` : e.ultimo_user_id ? 'Con sesión' : 'Sin sesión'}</dd></div>
                    </dl>
                    {e.stack && (<><p className="errores-subtitulo">Dónde ocurrió (stack)</p><pre className="errores-pre">{e.stack}</pre></>)}
                    {e.componente && (<><p className="errores-subtitulo">Componentes</p><pre className="errores-pre">{e.componente.trim()}</pre></>)}
                    {e.user_agent && <p className="errores-ua">{e.user_agent}</p>}
                    <button type="button" className="btn-crm-action outlined" onClick={() => copiar(e)}><Copy size={14} /> Copiar detalle</button>
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
