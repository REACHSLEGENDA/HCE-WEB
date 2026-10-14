import React, { useEffect, useState } from 'react';
import { UserCheck, ClipboardList, Inbox, Video, FilePen, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { esTablaFaltante } from '../../lib/cursos';

const DIAS_SESIONES = 7;

const formatoSesion = (fecha) => {
  const texto = new Date(fecha).toLocaleString('es-MX', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// Sesiones en vivo de los próximos días con su lección y curso.
async function cargarSesiones() {
  const ahora = new Date();
  const hasta = new Date(ahora.getTime() + DIAS_SESIONES * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from('sesiones_clase')
    .select('leccion_id, inicia_en')
    .gte('inicia_en', ahora.toISOString())
    .lte('inicia_en', hasta.toISOString())
    .order('inicia_en', { ascending: true });
  if (error) {
    if (esTablaFaltante(error)) return [];
    throw error;
  }
  const ids = (data || []).map((s) => s.leccion_id);
  if (!ids.length) return [];
  const { data: lecciones, error: errorLecciones } = await supabase
    .from('curso_lecciones')
    .select('id, titulo, course_id')
    .in('id', ids);
  if (errorLecciones) throw errorLecciones;
  const porId = new Map((lecciones || []).map((l) => [l.id, l]));
  return (data || []).map((s) => ({ ...s, leccion: porId.get(s.leccion_id) || null }));
}

/**
 * Lo que hay que atender hoy en el panel. Cada tarjeta lleva a su pestaña.
 * Los conteos llegan del panel (`null` = no se pudo saber, no se muestra);
 * las sesiones en vivo se consultan aquí.
 */
export default function PendientesHoy({ cargando = false, cuentas, solicitudes, tareas, borradores, cursos = [], onIr, onAbrirCurso }) {
  const [sesiones, setSesiones] = useState({ cargando: true, error: '', lista: [] });
  const [reintento, setReintento] = useState(0);

  useEffect(() => {
    let vigente = true;
    cargarSesiones()
      .then((lista) => { if (vigente) setSesiones({ cargando: false, error: '', lista }); })
      .catch((err) => { if (vigente) setSesiones({ cargando: false, error: err?.message || 'Error al consultar', lista: [] }); });
    return () => { vigente = false; };
  }, [reintento]);

  const tituloCurso = (id) => cursos.find((c) => Number(c.id) === Number(id))?.title || 'Curso';
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
  const sinVerificar = [cuentas, solicitudes, tareas, borradores].some(n => n == null) || !!sesiones.error;

  const tarjetas = [
    cuentas > 0 && {
      id: 'cuentas', icono: UserCheck, tono: 'naranja', numero: cuentas,
      titulo: plural(cuentas, 'cuenta por activar', 'cuentas por activar'),
      texto: 'Alumnos registrados que esperan acceso a sus cursos.',
      accion: 'Revisar cuentas', ir: () => onIr('students'),
    },
    solicitudes > 0 && {
      id: 'solicitudes', icono: Inbox, tono: 'azul', numero: solicitudes,
      titulo: plural(solicitudes, 'solicitud de inscripción', 'solicitudes de inscripción'),
      texto: 'Cursos que requieren tu aprobación para entrar.',
      accion: 'Ver solicitudes', ir: () => onIr('students'),
    },
    tareas > 0 && {
      id: 'tareas', icono: ClipboardList, tono: 'morado', numero: tareas,
      titulo: plural(tareas, 'tarea por revisar', 'tareas por revisar'),
      texto: 'Entregas de alumnos esperando calificación.',
      accion: 'Revisar tareas', ir: () => onIr('tareas'),
    },
    sesiones.lista.length > 0 && {
      id: 'sesiones', icono: Video, tono: 'cian', numero: sesiones.lista.length,
      titulo: plural(sesiones.lista.length, 'sesión en vivo esta semana', 'sesiones en vivo esta semana'),
      texto: null,
      lista: sesiones.lista.slice(0, 3),
      accion: null,
    },
    borradores > 0 && {
      id: 'borradores', icono: FilePen, tono: 'gris', numero: borradores,
      titulo: plural(borradores, 'curso en borrador', 'cursos en borrador'),
      texto: 'Aún no los ven los alumnos. Revisa qué les falta para publicarlos.',
      accion: 'Ver borradores', ir: () => onIr('courses', { filtro: 'borradores' }),
    },
  ].filter(Boolean);

  return (
    <section className="ph-seccion" aria-labelledby="ph-titulo">
      <div className="ph-encabezado">
        <h3 id="ph-titulo">Pendientes de hoy</h3>
        {sesiones.error && (
          <span className="ph-aviso" role="status">
            No se pudieron revisar las sesiones en vivo.
            <button type="button" className="ph-reintentar" onClick={() => { setSesiones((s) => ({ ...s, error: '' })); setReintento((n) => n + 1); }}>
              <RefreshCw size={12} /> Reintentar
            </button>
          </span>
        )}
      </div>

      {tarjetas.length === 0 ? (
        <div className="ph-al-dia">
          <CheckCircle2 size={22} />
          <div>
            <strong>{cargando || sesiones.cargando ? 'Un momento…' : sinVerificar ? 'Revisión incompleta' : 'Todo al día'}</strong>
            <span>{cargando || sesiones.cargando ? 'Revisando pendientes…' : sinVerificar ? 'Algunos pendientes no se pudieron consultar. Revisa sus secciones.' : 'No hay cuentas, solicitudes ni tareas pendientes.'}</span>
          </div>
        </div>
      ) : (
        <div className="ph-grid">
          {tarjetas.map((t) => {
            const Icono = t.icono;
            return (
              <article key={t.id} className={`ph-tarjeta ${t.tono}`}>
                <div className="ph-cabeza">
                  <span className="ph-icono"><Icono size={18} /></span>
                  <span className="ph-numero">{t.numero}</span>
                </div>
                <h4>{t.titulo}</h4>
                {t.texto && <p>{t.texto}</p>}
                {t.lista && (
                  <ul className="ph-sesiones">
                    {t.lista.map((s) => (
                      <li key={s.leccion_id}>
                        <button
                          type="button"
                          onClick={() => s.leccion && onAbrirCurso(s.leccion.course_id, 'lecciones')}
                          disabled={!s.leccion}
                        >
                          <span className="ph-fecha">{formatoSesion(s.inicia_en)}</span>
                          <span className="ph-sesion-titulo">{s.leccion?.titulo || 'Sesión'}</span>
                          <span className="ph-sesion-curso">{s.leccion ? tituloCurso(s.leccion.course_id) : ''}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {t.accion && (
                  <button type="button" className="ph-accion" onClick={t.ir}>
                    {t.accion} <ChevronRight size={15} />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
