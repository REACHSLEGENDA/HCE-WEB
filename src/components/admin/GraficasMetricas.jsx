import React, { useEffect, useRef, useState } from 'react';

// Gráficas del panel de métricas, dibujadas a mano en SVG.
//
// Reglas fijas para todas: una sola serie en el cian del panel (el color es
// la marca, nunca el texto), columnas de máximo 24 px con la punta redondeada
// y la base recta, líneas de 2 px, retícula de 1 px que no compite con los
// datos, y un recuadro flotante al pasar el cursor. Cada gráfica trae además
// su tabla, para quien no puede o no quiere usar el cursor.

const MARGEN = { arriba: 12, derecha: 12, abajo: 26, izquierda: 40 };

// Mide el ancho real del contenedor: así el texto de los ejes se dibuja a su
// tamaño y no se encoge en el celular como pasaría escalando un viewBox.
function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    if (!ref.current) return undefined;
    const observador = new ResizeObserver(([entrada]) => {
      setAncho(Math.floor(entrada.contentRect.width));
    });
    observador.observe(ref.current);
    return () => observador.disconnect();
  }, []);

  return [ref, ancho];
}

// Marcas del eje en números redondos (0, 5, 10… o 0, 20, 40…).
function ticksLimpios(maximo, cuantos = 4) {
  if (!maximo || maximo <= 0) return [0, 1];
  const bruto = maximo / cuantos;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 5, 10].map((m) => m * magnitud).find((p) => p >= bruto) || bruto;
  const tope = Math.ceil(maximo / paso) * paso;
  const ticks = [];
  for (let v = 0; v <= tope + paso / 2; v += paso) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

// Columna con la punta redondeada y la base recta, anclada a la línea base.
function caminoColumna(x, y, ancho, alto, base) {
  if (alto <= 0) return '';
  const r = Math.min(4, ancho / 2, alto);
  return [
    `M${x},${base}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + ancho - r},${y}`,
    `Q${x + ancho},${y} ${x + ancho},${y + r}`,
    `L${x + ancho},${base}`,
    'Z',
  ].join(' ');
}

// En la mitad derecha de la gráfica el recuadro se abre hacia la izquierda:
// si no, en los últimos puntos se saldría de la tarjeta.
function Recuadro({ pos, ancho, children }) {
  if (!pos) return null;
  const voltear = ancho && pos.x > ancho * 0.55;
  return (
    <div className={`m-recuadro${voltear ? ' m-recuadro--izquierda' : ''}`} style={{ left: pos.x, top: pos.y }} role="status">
      {children}
    </div>
  );
}

function TablaDeDatos({ encabezados, filas }) {
  return (
    <details className="m-tabla-datos">
      <summary>Ver como tabla</summary>
      <div className="m-tabla-scroll">
        <table>
          <thead>
            <tr>{encabezados.map((e) => <th key={e}>{e}</th>)}</tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i}>{fila.map((celda, j) => <td key={j}>{celda}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/**
 * Columnas de una sola serie.
 * datos: [{ clave, valor, etiquetaEje, detalle: ReactNode }]
 */
export function GraficaColumnas({ datos, alto = 200, unidad = '', umbral = null, tabla }) {
  const [ref, ancho] = useAncho();
  const [hover, setHover] = useState(null);

  const maximo = Math.max(0, ...datos.map((d) => d.valor));
  const ticks = ticksLimpios(maximo);
  const tope = ticks[ticks.length - 1];

  const anchoPlot = Math.max(0, ancho - MARGEN.izquierda - MARGEN.derecha);
  const altoPlot = alto - MARGEN.arriba - MARGEN.abajo;
  const base = MARGEN.arriba + altoPlot;
  const banda = datos.length ? anchoPlot / datos.length : 0;
  // Nunca llena la banda: lo que sobra es aire. 2 px de separación mínima.
  const anchoColumna = Math.max(1, Math.min(24, banda - 2));
  const escalaY = (v) => base - (tope ? (v / tope) * altoPlot : 0);

  // Cuántas etiquetas del eje X caben sin chocar (~64 px cada una).
  const cadaCuantas = Math.max(1, Math.ceil(datos.length / Math.max(1, Math.floor(anchoPlot / 64))));

  return (
    <div className="m-grafica" ref={ref}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={tabla?.titulo || 'Gráfica de columnas'}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="m-reticula" x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={escalaY(t)} y2={escalaY(t)} />
              <text className="m-eje" x={MARGEN.izquierda - 8} y={escalaY(t)} dy="0.32em" textAnchor="end">
                {t.toLocaleString('es-MX')}{unidad}
              </text>
            </g>
          ))}

          {umbral != null && umbral.indice != null && (
            <g>
              <line
                className="m-umbral"
                x1={MARGEN.izquierda + umbral.indice * banda}
                x2={MARGEN.izquierda + umbral.indice * banda}
                y1={MARGEN.arriba}
                y2={base}
              />
              <text className="m-eje m-eje--fuerte" x={MARGEN.izquierda + umbral.indice * banda + 5} y={MARGEN.arriba + 10}>
                {umbral.etiqueta}
              </text>
            </g>
          )}

          {datos.map((d, i) => {
            const x = MARGEN.izquierda + i * banda + (banda - anchoColumna) / 2;
            const y = escalaY(d.valor);
            const activa = hover?.i === i;
            return (
              <g key={d.clave}>
                <path className={`m-columna${activa ? ' m-columna--activa' : ''}`} d={caminoColumna(x, y, anchoColumna, base - y, base)} />
                {/* La zona sensible es toda la banda, no solo la columna. */}
                <rect
                  className="m-zona"
                  x={MARGEN.izquierda + i * banda}
                  y={MARGEN.arriba}
                  width={banda}
                  height={altoPlot}
                  onPointerMove={(e) => {
                    const caja = ref.current.getBoundingClientRect();
                    setHover({ i, x: e.clientX - caja.left, y: e.clientY - caja.top });
                  }}
                  onPointerLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          <line className="m-base" x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={base} y2={base} />

          {datos.map((d, i) => (i % cadaCuantas === 0 ? (
            <text key={d.clave} className="m-eje" x={MARGEN.izquierda + i * banda + banda / 2} y={alto - 8} textAnchor="middle">
              {d.etiquetaEje}
            </text>
          ) : null))}
        </svg>
      )}

      <Recuadro pos={hover ? { x: hover.x, y: hover.y } : null} ancho={ancho}>
        {hover && datos[hover.i]?.detalle}
      </Recuadro>

      {tabla && <TablaDeDatos encabezados={tabla.encabezados} filas={tabla.filas} />}
    </div>
  );
}

/**
 * Curva de retención del video: eje X = avance en el video, eje Y = % de
 * quienes lo empezaron que seguían ahí. Marca el tramo donde más se pierde.
 */
const MARGEN_RETENCION = { ...MARGEN, arriba: 26 };

export function GraficaRetencion({ curva, caida, duracionSeg, alto = 236 }) {
  const [ref, ancho] = useAncho();
  const [hover, setHover] = useState(null);
  const MARGEN = MARGEN_RETENCION;

  const anchoPlot = Math.max(0, ancho - MARGEN.izquierda - MARGEN.derecha);
  const altoPlot = alto - MARGEN.arriba - MARGEN.abajo;
  const base = MARGEN.arriba + altoPlot;
  const x = (p) => MARGEN.izquierda + (p / 100) * anchoPlot;
  const y = (pct) => base - (pct / 100) * altoPlot;

  const aTiempo = (punto) => {
    if (!duracionSeg) return `${punto}%`;
    const seg = Math.round((punto / 100) * duracionSeg);
    return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;
  };

  const linea = curva.puntos.map((p, i) => `${i ? 'L' : 'M'}${x(p.punto)},${y(p.porcentaje)}`).join(' ');
  const area = `${linea} L${x(100)},${base} L${x(0)},${base} Z`;
  const activo = hover != null ? curva.puntos[hover.i] : null;

  return (
    <div className="m-grafica" ref={ref}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label="Retención del video">
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line className="m-reticula" x1={MARGEN.izquierda} x2={ancho - MARGEN.derecha} y1={y(t)} y2={y(t)} />
              <text className="m-eje" x={MARGEN.izquierda - 8} y={y(t)} dy="0.32em" textAnchor="end">{t}%</text>
            </g>
          ))}

          <path className="m-area" d={area} />

          {caida && (
            <g>
              <rect className="m-caida" x={x(caida.desde)} y={MARGEN.arriba} width={x(caida.hasta) - x(caida.desde)} height={altoPlot} />
              <text className="m-eje m-eje--fuerte" x={(x(caida.desde) + x(caida.hasta)) / 2} y={MARGEN.arriba - 10} textAnchor="middle">
                Mayor caída
              </text>
            </g>
          )}

          <path className="m-linea" d={linea} />

          {activo && (
            <g>
              <line className="m-mira" x1={x(activo.punto)} x2={x(activo.punto)} y1={MARGEN.arriba} y2={base} />
              <circle className="m-punto" cx={x(activo.punto)} cy={y(activo.porcentaje)} r="4" />
            </g>
          )}

          {[0, 25, 50, 75, 100].map((t) => (
            <text key={t} className="m-eje" x={x(t)} y={alto - 8} textAnchor={t === 0 ? 'start' : t === 100 ? 'end' : 'middle'}>
              {aTiempo(t)}
            </text>
          ))}

          {/* Capa que atrapa el cursor y lo acerca al punto más próximo. */}
          <rect
            className="m-zona"
            x={MARGEN.izquierda}
            y={MARGEN.arriba}
            width={anchoPlot}
            height={altoPlot}
            onPointerMove={(e) => {
              const caja = ref.current.getBoundingClientRect();
              const px = e.clientX - caja.left;
              const punto = ((px - MARGEN.izquierda) / anchoPlot) * 100;
              let i = 0;
              curva.puntos.forEach((p, k) => {
                if (Math.abs(p.punto - punto) < Math.abs(curva.puntos[i].punto - punto)) i = k;
              });
              setHover({ i, x: px, y: e.clientY - caja.top });
            }}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      <Recuadro pos={hover} ancho={ancho}>
        {activo && (
          <>
            <strong>{Math.round(activo.porcentaje)}%</strong> seguía viendo
            <span className="m-recuadro-sub">
              en {aTiempo(activo.punto)}{duracionSeg ? ` (${activo.punto}% del video)` : ''} · {activo.alumnos} de {curva.total}
            </span>
          </>
        )}
      </Recuadro>

      <TablaDeDatos
        encabezados={['Punto del video', 'Seguían viendo', 'Alumnos']}
        filas={curva.puntos.map((p) => [aTiempo(p.punto), `${Math.round(p.porcentaje)}%`, `${p.alumnos} de ${curva.total}`])}
      />
    </div>
  );
}

/** Barras horizontales para pocas categorías (dispositivos). */
export function BarrasHorizontales({ filas }) {
  const maximo = Math.max(1, ...filas.map((f) => f.valor));
  return (
    <ul className="m-barras">
      {filas.map((f) => (
        <li key={f.clave}>
          <span className="m-barras-etiqueta">{f.etiqueta}</span>
          <span className="m-barras-pista">
            <span className="m-barras-relleno" style={{ width: `${(f.valor / maximo) * 100}%` }} />
          </span>
          <span className="m-barras-valor">{f.texto}</span>
        </li>
      ))}
    </ul>
  );
}
