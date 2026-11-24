// Reporte de inscritos por entrenamiento (Admin → Pagos y formularios →
// Reporte de inscritos). Junta pagos de Stripe, registros y solicitudes de
// factura; los cálculos viven en src/lib/inscritos.js. Se descarga en Excel
// con una hoja de resumen y una hoja por entrenamiento.
import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, FileSpreadsheet, RotateCcw, Search, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PROGRAMA, formatoDinero } from '../../lib/ventas';
import { filasInscritos, resumenPorEntrenamiento } from '../../lib/inscritos';
import './ReporteVentas.css';

const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
const si = (v) => (v ? 'Sí' : 'No');

async function descargarExcel(filas, resumen) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();

  const hojaResumen = libro.addWorksheet('Resumen');
  hojaResumen.addRow(['Reporte de inscritos por entrenamiento']).font = { bold: true, size: 13 };
  hojaResumen.addRow([`Generado el ${new Date().toLocaleString('es-MX')}`]);
  hojaResumen.addRow([]);
  hojaResumen.addRow(['Entrenamiento', 'Inscritos', 'Compraron simulador', 'Compraron Nursing', 'Con descuento', 'Pidieron factura', 'Ingresos MXN', 'Ingresos USD']).font = { bold: true };
  resumen.forEach((r) => hojaResumen.addRow([r.entrenamiento, r.inscritos, r.simulador, r.nursing, r.descuento, r.factura, r.MXN || 0, r.USD || 0]));
  hojaResumen.columns.forEach((c, i) => { c.width = i === 0 ? 26 : 18; if (i >= 6) c.numFmt = '#,##0.00'; });

  const encabezado = ['Fecha', 'Nombre', 'Correo', 'Teléfono', 'País', 'Institución', 'Especialidad', 'Perfil', 'Compró simulador', 'Compró Nursing', 'Obtuvo descuento', '% de descuento', 'Código / promoción', 'Solicitó factura', 'RFC', 'Monto pagado', 'Moneda', 'Origen'];
  for (const r of resumen) {
    const nombreHoja = String(r.entrenamiento).replace(/[\\/*?:[\]]/g, ' ').slice(0, 31);
    const hoja = libro.addWorksheet(nombreHoja);
    hoja.addRow(encabezado).font = { bold: true };
    filas.filter((f) => f.programa === r.programa).forEach((f) => hoja.addRow([
      f.fecha ? new Date(f.fecha) : '', f.nombre, f.correo, f.telefono, f.pais, f.institucion, f.especialidad, f.perfil,
      si(f.simulador), si(f.nursing), si(f.descuento), f.porcentaje ? f.porcentaje / 100 : 0, f.codigo, si(f.factura), f.facturaRfc,
      f.monto, f.moneda, f.origen,
    ]));
    hoja.getColumn(1).numFmt = 'dd/mm/yyyy';
    hoja.getColumn(12).numFmt = '0%';
    hoja.getColumn(16).numFmt = '#,##0.00';
    hoja.columns.forEach((c, i) => { c.width = [2, 5, 6].includes(i) ? 30 : 16; });
    hoja.views = [{ state: 'frozen', ySplit: 1 }];
  }

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Inscritos_por_entrenamiento_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReporteInscritos({ pagos = [], registros = [], cargando = false, onSincronizar, notificar }) {
  const [facturas, setFacturas] = useState([]);
  const [errorFacturas, setErrorFacturas] = useState('');
  const [programa, setPrograma] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    let vigente = true;
    supabase.from('facturacion_requests').select('correo, rfc, created_at').then(({ data, error }) => {
      if (!vigente) return;
      if (error) setErrorFacturas(error.message);
      else setFacturas(data || []);
    });
    return () => { vigente = false; };
  }, []);

  const filas = useMemo(() => filasInscritos({ pagos, registros, facturas }), [pagos, registros, facturas]);
  const resumen = useMemo(() => resumenPorEntrenamiento(filas), [filas]);
  const visibles = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return filas.filter((f) => (programa === 'todos' || f.programa === programa)
      && (!t || `${f.nombre} ${f.correo} ${f.institucion} ${f.codigo}`.toLowerCase().includes(t)));
  }, [filas, programa, busqueda]);

  const descargar = async () => {
    setDescargando(true);
    try {
      const elegidas = programa === 'todos' ? filas : filas.filter((f) => f.programa === programa);
      await descargarExcel(elegidas, resumenPorEntrenamiento(elegidas));
    } catch (err) {
      notificar?.(`No se pudo generar el Excel: ${err.message}`, 'error');
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div className="rv">
      <div className="rv-filtros">
        <label>
          Entrenamiento
          <select value={programa} onChange={(e) => setPrograma(e.target.value)}>
            <option value="todos">Todos</option>
            {resumen.map((r) => <option key={r.programa} value={r.programa}>{r.entrenamiento} ({r.inscritos})</option>)}
          </select>
        </label>
        <div className="rv-acciones">
          <button type="button" className="btn-crm-action outlined" onClick={onSincronizar} disabled={cargando}>
            <RotateCcw size={15} className={cargando ? 'spin-animation' : ''} /> {cargando ? 'Actualizando…' : 'Actualizar datos'}
          </button>
          <button type="button" className="btn-crm-action solid" onClick={descargar} disabled={!filas.length || descargando}>
            <FileSpreadsheet size={15} /> {descargando ? 'Generando…' : 'Descargar Excel'}
          </button>
        </div>
      </div>

      {errorFacturas && (
        <p className="rv-alerta" role="alert"><AlertCircle size={16} /> No se pudieron leer las solicitudes de factura ({errorFacturas}); la columna de factura sale vacía.</p>
      )}

      <div className="rv-kpis">
        {(programa === 'todos' ? resumen : resumen.filter((r) => r.programa === programa)).map((r) => (
          <div key={r.programa} className="rv-kpi">
            <span className="rv-kpi-etiqueta"><span className="rv-punto" style={{ background: `var(--rv-${r.programa})` }} aria-hidden="true" />{r.entrenamiento}</span>
            <span className="rv-kpi-valor">{r.inscritos} <small style={{ fontSize: '.9rem', fontWeight: 600 }}>inscritos</small></span>
            <span className="rv-kpi-extra">
              {r.simulador} con simulador{r.nursing ? ` · ${r.nursing} con Nursing` : ''} · {r.descuento} con descuento · {r.factura} pidieron factura
            </span>
            <span className="rv-kpi-nota">
              {[r.MXN && formatoDinero(r.MXN, 'MXN'), r.USD && formatoDinero(r.USD, 'USD')].filter(Boolean).join(' + ') || 'Sin ingresos'}
            </span>
          </div>
        ))}
        {!resumen.length && (
          <div className="rv-kpi">
            <span className="rv-kpi-etiqueta"><Users size={14} /> Inscritos</span>
            <span className="rv-kpi-valor">0</span>
            <span className="rv-kpi-extra">{cargando ? 'Cargando pagos…' : 'Da clic en "Actualizar datos" para traer los pagos y registros.'}</span>
          </div>
        )}
      </div>

      <section className="rv-tarjeta">
        <header className="rv-cabeza-lista">
          <div><h3>Inscritos</h3><span>{visibles.length} de {filas.length}</span></div>
          <div className="rv-lista-acciones">
            <label className="rv-buscar">
              <Search size={15} aria-hidden="true" />
              <span className="sr-only">Buscar inscritos</span>
              <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, correo, institución o código" />
            </label>
          </div>
        </header>
        {visibles.length ? (
          <div className="rv-tabla-envoltura">
            <table className="rv-tabla rv-tabla--pagos">
              <thead>
                <tr><th>Alumno</th><th>Entrenamiento</th><th>Simulador</th><th>Nursing</th><th>Descuento</th><th>Factura</th><th className="rv-num">Pagó</th></tr>
              </thead>
              <tbody>
                {visibles.slice(0, 300).map((f) => (
                  <tr key={`${f.correo}-${f.programa}-${f.fecha}`}>
                    <td><strong>{f.nombre || 'Sin nombre'}</strong><br /><small>{f.correo}{f.institucion ? ` · ${f.institucion}` : ''}</small></td>
                    <td><span className="rv-chip"><span className="rv-punto" style={{ background: `var(--rv-${f.programa})` }} aria-hidden="true" />{PROGRAMA[f.programa]?.nombre || f.entrenamiento}</span><br /><small>{fecha(f.fecha)}{f.perfil ? ` · ${f.perfil}` : ''}</small></td>
                    <td>{f.simulador ? <Check size={16} aria-label="Sí" /> : <small>No</small>}</td>
                    <td>{f.nursing ? <Check size={16} aria-label="Sí" /> : <small>No</small>}</td>
                    <td>{f.descuento ? <><strong>{f.porcentaje}%</strong><br /><small>{f.codigo}</small></> : <small>No</small>}</td>
                    <td>{f.factura ? <><Check size={16} aria-label="Sí" /><br /><small>{f.facturaRfc}</small></> : <small>No</small>}</td>
                    <td className="rv-num">{formatoDinero(f.monto, f.moneda)}<br /><small>{f.origen}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rv-vacio">No hay inscritos con estos filtros.</p>
        )}
        {visibles.length > 300 && <p className="rv-mas">Se muestran los 300 más recientes; el Excel trae todos.</p>}
      </section>
    </div>
  );
}
