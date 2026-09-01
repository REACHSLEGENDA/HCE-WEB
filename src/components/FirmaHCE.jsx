import './FirmaHCE.css';

/* ---------------------------------------------------------------------------
 * Firma animada de la marca.
 *
 * El logo NO entra de una pieza: está partido en siete capas por color, cada
 * una con su propia entrada. Las capas salen del PNG original clasificando cada
 * píxel por el color más cercano, así que al superponerse reconstruyen el logo
 * pixel por pixel — comprobado: cero diferencias en los 66,807 píxeles visibles.
 *
 * Ninguna capa se solapa con otra (cada píxel pertenece a una sola), de modo
 * que el orden de apilado da igual y no hacen falta z-index.
 *
 * Después el nombre se escribe debajo. No es una imagen: es texto real —lo lee
 * Google, se puede seleccionar y lo dicta un lector de pantalla— al que se le
 * descubre el ancho mientras una punta de pluma viaja por encima.
 *
 * Todo el movimiento vive en CSS a propósito. Con JavaScript de por medio
 * (esperar un frame para disparar la animación) el logo se queda invisible si
 * ese frame nunca llega, por ejemplo al cargar la página en una pestaña de
 * fondo. Una animación CSS con `forwards` siempre acaba en el estado final.
 * ------------------------------------------------------------------------ */

// El orden es el de aparición, no el de apilado.
const CAPAS = [
  'cian',        // remolino claro de la izquierda: entra deslizándose
  'azul-tallo',  // asta de la h: crece desde abajo
  'tealoscuro',  // hombro de la h: cae desde arriba
  'azul-cuerpo', // lomo de la h y la c: se descubre de izquierda a derecha
  'verde',       // cuña verde de la c: gira al entrar
  'rojo',        // arco rojo de la e: barre desde la derecha
  'naranja',     // cuerpo de la e: escala con rebote
];

const FirmaHCE = () => (
  <div className="firma">
    {/* Una sola descripción para el conjunto: las capas sueltas no significan
        nada por separado y solo ensuciarían al lector de pantalla. */}
    <div className="firma-marca" role="img" aria-label="hce">
      {CAPAS.map((capa) => (
        <img
          key={capa}
          className={`firma-capa firma-capa--${capa}`}
          src={`/assets/componentes/marca/${capa}.webp`}
          alt=""
          aria-hidden="true"
          width="500"
          height="286"
          fetchPriority="high"
          decoding="async"
        />
      ))}
    </div>

    <p className="firma-nombre">
      <span className="firma-nombre-texto">Healthcare Training Experience</span>
      <span className="firma-pluma" aria-hidden="true" />
    </p>
  </div>
);

export default FirmaHCE;
