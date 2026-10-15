/* ---------------------------------------------------------------------------
 * Motor del asistente: el único punto por donde pasa una duda escrita.
 *
 * Hoy responde con la búsqueda local (asistenteBuscar.js) sobre la base de
 * conocimiento. Está pensado para que mañana se pueda conectar una IA sin
 * tocar la interfaz:
 *
 *   import { usarProveedorRespuestas } from './data/asistenteMotor';
 *   usarProveedorRespuestas(async ({ pregunta, contexto, fuentes }) => {
 *     // Llamar a una función del servidor (nunca poner llaves en el navegador).
 *     const r = await fetch('/.netlify/functions/asistente', { ... });
 *     return { tipo: 'respuesta', texto: '...', pasos: [...], ir, fuentes: ['p-no-entro-curso'] };
 *   });
 *
 * El proveedor recibe solo datos no sensibles: la pregunta, la pantalla
 * (zona, pestaña, nombre), el rol y las entradas locales más parecidas como
 * "fuentes". Si falla o devuelve algo vacío, se usa la búsqueda local.
 *
 * NO hay ninguna IA conectada ni llaves en este proyecto.
 * ------------------------------------------------------------------------ */

import { buscar, sugerir } from './asistenteBuscar.js';
import { entradasPara, entradaPorId } from './asistenteConocimiento.js';

let proveedor = null;

/** Conecta (o quita, con null) un proveedor externo de respuestas. */
export function usarProveedorRespuestas(fn) {
  proveedor = typeof fn === 'function' ? fn : null;
}

/** Lo que sí se puede compartir de la pantalla. */
export function contextoSeguro(pantalla) {
  if (!pantalla) return { zona: 'publico', tab: null, nombre: '', roles: ['publico'] };
  return { zona: pantalla.zona, tab: pantalla.tab, nombre: pantalla.nombre, roles: pantalla.roles };
}

/**
 * Resuelve una duda escrita.
 * @returns {Promise<
 *   { tipo: 'respuesta', entrada: object, otras: object[] } |
 *   { tipo: 'resultados', resultados: object[] } |
 *   { tipo: 'sin-resultados' }
 * >}
 * En 'respuesta', `entrada` tiene la forma de una entrada de la base
 * (titulo, texto, pasos, casos, nota, ir…), venga de la base o de una IA.
 */
export async function resolverDuda(pregunta, pantalla) {
  const roles = pantalla?.roles || ['publico'];
  const encontrados = buscar(pregunta, entradasPara(roles), { pantalla: pantalla?.clave, limite: 5 });

  if (proveedor) {
    try {
      const r = await proveedor({
        pregunta: String(pregunta).slice(0, 500),
        contexto: contextoSeguro(pantalla),
        fuentes: encontrados.map(({ entrada }) => entrada),
      });
      if (r && r.tipo === 'respuesta' && (r.texto || r.pasos?.length)) {
        return {
          tipo: 'respuesta',
          entrada: { id: r.id || 'ia', tipo: 'ia', titulo: r.titulo || '', texto: r.texto, pasos: r.pasos, nota: r.nota, ir: r.ir },
          otras: (r.fuentes || []).map(entradaPorId).filter(Boolean).slice(0, 3),
        };
      }
    } catch {
      /* sin proveedor disponible: se usa la búsqueda local */
    }
  }

  if (!encontrados.length) return { tipo: 'sin-resultados' };
  const [primero, segundo] = encontrados;
  // Respuesta directa cuando la primera es claramente la mejor.
  const clara = !segundo || primero.puntaje >= segundo.puntaje * 1.35 || primero.puntaje >= 4.5;
  if (clara) {
    return { tipo: 'respuesta', entrada: primero.entrada, otras: encontrados.slice(1, 3).map((r) => r.entrada) };
  }
  return { tipo: 'resultados', resultados: encontrados.slice(0, 4).map((r) => r.entrada) };
}

/** Títulos sugeridos mientras se escribe (síncrono, solo local). */
export function sugerencias(texto, pantalla) {
  return sugerir(texto, entradasPara(pantalla?.roles || ['publico']), { pantalla: pantalla?.clave })
    .map((r) => r.entrada);
}
