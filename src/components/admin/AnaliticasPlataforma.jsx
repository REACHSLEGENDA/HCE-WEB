import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { traerTodo } from '../../lib/traerTodo';
import { analiticasPlataforma } from '../../lib/informes';
import { duracionTexto } from '../../lib/reporteAlumno';
import './Informes.css';

// Analíticas de toda la plataforma (como "Analíticas" de TalentLMS).

const pct = (n) => (n == null ? '—' : `${n.toFixed(n < 10 && n % 1 ? 2 : 1).replace(/\.0$/, '')}%`);

function BarraEstados({ partes, total }) {
  return (
    <div className="inf-estados">
      <div className="inf-estados-barra" role="img" aria-label={partes.map((p) => `${p.nombre}: ${Math.round(p.valor)}%`).join(', ')}>
        {partes.filter((p) => p.valor > 0).map((p) => (
          <span key={p.clave} className={`inf-seg ${p.clave}`} style={{ width: `${p.valor}%` }} title={`${p.nombre}: ${Math.round(p.valor)}%`} />
        ))}
      </div>
      <ul className="inf-leyenda">
        {partes.map((p) => (
          <li key={p.clave}><span className={`inf-punto ${p.clave}`} /> {p.nombre} <strong>{pct(p.valor)}</strong>{p.cuenta != null ? <small> ({p.cuenta})</small> : null}</li>
        ))}
      </ul>
      {total != null && <small className="inf-total">{total} en total</small>}
    </div>
  );
}

export default function AnaliticasPlataforma({ perfiles, cursos }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let vigente = true;
    Promise.all([
      traerTodo('inscripciones', 'user_id, course_id, created_at'),
      traerTodo('certificates', 'id, user_id, course_id, score, created_at, vigente_hasta').catch(() => traerTodo('certificates', 'id, user_id, course_id, score, created_at')),
      traerTodo('curso_lecciones', 'id, course_id, tipo'),
      traerTodo('leccion_progreso', 'user_id, course_id, porcentaje, completada', (q) => q, { orden: null }),
      traerTodo('curso_sesiones', 'user_id, course_id, iniciada_en, segundos_activos'),
      traerTodo('actividad_portal', 'user_id, creado_en', (q) => q.eq('tipo', 'login').gte('creado_en', new Date(Date.now() - 30 * 86400000).toISOString())),
      traerTodo('curso_archivos', 'id'),
    ])
      .then(([inscripciones, certificados, lecciones, progreso, visitas, logins, archivos]) => {
        if (vigente) setDatos({ inscripciones, certificados, lecciones, progreso, visitas, logins, archivos });
      })
      .catch((err) => { if (vigente) setError(err.message); });
    return () => { vigente = false; };
  }, [recarga]);

  const a = useMemo(
    () => (datos ? analiticasPlataforma({ perfiles, cursos: cursos.filter((c) => !isNaN(Number(c.id))), ...datos }) : null),
    [datos, perfiles, cursos]
  );

  if (error) return <p className="m-error">No se pudieron cargar las analíticas: {error}</p>;
  if (!a) return <p className="m-cargando">Cargando analíticas…</p>;

  return (
    <div className="inf">
      <div className="inf-acciones">
        <button type="button" className="m-boton" onClick={() => { setDatos(null); setRecarga((n) => n + 1); }}><RefreshCw size={15} /> Actualizar</button>
      </div>

      <div className="inf-rejilla">
        <section className="inf-tarjeta">
          <h3>Estado de progreso de los cursos</h3>
          <BarraEstados
            total={a.progreso.total}
            partes={[
              { clave: 'completado', nombre: 'Completado', valor: a.progreso.completado, cuenta: a.progreso.cuentas.completado },
              { clave: 'en_curso', nombre: 'En curso', valor: a.progreso.en_curso, cuenta: a.progreso.cuentas.en_curso },
              { clave: 'no_empezado', nombre: 'No empezado', valor: a.progreso.no_empezado, cuenta: a.progreso.cuentas.no_empezado },
            ]}
          />
        </section>

        <section className="inf-tarjeta">
          <h3>Vista general de cursos</h3>
          <dl className="inf-cifras">
            <div><dd>{a.cursos.total}</dd><dt>Cursos</dt></div>
            <div><dd>{a.cursos.puntuacionMedia != null ? a.cursos.puntuacionMedia.toFixed(2) : '—'}</dd><dt>Puntuación media</dt></div>
            <div><dd>{duracionTexto(a.cursos.tiempoFinalizacionSeg)}</dd><dt>Tiempo promedio de finalización</dt></div>
            <div><dd>{pct(a.cursos.tasaFinalizacion)}</dd><dt>Tasa de finalización</dt></div>
            <div><dd>{a.cursos.actividades}</dd><dt>Actividades de aprendizaje</dt></div>
          </dl>
        </section>

        <section className="inf-tarjeta">
          <h3>Análisis <small>últimos 30 días</small></h3>
          <ul className="inf-lista">
            <li><span>Inicios de sesión</span><strong>{pct(a.analisis.iniciosSesion)}</strong></li>
            <li><span>Inscripciones</span><strong>{pct(a.analisis.inscripciones)}</strong></li>
            <li><span>Participación</span><strong>{pct(a.analisis.participacion)}</strong></li>
            <li><span>Tasa de finalización del progreso</span><strong>{pct(a.analisis.finalizacion)}</strong></li>
          </ul>
          <small className="inf-nota">Inicios de sesión: alumnos que entraron al portal. Participación: inscritos que estudiaron en el periodo.</small>
        </section>

        <section className="inf-tarjeta">
          <h3>Biblioteca <small>{a.biblioteca.total}</small></h3>
          <ul className="inf-lista">
            <li><span>Videos</span><strong>{a.biblioteca.videos}</strong></li>
            <li><span>Documentos</span><strong>{a.biblioteca.documentos}</strong></li>
            <li><span>Lecturas y páginas</span><strong>{a.biblioteca.lecturas}</strong></li>
            <li><span>Exámenes y encuestas</span><strong>{a.biblioteca.evaluaciones}</strong></li>
            <li><span>Sesiones en vivo</span><strong>{a.biblioteca.sesiones}</strong></li>
          </ul>
        </section>

        <section className="inf-tarjeta">
          <h3>Certificados <small>{a.certificados.total}</small></h3>
          <BarraEstados
            partes={[
              { clave: 'completado', nombre: 'Válido', valor: a.certificados.total ? (a.certificados.vigente / a.certificados.total) * 100 : 0, cuenta: a.certificados.vigente },
              { clave: 'en_curso', nombre: 'Caduca en 30 días', valor: a.certificados.total ? (a.certificados.por_vencer / a.certificados.total) * 100 : 0, cuenta: a.certificados.por_vencer },
              { clave: 'vencido', nombre: 'Caducado', valor: a.certificados.total ? (a.certificados.vencido / a.certificados.total) * 100 : 0, cuenta: a.certificados.vencido },
            ]}
          />
        </section>

        <section className="inf-tarjeta">
          <h3>Usuarios <small>{a.usuarios.total}</small></h3>
          <ul className="inf-lista">
            <li><span>Alumnos</span><strong>{a.usuarios.alumnos}</strong></li>
            <li><span>Administradores</span><strong>{a.usuarios.admins}</strong></li>
            <li><span>Estudiaron en los últimos 30 días</span><strong>{a.usuarios.activos30}</strong></li>
          </ul>
        </section>

        <section className="inf-tarjeta inf-tarjeta--ancha">
          <h3>Duración de la formación <small>{duracionTexto(a.formacion.reduce((t, c) => t + c.segundos, 0))}</small></h3>
          {a.formacion.length ? (
            <ul className="inf-formacion">
              {a.formacion.map((c) => (
                <li key={c.courseId}>
                  <span className="inf-formacion-curso">{c.titulo}</span>
                  <span className="inf-formacion-pista"><span style={{ width: `${(c.segundos / a.formacion[0].segundos) * 100}%` }} /></span>
                  <span className="inf-formacion-valor">{duracionTexto(c.segundos)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="m-sin-datos">Todavía no hay tiempo registrado.</p>}
        </section>
      </div>
    </div>
  );
}
