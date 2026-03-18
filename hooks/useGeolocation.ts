'use client';
/**
 * useGeolocation — captures GPS coordinates
 * Returns a function to trigger capture + loading/error state
 */
import { useState, useCallback } from 'react';
import { GeoPoint } from '@/lib/types';

export interface GeolocationState {
  loading: boolean;
  error: string | null;
  location: GeoPoint | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    loading: false,
    error: null,
    location: null
  });

  const capture = useCallback((): Promise<GeoPoint> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Tu navegador no soporta geolocalización';
        setState(s => ({ ...s, error: err }));
        reject(new Error(err));
        return;
      }

      setState(s => ({ ...s, loading: true, error: null }));

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPoint: GeoPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy)
          };
          setState({ loading: false, error: null, location: geoPoint });
          resolve(geoPoint);
        },
        (error) => {
          const msg =
            error.code === 1 ? 'Permiso de ubicación denegado' :
            error.code === 2 ? 'No se pudo obtener la ubicación' :
            'Tiempo de espera agotado obteniendo ubicación';
          setState({ loading: false, error: msg, location: null });
          reject(new Error(msg));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        }
      );
    });
  }, []);

  return { ...state, capture };
}
