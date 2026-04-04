// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer as ReactMapContainer, TileLayer as ReactTileLayer, Marker as ReactMarker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Navigation } from 'lucide-react';
import { toast } from 'sonner';

const MapContainer = ReactMapContainer as any;
const TileLayer = ReactTileLayer as any;
const Marker = ReactMarker as any;

// Fix Leaflet icons issue in React
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapPickerProps {
  defaultLocation?: { lat: number; lng: number };
  onLocationSelect: (loc: { lat: number; lng: number }) => void;
  onClose: () => void;
}

function LocationMarker({ position, setPosition }: any) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  useEffect(() => {
    if (position) {
      // Zoom in appropriately if currently zoomed out
      const targetZoom = map.getZoom() < 15 ? 16 : map.getZoom();
      map.flyTo(position, targetZoom);
    }
  }, [position, map]);

  return position === null ? null : (
    // @ts-ignore
    <Marker position={position} icon={icon}></Marker>
  );
}

export default function MapPicker({ defaultLocation, onLocationSelect, onClose }: MapPickerProps) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(defaultLocation || null);
  // Default to Ecuador roughly
  const center = defaultLocation || { lat: -1.8312, lng: -78.1834 };

  const handleConfirm = () => {
    if (position) {
      onLocationSelect({ lat: position.lat, lng: position.lng });
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta geolocalización.');
      return;
    }
    const tid = toast.loading('Calculando coordenadas GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success('¡Ubicación encontrada!', { id: tid });
      },
      (err) => {
        toast.error('Error obteniendo ubicación. Asegúrate de dar permisos de GPS.', { id: tid });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="mx-auto my-8 bg-white rounded-3xl w-full max-w-xl overflow-hidden flex flex-col h-[75vh] shadow-2xl">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h2 className="font-bold text-slate-800 text-base sm:text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            Toca el mapa para fijar ubicación
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:bg-slate-100 p-2 rounded-full transition w-10 h-10 flex items-center justify-center font-bold">✕</button>
        </div>
        
        <div className="flex-1 relative z-0">
          {/* @ts-ignore */}
          <MapContainer center={center} zoom={defaultLocation ? 16 : 6} style={{ height: '100%', width: '100%' }}>
            {/* @ts-ignore */}
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker position={position} setPosition={setPosition} />
          </MapContainer>
          
          {/* Floating action button for current location */}
          <button 
            onClick={handleLocateMe}
            className="absolute bottom-4 right-4 z-[1000] bg-white text-blue-600 p-3 rounded-full shadow-lg border border-slate-100 hover:bg-slate-50 transition active:scale-95 flex items-center gap-2"
            title="Mi Ubicación"
          >
            <Navigation className="w-5 h-5" />
            <span className="text-sm font-bold pr-1 hidden sm:inline">Mi Ubicación</span>
          </button>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold border-2 border-slate-200 rounded-xl hover:bg-slate-50">
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!position}
            className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl disabled:opacity-50 hover:bg-blue-700"
          >
            Confirmar Coordenadas
          </button>
        </div>
      </div>
    </div>
  );
}
