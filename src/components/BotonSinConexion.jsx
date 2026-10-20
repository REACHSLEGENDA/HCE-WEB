// "Guardar sin conexión": guarda un PDF, archivo o lectura en este dispositivo
// para verlo sin internet en /classroom/sin-conexion.
import { useEffect, useState } from 'react';
import { CheckCircle2, CloudDownload } from 'lucide-react';
import { borrarMaterial, guardarMaterial, tieneMaterial } from '../lib/sinConexion';

export default function BotonSinConexion({ id, cursoId, curso, leccionId, titulo, tipo, obtenerUrl, texto = '', nombre = '', notificar, compacto = false }) {
  const [estado, setEstado] = useState('revisando'); // revisando | libre | guardando | guardado
  useEffect(() => {
    let vigente = true;
    tieneMaterial(id).then((si) => { if (vigente) setEstado(si ? 'guardado' : 'libre'); }).catch(() => { if (vigente) setEstado('libre'); });
    return () => { vigente = false; };
  }, [id]);

  if (typeof indexedDB === 'undefined' || estado === 'revisando') return null;

  const guardar = async () => {
    setEstado('guardando');
    try {
      const url = obtenerUrl ? await obtenerUrl() : '';
      await guardarMaterial({ id, cursoId, curso, leccionId, titulo, tipo, url, texto, nombre });
      // Deja lista la página sin conexión para cuando no haya internet.
      import('../pages/SinConexion').catch(() => {});
      setEstado('guardado');
      notificar?.('Guardado en este dispositivo. Ábrelo sin internet desde «Materiales sin conexión».', 'success');
    } catch (err) {
      setEstado('libre');
      notificar?.(`No se pudo guardar: ${err.message}`, 'error');
    }
  };

  const quitar = async () => {
    await borrarMaterial(id).catch(() => {});
    setEstado('libre');
  };

  if (estado === 'guardado') {
    return (
      <span className={`sin-conexion-estado${compacto ? ' compacto' : ''}`}>
        <CheckCircle2 size={14} aria-hidden="true" /> {compacto ? 'Guardado' : 'Guardado sin conexión'}
        {!compacto && <> · <a href="/classroom/sin-conexion">Ver</a> · <button type="button" onClick={quitar}>Quitar</button></>}
      </span>
    );
  }
  return (
    <button type="button" className={`sin-conexion-boton${compacto ? ' compacto' : ''}`} onClick={guardar} disabled={estado === 'guardando'} title="Guardar en este dispositivo para verlo sin internet" aria-label={compacto ? `Guardar ${titulo} sin conexión` : undefined}>
      <CloudDownload size={15} aria-hidden="true" /> {estado === 'guardando' ? 'Guardando…' : compacto ? '' : 'Guardar sin conexión'}
    </button>
  );
}
