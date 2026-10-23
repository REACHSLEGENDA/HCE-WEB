// Versión vieja abierta en el navegador: recarga una vez, sin ciclos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Cada import nuevo del módulo equivale a una página recién cargada.
const paginaNueva = async () => {
  vi.resetModules();
  return import('../src/lib/versionNueva.js');
};

describe('Recarga por versión nueva', () => {
  const original = window.location;
  let recargar;
  beforeEach(() => {
    recargar = vi.fn();
    delete window.location;
    window.location = { ...original, href: 'https://healthcareexp.com/nosotros', origin: 'https://healthcareexp.com', reload: recargar };
    sessionStorage.clear();
  });
  afterEach(() => { window.location = original; vi.unstubAllGlobals(); });

  it('reconoce los errores de archivos que ya no existen', async () => {
    const { esVersionVieja } = await paginaNueva();
    expect(esVersionVieja('Unable to preload CSS for /assets/ChatBot-B0jTYSZO.css')).toBe(true);
    expect(esVersionVieja('TypeError: Failed to fetch dynamically imported module: https://healthcareexp.com/assets/InstallApp-BLhZKI0p.js')).toBe(true);
    expect(esVersionVieja("TypeError: Cannot read properties of undefined (reading 'x')")).toBe(false);
  });

  it('varios archivos fallidos en la misma página: una recarga y ningún reporte', async () => {
    const { recargarPorVersionNueva } = await paginaNueva();
    expect(recargarPorVersionNueva()).toBe(true);
    expect(recargarPorVersionNueva()).toBe(true);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('si después de recargar vuelve a fallar en menos de un minuto, no recarga otra vez', async () => {
    expect((await paginaNueva()).recargarPorVersionNueva()).toBe(true);
    expect((await paginaNueva()).recargarPorVersionNueva()).toBe(false);
    expect(recargar).toHaveBeenCalledTimes(1);
  });

  it('distingue la red del celular de un archivo que de verdad falta', async () => {
    const { archivoExiste } = await paginaNueva();
    const msg = 'TypeError: Failed to fetch dynamically imported module: https://healthcareexp.com/assets/Consultas-C5e10hgo.js';
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'application/javascript' }) })));
    expect(await archivoExiste(msg)).toBe(true);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, headers: new Headers({ 'content-type': 'text/html' }) })));
    expect(await archivoExiste(msg)).toBe(false);
    expect(await archivoExiste('TypeError: Importing a module script failed.')).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/css' }) })));
    expect(await archivoExiste('Unable to preload CSS for /assets/InstallApp-CyU2CgQm.css')).toBe(true);
  });

  it('si Vite entrega undefined en vez del módulo, no llega a React', async () => {
    const { conReintento, recargarPorVersionNueva } = await paginaNueva();
    const cargar = vi.fn(async () => undefined);
    await expect(conReintento(cargar, { intentos: 1, esperaMs: 1 })).rejects.toThrow(/dynamically imported module/);
    expect(cargar).toHaveBeenCalledTimes(2);
    // Con la recarga en camino, la carga se queda esperando (no pinta un error).
    recargarPorVersionNueva();
    const pendiente = await Promise.race([conReintento(cargar, { intentos: 0 }).then(() => 'resuelta'), new Promise((ok) => setTimeout(() => ok('esperando'), 30))]);
    expect(pendiente).toBe('esperando');
  });
});
