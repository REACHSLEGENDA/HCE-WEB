import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { cargarEvaluacionAdmin } from '../../lib/evaluaciones';
import {
  intentosAnalizados,
  analizarPreguntas,
  resumenEvaluacion,
  esRespuestaCorrecta,
  textoRespuesta,
} from '../../lib/analisisEvaluacion';

// Análisis de los exámenes y encuestas de un curso, pregunta por pregunta, con
// el mismo Excel que da TalentLMS (hoja "Visión general" con la distribución de
// respuestas y hoja "Detalles" con cada alumno).

const pct = (n) => (n == null ? '—' : `${Math.round(n)}%`);
const tiempo = (seg) => {
  if (seg == null) return '—';
  const m = Math.floor(seg / 60);
  return m ? `${m}m ${Math.round(seg % 60)}s` : `${Math.round(seg)}s`;
};

async function exportarExcel({ tituloCurso, leccion, preguntas, analisis, intentos, perfiles }) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  const esExamen = leccion.tipo === 'examen';

  // Hoja 1: distribución de respuestas, pregunta por pregunta.
  const general = libro.addWorksheet('Visión general');
  general.getColumn(1).width = 26;
  general.getColumn(2).width = 110;
  general.addRow([leccion.titulo]).font = { bold: true, size: 14 };
  general.addRow([tituloCurso]).font = { italic: true };
  general.addRow([]);
  general.addRow(['Distribución de respuestas', 'Preguntas']).font = { bold: true };
  for (const q of analisis) {
    general.addRow([]);
    const extra = q.calificable ? ` - ${q.correctas} veces contestado correctamente` : q.promedioEscala != null ? ` - promedio ${q.promedioEscala.toFixed(2)}` : '';
    general.addRow(['', `(Q${q.numero}) ${q.texto} (Fue contestado ${q.contestada} veces${extra})`]).font = { bold: true };
    if (q.tipo === 'abierta') {
      q.abiertas.forEach((a) => general.addRow(['', `${a.nombre}: ${a.texto}`]));
      continue;
    }
    q.opciones.forEach((o) => {
      const fila = general.addRow([o.porcentaje / 100, `${q.tipo === 'escala' ? `(${o.indice + 1}) ` : ''}${o.texto}`]);
      fila.getCell(1).numFmt = '0%';
      fila.getCell(1).alignment = { horizontal: 'center' };
      if (o.correcta) fila.getCell(2).font = { bold: true, italic: true };
    });
  }

  // Hoja 2: cada intento con cada respuesta.
  const detalles = libro.addWorksheet('Detalles', { views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }] });
  const nombre = new Map(perfiles.map((p) => [p.id, p]));
  const encabezados = ['Nombre', 'Correo electrónico', 'Fecha', 'Tiempo', ...(esExamen ? ['Puntuación', 'Estado'] : []), 'Intento', ...preguntas.map((_, i) => `Q${i + 1}`)];
  const cab = detalles.addRow(encabezados);
  cab.font = { bold: true };
  detalles.getColumn(1).width = 30;
  detalles.getColumn(2).width = 32;
  detalles.getColumn(3).width = 16;
  const inicioPreguntas = encabezados.length - preguntas.length + 1;
  preguntas.forEach((_, i) => { detalles.getColumn(inicioPreguntas + i).width = esExamen ? 12 : 26; });

  const ordenados = [...intentos].sort((a, b) =>
    (nombre.get(a.user_id)?.nombre_completo || '').localeCompare(nombre.get(b.user_id)?.nombre_completo || '', 'es') || a.numero - b.numero);
  for (const it of ordenados) {
    const perfil = nombre.get(it.user_id);
    const celdas = preguntas.map((p) => {
      const r = it.respuestas?.[p.id];
      if (esExamen && ['opcion', 'multiple'].includes(p.tipo) && (p.correctas || []).length) {
        const bien = esRespuestaCorrecta(p, r);
        return r == null ? '' : bien ? 'correcto' : 'incorrecta';
      }
      return textoRespuesta(p, r);
    });
    const fila = detalles.addRow([
      perfil?.nombre_completo || 'Alumno',
      perfil?.email || '',
      new Date(it.enviado_en).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
      tiempo(it.duracion_seg),
      ...(esExamen ? [it.calificacion != null ? Number(it.calificacion) / 100 : '', it.aprobado ? 'Aprobado' : 'No aprobado'] : []),
      it.numero,
      ...celdas,
    ]);
    if (esExamen) fila.getCell(5).numFmt = '0.00%';
    celdas.forEach((v, i) => {
      if (v !== 'correcto' && v !== 'incorrecta') return;
      const celda = fila.getCell(inicioPreguntas + i);
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: v === 'correcto' ? 'FF6AA84F' : 'FFCC0000' } };
      celda.font = { color: { argb: 'FFFFFFFF' } };
      celda.alignment = { horizontal: 'center' };
    });
  }

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${esExamen ? 'Test' : 'Encuesta'}_${leccion.titulo.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 50)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AnalisisEvaluaciones({ tituloCurso, lecciones, intentos, perfiles, inscritos }) {
  const evaluaciones = useMemo(
    () => lecciones.filter((l) => l.tipo === 'examen' || l.tipo === 'encuesta').sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    [lecciones]
  );
  const [elegidaId, setElegidaId] = useState(null);
  const [modo, setModo] = useState('ultimo');
  const [preguntas, setPreguntas] = useState(null);
  const [abiertas, setAbiertas] = useState({});
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  const leccion = evaluaciones.find((l) => l.id === elegidaId) || evaluaciones[0] || null;
  const esExamen = leccion?.tipo === 'examen';

  useEffect(() => {
    if (!leccion) return undefined;
    let vigente = true;
    cargarEvaluacionAdmin(leccion.id)
      .then((r) => { if (vigente) { setPreguntas(r?.preguntas || []); setError(null); } })
      .catch((err) => { if (vigente) setError(err.message); });
    return () => { vigente = false; };
  }, [leccion]);

  const deLeccion = useMemo(() => (leccion ? intentos.filter((i) => i.leccion_id === leccion.id) : []), [intentos, leccion]);
  const analizados = useMemo(() => intentosAnalizados(deLeccion, modo), [deLeccion, modo]);
  const analisis = useMemo(
    () => (preguntas ? analizarPreguntas({ preguntas, intentos: analizados, perfiles }) : []),
    [preguntas, analizados, perfiles]
  );
  const resumen = useMemo(
    () => resumenEvaluacion({ intentosTodos: deLeccion, analizados, inscritos, esExamen }),
    [deLeccion, analizados, inscritos, esExamen]
  );

  if (!evaluaciones.length) {
    return <p className="m-sin-datos">Este curso no tiene exámenes ni encuestas de lección.</p>;
  }

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarExcel({ tituloCurso, leccion, preguntas, analisis, intentos: modo === 'ultimo' ? analizados : deLeccion, perfiles });
    } catch (err) {
      setError(`No se pudo generar el Excel: ${err.message}`);
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="m-analisis">
      <div className="m-tabla-acciones m-analisis-barra">
        <select className="m-select" value={leccion.id} onChange={(e) => { setElegidaId(Number(e.target.value)); setPreguntas(null); setAbiertas({}); }} aria-label="Evaluación">
          {evaluaciones.map((l) => <option key={l.id} value={l.id}>{l.tipo === 'examen' ? 'Examen' : 'Encuesta'} · {l.titulo}</option>)}
        </select>
        <select className="m-select" value={modo} onChange={(e) => setModo(e.target.value)} aria-label="Intentos">
          <option value="ultimo">Último intento de cada alumno</option>
          <option value="todos">Todos los intentos</option>
        </select>
        <button type="button" className="m-boton" onClick={exportar} disabled={exportando || !preguntas || !deLeccion.length}>
          <Download size={15} /> {exportando ? 'Generando…' : 'Exportar en Excel'}
        </button>
      </div>

      <dl className="m-analisis-resumen">
        <div><dt>{esExamen ? 'Aprobaron' : 'Respondieron'}</dt><dd>{esExamen ? resumen.aprobaron : resumen.presentaron}</dd></div>
        {esExamen && <div><dt>No aprobados</dt><dd>{resumen.noAprobados}</dd></div>}
        <div><dt>No presentado</dt><dd>{resumen.noPresentaron}</dd></div>
        <div><dt>Tasa de finalización</dt><dd>{pct(resumen.tasaFinalizacion)}</dd></div>
        {esExamen && <div><dt>Puntuación media</dt><dd>{pct(resumen.promedio)}</dd></div>}
        <div><dt>Tiempo promedio</dt><dd>{tiempo(resumen.tiempoPromedioSeg)}</dd></div>
      </dl>

      {error && <p className="m-error">{error}</p>}
      {!preguntas && !error && <p className="m-cargando">Cargando preguntas…</p>}
      {preguntas && !deLeccion.length && <p className="m-sin-datos">Nadie lo ha presentado todavía.</p>}

      {preguntas && deLeccion.length > 0 && (
        <ol className="m-analisis-preguntas">
          {analisis.map((q) => (
            <li key={q.id} className="m-analisis-pregunta">
              <h4><span>{q.numero}</span> {q.texto}</h4>
              <p className="m-analisis-sub">
                {q.calificable
                  ? `${pct(q.porcentajeCorrectas)} contestaron correctamente · ${q.correctas} de las ${q.contestada} respuestas`
                  : q.promedioEscala != null
                    ? `Promedio ${q.promedioEscala.toFixed(1)} de ${q.opciones.length} · ${q.contestada} respuestas`
                    : `${q.contestada} ${q.contestada === 1 ? 'respuesta' : 'respuestas'}`}
              </p>

              {q.tipo === 'abierta' ? (
                <>
                  <button type="button" className="m-orden m-analisis-ver" onClick={() => setAbiertas((a) => ({ ...a, [q.id]: !a[q.id] }))} aria-expanded={!!abiertas[q.id]}>
                    {abiertas[q.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Ver respuestas
                  </button>
                  {abiertas[q.id] && (
                    <ul className="m-analisis-abiertas">
                      {q.abiertas.map((a, i) => (
                        <li key={`${a.userId}-${i}`}><strong>{a.nombre}</strong><p>{a.texto}</p></li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <ul className="m-analisis-opciones">
                  {q.opciones.map((o) => (
                    <li key={o.indice} className={o.correcta ? 'correcta' : ''}>
                      <span className="m-analisis-opcion-texto">
                        {o.correcta ? <Check size={13} aria-label="Correcta" /> : null}
                        {q.tipo === 'escala' ? `${o.indice + 1}. ` : ''}{o.texto}
                      </span>
                      <span className="m-barras-pista"><span className="m-barras-relleno" style={{ width: `${o.porcentaje}%` }} /></span>
                      <span className="m-analisis-valor">{Math.round(o.porcentaje)}% · {o.veces}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
