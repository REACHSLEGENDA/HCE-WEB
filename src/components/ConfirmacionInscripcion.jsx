import { Link } from 'react-router-dom';

/* ---------------------------------------------------------------------------
 * Apartado A.8 del documento "Leyendas web y presentaciones HCE":
 * confirmacion de inscripcion.
 *
 * El plazo de entrega de credenciales cambia por programa (30 dias naturales
 * para el Diploma de Paris, 3 para ECMO Nursing), asi que viaja como prop en
 * lugar de estar escrito en el texto.
 *
 * La factura se solicita desde el formulario del sitio y no por correo: HCE
 * pidio enlazar la pagina en lugar de publicar una direccion.
 * ------------------------------------------------------------------------ */

const ConfirmacionInscripcion = ({ diasCredenciales }) => (
  <div className="ins-result-legal">
    <p>
      Tu inscripción quedó registrada. Recibirás tus credenciales de acceso en el correo
      que proporcionaste, a más tardar <strong>{diasCredenciales} días</strong> antes del
      inicio del programa. El acceso es personal e intransferible.
    </p>
    <p>
      Si requieres factura, solicítala dentro del mes calendario en que realizaste el pago
      desde el <Link to="/facturacion">formulario de facturación</Link>, adjuntando tu
      Constancia de Situación Fiscal vigente. Concluido el mes no será posible emitirla.
    </p>
  </div>
);

export default ConfirmacionInscripcion;
