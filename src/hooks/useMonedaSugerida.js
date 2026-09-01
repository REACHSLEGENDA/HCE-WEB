import { useEffect } from 'react';

const CLAVE_CACHE = 'hce_moneda_sugerida';

/**
 * Preselecciona la moneda segun el pais de la visita.
 *
 * Solo cambia el valor por defecto: el selector sigue visible y el alumno puede
 * cambiarlo cuando quiera. La pasarela de Stripe la decide `_stripe.js` a partir
 * de esa moneda, nunca a partir de la IP; una VPN de hospital o un mexicano de
 * viaje enrutarian mal si la geolocalizacion mandara.
 *
 * No hace nada si el alumno ya toco el selector, para no revertir su eleccion
 * cuando la respuesta llega tarde.
 */
export function useMonedaSugerida(setMoneda, yaEligio) {
  useEffect(() => {
    if (yaEligio) return;

    const guardada = sessionStorage.getItem(CLAVE_CACHE);
    if (guardada) {
      setMoneda(guardada);
      return;
    }

    let cancelado = false;

    fetch('/.netlify/functions/geo')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelado || !data?.moneda) return;
        sessionStorage.setItem(CLAVE_CACHE, data.moneda);
        setMoneda(data.moneda);
      })
      .catch(() => {
        // Sin geolocalizacion se queda el default de la pagina (mxn).
      });

    return () => { cancelado = true; };
  }, [setMoneda, yaEligio]);
}
