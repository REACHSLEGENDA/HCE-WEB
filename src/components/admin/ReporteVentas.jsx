// Reporte de ventas (Admin → Ventas → Pagos y formularios → Pasarelas Stripe).
// Filtros arriba, indicadores con comparación justa, ventas por mes apiladas
// por programa, ventas por programa, tabla programa × mes y la lista de pagos.
// Los cálculos viven en src/lib/ventas.js.
import { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, FileSpreadsheet, RotateCcw, Search, ShoppingCart, TrendingDown, TrendingUp, Upload } from 'lucide-react';
import {
  PROGRAMA, PROGRAMAS, filtrar, formatoDinero, matriz, mesesDe, moneda, neto, programaDePago,
  rangoDe, recuperacion, totales, variacion,
} from '../../lib/ventas';
import './ReporteVentas.css';

const PERIODOS = [
  { id: 'mes', nombre: 'Este mes' },
  { id: 'mes_pasado', nombre: 'Mes pasado' },
  { id: '90d', nombre: 'Últimos 90 días' },
  { id: 'anio', nombre: 'Este año' },
  { id: 'todo', nombre: 'Todo el historial' },
  { id: 'rango', nombre: 'Elegir fechas…' },
];

const leer = (clave, valor) => { try { return localStorage.getItem(clave) ?? valor; } catch { return valor; } };
const guardar = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } };

function Cambio({ valor, etiqueta }) {
  if (valor === null || valor === undefined) return <span className="rv-cambio rv-cambio--neutro">Sin periodo para comparar</span>;
  const sube = valor >= 0;
  const Icono = sube ? TrendingUp : TrendingDown;
  return (
    <span className={`rv-cambio ${sube ? 'rv-cambio--sube' : 'rv-cambio--baja'}`} title={`Contra ${etiqueta}`}>
      <Icono size={14} aria-hidden="true" /> {sube ? '+' : ''}{valor}% <span className="rv-cambio-vs">vs {etiqueta}</span>
    </span>
  );
}

function Leyenda({ programas }) {
  return (
    <ul className="rv-leyenda" aria-label="Programas">
      {programas.map((id) => (
        <li key={id}><span className="rv-punto" style={{ background: `var(--rv-${id})` }} aria-hidden="true" />{PROGRAMA[id]?.nombre || id}</li>
      ))}
    </ul>
  );
}

// Barras apiladas por mes. Una sola escala (la moneda elegida).
function VentasPorMes({ datos, meses, mon }) {
  const [hover, setHover] = useState(null);
  const totalesMes = meses.map((m) => datos.totalesMes[m.clave] || 0);
  const maximo = Math.max(...totalesMes, 1);
  const ancho = 640;
  const alto = 240;
  const base = 200;
  const alturaUtil = 170;
  const paso = ancho / Math.max(meses.length, 1);
  const barra = Math.min(46, paso * 0.56);
  const programasPresentes = PROGRAMAS.map((p) => p.id).filter((id) => datos.filas.some((f) => f.programa === id));
  const ticks = [0, 0.5, 1].map((f) => ({ y: base - f * alturaUtil, valor: maximo * f }));

  if (!datos.total) return <p className="rv-vacio">No hay ventas en {mon} en este periodo.</p>;

  return (
    <div className="rv-grafica">
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={`Ventas por mes en ${mon}, por programa`}>
        {ticks.map((t) => (
          <g key={t.y}>
            <line x1="56" x2={ancho} y1={t.y} y2={t.y} className="rv-rejilla" />
            <text x="50" y={t.y + 4} textAnchor="end" className="rv-eje">{formatoDinero(t.valor, mon).replace(/\.00$/, '')}</text>
          </g>
        ))}
        {meses.map((m, i) => {
          const x = 56 + i * ((ancho - 56) / meses.length) + ((ancho - 56) / meses.length - barra) / 2;
          let y = base;
          const segmentos = PROGRAMAS.map((p) => p.id)
            .map((id) => ({ id, valor: datos.filas.find((f) => f.programa === id)?.meses[m.clave] || 0 }))
            .filter((s) => s.valor > 0);
          return (
            <g key={m.clave}>
              {segmentos.map((s, k) => {
                const h = Math.max(2, (s.valor / maximo) * alturaUtil);
                y -= h;
                const ultimo = k === segmentos.length - 1;
                return (
                  <rect
                    key={s.id}
                    x={x}
                    y={y + (ultimo ? 0 : 1)}
                    width={barra}
                    height={Math.max(1, h - (ultimo ? 0 : 2))}
                    rx={ultimo ? 4 : 0}
                    style={{ fill: `var(--rv-${s.id})` }}
                    className={hover && hover.mes === m.clave && hover.id !== s.id ? 'rv-tenue' : ''}
                    tabIndex={0}
                    onMouseEnter={() => setHover({ mes: m.clave, etiqueta: m.etiqueta, id: s.id, valor: s.valor, x: x + barra / 2, y })}
                    onFocus={() => setHover({ mes: m.clave, etiqueta: m.etiqueta, id: s.id, valor: s.valor, x: x + barra / 2, y })}
                    onMouseLeave={() => setHover(null)}
                    onBlur={() => setHover(null)}
                  >
                    <title>{`${PROGRAMA[s.id]?.nombre}: ${formatoDinero(s.valor, mon)} (${m.etiqueta})`}</title>
                  </rect>
                );
              })}
              <text x={x + barra / 2} y={alto - 18} textAnchor="middle" className="rv-eje">{m.etiqueta}</text>
              {totalesMes[i] > 0 && <text x={x + barra / 2} y={y - 6} textAnchor="middle" className="rv-total-barra">{formatoDinero(totalesMes[i], mon).replace(/\.00$/, '')}</text>}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="rv-tooltip" style={{ left: `${(hover.x / ancho) * 100}%`, top: `${(hover.y / alto) * 100}%` }} role="status">
          <span className="rv-punto" style={{ background: `var(--rv-${hover.id})` }} aria-hidden="true" />
          <strong>{PROGRAMA[hover.id]?.nombre}</strong> · {hover.etiqueta}<br />{formatoDinero(hover.valor, mon)}
        </div>
      )}
      <Leyenda programas={programasPresentes} />
    </div>
  );
}

function VentasPorPrograma({ datos, mon }) {
  if (!datos.total) return <p className="rv-vacio">No hay ventas en {mon} en este periodo.</p>;
  const maximo = Math.max(...datos.filas.map((f) => f.total), 1);
  return (
    <ul className="rv-programas">
      {datos.filas.map((f) => (
        <li key={f.programa}>
          <div className="rv-programa-cabeza">
            <span><span className="rv-punto" style={{ background: `var(--rv-${f.programa})` }} aria-hidden="true" />{PROGRAMA[f.programa]?.nombre || f.programa}</span>
            <strong>{formatoDinero(f.total, mon)}</strong>
          </div>
          <div className="rv-pista"><div className="rv-relleno" style={{ width: `${(f.total / maximo) * 100}%`, background: `var(--rv-${f.programa})` }} /></div>
          <small>{f.ventas} {f.ventas === 1 ? 'venta' : 'ventas'} · {Math.round((f.total / datos.total) * 100)}% del total</small>
        </li>
      ))}
    </ul>
  );
}

async function exportarExcel({ pagos, rango, meses, nombrePeriodo }) {
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  for (const mon of ['MXN', 'USD']) {
    const datos = matriz(pagos, rango, meses, mon);
    if (!datos.total) continue;
    const hoja = libro.addWorksheet(`Por programa ${mon}`);
    hoja.addRow([`Ventas netas por programa y mes (${mon}) · ${nombrePeriodo}`]).font = { bold: true, size: 13 };
    hoja.addRow([]);
    const encabezado = hoja.addRow(['Programa', ...meses.map((m) => m.etiqueta), 'Total', 'Ventas']);
    encabezado.font = { bold: true };
    for (const f of datos.filas) hoja.addRow([PROGRAMA[f.programa]?.nombre || f.programa, ...meses.map((m) => f.meses[m.clave] || 0), f.total, f.ventas]);
    const total = hoja.addRow(['Total', ...meses.map((m) => datos.totalesMes[m.clave] || 0), datos.total, datos.filas.reduce((s, f) => s + f.ventas, 0)]);
    total.font = { bold: true };
    hoja.columns.forEach((c, i) => { c.width = i === 0 ? 22 : 14; if (i > 0) c.numFmt = '#,##0.00'; });
  }
  const detalle = libro.addWorksheet('Pagos');
  detalle.addRow(['Fecha', 'Programa', 'Concepto', 'Alumno', 'Correo', 'País', 'Importe', 'Reembolsado', 'Neto', 'Moneda', 'Método', 'ID de Stripe']).font = { bold: true };
  pagos.filter((p) => { const t = new Date(p.date).getTime(); return t >= rango.inicio.getTime() && t <= rango.fin.getTime(); })
    .forEach((p) => detalle.addRow([new Date(p.date), PROGRAMA[programaDePago(p)]?.nombre, p.courseName, p.studentName, p.studentEmail, p.studentCountry, p.amount, p.reembolsado || 0, neto(p), moneda(p), p.method, p.id]));
  detalle.getColumn(1).numFmt = 'dd/mm/yyyy hh:mm';
  detalle.columns.forEach((c) => { c.width = 18; });
  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `ventas_hce_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReporteVentas({ pagos, seguimiento = [], cargando, error, onSincronizar, onImportar, formatDate, notificar }) {
  const [periodo, setPeriodo] = useState(() => leer('rv_periodo', 'mes'));
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [programa, setPrograma] = useState('todos');
  const [incluirCnadot, setIncluirCnadot] = useState(() => leer('rv_cnadot', '0') === '1');
  const [mon, setMon] = useState('MXN');
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [limite, setLimite] = useState(25);

  const cambiarPeriodo = (v) => { setPeriodo(v); guardar('rv_periodo', v); };
  const cambiarCnadot = (v) => { setIncluirCnadot(v); guardar('rv_cnadot', v ? '1' : '0'); };

  const ahora = useMemo(() => new Date(), []);
  const rango = useMemo(() => rangoDe(periodo, ahora, desde, hasta), [periodo, ahora, desde, hasta]);
  const nombrePeriodo = PERIODOS.find((p) => p.id === periodo)?.nombre || '';

  const base = useMemo(() => filtrar(pagos, { incluirCnadot, programa }), [pagos, incluirCnadot, programa]);
  const actual = useMemo(() => totales(base, rango), [base, rango]);
  const previo = useMemo(() => (rango.anterior ? totales(base, rango.anterior) : null), [base, rango]);
  const meses = useMemo(() => {
    // "Este mes" y "mes pasado" muestran los últimos 6 meses para dar contexto.
    const contexto = ['mes', 'mes_pasado'].includes(periodo)
      ? { inicio: new Date(rango.fin.getFullYear(), rango.fin.getMonth() - 5, 1), fin: rango.fin }
      : rango;
    return mesesDe(contexto, ahora, 12);
  }, [periodo, rango, ahora]);
  const rangoGrafica = useMemo(() => ({ inicio: meses.length ? new Date(`${meses[0].clave}-01T00:00:00`) : rango.inicio, fin: rango.fin }), [meses, rango]);
  const datosMes = useMemo(() => matriz(base, rangoGrafica, meses, mon), [base, rangoGrafica, meses, mon]);
  const datosPeriodo = useMemo(() => matriz(base, rango, mesesDe(rango, ahora, 120), mon), [base, rango, ahora, mon]);
  const seguimientoFiltrado = useMemo(() => (seguimiento || []).filter((a) => (incluirCnadot || a.programa !== 'cnadot') && (programa === 'todos' || a.programa === programa)), [seguimiento, incluirCnadot, programa]);
  const recup = useMemo(() => recuperacion(seguimientoFiltrado, base, rango), [seguimientoFiltrado, base, rango]);

  const lista = useMemo(() => filtrar(pagos, { incluirCnadot, programa, busqueda })
    .filter((p) => { const t = new Date(p.date).getTime(); return t >= rango.inicio.getTime() && t <= rango.fin.getTime(); })
    .sort((a, b) => new Date(b.date) - new Date(a.date)), [pagos, incluirCnadot, programa, busqueda, rango]);

  const mxn = actual.porMoneda.MXN || { neto: 0, ventas: 0, ticket: 0, reembolsos: 0 };
  const usd = actual.porMoneda.USD || { neto: 0, ventas: 0, ticket: 0, reembolsos: 0 };
  const mxnPrev = previo?.porMoneda.MXN?.neto || 0;
  const hayUsd = usd.ventas > 0 || base.some((p) => moneda(p) === 'USD');

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarExcel({ pagos: base, rango, meses: mesesDe(rango, ahora, 120), nombrePeriodo });
    } catch (err) {
      notificar?.(`No se pudo generar el Excel: ${err.message}`, 'error');
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="rv">
      <div className="rv-filtros" role="group" aria-label="Filtros del reporte">
        <label>
          <span>Periodo</span>
          <select value={periodo} onChange={(e) => cambiarPeriodo(e.target.value)}>
            {PERIODOS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        {periodo === 'rango' && (
          <>
            <label><span>Desde</span><input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} /></label>
            <label><span>Hasta</span><input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} /></label>
          </>
        )}
        <label>
          <span>Programa</span>
          <select value={programa} onChange={(e) => setPrograma(e.target.value)}>
            <option value="todos">Todos</option>
            {PROGRAMAS.filter((p) => incluirCnadot || p.id !== 'cnadot').map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <div className="rv-moneda" role="radiogroup" aria-label="Moneda de las gráficas">
          {['MXN', 'USD'].map((m) => (
            <button key={m} type="button" role="radio" aria-checked={mon === m} className={mon === m ? 'activo' : ''} onClick={() => setMon(m)}>{m}</button>
          ))}
        </div>
        <label className="rv-check">
          <input type="checkbox" checked={incluirCnadot} onChange={(e) => cambiarCnadot(e.target.checked)} />
          <span>Incluir CNADOT</span>
        </label>
        <div className="rv-acciones">
          <button type="button" className="btn-crm-action outlined mini" onClick={onSincronizar} disabled={cargando}>
            <Clock size={14} className={cargando ? 'spin-animation' : ''} /> {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button type="button" className="btn-crm-action solid mini" onClick={exportar} disabled={exportando}>
            <FileSpreadsheet size={14} /> {exportando ? 'Generando…' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rv-alerta" role="alert"><AlertCircle size={16} /> No se pudieron actualizar los pagos: {error}. Se muestran los últimos datos recibidos.</div>
      )}

      <div className="rv-kpis">
        <div className="rv-kpi rv-kpi--principal">
          <span className="rv-kpi-etiqueta">Ingresos netos · {nombrePeriodo.toLowerCase()}</span>
          <strong className="rv-kpi-valor">{formatoDinero(mxn.neto, 'MXN')}</strong>
          {hayUsd && <span className="rv-kpi-extra">+ {formatoDinero(usd.neto, 'USD', 2)}</span>}
          {rango.anterior && <Cambio valor={variacion(mxn.neto, mxnPrev)} etiqueta={rango.etiqueta} />}
          {(mxn.reembolsos > 0 || usd.reembolsos > 0) && <span className="rv-kpi-nota"><RotateCcw size={12} /> Ya descuenta reembolsos</span>}
        </div>
        <div className="rv-kpi">
          <span className="rv-kpi-etiqueta">Ventas</span>
          <strong className="rv-kpi-valor">{actual.ventas}</strong>
          {rango.anterior && <Cambio valor={variacion(actual.ventas, previo?.ventas || 0)} etiqueta={rango.etiqueta} />}
        </div>
        <div className="rv-kpi">
          <span className="rv-kpi-etiqueta">Ticket promedio</span>
          <strong className="rv-kpi-valor">{formatoDinero(mxn.ticket, 'MXN')}</strong>
          {hayUsd && <span className="rv-kpi-extra">{formatoDinero(usd.ticket, 'USD', 2)} en dólares</span>}
        </div>
        <div className="rv-kpi">
          <span className="rv-kpi-etiqueta"><ShoppingCart size={13} /> Pagos sin terminar</span>
          <strong className="rv-kpi-valor">{recup.carritos + recup.rechazados}</strong>
          <span className="rv-kpi-extra">{recup.rechazados} con tarjeta rechazada · {recup.recuperados} terminaron después</span>
        </div>
      </div>

      <div className="rv-graficas">
        <section className="rv-tarjeta">
          <header><h3>Ventas por mes</h3><span>{mon} · neto · por programa</span></header>
          <VentasPorMes datos={datosMes} meses={meses} mon={mon} />
        </section>
        <section className="rv-tarjeta">
          <header><h3>Ventas por programa</h3><span>{mon} · {nombrePeriodo.toLowerCase()}</span></header>
          <VentasPorPrograma datos={datosPeriodo} mon={mon} />
        </section>
      </div>

      <section className="rv-tarjeta">
        <header><h3>Programa × mes</h3><span>{mon} · neto · lo que exporta el Excel</span></header>
        {datosMes.total ? (
          <div className="rv-tabla-envoltura">
            <table className="rv-tabla">
              <thead><tr><th scope="col">Programa</th>{meses.map((m) => <th key={m.clave} scope="col">{m.etiqueta}</th>)}<th scope="col">Total</th></tr></thead>
              <tbody>
                {datosMes.filas.map((f) => (
                  <tr key={f.programa}>
                    <th scope="row"><span className="rv-punto" style={{ background: `var(--rv-${f.programa})` }} aria-hidden="true" />{PROGRAMA[f.programa]?.nombre}</th>
                    {meses.map((m) => <td key={m.clave}>{f.meses[m.clave] ? formatoDinero(f.meses[m.clave], mon) : '—'}</td>)}
                    <td><strong>{formatoDinero(f.total, mon)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row">Total</th>{meses.map((m) => <td key={m.clave}>{formatoDinero(datosMes.totalesMes[m.clave], mon)}</td>)}<td><strong>{formatoDinero(datosMes.total, mon)}</strong></td></tr></tfoot>
            </table>
          </div>
        ) : <p className="rv-vacio">No hay ventas en {mon} en estos meses.</p>}
      </section>

      <section className="rv-tarjeta">
        <header className="rv-cabeza-lista">
          <div><h3>Pagos</h3><span>{lista.length} en el periodo</span></div>
          <div className="rv-lista-acciones">
            <label className="rv-buscar"><Search size={14} aria-hidden="true" /><input type="search" name="buscar-pago" autoComplete="off" placeholder="Alumno, correo o ID" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar pago" /></label>
            <label className="btn-crm-action outlined mini rv-importar">
              <Upload size={14} /> Importar
              <input type="file" accept=".json,.csv" onChange={onImportar} />
            </label>
          </div>
        </header>
        {lista.length === 0 ? <p className="rv-vacio">No hay pagos con estos filtros.</p> : (
          <div className="rv-tabla-envoltura">
            <table className="rv-tabla rv-tabla--pagos">
              <thead><tr><th scope="col">Fecha</th><th scope="col">Alumno</th><th scope="col">Programa</th><th scope="col">Importe</th><th scope="col">Método</th><th scope="col">Estado</th></tr></thead>
              <tbody>
                {lista.slice(0, limite).map((p) => {
                  const prog = programaDePago(p);
                  return (
                    <tr key={p.id}>
                      <td>{formatDate ? formatDate(p.date) : new Date(p.date).toLocaleDateString('es-MX')}</td>
                      <td><strong>{p.studentName}</strong><br /><small>{p.studentEmail}</small></td>
                      <td><span className="rv-chip"><span className="rv-punto" style={{ background: `var(--rv-${prog})` }} aria-hidden="true" />{PROGRAMA[prog]?.nombre}</span><br /><small title={p.courseName}>{p.courseName}</small></td>
                      <td className="rv-num"><strong>{formatoDinero(neto(p), moneda(p), 2)}</strong>{p.reembolsado > 0 && <><br /><small>Reembolso {formatoDinero(p.reembolsado, moneda(p), 2)}</small></>}</td>
                      <td><small>{p.method}</small></td>
                      <td>{p.reembolsado >= p.amount && p.amount > 0
                        ? <span className="rv-estado rv-estado--reembolso"><RotateCcw size={12} /> Reembolsado</span>
                        : <span className="rv-estado"><CheckCircle size={12} /> Pagado</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {lista.length > limite && <button type="button" className="btn-crm-action outlined mini rv-mas" onClick={() => setLimite((l) => l + 50)}>Ver más ({lista.length - limite})</button>}
      </section>
    </div>
  );
}
