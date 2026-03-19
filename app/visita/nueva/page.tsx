'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Loader2, Camera, User, ChevronDown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import { createVisit, getActiveVisit } from '@/lib/visitService';
import { getClients } from '@/lib/clientService';
import { uploadPhotoToStorage } from '@/lib/storageService';
import { dataUrlToFile } from '@/lib/utils';
import { Client, TimeStamp } from '@/lib/types';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { savePendingPhoto } from '@/lib/idb';
import { compressImage } from '@/lib/imageCompression';
import { toast } from 'sonner';
import Link from 'next/link';

export default function NuevaVisitaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { loading: geoLoading, capture: captureGeo } = useGeolocation();
  const isOnline = useNetworkStatus();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [arrivalPhoto, setArrivalPhoto] = useState<string | null>(null); // base64 preview
  const [checkingActive, setCheckingActive] = useState(true);
  
  // GPS Strict Guard
  const [gpsErrorMsg, setGpsErrorMsg] = useState('');
  const [gpsOverride, setGpsOverride] = useState(false);

  // Load clients and check active visit
  React.useEffect(() => {
    if (user?.email) {
      // 1. Sync check (bulletproof offline protection)
      const localActiveId = localStorage.getItem(`active_visit_${user.email}`);
      if (localActiveId) {
        toast.error('Tienes una visita en proceso, finalízala primero');
        router.replace(`/visita/${localActiveId}`);
        return;
      }

      // 2. Network check (in case they started it on another device or cleared cache)
      getActiveVisit(user.email).then(active => {
        if (active) {
          localStorage.setItem(`active_visit_${user.email}`, active.id);
          toast.error('Tienes una visita en proceso, finalízala primero');
          router.replace(`/visita/${active.id}`);
        } else {
          setCheckingActive(false);
          getClients(user.email).then(setClients).catch(console.error);
        }
      }).catch(() => {
        // If offline and no local active, it's safe to create
        setCheckingActive(false);
      });
    }
  }, [user, router]);

  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setClientName(val);
    const selected = clients.find(c => c.name === val);
    if (selected?.address) setClientAddress(selected.address);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const toastId = toast.loading('Optimizando foto de llegada...', { duration: Infinity });
    try {
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      reader.onload = () => {
        setArrivalPhoto(reader.result as string);
        toast.success('Foto adjuntada', { id: toastId, duration: 2000 });
      };
      reader.readAsDataURL(compressedFile);
    } catch (err) {
      console.error(err);
      toast.error('Error al optimizar imagen', { id: toastId, duration: 3000 });
    }
    e.target.value = '';
  };

  const handleStart = async () => {
    if (!user) return;
    if (!clientName.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }

    setSaving(true);
    const tempId = Date.now().toString();

    let geoPoint = null;
    try {
      geoPoint = await captureGeo();
      setGpsErrorMsg('');
    } catch (err: any) {
      if (!gpsOverride) {
        toast.error('GPS Requerido. Revisa tu señal o confirma la excepción manual.');
        setGpsErrorMsg(err.message || 'Error obteniendo ubicación');
        setSaving(false);
        return; // BLOCK!
      } else {
        toast.info('Visitando sin GPS (Excepción confirmada)');
      }
    }

    try {
      // Foto de llegada (opcional)
      const photoUrl = arrivalPhoto && isOnline
        ? await (async () => {
            try {
              const file = dataUrlToFile(arrivalPhoto, `arrival_${tempId}.jpg`);
              const path = `visits/${tempId}/arrival.jpg`;
              return await uploadPhotoToStorage(file, path);
            } catch (err) {
              console.error('Error subiendo foto de llegada', err);
              toast.error('La visita se creará, pero falló la subida de foto');
              return undefined;
            }
          })()
        : undefined;

      // Guardar foto offline si corresponde
      let finalPhotoUrl: string | undefined = photoUrl ?? undefined;
      if (arrivalPhoto && !isOnline) {
        const pendingId = `pending_arrival_${tempId}`;
        await savePendingPhoto({
          id: pendingId,
          dataUrl: arrivalPhoto,
          type: 'arrival',
          visitId: tempId,
        });
        finalPhotoUrl = pendingId;
      }

      const arrival: TimeStamp = {
        localTime: new Date().toISOString(),
        ...(geoPoint ? { location: geoPoint } : {}),
        ...(finalPhotoUrl ? { photoUrl: finalPhotoUrl } : {})
      };

      // Buscar el ID real del cliente si lo seleccionó de la lista
      const selectedClient = clients.find(c => c.name === clientName);

      // 3. Create visit in Firestore
      const visitId = await createVisit(
        user.email,
        user.name,
        clientName.trim(),
        arrival,
        selectedClient?.id, // ID real en vez de undefined
        clientAddress.trim() || undefined
      );

      // 4. (Offline-only) Re-link the saved IDB photo from tempId to the REAL visitId
      if (arrivalPhoto && !isOnline && finalPhotoUrl?.startsWith('pending_')) {
        await savePendingPhoto({
          id: finalPhotoUrl,
          dataUrl: arrivalPhoto,
          type: 'arrival',
          visitId: visitId
        });
      }

      toast.success('✅ Llegada registrada');
      router.push(`/visita/${visitId}`);
    } catch (err: any) {
      console.error(err);
      toast.error(`Fallo Firebase: ${err.message || 'Desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/">
            <button className="p-2 rounded-full hover:bg-slate-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          </Link>
          <h1 className="font-bold text-slate-800 text-lg">Nueva Visita Técnica</h1>
        </div>
      </header>

      {checkingActive ? (
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Info card */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium">📍 Se registrará automáticamente:</p>
          <ul className="mt-1 space-y-0.5 text-blue-600">
            <li>• Hora exacta de llegada</li>
            <li>• Coordenadas GPS (si das permiso)</li>
          </ul>
        </div>

        {/* Client selector */}
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="block text-sm font-semibold text-slate-700">
              Cliente <span className="text-red-500">*</span>
            </label>
            <Link href="/clientes/nuevo" className="text-xs text-blue-600 font-medium hover:underline">
              + Nuevo Cliente
            </Link>
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <select
              value={clientName}
              onChange={handleClientChange}
              className="w-full pl-10 pr-10 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800 appearance-none"
            >
              <option value="" disabled>Selecciona un cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Dirección del trabajo <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={clientAddress}
              onChange={e => setClientAddress(e.target.value)}
              placeholder="Calle, número, ciudad"
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-800"
            />
          </div>
        </div>

        {/* Photo of arrival (optional) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Foto de llegada <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            ref={inputFileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhotoCapture}
          />
          {arrivalPhoto ? (
            <div className="relative">
              <img src={arrivalPhoto} alt="Foto llegada" className="rounded-xl w-full h-48 object-cover border border-slate-200" />
              <button
                onClick={() => setArrivalPhoto(null)}
                className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-red-500 border border-red-200"
              >
                Eliminar
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputFileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 flex flex-col items-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
            >
              <Camera className="w-8 h-8" />
              <span className="text-sm">Tomar foto de llegada</span>
            </button>
          )}
        </div>

        {gpsErrorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 animate-fade-in">
            <p className="font-semibold mb-2">⚠️ Error GPS: {gpsErrorMsg}</p>
            <label className="flex items-start gap-2 cursor-pointer mt-1">
              <input 
                type="checkbox" 
                checked={gpsOverride} 
                onChange={e => setGpsOverride(e.target.checked)} 
                className="mt-0.5 w-5 h-5 rounded border-red-300 text-red-600 focus:ring-red-500 flex-shrink-0" 
              />
              <span className="leading-snug">Declaro que me es imposible obtener señal GPS en este momento y asumo la responsabilidad de registrar la visita sin coordenadas.</span>
            </label>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleStart}
          disabled={saving || geoLoading || !clientName.trim()}
          className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-md"
        >
          {(saving || geoLoading) ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
          ) : (
            <>📍 Registrar Llegada</>
          )}
        </button>

        <p className="text-xs text-center text-slate-400">
          La hora se guardará automáticamente al presionar el botón
        </p>

      </main>
      )}
    </div>
  );
}
