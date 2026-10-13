import { FileText, ExternalLink, Download } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import './Programas.css';

/* ---------------------------------------------------------------------------
 * Programas del Diploma de París — página de enlace privado.
 *
 * Solo el logo y los dos documentos. No se enlaza desde ningún lado, lleva
 * noindex y está bloqueada en robots.txt: se llega únicamente con la URL.
 *
 * Los PDF se abren en pestaña nueva en vez de incrustarse: el visor embebido
 * de PDF no funciona igual en los navegadores de celular, y buena parte de
 * quien reciba esto lo va a abrir desde el teléfono.
 * ------------------------------------------------------------------------ */

const PROGRAMAS = [
  {
    archivo: '/programas/programa-teorica-2026.pdf',
    titulo: 'Certificación Teórica',
    fechas: '28 y 29 de octubre',
  },
  {
    archivo: '/programas/programa-practica-2026.pdf',
    titulo: 'Certificación Práctica',
    fechas: '30 y 31 de octubre',
  },
];

export default function Programas() {
  useSEO({
    title: 'Programas 2026',
    description: 'Programas del Paris International Diploma in ECMO 2026.',
    noindex: true,
  });

  return (
    <div className="prog-page">
      <main className="prog-contenido">
        <img
          className="prog-logo"
          src="/assets/componentes/ghghg-scaled.png"
          alt="Healthcare Training Experience"
        />

        <h1 className="prog-titulo">Paris International Diploma in ECMO</h1>
        <p className="prog-sede">Instituto Nacional de Enfermedades Respiratorias (INER)</p>

        <div className="prog-lista">
          {PROGRAMAS.map(({ archivo, titulo, fechas }) => (
            <article key={archivo} className="prog-card">
              <span className="prog-card-icono" aria-hidden="true">
                <FileText size={26} />
              </span>

              <div className="prog-card-texto">
                <h2>{titulo}</h2>
                <p>{fechas}</p>
              </div>

              <div className="prog-card-acciones">
                <a href={archivo} target="_blank" rel="noreferrer" className="prog-btn prog-btn--primario">
                  <ExternalLink size={16} /> Ver programa
                </a>
                <a href={archivo} download className="prog-btn">
                  <Download size={16} /> Descargar
                </a>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
