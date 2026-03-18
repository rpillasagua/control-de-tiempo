'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Save, UserCircle, LogOut, Camera } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, saveProfile, Profile } from '@/lib/profileService';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Profile>>({
    name: '',
    companyName: '',
    ruc: '',
    phone: '',
  });

  const load = useCallback(async () => {
    if (!user) return; // Wait for useAuth to provide the user
    try {
      const email = user.email || 'unknown';
      const p = await getProfile(email);
      if (p) {
        setFormData({
          name: p.name || user.name || '',
          companyName: p.companyName || '',
          ruc: p.ruc || '',
          phone: p.phone || '',
          logoUrl: p.logoUrl || '',
        });
      } else {
        setFormData(prev => ({ ...prev, name: user.name || '' }));
      }
    } catch {
      toast.error('Error cargando perfil');
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => { 
    if (!authLoading) {
      if (user) {
        load();
      } else {
        setProfileLoading(false); // If no user after auth check, stop loading
      }
    }
  }, [authLoading, user, load]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const toastId = toast.loading('Optimizando logo...', { duration: Infinity });
    try {
      const fileCompressed = await compressImage(file, { maxWidthOrHeight: 600, quality: 0.8 });
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoFile(reader.result as string);
        toast.success('Logo optimizado', { id: toastId });
      };
      reader.readAsDataURL(fileCompressed);
    } catch {
      toast.error('Error al procesar el logo', { id: toastId });
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let finalLogoUrl = formData.logoUrl;
      if (logoFile) {
        const { uploadLogo } = await import('@/lib/profileService');
        finalLogoUrl = await uploadLogo(user.email || 'unknown', logoFile);
      }
      
      await saveProfile(user.email || 'unknown', { ...formData, logoUrl: finalLogoUrl });
      toast.success('Perfil actualizado correctamente');
      setLogoFile(null);
    } catch {
      toast.error('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 rounded-full hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>
            <h1 className="font-bold text-slate-800 text-lg">Mi Perfil Profesional</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        
        <div className="bg-white rounded-2xl p-6 border border-slate-100 text-center shadow-sm relative">
          <div className="relative w-24 h-24 mx-auto mb-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors group">
            {(logoFile || formData.logoUrl) ? (
              <img src={logoFile || formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-center leading-tight">Añadir<br/>Logo</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              title="Cambiar Logo"
            />
          </div>
          {(logoFile || formData.logoUrl) && (
            <button 
              onClick={() => { setLogoFile(null); setFormData(p => ({...p, logoUrl: ''})) }} 
              className="text-xs text-red-500 hover:underline mb-2 block mx-auto"
            >
              Quitar Logo
            </button>
          )}
          <h2 className="font-bold text-slate-800 text-lg">{user?.name}</h2>
          <p className="text-slate-500 text-sm mb-2">{user?.email}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-3">
            Datos para el Reporte / Factura
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre a mostrar</label>
            <input 
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de la Empresa o Negocio</label>
            <input 
              name="companyName"
              value={formData.companyName || ''}
              onChange={handleChange}
              placeholder="Ej: Soluciones Tecnológicas S.A."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">RUC / Cédula</label>
              <input 
                name="ruc"
                value={formData.ruc || ''}
                onChange={handleChange}
                placeholder="17xxxxxxxx001"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
              <input 
                name="phone"
                value={formData.phone || ''}
                onChange={handleChange}
                placeholder="099..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || profileLoading}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50"
        >
          {saving || profileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {profileLoading ? 'Cargando datos...' : 'Guardar Cambios'}
        </button>

        <button 
          onClick={async () => {
            await logout();
            window.location.href = '/';
          }}
          className="w-full bg-red-50 text-red-600 py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors mt-8"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </main>
    </div>
  );
}
