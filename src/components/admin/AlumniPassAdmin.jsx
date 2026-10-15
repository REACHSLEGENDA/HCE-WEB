import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, ExternalLink, RefreshCw, Send, Undo2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './AdminLms.css';

// Alumni Pass (Step 1 Refresher, 28 y 29 de octubre de 2026): solicitudes con
// datos y diploma de Step 1 → aceptar (manda el enlace de pago por correo) o
// rechazar (avisa con el motivo) → pagos. Todo pasa por
// netlify/functions/alumni-pass.js.

const llamar = async (cuerpo) => {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch('/.netlify/functions/alumni-pass', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token || ''}` },
    body: JSON.stringify(cuerpo),
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || `Error ${res.status}`);
  return datos;
};

const estadoDe = (r) => (r.pagado ? 'pagado' : r.revision === 'aprobado' ? 'aprobado' : r.revision === 'rechazado' ? 'rechazado' : 'pendiente');
const ESTADOS = {
  pendiente: { texto: 'Por revisar', clase: 'pendiente' },
  aprobado: { texto: 'Aceptado · sin pagar', clase: 'aprobado' },
  pagado: { texto: 'Pagado', clase: 'pagado' },
  rechazado: { texto: 'Rechazado', clase: 'rechazado' },
};
const FILTROS = [['pendiente', 'Por revisar'], ['aprobado', 'Aceptados sin pagar'], ['pagado', 'Pagados'], ['rechazado', 'Rechazados'], ['todos', 'Todos']];

const fecha = (iso) => (iso ? new Date(iso).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function AlumniPassAdmin({ notificar, confirmar }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [filtro, setFiltro] = useState('pendiente');
  const [busqueda, setBusqueda] = useState('');
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState('');
  const [rechazo, setRechazo] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await llamar({ accion: 'listar' }));
    } catch (err) {
      setError(/alumni_pass_registros|does not exist|schema cache|column/i.test(err.message)
        ? 'Falta correr en Supabase la migración supabase/alumni-pass.sql (versión con solicitud).'
        : err.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const registros = useMemo(() => datos?.registros || [], [datos]);
  const conteo = useMemo(() => {
    const c = { pendiente: 0, aprobado: 0, pagado: 0, rechazado: 0, todos: registros.length };
    registros.forEach((r) => { c[estadoDe(r)] += 1; });
    return c;
  }, [registros]);
  const pagados = registros.filter((r) => r.pagado);
  const ingresos = {
    mxn: pagados.filter((r) => r.moneda !== 'usd').reduce((t, r) => t + Number(r.importe || 0), 0),
    usd: pagados.filter((r) => r.moneda === 'usd').reduce((t, r) => t + Number(r.importe || 0), 0),
  };

  const visibles = registros.filter((r) => {
    if (filtro !== 'todos' && estadoDe(r) !== filtro) return false;
    const texto = busqueda.trim().toLowerCase();
    return !texto || [r.nombre, r.email, r.folio, r.telefono, r.ciudad, r.pais, r.hospital, r.especialidad]
      .filter(Boolean).join(' ').toLowerCase().includes(texto);
  });

  const accion = async (r, nombre, extra = {}) => {
    if (ocupado !== null) return;
    setOcupado(r.id);
    setAviso('');
    try {
      const respuesta = await llamar({ accion: nombre, id: r.id, ...extra });
      if (respuesta.correoEnviado === false || respuesta.avisoCorreo || respuesta.avisoRegistros) {
        const mensaje = respuesta.avisoRegistros || respuesta.avisoCorreo || (nombre === 'aprobar'
          ? `Solicitud aceptada, pero no se pudo enviar el correo a ${r.email}. Usa Reenviar enlace o Copiar enlace.`
          : 'El cambio quedó guardado, pero no se pudo enviar el aviso por correo.');
        setAviso(mensaje);
        notificar?.(mensaje, 'error');
      } else notificar?.(nombre === 'aprobar' ? `Aceptado: enviamos el enlace de pago a ${r.email}.`
        : nombre === 'rechazar' ? 'Solicitud rechazada: le avisamos por correo.'
          : nombre === 'reenviar-pase' ? 'El envío de confirmación quedó registrado.'
            : nombre === 'sincronizar-registros' ? 'Registro confirmado en Formularios, Formspree y Brevo.' : 'Regresó a "Por revisar".', 'success');
      await cargar();
      setRechazo(null);
    } catch (err) {
      notificar?.(`No se pudo: ${err.message}`, 'error');
    } finally {
      setOcupado(null);
    }
  };

  const aceptar = async (r) => {
    const reenviar = r.revision === 'aprobado';
    const mensaje = reenviar
      ? `¿Reenviar el enlace de pago a ${r.email}?`
      : `¿Aceptar a ${r.nombre}? Le llegará por correo su enlace de pago.`;
    const ok = confirmar ? await confirmar(mensaje, reenviar ? 'Reenviar enlace' : 'Aceptar solicitud') : window.confirm(mensaje);
    if (ok) await accion(r, 'aprobar');
  };

  const rechazar = (r) => setRechazo({ id: r.id, motivo: 'El documento no corresponde al diploma de Step 1 firmado por los profesores de París.' });
  const sincronizar = async (r) => {
    if (!r.formspree_enviado_en && r.formspree_intentado_en) {
      const mensaje = 'Formspree no confirmó el envío anterior. Revisa su buzón antes de continuar: reenviar puede crear un duplicado. ¿Reintentar los registros pendientes?';
      const ok = confirmar ? await confirmar(mensaje, 'Reintentar registros') : window.confirm(mensaje);
      if (!ok) return;
    }
    await accion(r, 'sincronizar-registros');
  };

  const copiar = async (r) => {
    try {
      await navigator.clipboard.writeText(r.enlace_pago);
      notificar?.('Enlace de pago copiado.', 'success');
    } catch {
      window.prompt('Copia el enlace de pago:', r.enlace_pago);
    }
  };

  const exportar = () => {
    const filas = [
      ['Estado', 'Folio', 'Nombre', 'Correo', 'Teléfono', 'Especialidad', 'Hospital', 'Ciudad', 'País', 'Modalidad', 'Grabaciones', 'Moneda', 'Importe', 'Solicitó', 'Pagó'],
      ...visibles.map((r) => [ESTADOS[estadoDe(r)].texto, r.folio || '', r.nombre, r.email, r.telefono || '', r.especialidad || '',
        r.hospital || '', r.ciudad || '', r.pais || '', r.modalidad === 'presencial' ? 'Presencial' : 'Virtual',
        r.grabaciones ? 'Sí' : 'No', (r.moneda || 'mxn').toUpperCase(), r.pagado ? r.importe ?? '' : '', fecha(r.creado_en), fecha(r.pagado_en)]),
    ];
    const csv = '﻿' + filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Alumni_Pass_Step1.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="settings-card">
        <p className="lms-aviso lms-aviso--error" role="alert">{error}</p>
        <button type="button" className="btn-crm-action outlined" onClick={cargar}><RefreshCw size={14} /> Reintentar</button>
      </div>
    );
  }
  if (!datos) return <p className="lms-cargando">Cargando solicitudes…</p>;

  const cupo = datos.presencial;
  return (
    <div className="alumni-admin">
      <div className="alumni-resumen">
        <div className="settings-card"><span>Por revisar</span><strong>{conteo.pendiente}</strong><small>solicitudes nuevas</small></div>
        <div className="settings-card"><span>Aceptados sin pagar</span><strong>{conteo.aprobado}</strong><small>pendientes de completar su pago</small></div>
        <div className="settings-card"><span>Presencial pagado</span><strong>{cupo?.pagados ?? 0} / {cupo?.total ?? 30}</strong><small>{cupo ? `${cupo.restantes} lugares libres` : ''}</small></div>
        <div className="settings-card"><span>Pagados</span><strong>{conteo.pagado}</strong><small>{pagados.filter((r) => r.grabaciones).length} con grabaciones</small></div>
        <div className="settings-card"><span>Ingresos</span><strong>${ingresos.mxn.toLocaleString('es-MX')}</strong><small>{ingresos.usd ? `+ US$${ingresos.usd.toLocaleString('es-MX')}` : 'MXN'}</small></div>
      </div>

      <div className="alumni-barra">
        <div className="alumni-filtros" role="group" aria-label="Filtrar">
          {FILTROS.map(([id, texto]) => (
            <button key={id} type="button" className={filtro === id ? 'activo' : ''} aria-pressed={filtro === id} onClick={() => setFiltro(id)}>
              {texto} <span className="alumni-num">{conteo[id]}</span>
            </button>
          ))}
        </div>
        <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, correo, hospital, ciudad…" aria-label="Buscar solicitud" />
        <button type="button" className="btn-crm-action outlined" onClick={cargar} disabled={cargando}><RefreshCw size={14} /> Actualizar</button>
        <button type="button" className="btn-crm-action outlined" onClick={exportar} disabled={!visibles.length}><Download size={14} /> Exportar</button>
      </div>

      {aviso && <p className="lms-aviso" role="status">{aviso}</p>}
      {visibles.length === 0 ? (
        <p className="lms-vacio">{registros.length ? 'No hay solicitudes en este filtro.' : 'Todavía no hay solicitudes. Comparte el enlace healthcareexp.com/alumni-pass-step1.'}</p>
      ) : (
        <div className="alumni-lista">
          {visibles.map((r) => {
            const est = estadoDe(r);
            const trabajando = ocupado !== null;
            return (
              <article key={r.id} className={`settings-card alumni-solicitud alumni-solicitud--${ESTADOS[est].clase}`}>
                <header>
                  <div>
                    <h4>{r.nombre}</h4>
                    <small className="alumni-sub">{r.email}{r.telefono ? ` · ${r.telefono}` : ''}</small>
                  </div>
                  <span className={`alumni-estado alumni-estado--${ESTADOS[est].clase}`}>{ESTADOS[est].texto}{r.folio ? ` · ${r.folio}` : ''}</span>
                </header>
                <dl className="alumni-datos">
                  <div><dt>Especialidad</dt><dd>{r.especialidad || '—'}</dd></div>
                  <div><dt>Hospital</dt><dd>{r.hospital || '—'}</dd></div>
                  <div><dt>Ciudad / país</dt><dd>{[r.ciudad, r.pais].filter(Boolean).join(', ') || '—'}</dd></div>
                  <div><dt>Modalidad</dt><dd>{r.modalidad === 'presencial' ? 'Presencial' : 'Virtual'}{r.grabaciones ? ' + grabaciones' : ''}</dd></div>
                  <div><dt>Solicitó</dt><dd>{fecha(r.creado_en)}</dd></div>
                  {r.pagado && <div><dt>Pagó</dt><dd>{r.moneda === 'usd' ? 'US$' : '$'}{Number(r.importe || 0).toLocaleString('es-MX')} · {fecha(r.pagado_en)}</dd></div>}
                  {est === 'aprobado' && <div><dt>Correo con enlace</dt><dd>{r.correo_enlace_en ? `Enviado ${fecha(r.correo_enlace_en)}` : 'Sin envío confirmado: reenvía o copia el enlace'}</dd></div>}
                  {r.pagado && <div><dt>Pase por correo</dt><dd>{r.brevo_sincronizado_en ? 'Envío registrado en Brevo' : 'Envío pendiente'}</dd></div>}
                  <div><dt>Panel de formularios</dt><dd>{r.formulario_registrado_en ? 'Registrado' : 'Pendiente de registrar'}</dd></div>
                  <div><dt>Formspree</dt><dd>{r.formspree_enviado_en ? 'Recepción confirmada' : r.formspree_estado === 'enviando' ? 'Envío en curso' : r.formspree_estado === 'sin_confirmar' ? 'Recepción sin confirmar: revisar buzón' : 'Envío pendiente'}</dd></div>
                  <div><dt>Contacto Brevo</dt><dd>{r.brevo_solicitud_en ? 'Registrado' : 'Pendiente de registrar'}</dd></div>
                  {r.formspree_error && <div className="alumni-datos-ancho"><dt>Detalle de Formspree</dt><dd>{r.formspree_error}</dd></div>}
                  {r.revision === 'rechazado' && r.notas && <div className="alumni-datos-ancho"><dt>Motivo</dt><dd>{r.notas}</dd></div>}
                </dl>
                <div className="alumni-acciones">
                  {r.diploma_url && <a href={r.diploma_url} target="_blank" rel="noreferrer" className="btn-crm-action outlined"><ExternalLink size={14} /> Ver diploma</a>}
                  {(!r.formulario_registrado_en || !r.formspree_enviado_en || !r.brevo_solicitud_en) && (
                    <button type="button" className="btn-crm-action outlined" disabled={trabajando} onClick={() => sincronizar(r)}><RefreshCw size={14} /> Reintentar registros pendientes</button>
                  )}
                  {est === 'pendiente' && (
                    <>
                      <button type="button" className="btn-crm-action solid" disabled={trabajando} onClick={() => aceptar(r)}><Check size={14} /> Aceptar y enviar enlace de pago</button>
                      <button type="button" className="btn-crm-action outlined lms-peligro" disabled={trabajando} onClick={() => rechazar(r)}><X size={14} /> Rechazar</button>
                    </>
                  )}
                  {est === 'aprobado' && (
                    <>
                      <button type="button" className="btn-crm-action outlined" disabled={trabajando} onClick={() => aceptar(r)}><Send size={14} /> Reenviar enlace</button>
                      {r.enlace_pago && <button type="button" className="btn-crm-action outlined" onClick={() => copiar(r)}><Copy size={14} /> Copiar enlace</button>}
                      <button type="button" className="btn-crm-action outlined" disabled={trabajando} onClick={() => accion(r, 'pendiente')}><Undo2 size={14} /> Regresar a revisión</button>
                    </>
                  )}
                  {est === 'rechazado' && (
                    <button type="button" className="btn-crm-action outlined" disabled={trabajando} onClick={() => aceptar(r)}><Check size={14} /> Aceptar de todos modos</button>
                  )}
                  {est === 'pagado' && (!r.brevo_sincronizado_en || !r.aviso_pago_en) && (
                    <button type="button" className="btn-crm-action outlined" disabled={trabajando} onClick={() => accion(r, 'reenviar-pase')}><Send size={14} /> Reintentar avisos pendientes</button>
                  )}
                </div>
                {rechazo?.id === r.id && (
                  <form className="alumni-rechazo" onSubmit={async (e) => { e.preventDefault(); await accion(r, 'rechazar', { notas: rechazo.motivo }); }}>
                    <label htmlFor={`alumni-motivo-${r.id}`}>Motivo del rechazo (se incluirá en el correo)</label>
                    <textarea id={`alumni-motivo-${r.id}`} rows={3} maxLength={500} value={rechazo.motivo} disabled={trabajando}
                      onChange={(e) => setRechazo({ ...rechazo, motivo: e.target.value })} />
                    <div className="alumni-acciones">
                      <button type="submit" className="btn-crm-action solid" disabled={trabajando}>Confirmar rechazo</button>
                      <button type="button" className="btn-crm-action outlined" disabled={trabajando} onClick={() => setRechazo(null)}>Cancelar</button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
