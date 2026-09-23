import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { esTablaFaltante } from '../lib/cursos';

// Registro de cada visita a un curso, para las métricas del panel.
//
// Mide dos tiempos distintos, porque cuentan cosas distintas:
//   - activo: el aula en pantalla y el alumno presente. Deja de contar con la
//     pestaña escondida, o tras cinco minutos sin tocar nada y el video en
//     pausa (se fue a hacer otra cosa y dejó la pestaña abierta).
//   - video: el video reproduciéndose, esté o no la pestaña a la vista.
// Y guarda hasta dónde llegó en el video, que es lo que dice dónde abandonan.
//
// Todo se cuenta localmente cada segundo y se manda cada 30. Si el alumno
// cierra la pestaña se pierden como mucho esos 30 segundos. El servidor
// valida lo que llega (ver supabase/cursos-actividad.sql).

const SEGUNDO = 1000;
const ENVIO_CADA = 30 * SEGUNDO;
const INACTIVIDAD = 5 * 60 * SEGUNDO;
// Volver después de media hora con la pestaña escondida cuenta como visita
// nueva: es el corte estándar de sesión en analítica web.
const CORTE_DE_VISITA = 30 * 60 * SEGUNDO;

const REPRODUCIENDO = 1; // YT.PlayerState.PLAYING

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function detectarDispositivo() {
  const ua = navigator.userAgent || '';
  // iPadOS se presenta como Mac de escritorio; lo delata la pantalla táctil.
  const esIpad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  if (esIpad || /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'movil';
  return 'escritorio';
}

// Lo que se manda a la base en cada envío.
const filaDe = (c) => ({
  segundos_activos: c.activos,
  segundos_video: c.video,
  posicion_max_seg: Math.floor(c.posicionMax),
  duracion_video_seg: c.duracion ? Math.floor(c.duracion) : null,
  porcentaje_max: c.porcentaje,
});

const contadoresVacios = () => ({
  activos: 0,
  video: 0,
  posicionMax: 0,
  duracion: null,
  porcentaje: 0,
});

export default function useSesionCurso({ userId, courseId, activo, playerRef }) {
  const sesionIdRef = useRef(null);
  const creandoRef = useRef(null);
  const tokenRef = useRef(null);
  const deshabilitadoRef = useRef(false);
  const contadoresRef = useRef(contadoresVacios());
  // Se fija al arrancar la visita (en el efecto), no al renderizar.
  const ultimaInteraccionRef = useRef(0);
  const ocultaDesdeRef = useRef(null);

  const leerPlayer = useCallback(() => {
    const player = playerRef?.current;
    if (!player) return { reproduciendo: false };
    try {
      return {
        reproduciendo: player.getPlayerState?.() === REPRODUCIENDO,
        posicion: player.getCurrentTime?.() || 0,
        duracion: player.getDuration?.() || 0,
      };
    } catch {
      // El reproductor se desmonta al pasar al examen.
      return { reproduciendo: false };
    }
  }, [playerRef]);

  const iniciarSesion = useCallback(async () => {
    if (deshabilitadoRef.current || !userId || !courseId) return null;

    contadoresRef.current = contadoresVacios();
    const promesa = (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      tokenRef.current = session?.access_token || null;

      const { data, error } = await supabase
        .from('curso_sesiones')
        .insert([{ user_id: userId, course_id: Number(courseId), dispositivo: detectarDispositivo() }])
        .select('id')
        .single();

      if (error) {
        // Antes de la migración no hay tabla; sin inscripción, la política lo
        // rechaza. En ambos casos no se insiste durante esta visita.
        if (!esTablaFaltante(error)) console.warn('No se pudo registrar la visita:', error.message);
        deshabilitadoRef.current = true;
        return null;
      }

      sesionIdRef.current = data.id;
      return data.id;
    })();

    creandoRef.current = promesa;
    return promesa;
  }, [userId, courseId]);

  const enviar = useCallback(async () => {
    if (deshabilitadoRef.current) return;
    if (!sesionIdRef.current && creandoRef.current) await creandoRef.current;
    const id = sesionIdRef.current;
    if (!id) return;

    const { data: { session } } = await supabase.auth.getSession();
    tokenRef.current = session?.access_token || tokenRef.current;

    const { error } = await supabase.from('curso_sesiones').update(filaDe(contadoresRef.current)).eq('id', id);
    if (error) console.warn('No se pudo actualizar la visita:', error.message);
  }, []);

  // Al cerrar la pestaña no da tiempo de esperar una petición normal. Con
  // `keepalive` el navegador la termina de mandar aunque la página se vaya, y
  // a diferencia de sendBeacon sí permite los encabezados de autenticación.
  const enviarAlSalir = useCallback(() => {
    const id = sesionIdRef.current;
    if (deshabilitadoRef.current || !id || !tokenRef.current) return;

    try {
      fetch(`${SUPABASE_URL}/rest/v1/curso_sesiones?id=eq.${id}`, {
        method: 'PATCH',
        keepalive: true,
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${tokenRef.current}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(filaDe(contadoresRef.current)),
      });
    } catch {
      // Última oportunidad: si falla, queda lo del último envío periódico.
    }
  }, []);

  useEffect(() => {
    if (!activo || !userId || !courseId) return undefined;

    deshabilitadoRef.current = false;
    sesionIdRef.current = null;
    ultimaInteraccionRef.current = Date.now();
    ocultaDesdeRef.current = document.visibilityState === 'hidden' ? Date.now() : null;
    void iniciarSesion();

    const marcarInteraccion = () => { ultimaInteraccionRef.current = Date.now(); };
    const eventosDePresencia = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'];
    eventosDePresencia.forEach((ev) => window.addEventListener(ev, marcarInteraccion, { passive: true }));

    const contar = setInterval(() => {
      const c = contadoresRef.current;
      const { reproduciendo, posicion, duracion } = leerPlayer();
      const visible = document.visibilityState === 'visible';
      const presente = reproduciendo || Date.now() - ultimaInteraccionRef.current < INACTIVIDAD;

      if (visible && presente) c.activos += 1;
      if (reproduciendo) c.video += 1;

      if (duracion > 0) {
        c.duracion = duracion;
        c.posicionMax = Math.max(c.posicionMax, posicion || 0);
        c.porcentaje = Math.min(100, Math.floor((c.posicionMax / duracion) * 100));
      }
    }, SEGUNDO);

    const envioPeriodico = setInterval(() => { void enviar(); }, ENVIO_CADA);

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'hidden') {
        ocultaDesdeRef.current = Date.now();
        void enviar();
        return;
      }

      const ocultaDesde = ocultaDesdeRef.current;
      ocultaDesdeRef.current = null;
      ultimaInteraccionRef.current = Date.now();

      if (ocultaDesde && Date.now() - ocultaDesde > CORTE_DE_VISITA) {
        // La visita anterior ya quedó cerrada con su último envío al
        // esconderse; esta cuenta como una nueva.
        sesionIdRef.current = null;
        void iniciarSesion();
      }
    };

    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    window.addEventListener('pagehide', enviarAlSalir);

    return () => {
      clearInterval(contar);
      clearInterval(envioPeriodico);
      eventosDePresencia.forEach((ev) => window.removeEventListener(ev, marcarInteraccion));
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      window.removeEventListener('pagehide', enviarAlSalir);
      void enviar();
    };
  }, [activo, userId, courseId, iniciarSesion, enviar, enviarAlSalir, leerPlayer]);

  // Exámenes y certificados, ligados a la visita en la que ocurrieron.
  const registrarEvento = useCallback(async (tipo, datos = {}) => {
    if (!userId || !courseId || deshabilitadoRef.current) return;
    if (!sesionIdRef.current && creandoRef.current) await creandoRef.current;

    const { error } = await supabase.from('curso_eventos').insert([{
      sesion_id: sesionIdRef.current,
      user_id: userId,
      course_id: Number(courseId),
      tipo,
      datos,
    }]);

    if (error && !esTablaFaltante(error)) console.warn('No se pudo registrar el evento:', error.message);
  }, [userId, courseId]);

  return { registrarEvento };
}
