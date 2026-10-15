# Alumni Pass: Step 1 Refresher (material de difusión)

Evento exclusivo para exalumnos del Diploma Internacional de París en ECMO (Step 1). 28 y 29 de octubre de 2026.
Inscripción: https://healthcareexp.com/alumni-pass-step1

## Archivos de esta carpeta

| Archivo | Qué es |
|---|---|
| `alumni-pass-1080x1350.png` | Imagen vertical para redes (Instagram/Facebook feed) |
| `alumni-pass-1080x1080.png` | Imagen cuadrada para redes |
| `alumni-pass-redes.html` | Fuente de ambas imágenes. Vertical: se abre tal cual. Cuadrada: agregar `?s=1080` a la URL. Los comandos para volver a exportar con Chrome headless están en el comentario del encabezado. |
| `mensaje-whatsapp.txt` | Texto para grupos de WhatsApp |

## Correos (proyecto React Email)

Carpeta: `Desktop\Aplicación web CNADOT completa (1)\cnadot-email`

| Plantilla | HTML exportado | Uso |
|---|---|---|
| `emails/hce-alumni-pass-invitacion.tsx` | `out/hce-alumni-pass-invitacion.html` | Campaña a exalumnos |
| `emails/hce-alumni-pass-confirmacion.tsx` | `out/hce-alumni-pass-confirmacion.html` | Correo automático después del pago |

Para regenerar: `npm run export`. Pegar el HTML de `out/` en Brevo (editor de código HTML).

### Asuntos y preencabezados

- **Invitación (campaña)**
  - Asunto: `Exclusivo para alumnos: Vuelve a vivir el Step 1 con los profesores de París`
  - Preencabezado: `Cupos limitados para exalumnos | 28 y 29 de octubre (Presencial o Virtual)`
- **Confirmación (automático)**
  - Asunto: `Tu Alumni Pass está confirmado ✨`
  - Preencabezado: `Step 1 Refresher · 28 y 29 de octubre de 2026 · Guarda este correo`

Ambos HTML ya traen el preencabezado oculto. Si Brevo pide uno en su campo propio, usa el mismo texto.

## Configuración en Brevo

**Atributos de contacto** (tipo texto):

| Atributo | Valores esperados |
|---|---|
| `ALUMNI_MODALIDAD` | `Presencial` o `Virtual` |
| `ALUMNI_GRABACIONES` | `Incluidas por 1 mes` o `No incluidas` |
| `ALUMNI_FOLIO` | Folio de la inscripción |

`FIRSTNAME` ya existe.

**Listas**

- **Exalumnos de París**: es la lista a la que se envía la campaña de invitación.
- **"Alumni Pass Step 1"**: al agregar un contacto a esta lista se dispara la automatización que envía el correo de confirmación. El backend debe guardar los tres atributos `ALUMNI_*` **antes** de agregar el contacto a la lista, para que el correo salga con los datos completos.

## Flujo vigente: solicitud antes del pago

### Registro en Formularios, Formspree y Brevo

Al guardar una solicitud se crea también una fila en `form_submissions`, con una
referencia generada por el servidor para no duplicarla en reintentos. Se ve en
**Ventas → Formularios → Alumni Pass · Solicitudes**. El expediente y las decisiones
siguen en **Ventas → Alumni Pass**.

El servidor envía los datos a `https://formspree.io/f/xdeapenv` (JSON con `Accept:
application/json`) y crea/actualiza el contacto de Brevo con sus atributos existentes.
Este alta de contacto NO agrega a la lista de pagados ni dispara el pase antes del
cobro. El diploma, los enlaces de pago, tokens y archivos no se envían a Formspree:
se indica dónde revisar el documento privado en el panel.

Ambos paneles muestran los estados de registro. Si un proveedor falla, la solicitud
se conserva y se puede usar **Reintentar registros pendientes**. Una desconexión de
Formspree puede ocurrir después de que haya recibido los datos: antes de reenviar
manualmente hay que revisar su buzón para evitar duplicados. No se repite un envío
ya confirmado ni se reenvían correos de aprobación al sincronizar registros.

Comprobar al activar: formulario `xdeapenv` activo, dominio/reglas antispam compatibles
con el envío desde el servidor y espacio/cupo de envíos en la cuenta Formspree.
No se necesita una clave de lectura de Formspree para este flujo: el panel HCE lee
su propio registro de Supabase.

El exalumno envía nombre(s), apellido paterno y materno (opcional), correo,
teléfono con lada, ciudad, país de un desplegable (incluye Otro país), hospital,
especialidad, edición y diploma de Step 1. Ediciones: Septiembre 2024 INC,
Marzo 2025 INER y Chile 2025 INT. El nombre completo se conserva para el pase;
los campos separados y la edición quedan en el panel, CSV y Formspree.
La ampliación `supabase/alumni-pass-datos-diploma.sql` ya está aplicada en
Supabase (cuatro columnas adicionales; total 45). La solicitud aparece en **Ventas → Alumni Pass**.
Se intenta enviar un aviso al equipo y un acuse al solicitante; aunque falle un
correo, la solicitud permanece guardada. La aprobación envía el enlace de pago
personal. El panel muestra cuándo se envió y permite reenviar o copiar el enlace.
El rechazo incluye un motivo editable y cierra cualquier Checkout abierto.

Solo después de confirmar el pago se actualizan los atributos y se agrega el
contacto a la lista que envía el pase. El webhook firmado confirma el pago aunque
el alumno cierre la pestaña; si falla Brevo, Stripe reintenta y el panel permite
**Reintentar avisos pendientes**. El folio y el pago se conservan.

## Activación pendiente después de revisar

1. **Supabase completado el 14 de octubre de 2026.** Se ejecutó todo
   `supabase/alumni-pass.sql` en `webinars` / `hce`, proyecto
   `mxpxvtklkyvonbhqjdmq` (main/PRODUCTION). Verificado: 41 columnas, RLS,
   bucket privado, cuatro índices, funciones de reserva/liberación exclusivas
   del servidor y permisos de registro general. Se conservaron los 63 formularios
   previos; Alumni sigue sin solicitudes, pagos ni diplomas reales.
   [Verificación en Supabase](https://supabase.com/dashboard/project/mxpxvtklkyvonbhqjdmq/sql/1dfcd417-668a-4fed-9a2f-254ae03828df).
2. La lista **Alumni Pass Step 1 (#20)** está definida en `LISTS.ALUMNI_PASS`,
   en `netlify/functions/_brevo.js`, igual que las demás listas. No requiere una
   variable adicional de lista en Netlify. Confirmar `BREVO_API_KEY` y un remitente
   verificado. Opcional: `AVISO_REGISTROS_PARA` para
   destinatarios adicionales del aviso de solicitud.
3. Sustituir en Brevo el HTML de invitación y el de confirmación por los archivos
   actualizados en `cnadot-email/out/`. La confirmación ahora dice que el diploma
   ya fue validado antes de pagar. El acuse y enlace de aprobación son correos
   transaccionales del servidor y no necesitan otra automatización.
4. El endpoint `https://healthcareexp.com/.netlify/functions/stripe-webhook` debe
   recibir `checkout.session.completed` y `checkout.session.async_payment_succeeded`
   en las dos cuentas de Stripe, con sus secretos de firma en Netlify.
5. Publicar solo cuando Christian lo indique. Las pruebas locales usan datos
   sintéticos; no verifican la configuración real de estas cuentas ni envían campañas.

La automatización de Brevo se dispara al agregar el contacto a la lista. Para
repetir una prueba con un correo que ya pertenece a ella, retirarlo antes de esa
lista; un contacto ya presente no dispara otra entrada por sí solo.
