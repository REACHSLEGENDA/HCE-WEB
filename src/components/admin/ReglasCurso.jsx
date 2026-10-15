import React, { useEffect, useState } from 'react';
import { ChevronDown, DoorOpen, Eye, CalendarClock, Award, Loader2 } from 'lucide-react';
import { cargarReglasCurso, guardarReglasCurso, REGLAS_FINALIZACION, MODOS_ACCESO } from '../../lib/reglas';
import { traerTodo } from '../../lib/traerTodo';
import './AdminLms.css';

// Reglas de un curso: catálogo, cupo, solicitud, días de acceso, prerrequisitos
// y cuándo se da por terminado (y se emite el certificado). Se muestran en
// tarjetas plegables con un resumen arriba de lo que está configurado.

// Campos de cada tarjeta: para marcar la que tiene cambios.
const CAMPOS = {
  acceso: ['modo_acceso'],
  disponibilidad: ['oculto_catalogo', 'cupo', 'requiere_solicitud'],
  limites: ['dias_acceso', 'conservar_acceso', 'prerrequisitos'],
  finalizacion: ['regla_finalizacion', 'porcentaje_finalizacion'],
};

const TERMINA = {
  examen_final: 'Termina con examen final',
  lecciones: 'Termina al completar las lecciones',
};

// Entero mayor a cero o vacío (sin límite): el mismo criterio con que se guarda.
const errorEntero = (v) => (v === '' || v == null || (Number.isInteger(Number(v)) && Number(v) >= 1)
  ? ''
  : 'Debe ser un número entero mayor a cero, o déjalo vacío para no limitar.');

function TarjetaRegla({ id, icono, titulo, explicacion, resumen, abierta, modificada, onAlternar, children }) {
  const Icono = icono;
  return (
    <section className={`reglas-tarjeta${abierta ? ' abierta' : ''}`}>
      <h5 className="reglas-tarjeta-titulo">
        <button type="button" aria-expanded={abierta} aria-controls={`reglas-${id}`} onClick={onAlternar}>
          <span className="reglas-tarjeta-icono" aria-hidden="true"><Icono size={17} /></span>
          <span className="reglas-tarjeta-textos">
            <span className="reglas-tarjeta-nombre">
              {titulo}
              {modificada && <span className="reglas-modificada">Modificado</span>}
            </span>
            <span className="reglas-tarjeta-resumen">{resumen}</span>
          </span>
          <ChevronDown size={17} className="reglas-tarjeta-flecha" aria-hidden="true" />
        </button>
      </h5>
      {abierta && (
        <div id={`reglas-${id}`} className="reglas-tarjeta-cuerpo">
          <p className="reglas-explicacion">{explicacion}</p>
          {children}
        </div>
      )}
    </section>
  );
}

export default function ReglasCurso({ courseId, cursos, tipoCurso, notificar, confirmar, onCambios, onGuardado }) {
  const [reglas, setReglas] = useState(null);
  const [faltaMigracion, setFaltaMigracion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [original, setOriginal] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [reintento, setReintento] = useState(0);
  const [abiertas, setAbiertas] = useState(() => new Set());
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
  }, [courseId, notificar, reintento]);

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
      // Pasar a "por grupo" cierra el curso a quien está inscrito sin grupo.
      if (reglas.modo_acceso === 'grupo' && original?.modo_acceso !== 'grupo') {
        const idCurso = Number(courseId);
        const [inscripciones, grupoCursos, certificados] = await Promise.all([
          traerTodo('inscripciones', 'user_id, origen', (q) => q.eq('course_id', idCurso)),
          traerTodo('grupo_cursos', 'grupo_id, course_id', (q) => q.eq('course_id', idCurso)),
          traerTodo('certificates', 'user_id', (q) => q.eq('course_id', idCurso)),
        ]);
        const grupos = grupoCursos.map((g) => g.grupo_id);
        const miembros = grupos.length
          ? await traerTodo('grupo_miembros', 'grupo_id, user_id', (q) => q.in('grupo_id', grupos))
          : [];
        const conGrupo = new Set(miembros.map((m) => m.user_id));
        const terminaron = new Set(certificados.map((c) => c.user_id));
        const sinGrupo = inscripciones.filter((i) => i.origen !== 'admin' && !conGrupo.has(i.user_id) && !terminaron.has(i.user_id)).length;
        if (sinGrupo) {
          const mensaje = `${sinGrupo} alumno(s) inscritos no están en un grupo con este curso: dejarán de verlo hasta que los asignes a uno. ¿Cambiar a acceso por grupo?`;
          const ok = confirmar ? await confirmar(mensaje, 'Acceso por grupo') : window.confirm(mensaje);
          if (!ok) return;
        }
      }
      await guardarReglasCurso(courseId, reglas);
      onGuardado?.();
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

  const alternar = (id) => setAbiertas((a) => {
    const n = new Set(a);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  if (faltaMigracion) {
    return <div className="lms-aviso">Para las reglas del curso corre en Supabase la migración <code>lms-reglas.sql</code>.</div>;
  }
  if (errorCarga) return <div className="lms-aviso lms-aviso--error" role="alert">No se pudieron cargar las reglas: {errorCarga} <button type="button" className="btn-crm-action outlined mini" onClick={() => { setErrorCarga(''); setReintento((n) => n + 1); }}>Reintentar</button></div>;
  if (!reglas) return <p className="lms-cargando">Cargando reglas…</p>;

  // Un prerrequisito ya guardado sigue visible aunque su curso esté inactivo,
  // para que el admin pueda verlo y quitarlo.
  const actuales = (reglas.prerrequisitos || []).map(Number);
  const otros = cursos.filter((c) => (c.activo !== false || actuales.includes(Number(c.id)))
    && Number(c.id) !== Number(courseId) && !isNaN(Number(c.id)));

  const modificada = (id) => original != null && CAMPOS[id].some((k) => JSON.stringify(reglas[k]) !== JSON.stringify(original[k]));
  const porGrupo = reglas.modo_acceso === 'grupo';
  const conSolicitud = tipoCurso !== 'pago' && reglas.requiere_solicitud;
  const conCupo = reglas.cupo !== '' && reglas.cupo != null;
  const conDias = reglas.dias_acceso !== '' && reglas.dias_acceso != null;
  const numPrerrequisitos = actuales.length;
  const textoPrerrequisitos = `${numPrerrequisitos} ${numPrerrequisitos === 1 ? 'prerrequisito' : 'prerrequisitos'}`;
  const terminaEn = reglas.regla_finalizacion === 'porcentaje'
    ? `Termina al ${reglas.porcentaje_finalizacion || '?'}% de las lecciones`
    : TERMINA[reglas.regla_finalizacion] || REGLAS_FINALIZACION[reglas.regla_finalizacion] || '';
  const resumenes = {
    acceso: porGrupo ? 'Acceso por grupo (generación)' : 'Acceso inmediato',
    disponibilidad: [
      reglas.oculto_catalogo ? 'Oculto del catálogo' : 'Visible en catálogo',
      conCupo ? `Cupo ${reglas.cupo}` : 'Sin cupo máximo',
      conSolicitud ? 'Con solicitud' : null,
    ].filter(Boolean).join(' · '),
    limites: [
      conDias ? `${reglas.dias_acceso} días de acceso` : 'Sin límite de días',
      numPrerrequisitos ? textoPrerrequisitos : 'Sin prerrequisitos',
    ].join(' · '),
    finalizacion: terminaEn,
  };
  const pastillas = [
    reglas.oculto_catalogo ? 'Oculto del catálogo' : 'Visible en catálogo',
    conCupo ? `Cupo ${reglas.cupo}` : null,
    porGrupo ? 'Acceso por grupo' : 'Acceso inmediato',
    conSolicitud ? 'Con solicitud' : null,
    conDias ? `${reglas.dias_acceso} días de acceso` : null,
    numPrerrequisitos ? textoPrerrequisitos : null,
    terminaEn,
  ].filter(Boolean);

  const errorCupo = errorEntero(reglas.cupo);
  const errorDias = errorEntero(reglas.dias_acceso);
  const pct = Number(reglas.porcentaje_finalizacion);
  const errorPorcentaje = reglas.regla_finalizacion === 'porcentaje' && !(Number.isInteger(pct) && pct >= 1 && pct <= 100)
    ? 'Pon un número entero entre 1 y 100.'
    : '';
  const hayErrores = !!(errorCupo || errorDias || errorPorcentaje);
  const abrirErrores = () => setAbiertas((prev) => {
    const s = new Set(prev);
    if (errorCupo) s.add('disponibilidad');
    if (errorDias) s.add('limites');
    if (errorPorcentaje) s.add('finalizacion');
    return s;
  });
  const todasAbiertas = Object.keys(CAMPOS).every((id) => abiertas.has(id));

  return (
    <div className="reglas">
      <div className="reglas-resumen">
        <ul className="reglas-pastillas" aria-label="Resumen de las reglas">
          {pastillas.map((p) => <li key={p}>{p}</li>)}
        </ul>
        <button type="button" className="btn-crm-action outlined mini" onClick={() => setAbiertas(todasAbiertas ? new Set() : new Set(Object.keys(CAMPOS)))}>
          {todasAbiertas ? 'Plegar todo' : 'Ver todo'}
        </button>
      </div>

      <TarjetaRegla
        id="acceso" icono={DoorOpen} titulo="Acceso al curso" resumen={resumenes.acceso}
        abierta={abiertas.has('acceso')} modificada={modificada('acceso')} onAlternar={() => alternar('acceso')}
        explicacion="Cuándo entra el alumno después de inscribirse o pagar."
      >
        <div className="reglas-modos" role="radiogroup" aria-label="Acceso al curso">
          {Object.entries(MODOS_ACCESO).map(([id, texto]) => (
            <label key={id} className={`reglas-modo${reglas.modo_acceso === id ? ' activo' : ''}`}>
              <input type="radio" name={`modo-${courseId}`} checked={reglas.modo_acceso === id} onChange={() => setReglas({ ...reglas, modo_acceso: id })} />
              <span>{texto}</span>
            </label>
          ))}
        </div>
        {porGrupo && (
          <small className="lms-ayuda">Asigna el curso a un grupo y su fecha de inicio en <strong>Grupos</strong>. Quien inscribas tú a mano entra directo.</small>
        )}
      </TarjetaRegla>

      <TarjetaRegla
        id="disponibilidad" icono={Eye} titulo="Disponibilidad" resumen={resumenes.disponibilidad}
        abierta={abiertas.has('disponibilidad')} modificada={modificada('disponibilidad')} onAlternar={() => alternar('disponibilidad')}
        explicacion="Quién lo ve en el catálogo y cuántos lugares hay."
      >
        <label className="lms-check">
          <input type="checkbox" checked={!reglas.oculto_catalogo} onChange={(e) => setReglas({ ...reglas, oculto_catalogo: !e.target.checked })} />
          Mostrar en el catálogo
        </label>
        <small className="lms-ayuda">Si lo ocultas, nadie puede inscribirse solo: solo entran quienes tú inscribas o sus grupos.</small>

        <label className="crm-input-group reglas-campo">
          <span>Cupo máximo de alumnos</span>
          <input type="number" min="1" inputMode="numeric" placeholder="Sin límite" value={reglas.cupo} aria-invalid={errorCupo ? true : undefined} onChange={(e) => setReglas({ ...reglas, cupo: e.target.value })} />
        </label>
        {errorCupo && <small className="lms-alerta reglas-error">{errorCupo}</small>}
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
      </TarjetaRegla>

      <TarjetaRegla
        id="limites" icono={CalendarClock} titulo="Límites" resumen={resumenes.limites}
        abierta={abiertas.has('limites')} modificada={modificada('limites')} onAlternar={() => alternar('limites')}
        explicacion="Por cuánto tiempo tiene acceso y qué cursos debe terminar antes."
      >
        <label className="crm-input-group reglas-campo">
          <span>{porGrupo ? 'Días de acceso desde que inicia su grupo' : 'Días de acceso después de inscribirse'}</span>
          <input type="number" min="1" inputMode="numeric" placeholder="Sin límite" value={reglas.dias_acceso} aria-invalid={errorDias ? true : undefined} onChange={(e) => setReglas({ ...reglas, dias_acceso: e.target.value })} />
        </label>
        {errorDias && <small className="lms-alerta reglas-error">{errorDias}</small>}
        {reglas.dias_acceso !== '' && (
          <label className="lms-check">
            <input type="checkbox" checked={reglas.conservar_acceso} onChange={(e) => setReglas({ ...reglas, conservar_acceso: e.target.checked })} />
            Quien ya terminó el curso conserva el acceso a los materiales
          </label>
        )}

        {otros.length > 0 ? (
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
        ) : (
          <small className="lms-ayuda">No hay otros cursos activos para ponerlos como prerrequisito.</small>
        )}
      </TarjetaRegla>

      <TarjetaRegla
        id="finalizacion" icono={Award} titulo="Finalización" resumen={resumenes.finalizacion}
        abierta={abiertas.has('finalizacion')} modificada={modificada('finalizacion')} onAlternar={() => alternar('finalizacion')}
        explicacion="Cuándo se da por terminado el curso y se emite el certificado."
      >
        <label className="crm-input-group reglas-campo reglas-campo--ancho">
          <span>El curso se da por terminado (y se emite el certificado)</span>
          <select value={reglas.regla_finalizacion} onChange={(e) => setReglas({ ...reglas, regla_finalizacion: e.target.value })}>
            {Object.entries(REGLAS_FINALIZACION).map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}
          </select>
        </label>
        {reglas.regla_finalizacion === 'porcentaje' && (
          <>
            <label className="crm-input-group reglas-campo">
              <span>Porcentaje de lecciones</span>
              <input type="number" min="1" max="100" inputMode="numeric" value={reglas.porcentaje_finalizacion} aria-invalid={errorPorcentaje ? true : undefined} onChange={(e) => setReglas({ ...reglas, porcentaje_finalizacion: e.target.value })} />
            </label>
            {errorPorcentaje && <small className="lms-alerta reglas-error">{errorPorcentaje}</small>}
          </>
        )}
        {reglas.regla_finalizacion !== 'examen_final' && (
          <small className="lms-ayuda">Los exámenes que pongas como lecciones obligatorias también cuentan: hay que aprobarlos para completar la lección.</small>
        )}
      </TarjetaRegla>

      <div className="reglas-acciones">
        {cambios && <span className="panel-lateral-cambios" role="status">Cambios sin guardar</span>}
        {hayErrores && <button type="button" className="lms-alerta reglas-error reglas-ver-errores" onClick={abrirErrores}>Corrige los campos marcados para guardar · Ver dónde</button>}
        <button type="button" className="btn-crm-action outlined" onClick={() => setReglas(original)} disabled={!cambios || guardando}>Descartar</button>
        <button type="button" className="btn-crm-action solid" onClick={guardar} disabled={guardando || hayErrores}>
          {guardando ? <><Loader2 size={14} className="lms-girando" /> Guardando…</> : 'Guardar reglas'}
        </button>
      </div>
    </div>
  );
}
