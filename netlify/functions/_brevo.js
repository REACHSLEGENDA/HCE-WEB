// Cliente compartido de Brevo para las funciones de Netlify.
// Reemplaza a la integración anterior con Mailchimp (merge fields MMERGE* y tags).

const BREVO_API = 'https://api.brevo.com/v3';

// IDs de las listas en la cuenta de HCE. Cada lista de "Inscritos"/"Compradores"
// dispara su automatización de bienvenida; cada lista de "Carrito abandonado"
// dispara la automatización de recuperación a la hora.
export const LISTS = {
  CARRITO_PARIS:      9,
  CARRITO_NURSING:   10,
  CARRITO_SIM:       11,
  INSCRITOS_PARIS:    8,
  INSCRITOS_NURSING: 12,
  COMPRADORES_SIM:   13,
  PORTAL:            14,
  STEP1_PARIS:       15,
};

export const isConfigured = () => Boolean(process.env.BREVO_API_KEY);

async function brevoFetch(path, { method = 'POST', body } = {}) {
  const res = await fetch(`${BREVO_API}${path}`, {
    method,
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // 204 No Content (actualizaciones y altas/bajas de lista) no traen cuerpo.
  const text = res.status === 204 ? '' : await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const detail = data?.message || text || `HTTP ${res.status}`;
    const err = new Error(`Brevo ${res.status} ${path}: ${detail}`);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }

  return data;
}

// Mapea el payload de los formularios de HCE a los atributos reales de Brevo.
// Los valores vacíos se omiten a propósito: enviarlos borraría el dato que el
// contacto ya tuviera de un registro anterior.
export function buildAttributes({
  nombres, apellidos, telefono, pais, estado,
  grado, profesion, especialidad, institucion, cargo,
} = {}) {
  const attributes = {
    FIRSTNAME:    nombres,
    LASTNAME:     apellidos,
    TELEFONO:     telefono,
    PAIS:         pais,
    ESTADO:       estado,
    PROFESION:    grado || profesion,
    ESPECIALIDAD: especialidad,
    INSTITUCION:  institucion,
    JOB_TITLE:    cargo,
  };

  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
}

// Crea el contacto o actualiza sus atributos si ya existe.
// Siempre se llama ANTES de moverlo de lista, para que la automatización
// encuentre los atributos poblados al renderizar el correo.
export async function upsertContact(email, attributes = {}) {
  return brevoFetch('/contacts', {
    body: { email, attributes, updateEnabled: true },
  });
}

// Añadir a una lista es lo que dispara las automatizaciones.
export async function addToList(email, listId) {
  return brevoFetch(`/contacts/lists/${listId}/contacts/add`, {
    body: { emails: [email] },
  });
}

// Sacar de una lista no es un error si el contacto no estaba en ella:
// pasa siempre que alguien paga sin haber abandonado el carrito antes.
export async function removeFromList(email, listId) {
  try {
    return await brevoFetch(`/contacts/lists/${listId}/contacts/remove`, {
      body: { emails: [email] },
    });
  } catch (err) {
    if (err.status === 400 || err.status === 404) return null;
    throw err;
  }
}
