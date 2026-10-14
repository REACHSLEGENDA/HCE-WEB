import { useMemo, useState, useId } from 'react';
import { Search, ChevronDown, ArrowRight, Lightbulb, LifeBuoy, X } from 'lucide-react';
import { GUIA_ADMIN, GUIA_ALUMNO, CORREO_AYUDA } from '../data/guiaUso';
import './GuiaUso.css';

/* ---------------------------------------------------------------------------
 * Guía de uso del portal.
 *
 * Un solo componente para los dos portales: cambia el contenido según el rol y
 * hereda el tema claro/oscuro de las variables del layout donde se monta
 * (.admin-layout o .crm-layout), sin estilos de tema propios.
 *
 * Cada guía puede llevar un botón "Ir a …" que cambia de pestaña con `onIr`.
 * ------------------------------------------------------------------------ */

// "**negritas**" del contenido → <strong>. Nada más: el texto es nuestro, no
// del usuario, así que no hace falta un intérprete de markdown completo.
const conNegritas = (texto) =>
  texto.split('**').map((trozo, i) => (i % 2 ? <strong key={i}>{trozo}</strong> : trozo));

const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Guia({ guia, abierta, onAlternar, onIr }) {
  const idCuerpo = useId();
  return (
    <article className={`guia-item${abierta ? ' guia-item--abierta' : ''}`}>
      <button
        type="button"
        className="guia-cabecera"
        aria-expanded={abierta}
        aria-controls={idCuerpo}
        onClick={onAlternar}
      >
        <span className="guia-cabecera-texto">
          <span className="guia-titulo">{guia.titulo}</span>
          <span className="guia-resumen">{guia.resumen}</span>
        </span>
        <ChevronDown size={18} className="guia-flecha" aria-hidden="true" />
      </button>

      {abierta && (
        <div id={idCuerpo} className="guia-cuerpo">
          <ol className="guia-pasos">
            {guia.pasos.map((paso, i) => (
              <li key={i}>
                <span className="guia-num" aria-hidden="true">{i + 1}</span>
                <span>{conNegritas(paso)}</span>
              </li>
            ))}
          </ol>

          {guia.nota && (
            <p className="guia-nota">
              <Lightbulb size={16} aria-hidden="true" />
              <span>{conNegritas(guia.nota)}</span>
            </p>
          )}

          {guia.ir && onIr && (
            <button type="button" className="guia-ir" onClick={() => onIr(guia.ir.tab)}>
              {guia.ir.texto} <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default function GuiaUso({ rol = 'alumno', onIr }) {
  const contenido = rol === 'admin' ? GUIA_ADMIN : GUIA_ALUMNO;
  const [busqueda, setBusqueda] = useState('');
  // La primera guía arranca abierta: se ve de entrada cómo es una guía por dentro.
  const [abiertas, setAbiertas] = useState(() => new Set([contenido[0]?.guias[0]?.id]));
  // Al buscar, las guías que coinciden se abren solas; aquí van las que el
  // usuario cierra a mano durante esa búsqueda, para que el clic sí funcione.
  const [cerradasEnBusqueda, setCerradasEnBusqueda] = useState(() => new Set());

  const termino = normalizar(busqueda.trim());
  const filtrado = useMemo(() => {
    if (!termino) return contenido;
    return contenido
      .map((g) => ({
        ...g,
        guias: g.guias.filter((guia) =>
          normalizar([guia.titulo, guia.resumen, ...guia.pasos, guia.nota || ''].join(' ')).includes(termino)),
      }))
      .filter((g) => g.guias.length);
  }, [contenido, termino]);

  const alternarEn = (setter, id) => setter((actual) => {
    const nuevo = new Set(actual);
    if (nuevo.has(id)) nuevo.delete(id); else nuevo.add(id);
    return nuevo;
  });
  const alternar = (id) => alternarEn(termino ? setCerradasEnBusqueda : setAbiertas, id);
  const estaAbierta = (id) => (termino ? !cerradasEnBusqueda.has(id) : abiertas.has(id));
  const buscar = (valor) => {
    setBusqueda(valor);
    setCerradasEnBusqueda(new Set());
  };

  const total = filtrado.reduce((n, g) => n + g.guias.length, 0);

  return (
    <section className="guia" aria-labelledby="guia-titulo">
      <header className="guia-encabezado">
        <span className="guia-icono" aria-hidden="true"><LifeBuoy size={24} /></span>
        <div>
          <h2 id="guia-titulo">Guía de uso</h2>
          <p>
            {rol === 'admin'
              ? 'Paso a paso de lo que más se hace en el panel.'
              : 'Todo lo que necesitas para tomar tus cursos.'}
          </p>
        </div>
      </header>

      <div className="guia-buscador">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => buscar(e.target.value)}
          placeholder={rol === 'admin' ? 'Busca: grupo, constancia…' : 'Busca: examen, constancia…'}
          aria-label="Buscar en la guía"
        />
        {busqueda && (
          <button type="button" onClick={() => buscar('')} aria-label="Borrar búsqueda">
            <X size={16} />
          </button>
        )}
      </div>

      {termino && (
        <p className="guia-conteo" aria-live="polite">
          {total ? `${total} ${total === 1 ? 'guía' : 'guías'} con "${busqueda.trim()}"` : 'Ninguna guía coincide con tu búsqueda.'}
        </p>
      )}

      {filtrado.map((g) => (
        <div key={g.grupo} className="guia-grupo">
          <h3 className="guia-grupo-titulo">{g.grupo}</h3>
          <div className="guia-lista">
            {g.guias.map((guia) => (
              <Guia
                key={guia.id}
                guia={guia}
                // Al buscar se abren todas las que coinciden: no tiene caso
                // filtrar y luego obligar a abrir una por una.
                abierta={estaAbierta(guia.id)}
                onAlternar={() => alternar(guia.id)}
                onIr={onIr}
              />
            ))}
          </div>
        </div>
      ))}

      <footer className="guia-pie">
        ¿No encontraste lo que buscabas? Escríbenos a{' '}
        <a href={`mailto:${CORREO_AYUDA}`}>{CORREO_AYUDA}</a>
      </footer>
    </section>
  );
}
