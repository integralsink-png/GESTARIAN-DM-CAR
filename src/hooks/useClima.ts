// src/hooks/useClima.ts
import { useEffect, useState } from 'react';

export const useClima = () => {
  const [temperatura, setTemperatura] = useState<number | null>(null);
  const [cargandoClima, setCargandoClima] = useState(true);

  useEffect(() => {
    async function fetchClima(lat: number, lon: number) {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
        const data = await res.json();
        if (data && data.current && typeof data.current.temperature_2m === 'number') {
          setTemperatura(Math.round(data.current.temperature_2m));
        } else {
          setTemperatura(22);
        }
      } catch (err) {
        setTemperatura(22);
      } finally {
        setCargandoClima(false);
      }
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchClima(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchClima(40.4168, -3.7038);
        },
        { timeout: 10000 }
      );
    } else {
      fetchClima(40.4168, -3.7038);
    }
  }, []);

  return { temperatura, cargandoClima };
};