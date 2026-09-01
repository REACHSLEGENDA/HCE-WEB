import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useSEO } from '../hooks/useSEO';
import './PrivacyPolicy.css';

/* ---------------------------------------------------------------------------
 * Terminos y Condiciones.
 *
 * Antes de esta pagina, la casilla de consentimiento pedia aceptar unos
 * "Terminos y Condiciones" que no existian en ninguna parte del sitio, y el pie
 * de pagina tenia un enlace "Terminos" apuntando a href="#".
 *
 * El contenido sale del documento "Leyendas web y presentaciones HCE", que
 * indica explicitamente que estos apartados pertenecen aqui:
 *   A.4 requisitos de constancia  -> "repetido en los Terminos y Condiciones"
 *   A.5 modificaciones al programa -> "Donde va: Terminos y Condiciones"
 *   A.6 cancelaciones              -> "documento propio, enlazado desde el checkout"
 * Se suman A.1 (acceso y contenidos) y A.7 (requisitos tecnicos), que ya estaban
 * en el checkout y son condiciones de uso.
 *
 * PENDIENTE DE LOS ABOGADOS — ningun documento entregado cubre estos puntos, y
 * NO se inventaron. Deben agregarse antes de considerar el documento completo:
 *   - Ley aplicable y jurisdiccion
 *   - Condiciones de pago (moneda, impuestos, facturacion, cargos fallidos)
 *   - Propiedad intelectual a detalle
 *   - Limitacion de responsabilidad
 *   - Acuerdo de Confidencialidad (documento aparte, tambien referido en la
 *     casilla de consentimiento y tampoco publicado)
 *   - Las cifras del apartado A.4: porcentaje de asistencia y calificacion
 *     minima, que en el documento siguen entre corchetes.
 * ------------------------------------------------------------------------ */

const TerminosCondiciones = () => {
  useSEO({
    title: 'Términos y Condiciones',
    description:
      'Condiciones de acceso, constancias, cancelaciones y requisitos técnicos de los programas de Healthcare Training Experience, S.C.',
  });

  return (
    <div className="privacy-page">
      <Navbar />

      <main className="privacy-container">
        <header className="privacy-header">
          <h1>TÉRMINOS Y CONDICIONES</h1>
          <p className="last-update">Healthcare Training Experience, S.C.</p>
        </header>

        <section className="privacy-section">
          <h2>1. Acceso a los programas y uso de los contenidos</h2>
          <p>
            El acceso a nuestros programas es personal e intransferible. Los contenidos,
            materiales y grabaciones están protegidos por la Ley Federal del Derecho de Autor
            y se te otorgan bajo una licencia de uso individual con fines formativos.
          </p>
          <p>
            Compartir tus credenciales o reproducir, distribuir o publicar los materiales dará
            lugar a la cancelación de tu acceso, sin perjuicio de las acciones legales que
            correspondan.
          </p>
        </section>

        <section className="privacy-section">
          <h2>2. Constancia de participación</h2>
          <p>
            La constancia de participación se emite a quienes acrediten el porcentaje mínimo
            de asistencia a las sesiones y aprueben la evaluación final con la calificación
            mínima establecida para cada programa, que se informa al participante al inicio
            del mismo.
          </p>
          <p className="note">
            El pago de la inscripción no sustituye el cumplimiento de estos requisitos.
          </p>
        </section>

        <section className="privacy-section">
          <h2>3. Modificaciones al programa</h2>
          <p>
            Healthcare Training Experience, S.C. podrá ajustar fechas, horarios, sede y cuadro
            docente por causas justificadas, notificando a los participantes al correo
            registrado con la mayor anticipación posible. Si el ajuste modifica sustancialmente
            el programa contratado, el participante podrá optar por la reprogramación sin costo
            a la siguiente edición.
          </p>
        </section>

        <section className="privacy-section">
          <h2>4. Política de cancelaciones</h2>

          <h3>Cancelación por el participante</h3>
          <p>
            La inscripción no es reembolsable. Por única ocasión, el participante podrá
            solicitar su reprogramación a la siguiente edición del programa, cubriendo en su
            caso la diferencia de precio.
          </p>

          <h3>Cancelación por Healthcare Training Experience, S.C.</h3>
          <p>
            Si el programa se cancela por causas atribuibles a Healthcare Training Experience,
            S.C., el participante conserva su lugar mediante reprogramación sin costo a la
            siguiente edición.
          </p>

          <h3>Suspensión por uso indebido</h3>
          <p>
            El incumplimiento de las condiciones de acceso y confidencialidad dará lugar a la
            suspensión del acceso al programa, sin que proceda devolución respecto de la parte
            ya impartida.
          </p>
        </section>

        <section className="privacy-section">
          <h2>5. Requisitos técnicos</h2>
          <p>
            Para participar necesitas conexión a internet estable, navegador actualizado y
            equipo con cámara y micrófono. Healthcare Training Experience, S.C. no es
            responsable por fallas en el equipo, la conexión o los servicios de terceros del
            participante.
          </p>
        </section>

        <section className="privacy-section">
          <h2>6. Facturación</h2>
          <p>
            Si requieres factura, solicítala dentro del mes calendario en que realizaste el
            pago desde nuestro{' '}
            <a href="/facturacion">formulario de facturación</a>, adjuntando tu Constancia de
            Situación Fiscal vigente. Concluido el mes no será posible emitirla.
          </p>
        </section>

        <section className="privacy-section">
          <h2>7. Datos personales</h2>
          <p>
            El tratamiento de tus datos personales se rige por nuestro{' '}
            <a href="/aviso-de-privacidad">Aviso de Privacidad</a>, que forma parte integrante
            de estos Términos y Condiciones.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TerminosCondiciones;
