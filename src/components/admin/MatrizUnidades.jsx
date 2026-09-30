import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { ESTADOS_MATRIZ } from '../../lib/metricas';

// Matriz de unidades: cada alumno contra cada lección del curso, con el mismo
// código que TalentLMS (✓ completada, ○ en curso, ✗ por corregir o reprobado).
// Se exporta a Excel con las celdas pintadas, igual que el reporte de allá.

// Colores de estado: siempre van con su símbolo, nunca solos.
const COLORES_EXCEL = {
  completa: { fondo: 'FF4CAF50', texto: 'FFFFFFFF' },
  'en-curso': { fondo: 'FFFFA726', texto: 'FFFFFFFF' },
  corregir: { fondo: 'FFE53935', texto: 'FFFFFFFF' },
  reprobado: { fondo: 'FFE53935', texto: 'FFFFFFFF' },
};

async function exportarExcel({ tituloCurso, columnas, filas }) {
  // ExcelJS pesa: solo se descarga cuando alguien exporta.
  const { default: ExcelJS } = await import('exceljs');
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Portal HCE';

  // Hoja 1: la matriz.
  const hoja = libro.addWorksheet('Matriz de unidad', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
  hoja.addRow(['Nombre', 'Correo', ...columnas.map((c) => c.titulo), 'Avance']);
  const encabezado = hoja.getRow(1);
  encabezado.height = 190;
  encabezado.eachCell((celda, n) => {
    celda.font = { bold: true };
    celda.alignment = n > 2 ? { textRotation: 60, vertical: 'bottom', horizontal: 'center' } : { vertical: 'bottom' };
  });
  hoja.getColumn(1).width = 34;
  hoja.getColumn(2).width = 30;
  columnas.forEach((_, i) => { hoja.getColumn(i + 3).width = 4.5; });
  hoja.getColumn(columnas.length + 3).width = 9;

  for (const f of filas) {
    const fila = hoja.addRow([f.nombre, f.email, ...f.celdas.map((c) => (c ? ESTADOS_MATRIZ[c].simbolo : '')), `${f.porcentaje}%`]);
    f.celdas.forEach((estado, i) => {
      const celda = fila.getCell(i + 3);
      celda.alignment = { horizontal: 'center', vertical: 'middle' };
      if (!estado) return;
      const color = COLORES_EXCEL[estado];
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color.fondo } };
      celda.font = { bold: true, color: { argb: color.texto } };
      celda.border = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } };
    });
  }

  // Hoja 2: cuántos completaron cada lección.
  const resumen = libro.addWorksheet('Visión general');
  resumen.addRow(['Lección', 'Completaron', 'En curso', 'Por corregir / reprobado', 'Sin empezar', '% completado']);
  resumen.getRow(1).font = { bold: true };
  columnas.forEach((c, i) => {
    const cuenta = (estado) => filas.filter((f) => f.celdas[i] === estado).length;
    const completaron = cuenta('completa');
    const mal = cuenta('corregir') + cuenta('reprobado');
    const enCurso = cuenta('en-curso');
    resumen.addRow([
      c.titulo, completaron, enCurso, mal, filas.length - completaron - enCurso - mal,
      filas.length ? Math.round((completaron / filas.length) * 100) / 100 : 0,
    ]);
  });
  resumen.getColumn(1).width = 50;
  [2, 3, 4, 5].forEach((n) => { resumen.getColumn(n).width = 14; });
  resumen.getColumn(6).width = 14;
  resumen.getColumn(6).numFmt = '0%';

  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `Matriz_${tituloCurso.replace(/[^\p{L}\p{N}]+/gu, '_').slice(0, 60)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function MatrizUnidades({ tituloCurso, matriz }) {
  const [busqueda, setBusqueda] = useState('');
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);

  const filas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? matriz.filas.filter((f) => f.nombre.toLowerCase().includes(q) || f.email.toLowerCase().includes(q)) : matriz.filas;
  }, [matriz, busqueda]);

  const exportar = async () => {
    setExportando(true);
    setError(null);
    try {
      await exportarExcel({ tituloCurso, columnas: matriz.columnas, filas: matriz.filas });
    } catch (err) {
      setError(`No se pudo generar el Excel: ${err.message}`);
    } finally {
      setExportando(false);
    }
  };

  if (!matriz.filas.length) return <p className="m-sin-datos">Todavía no hay alumnos inscritos en este curso.</p>;

  return (
    <div className="m-matriz">
      <div className="m-tabla-acciones m-matriz-barra">
        <label className="m-matriz-buscar">
          <Search size={14} />
          <input type="search" placeholder="Buscar alumno" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </label>
        <ul className="m-matriz-leyenda" aria-label="Leyenda">
          <li><span className="m-celda completa">✓</span> Completada</li>
          <li><span className="m-celda en-curso">○</span> En curso</li>
          <li><span className="m-celda corregir">✗</span> Por corregir / reprobado</li>
          <li><span className="m-celda vacia" /> Sin empezar</li>
        </ul>
        <button type="button" className="m-boton" onClick={exportar} disabled={exportando}>
          <Download size={15} /> {exportando ? 'Generando…' : 'Exportar en Excel'}
        </button>
      </div>
      {error && <p className="m-error">{error}</p>}

      <div className="m-matriz-scroll">
        <table className="m-matriz-tabla">
          <thead>
            <tr>
              <th className="m-matriz-alumno" scope="col">Alumno</th>
              {matriz.columnas.map((c, i) => (
                <th key={c.id} scope="col" className="m-matriz-col" title={c.titulo}>
                  <span>{c.tipo === 'examen' ? c.titulo : `${i + 1}. ${c.titulo}`}</span>
                </th>
              ))}
              <th scope="col" className="m-matriz-avance">Avance</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.userId}>
                <th scope="row" className="m-matriz-alumno" title={f.email}>{f.nombre}</th>
                {f.celdas.map((estado, i) => (
                  <td key={matriz.columnas[i].id} title={`${matriz.columnas[i].titulo}: ${estado ? ESTADOS_MATRIZ[estado].nombre : 'Sin empezar'}`}>
                    <span className={`m-celda ${estado || 'vacia'}`}>{estado ? ESTADOS_MATRIZ[estado].simbolo : ''}</span>
                  </td>
                ))}
                <td className="m-matriz-avance">{f.porcentaje}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="m-matriz-pie">{filas.length} de {matriz.filas.length} alumnos · {matriz.columnas.length} unidades</p>
    </div>
  );
}
