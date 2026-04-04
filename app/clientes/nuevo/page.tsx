'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createClient, getClients } from '@/lib/clientService';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }

    setSaving(true);
    try {
      // Validar si el cliente ya existe
      const existingClients = await getClients(user.email);
      const nameToCheck = formData.name.trim().toLowerCase();
      const alreadyExists = existingClients.some(c => c.name.toLowerCase() === nameToCheck);
      
      if (alreadyExists) {
        toast.warning('Ese cliente ya se encuentra registrado en tu lista.');
        setSaving(false);
        return;
      }

      await createClient(
        user.email,
        {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        notes: formData.notes.trim(),
        location: location || undefined,
        createdBy: user.email,
        createdAt: new Date().toISOString()
      } as any);
      
      toast.success('Cliente guardado');
      router.back();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error de base de datos: ${err.message || 'Desconocido'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded-full hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="font-bold text-slate-800 text-lg">{t.newClientTitle}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            {t.nameLabel} <span className="text-red-500">*</span>
          </label>
          <input 
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={t.namePlaceholder}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.addressLabel}</label>
          <div className="flex flex-col gap-2">
            <input 
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder={t.addressPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-bold border-2 transition ${location ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
            >
              <MapPin className="w-4 h-4" />
              {location ? `Ubicación Fijada (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 'Seleccionar Ubicación Exacta en Mapa'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.phoneLabel}</label>
            <input 
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder={t.phonePlaceholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.emailLabel}</label>
            <input 
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t.emailPlaceholder}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">{t.notesLabel}</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder={t.notesPlaceholder}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 mt-8"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? t.creating : t.saveClientBtn}
        </button>
      </main>

      {/* Map Picker Overlay */}
      {showMapPicker && (
        <MapPicker 
          onLocationSelect={(loc) => { setLocation(loc); setShowMapPicker(false); }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
