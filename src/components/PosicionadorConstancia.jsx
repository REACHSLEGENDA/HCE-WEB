import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MousePointerClick, RotateCcw } from 'lucide-react';

// Editor visual de la constancia.
//
// Antes había que adivinar las coordenadas del nombre escribiendo números a
// ciegas. Aquí se ve la plantilla real y se coloca el nombre picándole encima:
// el lienzo se dibuja al tamaño que quepa, pero las coordenadas que se guardan
// siempre son las del archivo original, que es lo que usa el generador.

const PLANTILLA_POR_DEFECTO =
  'https://raw.githubusercontent.com/HCEDEV/imagenes/refs/heads/main/Picsart_26-04-22_16-25-51-449.png';

const ANCHO_LIENZO = 720;

const PosicionadorConstancia = ({
  templateUrl,
  x,
  y,
  fontSize,
  nombreEjemplo = 'Nombre del Alumno',
  onChange,
}) => {
  const canvasRef = useRef(null);
  const urlEfectiva = (templateUrl || '').trim() || PLANTILLA_POR_DEFECTO;

  // Se guarda junto con la URL que la produjo: así, al cambiar de plantilla,
  // se sabe que lo cargado ya no corresponde sin tener que resetear a mano.
  const [cargada, setCargada] = useState(null);

  const fuente = Number(fontSize) || 40;
  const vigente = cargada?.url === urlEfectiva ? cargada : null;
  const plantilla = vigente && !vigente.error ? vigente : null;

  // El tope del deslizador depende de la plantilla: 140 px se ven enormes en
  // una imagen de 800 px de ancho y microscópicos en una de 4000.
  const fuenteMaxima = plantilla ? Math.max(140, Math.round(plantilla.ancho / 10)) : 140;

  useEffect(() => {
    let cancelado = false;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = urlEfectiva;

    img.onload = () => {
      if (!cancelado) setCargada({ url: urlEfectiva, img, ancho: img.width, alto: img.height });
    };
    img.onerror = () => {
      if (!cancelado) setCargada({ url: urlEfectiva, error: true });
    };

    return () => { cancelado = true; };
  }, [urlEfectiva]);

  // ---- Dibujado ------------------------------------------------------------
  const dibujar = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !plantilla) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(plantilla.img, 0, 0, canvas.width, canvas.height);

    // El lienzo se muestra reducido, así que todo lo dibujado encima se escala
    // en la misma proporción para que la vista previa sea fiel.
    const escala = canvas.width / plantilla.ancho;
    const posX = (Number(x) || plantilla.ancho / 2) * escala;
    const posY = (Number(y) || plantilla.alto / 2) * escala;

    // Guía de la línea base: ayuda a alinear el nombre con el renglón impreso.
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 188, 212, 0.5)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, posY);
    ctx.lineTo(canvas.width, posY);
    ctx.stroke();
    ctx.restore();

    ctx.font = `bold ${fuente * escala}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Solo en la vista previa: un contorno claro detrás del nombre. La
    // constancia real se dibuja sin él, pero sobre una plantilla oscura el
    // azul marino desaparece y parecería que el editor no está haciendo nada.
    ctx.lineWidth = Math.max(2, fuente * escala * 0.12);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineJoin = 'round';
    ctx.strokeText(nombreEjemplo, posX, posY);

    ctx.fillStyle = '#1B2B3C';
    ctx.fillText(nombreEjemplo, posX, posY);
  }, [plantilla, x, y, fuente, nombreEjemplo]);

  useEffect(() => { dibujar(); }, [dibujar]);

  // ---- Interacción ---------------------------------------------------------
  const arrastrando = useRef(false);

  const colocar = (evento) => {
    const canvas = canvasRef.current;
    if (!canvas || !plantilla) return;

    const caja = canvas.getBoundingClientRect();
    const escala = plantilla.ancho / caja.width;

    onChange({
      x: Math.round((evento.clientX - caja.left) * escala),
      y: Math.round((evento.clientY - caja.top) * escala),
      fontSize: fuente,
    });
  };

  const centrar = () => {
    if (!plantilla) return;
    onChange({
      x: Math.round(plantilla.ancho / 2),
      y: Math.round(plantilla.alto / 2),
      fontSize: fuente,
    });
  };

  if (vigente?.error) {
    return (
      <div className="constancia-editor constancia-editor--error">
        No se pudo cargar esa plantilla. Revisa que la URL sea de una imagen pública
        (que termine en .png o .jpg) y que el sitio permita mostrarla desde otro dominio.
      </div>
    );
  }

  return (
    <div className="constancia-editor">
      <p className="constancia-editor-ayuda">
        <MousePointerClick size={15} />
        <span>Haz clic sobre la plantilla para colocar el nombre. También puedes arrastrarlo.</span>
      </p>

      <div className="constancia-editor-lienzo">
        <canvas
          ref={canvasRef}
          width={ANCHO_LIENZO}
          height={plantilla ? Math.round((ANCHO_LIENZO * plantilla.alto) / plantilla.ancho) : 480}
          onMouseDown={(e) => { arrastrando.current = true; colocar(e); }}
          onMouseMove={(e) => { if (arrastrando.current) colocar(e); }}
          onMouseUp={() => { arrastrando.current = false; }}
          onMouseLeave={() => { arrastrando.current = false; }}
        />
        {!plantilla && <span className="constancia-editor-cargando">Cargando plantilla…</span>}
      </div>

      <div className="constancia-editor-controles">
        <label>
          <span>Tamaño de la letra</span>
          <input
            type="range"
            min="16"
            max={fuenteMaxima}
            value={Math.min(fuente, fuenteMaxima)}
            onChange={(e) => onChange({ x, y, fontSize: Number(e.target.value) })}
          />
          <b>{fuente} px</b>
        </label>

        <button type="button" className="btn-crm-action outlined" onClick={centrar}>
          <RotateCcw size={14} /> Centrar
        </button>
      </div>

      {plantilla && (
        <p className="constancia-editor-pie">
          Plantilla de {plantilla.ancho}×{plantilla.alto} px · nombre en{' '}
          {Number(x) || Math.round(plantilla.ancho / 2)}, {Number(y) || Math.round(plantilla.alto / 2)}
        </p>
      )}
    </div>
  );
};

export default PosicionadorConstancia;
