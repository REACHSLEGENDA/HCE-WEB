import React, { useEffect, useState } from 'react';
import { cargarReglasCurso, guardarReglasCurso, REGLAS_FINALIZACION } from '../../lib/reglas';
import { traerTodo } from '../../lib/traerTodo';
import './AdminLms.css';

// Reglas de un curso: catálogo, cupo, solicitud, días de acceso, prerrequisitos
// y cuándo se da por terminado (y se emite el certificado).

export default function ReglasCurso({ courseId, cursos, tipoCurso, notificar, confirmar, onCambios }) {
  const [reglas, setReglas] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [original, setOriginal] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const cambios = original != null && JSON.stringify(reglas) !== JSON.stringify(original);

  useEffect(() => {
    onCambios?.(cambios);
    const salir = (e) => { if (cambios) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', salir);
    return () => { onCambios?.(false); window.removeEventListener('beforeunload', salir); };
  }, [cambios, onCambios]);

  useEffect(() => {
    let vigente = true;
    cargarReglasCurso(courseId)
      .then((r) => {
        if (!vigente) return;
        if (r === null) setFaltaMigracion(true);
        else {
          const cargadas = { ...r, cupo: r.cupo ?? '', dias_acceso: r.dias_acceso ?? '' };
          setReglas(cargadas);
          setOriginal(cargadas);
        }
      })
      .catch((err) => { if (vigente) { setErrorCarga(err.message); notificar(`No se pudieron cargar las reglas: ${err.message}`, 'error'); } });
    return () => { vigente = false; };
  }, [courseId, notificar]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const dias = reglas.dias_acceso === '' ? null : Number(reglas.dias_acceso);
      const anteriores = original?.dias_acceso === '' ? null : Number(original?.dias_acceso);
      if (dias != null && (!anteriores || dias < anteriores || (original?.conservar_acceso && !reglas.conservar_acceso))) {
        const [inscripciones, certificados] = await Promise.all([
          traerTodo('inscripciones', 'user_id, created_at', (q) => q.eq('course_id', Number(courseId))),
          reglas.conservar_acceso ? traerTodo('certificates', 'user_id', (q) => q.eq('course_id', Number(courseId))) : Promise.resolve([]),
        ]);
        const conservan = new Set(certificados.map((c) => c.user_id));
        const afectados = inscripciones.filter((i) => !conservan.has(i.user_id) && new Date(i.created_at).getTime() + dias * 86400000 <= Date.now()).length;
        if (afectados) {
          const mensaje = `${afectados} alumno(s) inscritos quedarían sin acceso inmediato al guardar ${dias} días de acceso. ¿Guardar las reglas?`;
          const ok = confirmar ? await confirmar(mensaje, 'Cambiar días de acceso') : window.confirm(mensaje);
          if (!ok) return;
        }
      }
      await guardarReglasCurso(courseId, reglas);
      setOriginal({ ...reglas });
      notificar('Reglas del curso guardadas.', 'success');
    } catch (err) {
      notificar(`No se pudieron guardar: ${err.message}`, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const alternarPrerrequisito = (id) => {
    const lista = reglas.prerrequisitos || [];
    setReglas({ ...reglas, prerrequisitos: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] });
  };

  if (faltaMigracion) {
    return <div className="lms-aviso">Para las reglas del curso corre en Supabase la migración <code>lms-reglas.sql</code>.</div>;
  }
  if (errorCarga) return <p className="lms-aviso lms-aviso--error" role="alert">No se pudieron cargar las reglas: {errorCarga}</p>;
  if (!reglas) return <p className="lms-cargando">Cargando reglas…</p>;

  // Un prerrequisito ya guardado sigue visible aunque su curso esté inactivo,
  // para que el admin pueda verlo y quitarlo.
  const actuales = (reglas.prerrequisitos || []).map(Number);
  const otros = cursos.filter((c) => (c.activo !== false || actuales.includes(Number(c.id)))
    && Number(c.id) !== Number(courseId) && !isNaN(Number(c.id)));

  return (
    <div className="reglas">
      {cambios && <p className="lms-alerta" role="status">Cambios sin guardar</p>}
      <section className="reglas-grupo">
        <h5>Disponibilidad</h5>
        <label className="lms-check">
          <input type="checkbox" checked={!reglas.oculto_catalogo} onChange={(e) => setReglas({ ...reglas, oculto_catalogo: !e.target.checked })} />
          Mostrar en el catálogo
        </label>
        <small className="lms-ayuda">Si lo ocultas, nadie puede inscribirse solo: solo entran quienes tú inscribas o sus grupos.</small>

        <label className="crm-input-group reglas-campo">
          <span>Cupo máximo de alumnos</span>
          <input type="number" min="1" placeholder="Sin límite" value={reglas.cupo} onChange={(e) => setReglas({ ...reglas, cupo: e.target.value })} />
        </label>
        <small className="lms-ayuda">Al llenarse ya no se puede inscribir ni comprar. Tú sí puedes seguir inscribiendo a mano.</small>

        {tipoCurso !== 'pago' && (
          <>
            <label className="lms-check">
              <input type="checkbox" checked={reglas.requiere_solicitud} onChange={(e) => setReglas({ ...reglas, requiere_solicitud: e.target.checked })} />
              Solicitud de inscripción
            </label>
            <small className="lms-ayuda">El alumno pide entrar y tú apruebas o rechazas en Alumnos → Solicitudes de inscripción.</small>
          </>
        )}
      </section>

      <section className="reglas-grupo">
        <h5>Límites</h5>
        <label className="crm-input-group reglas-campo">
          <span>Días de acceso después de inscribirse</span>
          <input type="number" min="1" placeholder="Sin límite" value={reglas.dias_acceso} onChange={(e) => setReglas({ ...reglas, dias_acceso: e.target.value })} />
        </label>
        {reglas.dias_acceso !== '' && (
          <label className="lms-check">
            <input type="checkbox" checked={reglas.conservar_acceso} onChange={(e) => setReglas({ ...reglas, conservar_acceso: e.target.checked })} />
            Quien ya terminó el curso conserva el acceso a los materiales
          </label>
        )}

        {otros.length > 0 && (
          <div className="crm-input-group">
            <span className="reglas-etiqueta">Cursos que debe terminar antes (prerrequisitos)</span>
            <div className="reglas-lista">
              {otros.map((c) => (
                <label key={c.id} className="lms-check">
                  <input type="checkbox" checked={(reglas.prerrequisitos || []).map(Number).includes(Number(c.id))} onChange={() => alternarPrerrequisito(Number(c.id))} />
                  {c.title}{c.activo === false ? ' (inactivo)' : ''}
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="reglas-grupo">
        <h5>Finalización</h5>
        <label className="crm-input-group reglas-campo reglas-campo--ancho">
          <span>El curso se da por terminado (y se emite el certificado)</span>
          <select value={reglas.regla_finalizacion} onChange={(e) => setReglas({ ...reglas, regla_finalizacion: e.target.value })}>
            {Object.entries(REGLAS_FINALIZACION).map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
          </select>
        </label>
        {reglas.regla_finalizacion === 'porcentaje' && (
          <label className="crm-input-group reglas-campo">
            <span>Porcentaje de lecciones</span>
            <input type="number" min="1" max="100" value={reglas.porcentaje_finalizacion} onChange={(e) => setReglas({ ...reglas, porcentaje_finalizacion: e.target.value })} />
          </label>
        )}
        {reglas.regla_finalizacion !== 'examen_final' && (
          <small className="lms-ayuda">Los exámenes que pongas como lecciones obligatorias también cuentan: hay que aprobarlos para completar la lección.</small>
        )}
      </section>

      <div className="lms-editor-acciones">
        <button type="button" className="btn-crm-action solid" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar reglas'}</button>
      </div>
    </div>
  );
}
