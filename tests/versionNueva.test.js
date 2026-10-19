// Versión vieja abierta en el navegador: recarga una vez, sin ciclos.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { esVersionVieja, recargarPorVersionNueva } from '../src/lib/versionNueva.js';

describe('Recarga por versión nueva', () => {
  const original = window.location;
  let recargar;
  beforeEach(() => {
    recargar = vi.fn();
    delete window.location;
    window.location = { ...original, reload: recargar };
    sessionStorage.clear();
  });
  afterEach(() => { window.location = original; });

  it('reconoce los errores de archivos que ya no existen', () => {
    expect(esVersionVieja('Unable to preload CSS for /assets/ChatBot-B0jTYSZO.css')).toBe(true);
    expect(esVersionVieja('TypeError: Failed to fetch dynamically imported module: https://healthcareexp.com/assets/InstallApp-BLhZKI0p.js')).toBe(true);
    expect(esVersionVieja("TypeError: Cannot read properties of undefined (reading 'x')")).toBe(false);
  });

  it('recarga una sola vez por minuto', () => {
    expect(recargarPorVersionNueva()).toBe(true);
    expect(recargarPorVersionNueva()).toBe(false);
    expect(recargar).toHaveBeenCalledTimes(1);
  });
});
