// Cálculos del reporte de ventas (Admin → Ventas → Pagos). Sin React, para
// poder probarlos. Los pagos llegan de get-stripe-payments (o del respaldo
// local / importación CSV, que pueden no traer `programa`).

// Cada programa con su color fijo (paleta validada para daltonismo en claro y
// oscuro; el color sigue al programa aunque cambien los filtros).
export const PROGRAMAS = [
  { id: 'paris', nombre: 'Diploma de París', claro: '#2a78d6', oscuro: '#3987e5' },
  { id: 'step1', nombre: 'Step 1', claro: '#eb6834', oscuro: '#d95926' },
  { id: 'nursing', nombre: 'ECMO Nursing', claro: '#1baf7a', oscuro: '#199e70' },
  { id: 'sim', nombre: 'ECMO Sim', claro: '#eda100', oscuro: '#c98500' },
  { id: 'curso', nombre: 'Cursos en línea', claro: '#e87ba4', oscuro: '#d55181' },
  { id: 'alumni', nombre: 'Alumni Pass', claro: '#008300', oscuro: '#008300' },
  { id: 'step2', nombre: 'Step 2', claro: '#6250d6', oscuro: '#9085e9' },
  { id: 'cnadot', nombre: 'CNADOT', claro: '#e34948', oscuro: '#e66767' },
  { id: 'otro', nombre: 'Otros', claro: '#8a94a6', oscuro: '#8a94a6' },
];
export const PROGRAMA = Object.fromEntries(PROGRAMAS.map((p) => [p.id, p]));

const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Programa del pago: el que manda el servidor o, en registros viejos, por el nombre. */
export function programaDePago(pago) {
  if (pago.programa && PROGRAMA[pago.programa]) return pago.programa;
  if (pago.courseId === 'cnadot') return 'cnadot';
  const n = String(pago.courseName || '');
  if (/alumni/i.test(n)) return 'alumni';
  if (/nursing/i.test(n)) return 'nursing';
  if (/step\s*2|simulation course/i.test(n)) return 'step2';
  if (/\bsim\b|simulador/i.test(n)) return 'sim';
  if (/step\s*1/i.test(n)) return 'step1';
  if (/par[ií]s|diploma/i.test(n)) return 'paris';
  if (pago.courseId && !['general', 'cnadot'].includes(String(pago.courseId)) && /^\d+$/.test(String(pago.courseId))) return 'curso';
  return 'otro';
}

const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const finDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

/**
 * Rango del periodo y el periodo anterior equivalente, para comparar justo:
 * "este mes" (del 1 a hoy) se compara con el mismo número de días del mes
 * pasado, no con el mes pasado completo.
 */
export function rangoDe(periodo, ahora = new Date(), desdeTxt = '', hastaTxt = '') {
  const hoy = finDia(ahora);
  let inicio;
  let fin = hoy;
  let anterior = null;
  let etiqueta = '';
  switch (periodo) {
    case 'mes': {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const dia = ahora.getDate();
      const iniPrev = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      const ultimoPrev = new Date(ahora.getFullYear(), ahora.getMonth(), 0).getDate();
      anterior = { inicio: iniPrev, fin: finDia(new Date(iniPrev.getFullYear(), iniPrev.getMonth(), Math.min(dia, ultimoPrev))) };
      etiqueta = `del 1 al ${dia} del mes pasado`;
      break;
    }
    case 'mes_pasado': {
      inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
      fin = finDia(new Date(ahora.getFullYear(), ahora.getMonth(), 0));
      anterior = { inicio: new Date(ahora.getFullYear(), ahora.getMonth() - 2, 1), fin: finDia(new Date(ahora.getFullYear(), ahora.getMonth() - 1, 0)) };
      etiqueta = 'el mes anterior';
      break;
    }
    case '90d': {
      inicio = inicioDia(new Date(ahora.getTime() - 89 * 86400000));
      anterior = { inicio: inicioDia(new Date(inicio.getTime() - 90 * 86400000)), fin: new Date(inicio.getTime() - 1) };
      etiqueta = 'los 90 días anteriores';
      break;
    }
    case 'anio': {
      inicio = new Date(ahora.getFullYear(), 0, 1);
      anterior = { inicio: new Date(ahora.getFullYear() - 1, 0, 1), fin: finDia(new Date(ahora.getFullYear() - 1, ahora.getMonth(), ahora.getDate())) };
      etiqueta = 'el mismo periodo del año pasado';
      break;
    }
    case 'rango': {
      const d = desdeTxt ? new Date(`${desdeTxt}T00:00:00`) : null;
      const h = hastaTxt ? new Date(`${hastaTxt}T23:59:59`) : hoy;
      inicio = d && !Number.isNaN(d.getTime()) ? d : new Date(2000, 0, 1);
      fin = h && !Number.isNaN(h.getTime()) ? h : hoy;
      if (d) {
        const largo = fin.getTime() - inicio.getTime();
        anterior = { inicio: new Date(inicio.getTime() - largo - 1), fin: new Date(inicio.getTime() - 1) };
        etiqueta = 'el periodo anterior del mismo largo';
      }
      break;
    }
    default:
      inicio = new Date(2000, 0, 1);
  }
  return { inicio, fin, anterior, etiqueta };
}

const dentro = (pago, { inicio, fin }) => {
  const t = new Date(pago.date).getTime();
  return t >= inicio.getTime() && t <= fin.getTime();
};

export const moneda = (p) => String(p.currency || 'MXN').toUpperCase();
export const neto = (p) => Math.max(0, (Number(p.amount) || 0) - (Number(p.reembolsado) || 0));

/** Pagos que cumplen los filtros (sin el periodo). */
export function filtrar(pagos, { incluirCnadot = false, programa = 'todos', busqueda = '' } = {}) {
  const q = busqueda.trim().toLowerCase();
  return pagos.filter((p) => {
    const prog = programaDePago(p);
    if (!incluirCnadot && prog === 'cnadot') return false;
    if (programa !== 'todos' && prog !== programa) return false;
    if (q && !`${p.studentName || ''} ${p.studentEmail || ''} ${p.id || ''} ${p.courseName || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Totales del periodo por moneda: neto, reembolsos, ventas y ticket promedio. */
export function totales(pagos, rango) {
  const porMoneda = {};
  let ventas = 0;
  for (const p of pagos) {
    if (!dentro(p, rango)) continue;
    ventas += 1;
    const m = moneda(p);
    const t = (porMoneda[m] ||= { neto: 0, reembolsos: 0, ventas: 0 });
    t.neto += neto(p);
    t.reembolsos += Number(p.reembolsado) || 0;
    t.ventas += 1;
  }
  for (const t of Object.values(porMoneda)) t.ticket = t.ventas ? t.neto / t.ventas : 0;
  return { porMoneda, ventas };
}

/** Variación en % (null si no hay base para comparar). */
export const variacion = (actual, previo) => (previo > 0 ? Math.round(((actual - previo) / previo) * 100) : null);

/** Meses (clave AAAA-MM) que cubre el rango, máximo los últimos `max`. */
export function mesesDe(rango, ahora = new Date(), max = 12) {
  const fin = rango.fin.getTime() > ahora.getTime() ? ahora : rango.fin;
  const lista = [];
  let d = new Date(fin.getFullYear(), fin.getMonth(), 1);
  const tope = new Date(rango.inicio.getFullYear(), rango.inicio.getMonth(), 1);
  while (d.getTime() >= tope.getTime() && lista.length < max) {
    lista.unshift({ clave: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, etiqueta: `${MES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` });
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  }
  return lista;
}

const claveMes = (fecha) => {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/**
 * Ventas por programa y mes en una moneda: { filas: [{programa, meses: {clave: monto}, total, ventas}], totalesMes }.
 * Programas ordenados por total (pero cada uno conserva su color).
 */
export function matriz(pagos, rango, meses, mon) {
  const porPrograma = new Map();
  const totalesMes = Object.fromEntries(meses.map((m) => [m.clave, 0]));
  for (const p of pagos) {
    if (moneda(p) !== mon || !dentro(p, rango)) continue;
    const mes = claveMes(p.date);
    if (!(mes in totalesMes)) continue;
    const prog = programaDePago(p);
    const fila = porPrograma.get(prog) || { programa: prog, meses: {}, total: 0, ventas: 0 };
    fila.meses[mes] = (fila.meses[mes] || 0) + neto(p);
    fila.total += neto(p);
    fila.ventas += 1;
    totalesMes[mes] += neto(p);
    porPrograma.set(prog, fila);
  }
  const filas = [...porPrograma.values()].sort((a, b) => b.total - a.total);
  return { filas, totalesMes, total: filas.reduce((s, f) => s + f.total, 0) };
}

/** Carritos abandonados / pagos rechazados del periodo y cuántos terminaron pagando después. */
export function recuperacion(seguimiento, pagos, rango) {
  const avisos = (seguimiento || []).filter((a) => dentro({ date: a.creado_en }, rango));
  let recuperados = 0;
  for (const a of avisos) {
    const t = new Date(a.creado_en).getTime();
    if (pagos.some((p) => String(p.studentEmail || '').toLowerCase() === String(a.email || '').toLowerCase()
      && programaDePago(p) === a.programa && new Date(p.date).getTime() >= t)) recuperados += 1;
  }
  return {
    carritos: avisos.filter((a) => a.tipo === 'carrito').length,
    rechazados: avisos.filter((a) => a.tipo === 'pago_fallido').length,
    recuperados,
  };
}

export const formatoDinero = (n, mon = 'MXN', decimales = 0) => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: mon, minimumFractionDigits: decimales, maximumFractionDigits: decimales,
}).format(n || 0);
