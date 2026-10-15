// Preparación común de las pruebas (vitest + jsdom).
// Corre ANTES de importar cualquier pantalla: supabase-js toma `fetch` al crear
// el cliente, así que el simulado tiene que estar puesto desde aquí.

import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { fetchSimulado, reiniciarSimulado } from './simulador.js';

globalThis.fetch = vi.fn(fetchSimulado);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Como en index.html: hay al menos un <script> (el aula inserta la API de
// YouTube antes del primero).
if (!document.querySelector('script')) {
  const script = document.createElement('script');
  script.type = 'module';
  document.head.appendChild(script);
}

// Lo que jsdom no trae y las pantallas usan.
const sinUso = () => {};
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false, media: query, onchange: null,
    addListener: sinUso, removeListener: sinUso, addEventListener: sinUso, removeEventListener: sinUso, dispatchEvent: () => false,
  });
}
class ObservadorFalso {
  constructor(cb) { this.cb = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}
globalThis.IntersectionObserver = globalThis.IntersectionObserver || ObservadorFalso;
globalThis.ResizeObserver = globalThis.ResizeObserver || ObservadorFalso;
window.IntersectionObserver = globalThis.IntersectionObserver;
window.ResizeObserver = globalThis.ResizeObserver;
window.scrollTo = sinUso;
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || sinUso;
Element.prototype.scrollTo = Element.prototype.scrollTo || sinUso;
HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = sinUso;
HTMLMediaElement.prototype.load = sinUso;
HTMLCanvasElement.prototype.getContext = () => null;
URL.createObjectURL = URL.createObjectURL || (() => 'blob:prueba');
URL.revokeObjectURL = URL.revokeObjectURL || sinUso;
window.confirm = () => true;
window.alert = sinUso;
if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true });
}

// La consola de las pantallas (avisos de datos faltantes, etc.) no ensucia la
// salida; los errores reales los atrapa el límite de errores de cada prueba.
vi.spyOn(console, 'warn').mockImplementation(sinUso);
vi.spyOn(console, 'error').mockImplementation(sinUso);
vi.spyOn(console, 'log').mockImplementation(sinUso);
vi.spyOn(console, 'info').mockImplementation(sinUso);

beforeEach(() => {
  reiniciarSimulado();
  try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin almacenamiento */ }
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  cleanup();
});
