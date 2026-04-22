import React from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PrivacyPolicy.css';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-page">
      <Navbar />
      
      <main className="privacy-container">
        <header className="privacy-header">
          <h1>AVISO DE PRIVACIDAD</h1>
          <p className="last-update">Última actualización: 15/04/2024</p>
        </header>

        <section className="privacy-section">
          <h2>¿Para qué fines utilizaremos sus datos personales?</h2>
          <p>
            Los datos personales que recabamos de usted, los utilizaremos para las siguientes finalidades que 
            son necesarias para el entrenamiento que solicita:
          </p>
          <ul>
            <li>Para dar contestación a sus dudas, consultas y comentarios.</li>
            <li>Hacer consultas, investigaciones y revisiones en relación a sus quejas o sugerencias.</li>
            <li>Comunicar los precios de los entrenamientos y descuentos vigentes en cada momento.</li>
            <li>Realización de los entrenamientos, facturas y notificaciones.</li>
            <li>Transmisión de información a nuestros proveedores, exclusivamente en cuanto sea necesario para el cumplimiento de las obligaciones frente a los participantes de los entrenamientos o las autoridades.</li>
            <li>Diseño de entrenamientos especiales.</li>
            <li>Registro y alta de los participantes.</li>
            <li>Contactar al titular para cualquier tema relacionado con los entrenamientos o el presente aviso de privacidad.</li>
            <li>Poner a disposición del participante el calendario programado para los entrenamientos y demás información necesaria para el desarrollo de los mismos.</li>
            <li>Actividades complementarias necesarias para la realización de los fines anteriores.</li>
          </ul>
          
          <p className="mt-4">
            De manera adicional, utilizaremos su información personal para las siguientes finalidades 
            secundarias que no son necesarias para el servicio solicitado, pero que nos permiten y facilitan 
            brindarle una mejor atención:
          </p>
          <ul>
            <li>Publicidad, mercadotecnia, prospección comercial, promociones y elaboración de propuestas para los participantes para el desarrollo y ofrecimiento de nuevos entrenamientos, realización de encuestas, creación o implementación de procesos analíticos y estadísticos relacionados con los entrenamientos.</li>
          </ul>
          <p className="note">
            La negativa para el uso de sus datos personales para estas finalidades no podrá ser un motivo 
            para que le neguemos el acceso a nuestros entrenamientos.
          </p>
        </section>

        <section className="privacy-section">
          <h2>¿Qué datos personales utilizaremos para estos fines?</h2>
          <p>
            Para llevar a cabo las finalidades descritas en el presente aviso de privacidad, utilizaremos los 
            siguientes datos personales:
          </p>
          <ul>
            <li>Datos de identificación</li>
            <li>Datos de contacto</li>
            <li>Datos laborales</li>
            <li>Datos académicos</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>¿Con quién compartimos su información personal y para qué fines?</h2>
          <p>
            Le informamos que sus datos personales son compartidos fuera del país con las siguientes personas, 
            empresas, organizaciones o autoridades distintas a nosotros, para los siguientes fines:
          </p>
          <div className="table-responsive">
            <table className="privacy-table">
              <thead>
                <tr>
                  <th>Destinatario de los datos personales</th>
                  <th>Finalidad</th>
                  <th>Requiere del consentimiento</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PRACTICO SANTÉ SAS</td>
                  <td>Activación del entrenamiento a través de simulador de escenarios clínicos virtuales.</td>
                  <td>No</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="privacy-section">
          <h2>¿Cómo puede acceder, rectificar o cancelar sus datos personales, u oponerse a su uso?</h2>
          <p>
            Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y 
            las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de 
            su información personal en caso de que esté desactualizada, sea inexacta o incompleta 
            (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que la 
            misma no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus 
            datos personales para fines específicos (Oposición). Estos derechos se conocen como derechos 
            ARCO.
          </p>
          <p>
            Para el ejercicio de cualquiera de los derechos ARCO, usted deberá presentar la solicitud 
            respectiva a través del siguiente medio: 
            <strong> enviando un correo a info@healthcareexp.com</strong>
          </p>
          <p>
            Con relación al procedimiento y requisitos para el ejercicio de sus derechos ARCO, le informamos 
            lo siguiente:
          </p>
          <ol type="a">
            <li>
              <strong>¿A través de qué medios pueden acreditar su identidad el titular y, en su caso, su representante, así como la personalidad este último?</strong><br />
              A través del correo electrónico: info@healthcareexp.com
            </li>
            <li>
              <strong>¿Qué información y/o documentación deberá contener la solicitud?</strong>
              <ul>
                <li>Nombre completo del titular de los datos personales, documentos que acrediten la identidad del titular. En su caso, nombre completo del representante del titular y documentos para acreditar su identidad y personalidad, domicilio o cualquier medio para recibir notificaciones.</li>
                <li>Descripción clara y precisa de los datos personales que se quieran rectificar, cancelar, u oponerse a su tratamiento.</li>
                <li>Descripción del derecho que quiere ejercer o de lo que solicita el titular, en su caso, documentos o información que faciliten la localización de los datos personales.</li>
              </ul>
            </li>
            <li>
              <strong>¿En cuántos días le daremos respuesta a su solicitud?</strong><br />
              20 días hábiles contados a partir del día en que se recibe la solicitud.
            </li>
            <li>
              <strong>¿Por qué medio le comunicaremos la respuesta a su solicitud?</strong><br />
              Vía correo electrónico.
            </li>
          </ol>
          <p>
            Los datos de contacto de la persona o departamento de datos personales, que está a cargo de dar 
            trámite a las solicitudes de derechos ARCO, son los siguientes:
          </p>
          <ul className="contact-list">
            <li><strong>Nombre:</strong> Jenifer Trejo</li>
            <li><strong>Domicilio:</strong> Del tordillo 63, Villas de la Hacienda, Adolfo López Mateos, Atizapán de Zaragoza, C.P. 52929, Estado de México, México</li>
            <li><strong>Correo electrónico:</strong> info@healthcareexp.com</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>Usted puede revocar su consentimiento para el uso de sus datos personales</h2>
          <p>
            Usted puede revocar el consentimiento que, en su caso, nos haya otorgado para el tratamiento de 
            sus datos personales. Sin embargo, es importante que tenga en cuenta que no en todos los casos 
            podremos atender su solicitud o concluir el uso de forma inmediata, ya que es posible que por 
            alguna obligación legal requiramos seguir tratando sus datos personales. Asimismo, usted deberá 
            considerar que para ciertos fines, la revocación de su consentimiento implicará que no le podamos 
            seguir prestando el servicio que nos solicitó, o la conclusión de su relación con nosotros.
          </p>
          <p>
            Para revocar su consentimiento deberá presentar su solicitud a través del siguiente medio:<br />
            <strong>a través del correo: info@healthcareexp.com</strong>
          </p>
        </section>

        <section className="privacy-section">
          <h2>¿Cómo puede limitar el uso o divulgación de su información personal?</h2>
          <p>
            Con objeto de que usted pueda limitar el uso y divulgación de su información personal, le 
            ofrecemos los siguientes medios: 
            <strong> mediante correo electrónico: info@healthcareexp.com</strong>
          </p>
        </section>

        <section className="privacy-section">
          <h2>El uso de tecnologías de rastreo en nuestro portal de internet</h2>
          <p>
            Le informamos que en nuestra página de internet utilizamos cookies, u otras tecnologías, a través 
            de las cuales es posible monitorear su comportamiento como usuario de internet, así como brindarle 
            un mejor servicio y experiencia al navegar en nuestra página. Los datos personales que recabamos 
            a través de estas tecnologías, los utilizaremos para los siguientes fines:
          </p>
          <ul>
            <li>Registro y activación de la cuenta</li>
          </ul>
          <p>
            Los datos personales que obtenemos de estas tecnologías de rastreo son los siguientes:
          </p>
          <ul>
            <li>Identificadores, nombre de usuario y contraseñas de una sesión</li>
            <li>Región en la que se encuentra el usuario</li>
            <li>Fecha y hora del inicio o final de una sesión de un usuario.</li>
          </ul>
        </section>

        <section className="privacy-section">
          <h2>¿Cómo puede conocer los cambios en este aviso de privacidad?</h2>
          <p>
            El presente aviso de privacidad puede sufrir modificaciones, cambios o actualizaciones derivadas 
            de nuevos requerimientos legales; de nuestras propias necesidades por los productos o servicios 
            que ofrecemos; de nuestras prácticas de privacidad; de cambios en nuestro modelo de negocio, o 
            por otras causas.
          </p>
          <p>
            Nos comprometemos a mantenerlo informado sobre los cambios que pueda sufrir el presente aviso 
            de privacidad, a través de la página de internet.
          </p>
          <p>
            El procedimiento a través del cual se llevarán a cabo las notificaciones sobre cambios o 
            actualizaciones al presente aviso de privacidad es el siguiente: 
            <strong> A través de la página de internet</strong>
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
