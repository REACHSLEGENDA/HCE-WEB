import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Archive, Inbox, Paperclip, PenSquare, Reply, Search, Send, X } from 'lucide-react';
import {
  cargarRecibidos,
  cargarEnviados,
  cargarHilo,
  marcarLeido,
  archivar,
  subirAdjunto,
  abrirAdjunto,
  enviarMensaje,
} from '../lib/mensajes';
import './Mensajes.css';

// Bandeja de mensajes del portal. La misma para alumno y administrador; el
// administrador además elige a quién escribir (persona, grupo, curso, todos).

const LIMITE_MB = 20;
const fecha = (iso) => new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const DESTINOS = [
  ['usuario', 'Una persona'],
  ['grupo', 'Un grupo'],
  ['curso', 'Los inscritos de un curso'],
  ['todos', 'Todos los alumnos'],
  ['admins', 'Administradores'],
];

function Redactar({ userId, esAdmin, perfiles, grupos, cursos, respondeA, notificar, onEnviado, onCancelar }) {
  const [form, setForm] = useState({ destinoTipo: esAdmin ? 'usuario' : 'admins', destinoId: '', asunto: '', cuerpo: '' });
  const [busqueda, setBusqueda] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const personas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    return perfiles.filter((p) => p.id !== userId && `${p.nombre_completo || ''} ${p.email || ''}`.toLowerCase().includes(q)).slice(0, 8);
  }, [busqueda, perfiles, userId]);
  const elegida = perfiles.find((p) => p.id === form.destinoId);

  const enviar = async (e) => {
    e.preventDefault();
    if (!form.cuerpo.trim()) { notificar('Escribe el mensaje.', 'error'); return; }
    if (!respondeA && !form.asunto.trim()) { notificar('Pon el asunto.', 'error'); return; }
    if (archivo && archivo.size > LIMITE_MB * 1024 * 1024) { notificar(`El archivo pasa de ${LIMITE_MB} MB.`, 'error'); return; }
    setEnviando(true);
    try {
      const adjunto = archivo ? await subirAdjunto(userId, archivo) : null;
      const r = await enviarMensaje({
        ...form,
        respondeA: respondeA?.id || null,
        adjuntoPath: adjunto?.path || null,
        adjuntoNombre: adjunto?.nombre || null,
      });
      notificar(r.destinatarios > 1 ? `Mensaje enviado a ${r.destinatarios} personas.` : 'Mensaje enviado.', 'success');
      onEnviado?.();
    } catch (err) {
      notificar(err.message, 'error');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="msj-redactar" onSubmit={enviar}>
      {!respondeA && (
        <>
          {esAdmin ? (
            <div className="msj-campo">
              <label htmlFor="msj-destino">Enviar a</label>
              <div className="msj-destino">
                <select id="msj-destino" value={form.destinoTipo} onChange={(e) => setForm({ ...form, destinoTipo: e.target.value, destinoId: '' })}>
                  {DESTINOS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                </select>
                {form.destinoTipo === 'usuario' && (
                  elegida ? (
                    <span className="msj-elegido">{elegida.nombre_completo || elegida.email} <button type="button" onClick={() => setForm({ ...form, destinoId: '' })} aria-label="Quitar"><X size={13} /></button></span>
                  ) : (
                    <div className="msj-buscar-persona">
                      <input type="search" placeholder="Escribe al menos 2 letras del nombre o correo" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                      {personas.length > 0 && (
                        <ul>
                          {personas.map((p) => (
                            <li key={p.id}><button type="button" onClick={() => { setForm({ ...form, destinoId: p.id }); setBusqueda(''); }}>{p.nombre_completo || p.email} <small>{p.email}</small></button></li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                )}
                {form.destinoTipo === 'grupo' && (
                  <select value={form.destinoId} onChange={(e) => setForm({ ...form, destinoId: e.target.value })} aria-label="Grupo">
                    <option value="">Elige el grupo</option>
                    {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                  </select>
                )}
                {form.destinoTipo === 'curso' && (
                  <select value={form.destinoId} onChange={(e) => setForm({ ...form, destinoId: e.target.value })} aria-label="Curso">
                    <option value="">Elige el curso</option>
                    {cursos.filter((c) => !isNaN(Number(c.id))).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                )}
              </div>
            </div>
          ) : (
            <p className="msj-nota">Tu mensaje llega al equipo de administración de HCE.</p>
          )}
          <div className="msj-campo">
            <label htmlFor="msj-asunto">Asunto</label>
            <input id="msj-asunto" type="text" maxLength={200} value={form.asunto} onChange={(e) => setForm({ ...form, asunto: e.target.value })} />
          </div>
        </>
      )}
      <div className="msj-campo">
        <label htmlFor="msj-cuerpo">{respondeA ? 'Tu respuesta' : 'Mensaje'}</label>
        <textarea id="msj-cuerpo" rows={respondeA ? 4 : 8} value={form.cuerpo} onChange={(e) => setForm({ ...form, cuerpo: e.target.value })} placeholder="Escribe tu mensaje aquí…" />
      </div>
      <div className="msj-pie">
        <label className="msj-adjuntar">
          <Paperclip size={15} /> <span>{archivo ? archivo.name : `Adjuntar archivo (máx. ${LIMITE_MB} MB)`}</span>
          <input type="file" onChange={(e) => setArchivo(e.target.files?.[0] || null)} />
        </label>
        <div className="msj-botones">
          {onCancelar && <button type="button" className="msj-boton" onClick={onCancelar} disabled={enviando}>Cancelar</button>}
          <button type="submit" className="msj-boton principal" disabled={enviando}><Send size={15} /> {enviando ? 'Enviando…' : 'Enviar'}</button>
        </div>
      </div>
    </form>
  );
}

export default function Mensajes({ userId, esAdmin = false, perfiles = [], grupos = [], cursos = [], notificar, onLeidos }) {
  const [vista, setVista] = useState('recibidos');
  const [recibidos, setRecibidos] = useState(null);
  const [enviados, setEnviados] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [abierto, setAbierto] = useState(null);
  const [hilo, setHilo] = useState([]);
  const [respondiendo, setRespondiendo] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [errorCarga, setErrorCarga] = useState('');
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setErrorCarga('');
    setFaltaMigracion(false);
    try {
      const [r, e] = await Promise.all([cargarRecibidos(userId), cargarEnviados(userId)]);
      if (r === null || e === null) { setFaltaMigracion(true); return; }
      setRecibidos(r);
      setEnviados(e);
    } catch (err) {
      setErrorCarga(err.message || 'No se pudieron cargar los mensajes.');
    } finally { setCargando(false); }
  }, [userId]);

  useEffect(() => {
    let vigente = true;
    Promise.all([cargarRecibidos(userId), cargarEnviados(userId)])
      .then(([r, e]) => {
        if (!vigente) return;
        if (r === null || e === null) { setFaltaMigracion(true); return; }
        setRecibidos(r);
        setEnviados(e);
      })
      .catch((err) => { if (vigente) setErrorCarga(err.message || 'No se pudieron cargar los mensajes.'); });
    return () => { vigente = false; };
  }, [userId]);

  const abrir = async (m) => {
    setAbierto(m);
    setHilo([]);
    setRespondiendo(false);
    try {
      const conversacion = await cargarHilo(m);
      setHilo(conversacion);
      const porLeer = (recibidos || []).filter((r) => !r.leido && conversacion.some((c) => c.id === r.id)).map((r) => r.id);
      if (porLeer.length) {
        await marcarLeido(userId, porLeer);
        setRecibidos((lista) => lista.map((r) => (porLeer.includes(r.id) ? { ...r, leido: true } : r)));
        onLeidos?.();
      }
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  const archivarAbierto = async () => {
    try {
      await archivar(userId, abierto.id);
      setAbierto(null);
      await cargar();
    } catch (err) {
      notificar(err.message, 'error');
    }
  };

  if (faltaMigracion) {
    return <p className="msj-vacio">Los mensajes se activan al correr en Supabase la migración <code>mensajes.sql</code>.</p>;
  }

  const lista = (vista === 'recibidos' ? recibidos : enviados) || [];
  const q = busqueda.trim().toLowerCase();
  const filtrada = q ? lista.filter((m) => `${m.asunto} ${m.remitente_nombre || ''} ${m.destino_nombre || ''}`.toLowerCase().includes(q)) : lista;
  const noLeidos = (recibidos || []).filter((m) => !m.leido).length;

  // ---- Conversación abierta ---------------------------------------------------
  if (abierto) {
    return (
      <div className="msj">
        <div className="msj-barra">
          <button type="button" className="msj-boton" onClick={() => { setAbierto(null); void cargar(); }}><ArrowLeft size={15} /> Mensajes</button>
          <div className="msj-botones">
            {vista === 'recibidos' && <button type="button" className="msj-boton" onClick={archivarAbierto}><Archive size={15} /> Archivar</button>}
          </div>
        </div>
        <h2 className="msj-titulo">{hilo[0]?.asunto || abierto.asunto}</h2>
        <ol className="msj-hilo">
          {(hilo.length ? hilo : [abierto]).map((m) => (
            <li key={m.id} className={m.remitente_id === userId ? 'propio' : ''}>
              <header>
                <strong>{m.remitente_id === userId ? 'Tú' : m.remitente_nombre || 'Usuario'}</strong>
                {m.remitente_id === userId && m.destino_nombre && <small>para {m.destino_nombre}</small>}
                <time>{fecha(m.creado_en)}</time>
              </header>
              <p>{m.cuerpo}</p>
              {m.adjunto_path && (
                <button type="button" className="msj-adjunto" onClick={() => abrirAdjunto(m).catch((err) => notificar(err.message, 'error'))}>
                  <Paperclip size={14} /> {m.adjunto_nombre || 'Archivo adjunto'}
                </button>
              )}
            </li>
          ))}
        </ol>
        {respondiendo ? (
          <Redactar
            userId={userId}
            esAdmin={esAdmin}
            perfiles={perfiles}
            respondeA={hilo[hilo.length - 1] || abierto}
            notificar={notificar}
            onEnviado={async () => { setRespondiendo(false); setHilo(await cargarHilo(abierto)); }}
            onCancelar={() => setRespondiendo(false)}
          />
        ) : (
          <button type="button" className="msj-boton principal msj-responder" onClick={() => setRespondiendo(true)}><Reply size={15} /> Responder</button>
        )}
      </div>
    );
  }

  // ---- Bandeja -----------------------------------------------------------------
  return (
    <div className="msj">
      <div className="msj-barra">
        <nav className="msj-pestanas" role="tablist">
          <button type="button" role="tab" aria-selected={vista === 'recibidos'} className={vista === 'recibidos' ? 'activa' : ''} onClick={() => setVista('recibidos')}>
            <Inbox size={15} /> Recibidos {noLeidos > 0 && <span className="msj-contador">{noLeidos}</span>}
          </button>
          <button type="button" role="tab" aria-selected={vista === 'enviados'} className={vista === 'enviados' ? 'activa' : ''} onClick={() => setVista('enviados')}>
            <Send size={15} /> Enviados
          </button>
          <button type="button" role="tab" aria-selected={vista === 'nuevo'} className={vista === 'nuevo' ? 'activa' : ''} onClick={() => setVista('nuevo')}>
            <PenSquare size={15} /> Nuevo mensaje
          </button>
        </nav>
        {vista !== 'nuevo' && (
          <label className="msj-buscar"><Search size={14} /><input type="search" placeholder="Buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} /></label>
        )}
      </div>

      {vista === 'nuevo' ? (
        <Redactar
          userId={userId}
          esAdmin={esAdmin}
          perfiles={perfiles}
          grupos={grupos}
          cursos={cursos}
          notificar={notificar}
          onEnviado={async () => { await cargar(); setVista('enviados'); }}
        />
      ) : errorCarga ? (
        <div className="msj-vacio" role="alert">
          <p>No se pudieron cargar los mensajes: {errorCarga}</p>
          <button type="button" className="msj-boton" disabled={cargando} onClick={cargar}>{cargando ? 'Cargando…' : 'Reintentar'}</button>
        </div>
      ) : recibidos === null ? (
        <p className="msj-vacio">Cargando…</p>
      ) : filtrada.length === 0 ? (
        <p className="msj-vacio">{vista === 'recibidos' ? 'No tienes mensajes.' : 'No has enviado mensajes.'}</p>
      ) : (
        <ul className="msj-lista">
          {filtrada.map((m) => (
            <li key={m.id}>
              <button type="button" className={`msj-fila${vista === 'recibidos' && !m.leido ? ' no-leido' : ''}`} onClick={() => abrir(m)}>
                <span className="msj-de">{vista === 'recibidos' ? m.remitente_nombre || 'Usuario' : `Para: ${m.destino_nombre || ''}`}</span>
                <span className="msj-asunto">{m.asunto}{m.adjunto_path ? <Paperclip size={12} /> : null}</span>
                <span className="msj-extracto">{m.cuerpo.slice(0, 120)}</span>
                <time className="msj-fecha">{new Date(m.creado_en).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</time>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
