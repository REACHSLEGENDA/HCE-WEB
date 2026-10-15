import { beforeEach, describe, expect, it, vi } from 'vitest';

const falso = vi.hoisted(() => ({
  rpc: vi.fn(), admins: vi.fn(), enviar: vi.fn(), usuario: vi.fn(), configurado: vi.fn(), correoListo: vi.fn(),
}));
vi.mock('../netlify/functions/_supabase.js', () => ({
  isConfigured: falso.configurado,
  admin: () => ({ rpc: falso.rpc, from: () => ({ select: () => ({ eq: () => ({ eq: falso.admins }) }) }) }),
  usuarioDesdeToken: falso.usuario,
  esEsquemaFaltante: e => ['42P01', 'PGRST202'].includes(e?.code),
  json: (statusCode, cuerpo) => ({ statusCode, body: JSON.stringify(cuerpo) }),
}));
vi.mock('../netlify/functions/_brevo.js', () => ({ enviarCorreo: falso.enviar, isConfigured: falso.correoListo }));
vi.mock('../netlify/functions/_notificaciones.js', () => ({ plantillaHce: (texto, opciones) => texto + opciones.enlace }));
import { handler } from '../netlify/functions/reportar-error';

const evento = mensaje => ({ httpMethod: 'POST', headers: { 'x-nf-client-connection-ip': 'prueba-local', authorization: 'Bearer token-prueba' }, body: JSON.stringify({ mensaje, ruta: '/classroom/7?token=oculto', userId: 'suplantado' }) });

describe('Alertas de errores con servidor y correo simulados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    falso.configurado.mockReturnValue(true);
    falso.correoListo.mockReturnValue(true);
    falso.usuario.mockResolvedValue({ id: 'usuario-verificado' });
    falso.admins.mockResolvedValue({ data: [{ email: 'admin@prueba.test' }], error: null });
    falso.enviar.mockResolvedValue({});
  });
  it('guarda el usuario verificado y avisa a los administradores sin inyectar HTML', async () => {
    falso.rpc.mockResolvedValue({ data: { nuevo: true, enviar_correo: true, veces: 1 }, error: null });
    const r = await handler(evento('Fallo <img src=x onerror=alert(1)>'));
    expect(r.statusCode).toBe(200);
    expect(falso.rpc.mock.calls[0][1]).toMatchObject({ p_user_id: 'usuario-verificado', p_ruta: '/classroom/:id' });
    expect(falso.rpc.mock.calls[0][1].p_ip_hash).not.toBe('prueba-local');
    expect(falso.enviar).toHaveBeenCalledOnce();
    expect(falso.enviar.mock.calls[0][0]).toMatchObject({ para: ['admin@prueba.test'] });
    expect(falso.enviar.mock.calls[0][0].html).toContain('&lt;img');
    expect(falso.enviar.mock.calls[0][0].html).not.toContain('<img');
  });
  it('no manda otro correo si la base ya reservó el aviso para otro reporte', async () => {
    falso.rpc.mockResolvedValue({ data: { nuevo: false, enviar_correo: false, veces: 2 }, error: null });
    expect((await handler(evento('Fallo repetido'))).statusCode).toBe(200);
    expect(falso.enviar).not.toHaveBeenCalled();
  });
  it('sin migración acepta el reporte y limita el aviso repetido por huella', async () => {
    falso.rpc.mockResolvedValue({ error: { code: 'PGRST202', message: 'Falta migración' } });
    const a = await handler(evento('Fallo sin tabla'));
    const b = await handler(evento('Fallo sin tabla'));
    expect(JSON.parse(a.body)).toEqual({ ok: true, guardado: false });
    expect(b.statusCode).toBe(202);
    expect(falso.enviar).toHaveBeenCalledOnce();
  });
  it('un fallo de correo conserva el registro y no rompe la respuesta', async () => {
    falso.rpc.mockResolvedValue({ data: { nuevo: true, enviar_correo: true }, error: null });
    falso.enviar.mockRejectedValue(new Error('Brevo no disponible'));
    const r = await handler(evento('Fallo con correo caído'));
    expect(JSON.parse(r.body).guardado).toBe(true);
  });
  it('respeta el límite atómico del servidor', async () => {
    falso.rpc.mockResolvedValue({ data: { limitado: true }, error: null });
    expect((await handler(evento('Fallo limitado'))).statusCode).toBe(429);
    expect(falso.enviar).not.toHaveBeenCalled();
  });
  it('un rechazo de red tampoco causa otro error al reportar el original', async () => {
    falso.rpc.mockRejectedValue(new Error('Red no disponible'));
    const r = await handler(evento('Fallo de reporte con red caída'));
    expect(r.statusCode).toBe(202);
    expect(JSON.parse(r.body).guardado).toBe(false);
  });
});
