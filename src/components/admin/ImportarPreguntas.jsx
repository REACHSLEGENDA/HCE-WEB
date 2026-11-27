import React, { useId, useState } from 'react';
import { Check, Download, FileSpreadsheet, Loader2, TriangleAlert, Upload } from 'lucide-react';
import PanelLateral from './PanelLateral';
import { descargarPlantilla, esEjemploPlantilla, leerArchivoPreguntas } from '../../lib/importarPreguntas';
import './AdminLms.css';
import './ImportarPreguntas.css';

// Panel para traer preguntas de un Excel o CSV (la plantilla HCE o lo que se
// exporta de TalentLMS) con vista previa antes de guardarlas.
// Props: esExamen (en encuestas no hay correctas ni emparejar),
// onImportar(preguntas) async, onCerrar().

const ETIQUETAS = {
  examen: { opcion: 'Una correcta', multiple: 'Varias correctas', abierta: 'Abierta', emparejar: 'Emparejar' },
  encuesta: { opcion: 'Una respuesta', multiple: 'Varias respuestas', abierta: 'Abierta', emparejar: 'Emparejar' },
};

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

export default function ImportarPreguntas({ esExamen = true, onImportar, onCerrar }) {
  const idArchivo = useId();
  const [nombreArchivo, setNombreArchivo] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [seleccion, setSeleccion] = useState(() => new Set());
  const [arrastrando, setArrastrando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState('');
  const [importadas, setImportadas] = useState(0);
  const [bajandoPlantilla, setBajandoPlantilla] = useState(false);
  const [errorPlantilla, setErrorPlantilla] = useState('');

  const etiquetas = esExamen ? ETIQUETAS.examen : ETIQUETAS.encuesta;
  const preguntas = resultado?.preguntas || [];
  const avisos = resultado?.avisos || [];
  const elegidas = preguntas.filter((_, i) => seleccion.has(i));

  const leer = async (archivo) => {
    if (!archivo || leyendo || importando) return;
    setNombreArchivo(archivo.name || 'archivo');
    setLeyendo(true);
    setError('');
    setImportadas(0);
    setResultado(null);
    const r = await leerArchivoPreguntas(archivo, { esExamen });
    const marcadas = new Set();
    let ejemplos = 0;
    r.preguntas.forEach((p, i) => { if (esEjemploPlantilla(p)) ejemplos += 1; else marcadas.add(i); });
    const avisosFinales = ejemplos
      ? [...r.avisos, `${ejemplos === 1 ? 'La pregunta de ejemplo de la plantilla quedó' : `Las ${ejemplos} preguntas de ejemplo de la plantilla quedaron`} sin seleccionar.`]
      : r.avisos;
    setResultado({ preguntas: r.preguntas, avisos: avisosFinales });
    setSeleccion(marcadas);
    setLeyendo(false);
  };

  const alElegir = (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    void leer(archivo);
  };

  const alSoltar = (e) => {
    e.preventDefault();
    setArrastrando(false);
    void leer(e.dataTransfer?.files?.[0]);
  };

  const bajarPlantilla = async () => {
    setBajandoPlantilla(true);
    setErrorPlantilla('');
    try {
      await descargarPlantilla();
    } catch {
      setErrorPlantilla('No se pudo descargar la plantilla. Intenta de nuevo.');
    } finally {
      setBajandoPlantilla(false);
    }
  };

  const alternar = (i) => {
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (nueva.has(i)) nueva.delete(i); else nueva.add(i);
      return nueva;
    });
  };

  const todas = preguntas.length > 0 && seleccion.size === preguntas.length;
  const alternarTodas = () => setSeleccion(todas ? new Set() : new Set(preguntas.map((_, i) => i)));

  const importar = async () => {
    if (!elegidas.length || importando) return;
    setImportando(true);
    setError('');
    try {
      await onImportar(elegidas);
      setImportadas(elegidas.length);
      setResultado(null);
      setSeleccion(new Set());
      setNombreArchivo('');
    } catch (e) {
      setError(e?.message || 'Intenta de nuevo.');
    } finally {
      setImportando(false);
    }
  };

  const pie = importadas ? (
    <button type="button" className="btn-crm-action solid" onClick={onCerrar}>Cerrar</button>
  ) : (
    <>
      <button type="button" className="btn-crm-action outlined" disabled={importando} onClick={onCerrar}>Cancelar</button>
      <button type="button" className="btn-crm-action solid" disabled={!elegidas.length || importando || leyendo} onClick={importar}>
        {importando
          ? <><Loader2 size={14} className="imp-girando" /> Importando…</>
          : `Importar ${plural(elegidas.length, 'pregunta', 'preguntas')}`}
      </button>
    </>
  );

  return (
    <PanelLateral
      titulo="Importar preguntas"
      subtitulo={esExamen ? 'Examen' : 'Encuesta'}
      onCerrar={onCerrar}
      ocupado={importando}
      ancho={640}
      pie={pie}
    >
      <div className="imp">
        <p className="imp-explica">
          Sube tu archivo de Excel (.xlsx) o CSV con las preguntas; también sirve el que exportas de TalentLMS.
          Antes de importar verás cómo quedó cada pregunta y podrás quitar las que no quieras.
        </p>
        <div className="imp-plantilla">
          <button type="button" className="imp-enlace" disabled={bajandoPlantilla} onClick={bajarPlantilla}>
            {bajandoPlantilla ? <Loader2 size={15} className="imp-girando" /> : <Download size={15} />}
            Descargar plantilla
          </button>
          <span>Trae ejemplos de cada tipo e instrucciones para llenarla.</span>
        </div>
        {errorPlantilla && <p className="imp-error" role="alert">{errorPlantilla}</p>}

        <input
          id={idArchivo}
          className="imp-input"
          type="file"
          accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          disabled={leyendo || importando}
          onChange={alElegir}
        />

        {importadas > 0 && (
          <div className="imp-listo" role="status">
            <Check size={18} />
            <div>
              <strong>Listo: se {importadas === 1 ? 'importó 1 pregunta' : `importaron ${importadas} preguntas`}.</strong>
              <p>Ya puedes revisarlas y editarlas en la lista. Si quieres traer más, elige otro archivo.</p>
            </div>
          </div>
        )}

        {!resultado && (
          <label
            htmlFor={idArchivo}
            className={`imp-zona${arrastrando ? ' imp-zona--encima' : ''}${leyendo ? ' imp-zona--leyendo' : ''}`}
            onDragOver={(e) => { e.preventDefault(); if (!arrastrando) setArrastrando(true); }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={alSoltar}
          >
            {leyendo ? (
              <>
                <Loader2 size={28} className="imp-girando" />
                <strong>Leyendo {nombreArchivo}…</strong>
              </>
            ) : (
              <>
                <Upload size={28} />
                <strong>Toca para elegir el archivo</strong>
                <span>o arrástralo aquí. Excel (.xlsx) o CSV.</span>
              </>
            )}
          </label>
        )}

        {resultado && (
          <>
            <div className="imp-archivo">
              <FileSpreadsheet size={18} />
              <span className="imp-archivo-nombre">{nombreArchivo}</span>
              <label htmlFor={idArchivo} className="btn-crm-action outlined mini imp-archivo-otro">Elegir otro archivo</label>
            </div>

            {avisos.length > 0 && (
              <div className="imp-avisos" role="status">
                <p className="imp-avisos-titulo"><TriangleAlert size={16} /> Revisa {avisos.length === 1 ? 'este aviso' : `estos ${avisos.length} avisos`}</p>
                <ul>
                  {avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {preguntas.length === 0 ? (
              <p className="imp-vacio">No se encontró ninguna pregunta para importar en este archivo.</p>
            ) : (
              <>
                <div className="imp-barra">
                  <label className="imp-todas">
                    <input type="checkbox" checked={todas} onChange={alternarTodas} />
                    Seleccionar todas
                  </label>
                  <span className="imp-cuenta">{elegidas.length} de {plural(preguntas.length, 'pregunta', 'preguntas')}</span>
                </div>
                <ol className="imp-lista">
                  {preguntas.map((p, i) => {
                    const incluida = seleccion.has(i);
                    const sinClave = esExamen && ['opcion', 'multiple'].includes(p.tipo) && !p.correctas.length;
                    return (
                      <li key={i} className={`imp-pregunta${incluida ? '' : ' imp-pregunta--fuera'}`}>
                        <label className="imp-pregunta-cabeza">
                          <input type="checkbox" checked={incluida} onChange={() => alternar(i)} aria-label={`Incluir la pregunta ${i + 1}`} />
                          <span className="imp-num">{i + 1}.</span>
                          <span className="imp-texto">{p.texto}</span>
                        </label>
                        <div className="imp-etiquetas">
                          <span className="imp-tipo">{etiquetas[p.tipo] || p.tipo}</span>
                          {sinClave && <span className="imp-sin-clave">Sin respuesta correcta</span>}
                        </div>
                        {p.tipo === 'abierta' && <p className="imp-nota">El alumno escribe su respuesta.</p>}
                        {p.tipo === 'emparejar' && (
                          <ul className="imp-pares">
                            {(p.pares || []).map((par, j) => (
                              <li key={j}>
                                <span>{par.izquierda}</span>
                                <span className="imp-flecha" aria-hidden="true">→</span>
                                <span>{par.derecha}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {['opcion', 'multiple'].includes(p.tipo) && (
                          <ul className="imp-opciones">
                            {p.opciones.map((o, j) => {
                              const correcta = esExamen && p.correctas.includes(j);
                              return (
                                <li key={j} className={correcta ? 'imp-opcion--correcta' : undefined}>
                                  <span className="imp-letra">{LETRAS[j] || j + 1}.</span>
                                  <span className="imp-opcion-texto">{o}</span>
                                  {correcta && <span className="imp-marca"><Check size={13} /> Correcta</span>}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </>
        )}

        {error && (
          <p className="imp-error" role="alert">No se pudieron importar las preguntas: {error}</p>
        )}
      </div>
    </PanelLateral>
  );
}
