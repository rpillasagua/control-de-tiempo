'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/clientService';
import { toast } from 'sonner';

export default function NewClientPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
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
      await createClient(
        user.email,
        {
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        notes: formData.notes.trim(),
        createdBy: user.email,
        createdAt: new Date().toISOString()
      } as any);
      
      toast.success('Cliente guardado');
      router.back();
    } catch {
      toast.error('Error al guardar el cliente');
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
            <h1 className="font-bold text-slate-800 text-lg">Nuevo Cliente</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
            Nombre o Razón Social <span className="text-red-500">*</span>
          </label>
          <input 
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ej: Ferretería EPA"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dirección</label>
          <input 
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Ej: Av. Principal 123"
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Teléfono</label>
            <input 
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="099..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input 
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="@..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notas adicionales</label>
          <textarea 
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Horarios de atención, persona de contacto..."
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <button 
          onClick={handleSave}
          disabled={saving || !formData.name.trim()}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 mt-8"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Guardar Cliente
        </button>
      </main>
    </div>
  );
}
