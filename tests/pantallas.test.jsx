// Pruebas de humo: MONTAN las pantallas clave con Supabase y sesión simulados
// y fallan si alguna truena al dibujarse o al cambiar de pestaña (como el
// error de TDZ que dejó el aula en blanco en producción).

import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { NotificationProvider } from '../src/context/NotificationContext';
import { ADMIN, ALUMNO, sesionComo, simulado } from './simulador.js';

vi.mock('../src/context/AuthContext', async () => {
  const { authSimulado } = await import('./simulador.js');
  return {
    useAuth: () => authSimulado.valor,
    AuthProvider: ({ children }) => children,
  };
});

// ---- Captura de errores --------------------------------------------------
let errores = [];
const alError = (evento) => errores.push(evento.error || new Error(evento.message));
beforeEach(() => {
  errores = [];
  window.addEventListener('error', alError);
});
afterEach(() => window.removeEventListener('error', alError));

class Atrapa extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { errores.push(Object.assign(error, { componentStack: info?.componentStack })); }
  render() { return this.state.error ? <p data-testid="pantalla-rota">La pantalla tronó</p> : this.props.children; }
}

const describir = (e) => `${e?.name || 'Error'}: ${e?.message}\n${String(e?.stack || '').split('\n').slice(1, 6).join('\n')}${e?.componentStack ? `\nComponentes:${String(e.componentStack).split('\n').slice(0, 6).join('\n')}` : ''}`;

function sinErrores(donde) {
  if (errores.length) {
    throw new Error(`La pantalla tronó (${donde}):\n${errores.map(describir).join('\n---\n')}`);
  }
}

// Deja correr las promesas y temporizadores cortos (datos simulados).
async function esperar(vueltas = 8) {
  for (let i = 0; i < vueltas; i += 1) {
    await act(async () => { await new Promise((r) => setTimeout(r, 25)); });
  }
}

async function montar(elemento, { ruta = '/', patron = '/' } = {}) {
  window.history.replaceState(null, '', ruta);
  let resultado;
  await act(async () => {
    resultado = render(
      <MemoryRouter initialEntries={[ruta]}>
        <NotificationProvider>
          <Atrapa>
            <Suspense fallback={<p>Cargando…</p>}>
              <Routes>
                <Route path={patron} element={elemento} />
                <Route path="*" element={<p data-testid="otra-ruta">Otra ruta</p>} />
              </Routes>
            </Suspense>
          </Atrapa>
        </NotificationProvider>
      </MemoryRouter>,
    );
  });
  await esperar();
  sinErrores(`al montar ${ruta}`);
  expect(resultado.queryByTestId('pantalla-rota')).toBeNull();
  expect(resultado.container.textContent.trim().length).toBeGreaterThan(20);
  return resultado;
}

async function clic(elemento, donde) {
  await act(async () => { fireEvent.click(elemento); });
  await esperar(4);
  sinErrores(donde);
}

const texto = (el) => (el.textContent || el.getAttribute('aria-label') || el.title || '').trim();
const PELIGROSOS = /cerrar sesi|salir|eliminar|borrar|desinscrib/i;

// Recorre todos los botones de los menús <nav> (re-buscándolos cada vez,
// porque la pantalla se vuelve a dibujar) y regresa los que visitó.
async function recorrerMenu(container, donde) {
  const etiquetas = [...new Set([...container.querySelectorAll('nav button')].map(texto).filter((t) => t && !PELIGROSOS.test(t)))];
  const visitadas = [];
  for (const etiqueta of etiquetas) {
    const boton = [...container.querySelectorAll('nav button')].find((b) => texto(b) === etiqueta);
    if (!boton) continue;
    await clic(boton, `${donde} → pestaña "${etiqueta}"`);
    visitadas.push(etiqueta);
  }
  return visitadas;
}

// ---- Páginas públicas ------------------------------------------------------
describe('Páginas públicas', () => {
  beforeEach(() => sesionComo(null));

  it('Home (/)', async () => {
    const { default: Home } = await import('../src/pages/Home');
    await montar(<Home />);
  });

  it('Login (/login)', async () => {
    const { default: Login } = await import('../src/pages/Login');
    const { container } = await montar(<Login />, { ruta: '/login', patron: '/login' });
    expect(container.querySelector('input[type="email"], input[type="password"]')).not.toBeNull();
  });

  it('Inscripciones Step 1 (/inscripciones-step1)', async () => {
    const { default: InscripcionesStep1 } = await import('../src/pages/InscripcionesStep1');
    await montar(<InscripcionesStep1 />, { ruta: '/inscripciones-step1', patron: '/inscripciones-step1' });
  });

  it('Alumni Pass (/alumni-pass-step1)', async () => {
    simulado.netlify['alumni-pass'] = { ok: true, presencial: { total: 30, ocupados: 3, restantes: 27, pagados: 3 } };
    const { default: AlumniPass } = await import('../src/pages/AlumniPass');
    await montar(<AlumniPass />, { ruta: '/alumni-pass-step1', patron: '/alumni-pass-step1' });
  });

  // Solo si ya existe la página de verificación de certificados.
  const verificar = import.meta.glob('../src/pages/VerificarCertificado.jsx');
  const cargarVerificar = Object.values(verificar)[0];
  it.skipIf(!cargarVerificar)('Verificar certificado (/verificar/:folio)', async () => {
    simulado.netlify['certificado-verificar'] = {
      certificado: {
        titular: 'Alumna de Prueba', curso: 'ECMO básico de prueba', emitido_en: new Date().toISOString(),
        vigencia: { estado: 'permanente' }, folio: 'FOL-000123',
      },
    };
    const { default: VerificarCertificado } = await cargarVerificar();
    const { container } = await montar(<VerificarCertificado />, { ruta: '/verificar/FOL-000123', patron: '/verificar/:folio' });
    expect(container.textContent).toContain('FOL-000123');
  });
});

// ---- Portal del alumno ----------------------------------------------------
describe('Portal del alumno', () => {
  beforeEach(() => sesionComo(ALUMNO));

  it('Dashboard: monta y recorre todas las pestañas del menú', async () => {
    const { default: Dashboard } = await import('../src/pages/Dashboard');
    const { container } = await montar(<Dashboard />, { ruta: '/dashboard', patron: '/dashboard' });
    const visitadas = await recorrerMenu(container, 'Dashboard del alumno');
    expect(visitadas.length, `pestañas visitadas: ${visitadas.join(', ')}`).toBeGreaterThanOrEqual(5);
  });

  it('Classroom: curso con lecciones (sección, video, lectura y tarea)', async () => {
    const { default: Classroom } = await import('../src/pages/Classroom');
    const { container } = await montar(<Classroom />, { ruta: '/classroom/7', patron: '/classroom/:id' });
    // Prueba que sí llegó a dibujar el curso con su temario (no un aviso de acceso).
    expect(container.textContent).toContain('Lectura de apoyo');
    for (const titulo of ['Lectura de apoyo', 'Tarea final', 'Introducción en video']) {
      const boton = [...container.querySelectorAll('button, a, [role="button"]')].find((b) => (b.textContent || '').includes(titulo));
      if (boton) await clic(boton, `Classroom → lección "${titulo}"`);
    }
  });
});

// ---- Panel del administrador ---------------------------------------------
describe('Panel del administrador', () => {
  beforeEach(() => sesionComo(ADMIN));

  it('AdminDashboard: monta y recorre todas las pestañas del menú', async () => {
    const { default: AdminDashboard } = await import('../src/pages/AdminDashboard');
    const { container } = await montar(<AdminDashboard />, { ruta: '/admin', patron: '/admin' });
    const visitadas = await recorrerMenu(container, 'AdminDashboard');
    expect(visitadas.length, `pestañas visitadas: ${visitadas.join(', ')}`).toBeGreaterThanOrEqual(8);
  });

  it('AdminDashboard → Cursos: abre el editor y recorre sus pestañas', async () => {
    try { localStorage.setItem('adminActiveTab', 'courses'); } catch { /* sin almacenamiento */ }
    const { default: AdminDashboard } = await import('../src/pages/AdminDashboard');
    const utilidades = await montar(<AdminDashboard />, { ruta: '/admin', patron: '/admin' });

    const editar = utilidades.queryAllByRole('button', { name: /Editar ECMO básico de prueba/i })[0]
      || [...utilidades.container.querySelectorAll('button')].find((b) => /^Editar/i.test(texto(b)));
    expect(editar, 'No se encontró el botón para editar el curso en la lista de Cursos').toBeTruthy();
    await clic(editar, 'Cursos → Editar curso');

    const lista = utilidades.getByRole('tablist', { name: /Secciones del curso/i });
    const pestanas = within(lista).getAllByRole('tab').map(texto);
    expect(pestanas.length).toBeGreaterThanOrEqual(6);
    for (const etiqueta of pestanas) {
      const tab = within(utilidades.getByRole('tablist', { name: /Secciones del curso/i }))
        .getAllByRole('tab').find((t) => texto(t) === etiqueta);
      await clic(tab, `Editor de curso → pestaña "${etiqueta}"`);
    }
  });

  it('AdminDashboard → Cursos: editor de curso nuevo', async () => {
    try { localStorage.setItem('adminActiveTab', 'courses'); } catch { /* sin almacenamiento */ }
    const { default: AdminDashboard } = await import('../src/pages/AdminDashboard');
    const utilidades = await montar(<AdminDashboard />, { ruta: '/admin', patron: '/admin' });
    const crear = [...utilidades.container.querySelectorAll('button')].find((b) => /(Crear|Nuevo) curso/i.test(texto(b)));
    expect(crear, 'No se encontró el botón "Crear curso"').toBeTruthy();
    await clic(crear, 'Cursos → Crear curso');
    expect(utilidades.getByRole('tablist', { name: /Secciones del curso/i })).toBeTruthy();
  });

  it('Errores (Sistema → Errores): lista, detalle y aviso sin tabla', async () => {
    const { default: ErroresAdmin } = await import('../src/components/admin/ErroresAdmin');
    simulado.tablas.errores_cliente = [{
      id: 1, huella: 'abc', mensaje: "ReferenceError: Cannot access 'x' before initialization", stack: 'at Classroom (Classroom-abc.js:1:2)',
      componente: '\n    at Classroom', ruta: '/classroom/:id', origen: 'render', version: 'index-abc.js', navegador: 'Chrome 141 · Android',
      user_agent: 'Mozilla/5.0', ultimo_user_id: ALUMNO.id, veces: 12, primera_vez: new Date().toISOString(),
      ultima_vez: new Date().toISOString(), correo_enviado_en: null, resuelto: false,
    }];
    const notificar = vi.fn();
    const utilidades = await montar(<ErroresAdmin notificar={notificar} />);
    expect(utilidades.container.textContent).toContain('before initialization');
    await clic(utilidades.getByRole('button', { name: /Ver detalle/i }), 'Errores → Ver detalle');
    expect(utilidades.container.textContent).toContain('Classroom-abc.js');
    await clic(utilidades.getByRole('button', { name: /Marcar como resuelto/i }), 'Errores → Marcar resuelto');
    expect(notificar).toHaveBeenCalled();
    utilidades.unmount();

    delete simulado.tablas.errores_cliente;
    const sinTabla = await montar(<ErroresAdmin notificar={notificar} />);
    expect(sinTabla.container.textContent).toContain('supabase/errores.sql');
  });
});
