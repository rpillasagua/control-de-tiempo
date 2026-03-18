'use client';

import React, { useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Camera, Loader2, X, Upload, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { addActivity } from '@/lib/visitService';
import { uploadPhotoToStorage } from '@/lib/storageService';
import { dataUrlToFile } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { toast } from 'sonner';

export default function ActividadPage() {
  const params = useParams();
  const visitId = params.id as string;
  const router = useRouter();
  const { getDriveToken } = useAuth();
  const isOnline = useNetworkStatus();

  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]); // base64 previews
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 5) { toast.error('Máximo 5 fotos por actividad'); return; }
    const reader = new FileReader();
    reader.onload = () => setPhotos(prev => [...prev, reader.result as string]);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!description.trim()) { toast.error('Describe qué fue lo que hiciste'); return; }
    setSaving(true);
    try {
      let photoUrls: string[] = [];

      // Upload photos to Firebase Storage if any
      if (photos.length > 0) {
        setUploadProgress(`Subiendo fotos...`);
        const uploads = await Promise.all(
          photos.map(async (dataUrl, i) => {
            setUploadProgress(`Subiendo foto ${i + 1} de ${photos.length}...`);
            const file = dataUrlToFile(dataUrl, `actividad_${Date.now()}_${i}.jpg`);
            const path = `visits/${visitId}/${Date.now()}_${i}.jpg`;
            return uploadPhotoToStorage(file, path);
          })
        );
        photoUrls = uploads;
        toast.success(`📸 ${photos.length} foto${photos.length > 1 ? 's' : ''} subida${photos.length > 1 ? 's' : ''}`);
      }

      setUploadProgress('Guardando actividad...');
      await addActivity(visitId, {
        description: description.trim(),
        photoUrls,
        timestamp: new Date().toISOString()
      });

      toast.success('✅ Actividad registrada');
      router.push(`/visita/${visitId}`);
    } catch (err) {
      console.error(err);
      toast.error('Error guardando actividad');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href={`/visita/${visitId}`}>
            <button className="p-2 rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          </Link>
          <h1 className="font-bold text-slate-800 text-lg">Nueva Actividad</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            ¿Qué realizaste? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={5}
            className="w-full border border-slate-200 rounded-xl p-4 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white leading-relaxed"
            placeholder="Ej: Cambié las IPs de 8 cámaras Dahua del rango 192.168.1.x al 10.0.1.x. Verifiqué que todas aparezcan en el NVR. Restablecí contraseñas de admin y probé acceso remoto via DDNS."
          />
          <p className="text-xs text-slate-400 mt-1">
            {description.length} caracteres — sé específico, esta descripción respalda tu factura
          </p>
        </div>

        {/* Photos */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2 flex-wrap">
            Fotos de evidencia{' '}
            <span className="text-slate-400 font-normal">(hasta 5 — se guardan en Google Drive)</span>
            {!isOnline && (
              <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3" /> Sin conexión — se subirán al volver online
              </span>
            )}
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handlePhoto}
          />
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square">
                <img src={p} alt="" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {photos.length < 5 && (
              <button
                onClick={() => fileRef.current?.click()}
                className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                <Camera className="w-6 h-6" />
                <span className="text-xs">Foto</span>
              </button>
            )}
          </div>
          {photos.length > 0 && (
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Upload className="w-3 h-3" />
              Se subirán a Google Drive al guardar
            </p>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !description.trim()}
          className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 active:scale-[0.98]"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> {uploadProgress || 'Guardando...'}</>
          ) : (
            '💾 Guardar Actividad'
          )}
        </button>

      </main>
    </div>
  );
}
