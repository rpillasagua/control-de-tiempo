'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, Send, Camera, Building2, CheckCircle2, Image as ImageIcon, MapPin, Phone, User as UserIcon } from 'lucide-react';
import { getCompanyById } from '@/lib/companyService';
import { createTicket } from '@/lib/ticketService';
import { uploadPhotoToStorage } from '@/lib/storageService';
import { compressImage } from '@/lib/imageCompression';
import { Company } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

export default function PublicSupportPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { t } = useTranslation();

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [locationUrl, setLocationUrl] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [showMap, setShowMap] = useState(false);

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

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalización no soportada');
      return;
    }
    setFetchingLocation(true);
    toast.info('Buscando señal GPS...', { id: 'gps' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationUrl(`https://www.google.com/maps/search/?api=1&query=${pos.coords.latitude},${pos.coords.longitude}`);
        setFetchingLocation(false);
        toast.success('Ubicación obtenida exitosamente', { id: 'gps' });
      },
      (err) => {
        setFetchingLocation(false);
        toast.error('Error al obtener ubicación. Revisa los permisos.', { id: 'gps' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !issueDescription.trim()) {
      toast.error(t.supportRequired);
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
        photoUrl: photoUrl || undefined,
        location: location || undefined,
        locationUrl: locationUrl.trim() || undefined
      });

      setSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error(t.supportErrorUpload);
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
        <h1 className="text-xl font-bold text-slate-800">{t.supportNotFound}</h1>
        <p className="text-slate-500 mt-2">{t.supportNotFoundDesc}</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-white/20 p-6 rounded-full mb-6 backdrop-blur-md">
          <CheckCircle2 className="w-20 h-20" />
        </div>
        <h1 className="text-2xl font-bold mb-3">{t.supportSuccessTitle}</h1>
        <p className="text-blue-100 max-w-sm text-lg">
          {t.supportSuccessMsg(company.name)}
        </p>
        <button 
          onClick={() => { setSuccess(false); setIssueDescription(''); setPhotoPreview(null); setRawFile(null); setLocation(null); }}
          className="mt-10 bg-white text-blue-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-50"
        >
          {t.supportSendAnother}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      <div className="bg-blue-600 text-white pt-10 pb-20 px-4 rounded-b-[2.5rem] shadow-sm relative">
        <button 
          onClick={() => window.location.href = `/soporte/${companyId}/historial`}
          className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <UserIcon className="w-4 h-4" /> Mi Historial
        </button>
        <div className="max-w-xl mx-auto text-center mt-4">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="w-16 h-16 mx-auto rounded-xl bg-white object-contain p-1.5 shadow-sm mb-3" crossOrigin="anonymous" />
          ) : (
            <Building2 className="w-10 h-10 mx-auto opacity-80 mb-3" />
          )}
          <h1 className="text-2xl font-bold">{company.name}</h1>
          <p className="opacity-90 mt-1">{t.supportPortalTitle}</p>
        </div>
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 -mt-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-lg p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t.supportFullName} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                placeholder={t.supportFullNamePlaceholder}
                className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.supportPhone}</label>
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
              <label className="block text-sm font-semibold text-slate-700 mb-1">{t.supportAddress}</label>
              <div className="relative">
                <MapPin className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                  placeholder={t.supportAddressPlaceholder}
                  className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <input 
                  type="url" value={locationUrl} onChange={e => setLocationUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-2 bg-white rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button 
                  type="button" 
                  onClick={() => setShowMap(true)} 
                  className={`flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors ${location ? 'border-emerald-500 text-emerald-600 bg-emerald-50' : 'border-blue-100 text-blue-600 hover:bg-blue-50'}`}
                >
                  <MapPin className="w-4 h-4" />
                  {location ? 'Ver en Mapa' : 'Elegir en Mapa'}
                </button>
                <button 
                  type="button" 
                  onClick={handleGetLocation} 
                  disabled={fetchingLocation}
                  className="flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 text-xs font-semibold transition-colors hover:bg-slate-50"
                  title="Usar GPS actual"
                >
                  {fetchingLocation ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          
          {showMap && (
            <MapPicker
              defaultLocation={location || undefined}
              onClose={() => setShowMap(false)}
              onLocationSelect={(loc) => {
                setLocation(loc);
                setLocationUrl(`https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`);
                setShowMap(false);
                toast.success('Coordenadas capturadas del mapa');
              }}
            />
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              {t.supportProblem} <span className="text-red-500">*</span>
            </label>
            <textarea 
              required rows={4} value={issueDescription} onChange={e => setIssueDescription(e.target.value)}
              placeholder={t.supportProblemPlaceholder}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Photo upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">{t.supportPhoto}</label>
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handlePhotoCapture} />
            
            {photoPreview ? (
              <div className="relative border border-slate-200 rounded-xl overflow-hidden block w-full h-48 bg-slate-100">
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" onClick={() => { setPhotoPreview(null); setRawFile(null); }}
                  className="absolute top-2 right-2 bg-white/90 text-red-500 text-xs px-3 py-1 rounded-full font-bold shadow-sm"
                >
                  {t.supportRemovePhoto}
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl py-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors text-slate-400"
              >
                <div className="bg-slate-100 p-3 rounded-full"><ImageIcon className="w-6 h-6" /></div>
                <span className="text-sm">{t.supportAddPhoto}</span>
              </div>
            )}
          </div>

          <button 
            type="submit" disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-wait mt-4"
          >
            {isSubmitting ? (
              <><Loader2 className="w-5 h-5 animate-spin"/> {t.supportSending}</>
            ) : (
              <><Send className="w-5 h-5"/> {t.supportSubmit}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
