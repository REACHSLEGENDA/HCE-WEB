import React, { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Video, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fechaEnZona, formatearFechaHora, diaEnZona, zonaPreferida, nombreZona } from '../lib/zonaHoraria';
import { descargarIcs } from '../lib/sesiones';
import './CalendarioAlumno.css';

// Calendario del alumno: las sesiones en vivo de sus cursos y los webinars, en
// su zona horaria.

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

async function cargarEventos(cursosInscritos, cursos) {
  const eventos = [];
  const ids = [...cursosInscritos];
  if (ids.length) {
    const { data: lecciones } = await supabase.from('curso_lecciones').select('id, course_id, titulo').eq('tipo', 'sesion').in('course_id', ids);
    if (lecciones?.length) {
      const { data: horarios } = await supabase.from('sesiones_clase').select('leccion_id, inicia_en, duracion_min').in('leccion_id', lecciones.map((l) => l.id));
      for (const h of horarios || []) {
        const l = lecciones.find((x) => x.id === h.leccion_id);
        eventos.push({
          id: `s-${h.leccion_id}`,
          tipo: 'sesion',
          titulo: l?.titulo || 'Sesión en vivo',
          curso: cursos.find((c) => Number(c.id) === Number(l?.course_id))?.title || '',
          courseId: l?.course_id,
          inicio: new Date(h.inicia_en),
          duracionMin: h.duracion_min || 60,
        });
      }
    }
  }
  const { data: webinars } = await supabase.from('webinars').select('id, title, fecha_inicio, fecha_fin, activo').not('fecha_inicio', 'is', null);
  for (const w of webinars || []) {
    if (w.activo === false) continue;
    const inicio = fechaEnZona(w.fecha_inicio);
    if (!inicio) continue;
    const fin = fechaEnZona(w.fecha_fin);
    eventos.push({
      id: `w-${w.id}`,
      tipo: 'webinar',
      titulo: w.title,
      curso: 'Webinar',
      inicio,
      duracionMin: fin ? Math.max(15, Math.round((fin - inicio) / 60000)) : 60,
    });
  }
  return eventos.sort((a, b) => a.inicio - b.inicio);
}

export default function CalendarioAlumno({ cursosInscritos, cursos, onAbrirEvento }) {
  const zona = zonaPreferida();
  const [eventos, setEventos] = useState(null);
  const [mes, setMes] = useState(() => {
    const [a, m] = diaEnZona(new Date(), zona).split('-').map(Number);
    return { a, m };
  });
  const [diaElegido, setDiaElegido] = useState(null);
  const clave = [...(cursosInscritos || [])].sort().join(',');

  useEffect(() => {
    let vigente = true;
    cargarEventos(cursosInscritos || new Set(), cursos)
      .then((lista) => { if (vigente) setEventos(lista); })
      .catch(() => { if (vigente) setEventos([]); });
    return () => { vigente = false; };
    // Se recarga cuando cambian los cursos inscritos (clave), no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave, cursos.length]);

  const porDia = useMemo(() => {
    const mapa = new Map();
    (eventos || []).forEach((e) => {
      const d = diaEnZona(e.inicio, zona);
      mapa.set(d, [...(mapa.get(d) || []), e]);
    });
    return mapa;
  }, [eventos, zona]);

  const hoy = diaEnZona(new Date(), zona);
  const celdas = useMemo(() => {
    const primero = new Date(Date.UTC(mes.a, mes.m - 1, 1));
    const desfase = (primero.getUTCDay() + 6) % 7; // lunes primero
    const diasMes = new Date(Date.UTC(mes.a, mes.m, 0)).getUTCDate();
    const lista = [];
    for (let i = 0; i < desfase; i += 1) lista.push(null);
    for (let d = 1; d <= diasMes; d += 1) lista.push(`${mes.a}-${String(mes.m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    while (lista.length % 7) lista.push(null);
    return lista;
  }, [mes]);

  const moverMes = (paso) => {
    setDiaElegido(null);
    setMes(({ a, m }) => {
      const t = m + paso;
      return t < 1 ? { a: a - 1, m: 12 } : t > 12 ? { a: a + 1, m: 1 } : { a, m: t };
    });
  };

  const titulo = new Date(Date.UTC(mes.a, mes.m - 1, 15)).toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const proximos = (eventos || []).filter((e) => e.inicio.getTime() + e.duracionMin * 60000 >= Date.now());
  const listado = diaElegido ? porDia.get(diaElegido) || [] : proximos.slice(0, 20);

  return (
    <div className="cal">
      <div className="cal-cabecera">
        <div className="cal-nav">
          <button type="button" onClick={() => moverMes(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
          <h2>{titulo}</h2>
          <button type="button" onClick={() => moverMes(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
        </div>
        <button
          type="button"
          className="cal-hoy"
          onClick={() => { const [a, m] = hoy.split('-').map(Number); setMes({ a, m }); setDiaElegido(null); }}
        >
          Hoy
        </button>
      </div>
      <p className="cal-zona">Horarios en tu zona: <strong>{nombreZona(zona)}</strong>. Puedes cambiarla en Configuración.</p>

      <div className="cal-rejilla" role="grid" aria-label={titulo}>
        {DIAS.map((d) => <div key={d} className="cal-dia-nombre" role="columnheader">{d}</div>)}
        {celdas.map((dia, i) => {
          if (!dia) return <div key={`v-${i}`} className="cal-celda vacia" />;
          const deDia = porDia.get(dia) || [];
          return (
            <button
              key={dia}
              type="button"
              role="gridcell"
              className={`cal-celda${dia === hoy ? ' hoy' : ''}${dia === diaElegido ? ' elegida' : ''}${deDia.length ? ' con-eventos' : ''}`}
              onClick={() => setDiaElegido(dia === diaElegido ? null : dia)}
              aria-label={`${Number(dia.slice(8))}${deDia.length ? `, ${deDia.length} evento(s)` : ''}`}
            >
              <span className="cal-numero">{Number(dia.slice(8))}</span>
              {deDia.slice(0, 2).map((e) => (
                <span key={e.id} className={`cal-chip ${e.tipo}`}>
                  {e.inicio.toLocaleTimeString('es-MX', { timeZone: zona, hour: '2-digit', minute: '2-digit' })} {e.titulo}
                </span>
              ))}
              {deDia.length > 2 && <span className="cal-mas">+{deDia.length - 2}</span>}
              {deDia.length > 0 && <span className="cal-puntos" aria-hidden="true">{deDia.map((e) => <span key={e.id} className={e.tipo} />)}</span>}
            </button>
          );
        })}
      </div>

      <h3 className="cal-subtitulo">{diaElegido ? formatearFechaHora(fechaEnZona(`${diaElegido}T12:00`, zona), { conZona: false, opciones: { weekday: 'long', day: 'numeric', month: 'long' } }) : 'Próximos eventos'}</h3>
      {eventos === null ? <p className="cal-vacio">Cargando…</p> : listado.length === 0 ? (
        <p className="cal-vacio">{diaElegido ? 'No hay eventos este día.' : 'No tienes eventos próximos.'}</p>
      ) : (
        <ul className="cal-lista">
          {listado.map((e) => (
            <li key={e.id} className={e.tipo}>
              <span className="cal-lista-icono">{e.tipo === 'sesion' ? <Video size={16} /> : <Radio size={16} />}</span>
              <button type="button" className="cal-lista-texto" onClick={() => onAbrirEvento?.(e)}>
                <strong>{e.titulo}</strong>
                <span>{formatearFechaHora(e.inicio, { zona, conZona: false })} · {e.duracionMin} min</span>
                <small>{e.tipo === 'sesion' ? `Sesión en vivo · ${e.curso}` : 'Webinar'}</small>
              </button>
              <button
                type="button"
                className="cal-ics"
                title="Agregar a mi calendario"
                aria-label={`Agregar ${e.titulo} a mi calendario`}
                onClick={() => descargarIcs({ titulo: e.titulo, curso: e.curso, iniciaEn: e.inicio.toISOString(), duracionMin: e.duracionMin, url: window.location.origin + (e.courseId ? `/classroom/${e.courseId}` : '/dashboard') })}
              >
                <CalendarPlus size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
