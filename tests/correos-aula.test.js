// Enlace "Agregar a mi calendario" y textos cortos para enlaces largos.
import { describe, expect, it } from 'vitest';
import { enlaceCalendario } from '../netlify/functions/_sesiones.js';
import { aHtml, avisoPortal } from '../netlify/functions/_notificaciones.js';

describe('Correos de clases y aula', () => {
  it('arma el enlace de Google Calendar con inicio y fin en UTC', () => {
    const url = new URL(enlaceCalendario({ titulo: 'Canulación VV', inicia_en: '2026-10-28T10:00:00-06:00', duracion_min: 90, curso: 'ECMO', aula: 'https://healthcareexp.com/classroom/7?leccion=3' }));
    expect(url.hostname).toBe('calendar.google.com');
    expect(url.searchParams.get('dates')).toBe('20261028T160000Z/20261028T173000Z');
    expect(url.searchParams.get('text')).toContain('Canulación VV');
    expect(url.searchParams.get('details')).toContain('/classroom/7');
  });

  it('una fecha inválida no rompe el correo', () => {
    expect(enlaceCalendario({ titulo: 'x', inicia_en: 'no-es-fecha' })).toBe('');
  });

  it('el correo muestra "Agregar a mi calendario" en lugar del enlace largo', () => {
    const html = aHtml('Hola:\n\nAgrégala:\nhttps://calendar.google.com/calendar/render?action=TEMPLATE&text=a');
    expect(html).toContain('Agregar a mi calendario');
    expect(html).not.toContain('>https://calendar.google.com');
  });

  it('la campanita tiene texto para los avisos nuevos', () => {
    expect(avisoPortal('sesion_recordatorio_dia', { courseId: 7, clave: 'sesion-dia:3:2026', variables: { sesion: 'Clase 1' } }).enlace).toBe('/classroom/7?leccion=3');
    expect(avisoPortal('comentario_respondido', { courseId: 7, variables: { autor: 'El equipo de HCE' } }).titulo).toContain('respondió');
    expect(avisoPortal('curso_casi', { courseId: 7, curso: 'ECMO', variables: { porcentaje: '85%' } }).cuerpo).toContain('85%');
    expect(avisoPortal('encuesta_curso', { variables: { encuesta: 'https://healthcareexp.com/retroalimentacion?taller=ECMO' } }).enlace).toBe('/retroalimentacion?taller=ECMO');
    expect(avisoPortal('avance_semanal', {})).toBeNull();
  });
});
