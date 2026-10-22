// Aviso automático de errores: filtro de ruido, límites y huella del servidor.
import { describe, it, expect, beforeEach } from 'vitest';
import { esRuido, limpiar, reportarError } from '../src/lib/reporteErrores';
import { huellaDe, normalizarRuta, primeraLineaStack, navegadorDe, limpiarTexto, handler } from '../netlify/functions/reportar-error.js';
import { simulado } from './simulador.js';

describe('reporteErrores (navegador)', () => {
  beforeEach(() => { window.history.replaceState(null, '', '/classroom/7?token=secreto#access_token=abc'); });

  it('filtra el ruido conocido', () => {
    expect(esRuido({ mensaje: 'ResizeObserver loop completed with undelivered notifications.' })).toBe(true);
    expect(esRuido({ mensaje: 'Script error.' })).toBe(true);
    expect(esRuido({ mensaje: 'AbortError: The user aborted a request.' })).toBe(true);
    expect(esRuido({ mensaje: 'TypeError: Failed to fetch' })).toBe(true);
    expect(esRuido({ mensaje: 'x', stack: 'at y (chrome-extension://abc/content.js:1:1)' })).toBe(true);
    expect(esRuido({ mensaje: 'Error raro', archivo: 'https://www.googletagmanager.com/gtm.js' })).toBe(true);
    expect(esRuido({ mensaje: 'Object Not Found Matching Id:7, MethodName:simulateEvent, ParamCount:1' })).toBe(true);
    expect(esRuido({ mensaje: 'Object Not Found Matching Id:2, MethodName:update, ParamCount:4' })).toBe(true);
    expect(esRuido({ mensaje: "ReferenceError: Cannot access 'x' before initialization" })).toBe(false);
    expect(esRuido({ mensaje: 'TypeError: Failed to fetch dynamically imported module: https://healthcareexp.com/assets/a.js' })).toBe(false);
  });

  it('quita correos, tokens y parámetros de las URLs', () => {
    const t = limpiar('Falló para ana@correo.com en https://healthcareexp.com/x?token=abc#h eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghij', 500);
    expect(t).not.toMatch(/ana@correo/);
    expect(t).not.toMatch(/token=abc/);
    expect(t).not.toMatch(/eyJhbGci/);
  });

  it('manda la ruta sin query ni hash, una sola vez por error y con tope por sesión', async () => {
    const enviados = [];
    simulado.netlify['reportar-error'] = ({ cuerpo }) => { enviados.push(cuerpo); return { ok: true }; };
    const error = new Error('Falla de prueba única');
    const cuerpo = reportarError(error, { origen: 'render', forzar: true });
    expect(cuerpo.ruta).toBe('/classroom/7');
    expect(reportarError(error, { forzar: true })).toBeNull(); // duplicado
    for (let i = 0; i < 20; i += 1) reportarError(new Error(`Otra falla ${'x'.repeat(i)}`), { forzar: true });
    await new Promise((r) => setTimeout(r, 50));
    expect(enviados.length).toBeLessThanOrEqual(8);
    expect(enviados[0].mensaje).toBe('Falla de prueba única');
  });

  it('no reporta fuera de producción salvo que se fuerce', () => {
    expect(reportarError(new Error('En desarrollo'))).toBeNull();
  });
});

describe('reportar-error (servidor)', () => {
  it('agrupa por mensaje + primera línea del stack + ruta normalizada', () => {
    const stack = "ReferenceError: Cannot access 'a' before initialization\n    at Classroom (https://healthcareexp.com/assets/Classroom-x1.js:10:20)";
    const a = huellaDe({ mensaje: 'Fallo 12', stack, ruta: '/classroom/12' });
    const b = huellaDe({ mensaje: 'Fallo 15', stack, ruta: '/classroom/99?x=1' });
    const c = huellaDe({ mensaje: 'Fallo 12', stack, ruta: '/dashboard' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(normalizarRuta('/classroom/12?token=1')).toBe('/classroom/:id');
    expect(primeraLineaStack(stack)).toBe('at Classroom (/assets/Classroom-x1.js:10:20)');
  });

  it('resume el navegador y limpia datos sensibles', () => {
    expect(navegadorDe('Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36')).toBe('Chrome 141 · Android');
    expect(navegadorDe('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('Safari 18 · iOS');
    expect(limpiarTexto('x pepe@a.com sk_live_abc 1234567890123', 100)).toBe('x [correo] [llave] [num]');
  });

  it('rechaza cuerpos inválidos o demasiado grandes', async () => {
    expect((await handler({ httpMethod: 'GET', headers: {} })).statusCode).toBe(405);
    expect((await handler({ httpMethod: 'POST', headers: {}, body: '{' })).statusCode).toBe(400);
    expect((await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ mensaje: '' }) })).statusCode).toBe(400);
    expect((await handler({ httpMethod: 'POST', headers: {}, body: 'x'.repeat(20000) })).statusCode).toBe(413);
  });

  it('limita la tasa por IP', async () => {
    const evento = { httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': '203.0.113.9' }, body: JSON.stringify({ mensaje: 'Error de prueba', ruta: '/' }) };
    const codigos = [];
    for (let i = 0; i < 25; i += 1) codigos.push((await handler(evento)).statusCode);
    expect(codigos).toContain(429);
  });
});
