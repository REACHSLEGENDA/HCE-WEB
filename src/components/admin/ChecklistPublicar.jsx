import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronRight, RefreshCw, Rocket } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';

const esMiniaturaYoutube = (url) => /img\.youtube\.com|ytimg\.com/i.test(String(url || ''));
const lleno = (v) => !!String(v ?? '').trim();

// ¿La lección tiene algo que ver? Video/archivo/texto/enlace, preguntas en
// las evaluaciones o fecha en las sesiones en vivo.
const tieneContenido = (leccion, contenidos, conPreguntas, conSesion) => {
  if (leccion.tipo === 'examen' || leccion.tipo === 'encuesta') return conPreguntas.has(leccion.id);
  if (leccion.tipo === 'sesion') return conSesion.has(leccion.id);
  const c = contenidos.get(leccion.id);
  return !!c && [c.youtube_video_id, c.archivo_path, c.texto, c.enlace].some(lleno);
};

async function cargarEstado(courseId) {
  const id = Number(courseId);
  const resultado = { lecciones: null, conContenido: 0, verificado: true, regla: 'examen_final', modoAcceso: 'inmediato', grupos: null };

  const { data: lecciones, error } = await supabase.from('curso_lecciones').select('id, tipo').eq('course_id', id);
  if (error && !esTablaFaltante(error)) throw error;
  if (!error) {
    const reales = (lecciones || []).filter((l) => l.tipo !== 'seccion');
    resultado.lecciones = reales.length;
    const ids = reales.map((l) => l.id);
    if (ids.length) {
      const [cont, preg, ses] = await Promise.all([
        supabase.from('leccion_contenido').select('*').in('leccion_id', ids),
        supabase.from('evaluacion_preguntas').select('leccion_id').in('leccion_id', ids),
        supabase.from('sesiones_clase').select('leccion_id').in('leccion_id', ids),
      ]);
      if (cont.error || preg.error || ses.error) {
        throw cont.error || preg.error || ses.error;
      } else {
        const contenidos = new Map((cont.data || []).map((c) => [c.leccion_id, c]));
        const conPreguntas = new Set((preg.data || []).map((p) => p.leccion_id));
        const conSesion = new Set((ses.data || []).map((s) => s.leccion_id));
        resultado.conContenido = reales.filter((l) => tieneContenido(l, contenidos, conPreguntas, conSesion)).length;
      }
    }
  }

  const { data: reglas, error: errorReglas } = await supabase.from('curso_reglas').select('*').eq('course_id', id).maybeSingle();
  if (errorReglas && !esTablaFaltante(errorReglas)) throw errorReglas;
  if (!errorReglas && reglas) {
    resultado.regla = reglas.regla_finalizacion || 'examen_final';
    resultado.modoAcceso = reglas.modo_acceso === 'grupo' ? 'grupo' : 'inmediato';
  }

  if (resultado.modoAcceso === 'grupo') {
    const { count, error: errorGrupos } = await supabase
      .from('grupo_cursos')
      .select('grupo_id', { count: 'exact', head: true })
      .eq('course_id', id);
    if (errorGrupos) throw errorGrupos;
    resultado.grupos = errorGrupos ? null : (count || 0);
  }

  return resultado;
}

/**
 * Qué le falta a un curso para activarlo. Cada punto lleva a la pestaña donde
 * se arregla. Lo del formulario se evalúa en vivo; lecciones, reglas y grupos
 * se consultan al abrir y cada vez que `recarga` cambia.
 */
export default function ChecklistPublicar({ courseId, form, activo, sucio, recarga, onIr, onIrGrupos, onActivar }) {
  const [estado, setEstado] = useState({ cargando: true, error: '', datos: null });
  // En pantallas angostas va arriba del contenido: arranca plegado para no
  // tapar el formulario (la barra de avance sigue a la vista).
  const [abierto, setAbierto] = useState(() => !activo && (typeof window === 'undefined' || window.innerWidth >= 1200));
  const [reintento, setReintento] = useState(0);
  const [activando, setActivando] = useState(false);

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true, error: '' }));
    cargarEstado(courseId)
      .then((datos) => { if (vigente) setEstado({ cargando: false, error: '', datos }); })
      .catch((err) => { if (vigente) setEstado({ cargando: false, error: err?.message || 'No se pudo revisar el curso.', datos: null }); });
    return () => { vigente = false; };
  }, [courseId, recarga, reintento]);

  const datos = estado.datos;
  const esPago = form.tipo === 'pago';
  const regla = datos?.regla || 'examen_final';
  const conContenido = (datos?.conContenido || 0) + (lleno(form.youtube_video_id) ? 1 : 0);
  const preguntas = (form.questions || []).length;

  const faltaInfo = [];
  if (!lleno(form.description)) faltaInfo.push('descripción');
  if (!lleno(form.image)) faltaInfo.push('portada');
  else if (esPago && esMiniaturaYoutube(form.image)) faltaInfo.push('portada propia (no la miniatura de YouTube)');

  const puntos = [
    {
      id: 'info',
      texto: 'Descripción y portada',
      ok: faltaInfo.length === 0,
      detalle: faltaInfo.length ? `Falta: ${faltaInfo.join(' y ')}.` : 'Así se ve en el catálogo.',
      ir: () => onIr('info'),
      esencial: true,
    },
    esPago && {
      id: 'precio',
      texto: 'Precio del curso',
      ok: Number(form.precio_mxn) > 0,
      detalle: Number(form.precio_mxn) > 0 ? null : 'Un curso de pago necesita precio.',
      ir: () => onIr('precio'),
      esencial: true,
    },
    {
      id: 'lecciones',
      texto: 'Al menos una lección con contenido',
      ok: conContenido > 0,
      detalle: datos?.lecciones == null
        ? (conContenido > 0 ? 'Tiene el video del curso.' : 'Agrega lecciones al curso.')
        : datos.lecciones === 0
          ? (conContenido > 0 ? 'Tiene el video del curso.' : 'Todavía no tiene lecciones.')
          : `${datos.conContenido} de ${datos.lecciones} ${datos.lecciones === 1 ? 'lección tiene' : 'lecciones tienen'} contenido${datos.verificado ? '' : ' (sin verificar)'}.`,
      ir: () => onIr('lecciones'),
      esencial: true,
    },
    regla === 'examen_final'
      ? {
        id: 'fin',
        texto: 'Cómo se termina: examen final con preguntas',
        ok: preguntas > 0,
        detalle: preguntas > 0
          ? `${preguntas} ${preguntas === 1 ? 'pregunta' : 'preguntas'}.`
          : 'La regla del curso pide aprobar un examen final y no tiene preguntas. Agrégalas o cambia la regla de finalización en Reglas.',
        ir: () => onIr('examen'),
        esencial: true,
      }
      : {
        id: 'fin',
        texto: 'Cómo se termina: regla por lecciones',
        ok: conContenido > 0,
        detalle: regla === 'porcentaje' ? 'Se termina al completar cierto porcentaje de lecciones.' : 'Se termina al completar las lecciones obligatorias.',
        ir: () => onIr('reglas'),
        esencial: true,
      },
    {
      id: 'certificado',
      texto: 'Plantilla de certificado',
      ok: lleno(form.certificado_template_url),
      detalle: lleno(form.certificado_template_url) ? null : 'Recomendado: sin plantilla no se genera el certificado del curso.',
      ir: () => onIr('certificado'),
      esencial: false,
    },
    datos?.modoAcceso === 'grupo' && {
      id: 'grupo',
      texto: 'Al menos un grupo con este curso',
      ok: (datos.grupos || 0) > 0,
      detalle: datos.grupos == null
        ? 'No se pudo revisar los grupos.'
        : datos.grupos > 0 ? `${datos.grupos} ${datos.grupos === 1 ? 'grupo' : 'grupos'}.` : 'El acceso es por grupo: sin un grupo nadie puede entrar.',
      ir: onIrGrupos,
      esencial: true,
    },
  ].filter(Boolean);

  const listos = puntos.filter((p) => p.ok).length;
  const esencialesListos = puntos.every((p) => p.ok || !p.esencial);
  const porcentaje = Math.round((listos / puntos.length) * 100);

  const activar = async () => {
    setActivando(true);
    try { await onActivar(); } finally { setActivando(false); }
  };

  let motivoBloqueo = '';
  if (estado.cargando) motivoBloqueo = 'Revisando el curso…';
  else if (estado.error) motivoBloqueo = 'Reintenta la revisión del curso antes de activar.';
  else if (sucio) motivoBloqueo = 'Guarda los cambios antes de activar.';
  else if (!esencialesListos) motivoBloqueo = 'Completa los puntos marcados con ○ (los esenciales).';

  return (
    <section className={`cp-tarjeta${esencialesListos ? ' listo' : ''}`} aria-labelledby="cp-titulo">
      <button type="button" className="cp-cabecera" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        {abierto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span id="cp-titulo" className="cp-titulo">{activo ? 'Revisión del curso' : 'Revisión antes de publicar'}</span>
        <span className="cp-conteo">{esencialesListos ? (activo ? `${listos} de ${puntos.length}` : 'Listo para publicar') : `${listos} de ${puntos.length}`}</span>
      </button>
      <div className="cp-barra" aria-hidden="true"><span style={{ width: `${porcentaje}%` }} /></div>

      {abierto && (
        <div className="cp-cuerpo">
          {estado.error ? (
            <div className="cp-error" role="alert">
              <span>No se pudo revisar lecciones y reglas: {estado.error}</span>
              <button type="button" className="btn-crm-action outlined mini" onClick={() => setReintento((n) => n + 1)}>
                <RefreshCw size={13} /> Reintentar
              </button>
            </div>
          ) : null}
          <ul className="cp-lista">
            {puntos.map((p) => (
              <li key={p.id}>
                <button type="button" className={`cp-punto${p.ok ? ' ok' : ''}`} onClick={p.ir}>
                  {p.ok
                    ? <CheckCircle2 size={18} className="cp-icono ok" aria-label="Listo" />
                    : <Circle size={18} className="cp-icono" aria-label="Pendiente" />}
                  <span className="cp-texto">
                    <strong>{p.texto}{!p.esencial && <em className="cp-opcional"> · recomendado</em>}</strong>
                    {p.detalle && <small>{p.detalle}</small>}
                  </span>
                  <ChevronRight size={15} className="cp-ir" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>

          {activo ? (
            <p className="cp-pie ok">El curso está activo: los alumnos ya lo ven en el catálogo.</p>
          ) : (
            <div className="cp-pie">
              <button
                type="button"
                className="btn-crm-action solid cp-activar"
                onClick={activar}
                disabled={!!motivoBloqueo || activando}
              >
                <Rocket size={15} /> <span>{activando ? 'Activando…' : 'Activar curso'}</span>
              </button>
              {motivoBloqueo && <small>{motivoBloqueo}</small>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
