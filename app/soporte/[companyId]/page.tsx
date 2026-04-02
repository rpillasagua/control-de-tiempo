'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Send, Camera, Building2, CheckCircle2, Image as ImageIcon, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { getCompanyById } from '@/lib/companyService';
import { createTicket } from '@/lib/ticketService';
import { uploadPhotoToStorage } from '@/lib/storageService';
import { compressImage } from '@/lib/imageCompression';
import { Company } from '@/lib/types';
import { toast } from 'sonner';

export default function PublicSupportPage() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!companyId) return;
    getCompanyById(companyId)
      .then((data) => {
        setCompany(data);
        setLoadingConfig(false);
      })
      .catch((err) => {
        console.error(err);
        setLoadingConfig(false);
      });
  }, [companyId]);

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setRawFile(compressed);
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(compressed);
    } catch {
      toast.error('Error procesando imagen');
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !issueDescription.trim()) {
      toast.error('Nombre y problema son requeridos');
      return;
    }
    
    setIsSubmitting(true);
    try {
      let photoUrl = '';
      const tempId = Date.now().toString();
      
      if (rawFile) {
        toast.info('Subiendo imagen adjunta...');
        photoUrl = await uploadPhotoToStorage(rawFile, `tickets/${companyId}/${tempId}.jpg`);
      }

      await createTicket({
        companyId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientAddress: clientAddress.trim(),
        issueDescription: issueDescription.trim(),
        photoUrl: photoUrl || undefined
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error('Ocurrió un error al enviar tu reporte. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="mt-4 text-slate-500 font-medium">Cargando portal...</p>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Building2 className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Empresa no encontrada</h1>
        <p className="text-slate-500 mt-2">El enlace que ingresaste no es válido o la empresa fue dada de baja.</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-md">
          <CheckCircle2 className="w-20 h-20" />
        </div>
        <h1 className="text-2xl font-bold mb-3">¡Reporte Enviado!</h1>
        <p className="text-blue-100 max-w-sm text-lg">
          Nuestro equipo en <strong>{company.name}</strong> ha recibido tu solicitud y se pondrá en contacto pronto.
        </p>
        <button 
          onClick={() => { setSuccess(false); setIssueDescription(''); setPhotoPreview(null); setRawFile(null); }}
          className="mt-10 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50"
        >
          Enviar otro reporte
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-blue-600 text-white pt-10 pb-20 px-4 rounded-b-[2.5rem] shadow-sm">
        <div className="max-w-xl mx-auto text-center">
          <Building2 className="w-10 h-10 mx-auto opacity-80 mb-3" />
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="opacity-90 mt-1">Portal Rápido de Soporte Técnico</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 -mt-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Tu Nombre Completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder="Ej. Juan Pérez"
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Teléfono</label>
              <div className="relative">
                <Phone className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  placeholder="099..."
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección / Sede</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                  placeholder="Calle principal..."
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Descripción del Problema <span className="text-red-500">*</span>
            </label>
            <textarea 
              required rows={4} value={issueDescription} onChange={e => setIssueDescription(e.target.value)}
              placeholder="¿Qué pasa con el equipo? Sé lo más detallado posible..."
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Evidencia Fotográfica (Opcional)</label>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
            
            {photoPreview ? (
              <div className="relative border border-slate-200 rounded-xl overflow-hidden block w-full h-48 bg-slate-100">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" onClick={() => { setPhotoPreview(null); setRawFile(null); }}
                  className="absolute top-2 right-2 bg-white/90 text-red-500 text-xs px-3 py-1 rounded-full font-bold shadow-sm"
                >
                  Eliminar
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors text-slate-400"
              >
                <div className="bg-slate-100 p-3 rounded-full"><ImageIcon className="w-6 h-6" /></div>
                <span className="text-sm">Toca para agregar una foto</span>
              </div>
            )}
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-wait mt-4"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin"/> Enviando tu reporte...</>
            ) : (
              <><Send className="w-5 h-5"/> Enviar Reporte</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
