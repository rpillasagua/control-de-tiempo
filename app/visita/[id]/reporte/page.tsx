'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Loader2, Printer, MapPin, Clock, CheckCircle, Share2, Copy, Building2, Phone } from 'lucide-react';
import Link from 'next/link';
import { getVisit } from '@/lib/visitService';
import { getProfile, Profile } from '@/lib/profileService';
import { Visit } from '@/lib/types';
import { toast } from 'sonner';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} hora${h > 1 ? 's' : ''} ${m > 0 ? `${m} min` : ''}`.trim()
               : `${m} minutos`;
}

export default function ReportPage() {
  const params = useParams();
  const visitId = params.id as string;
  const [visit, setVisit] = useState<Visit | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVisit = useCallback(async () => {
    try {
      const v = await getVisit(visitId);
      setVisit(v);
      if (v) {
        const p = await getProfile(v.technicianId);
        setProfile(p);
      }
    } catch {
      toast.error('Error cargando reporte');
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => { loadVisit(); }, [loadVisit]);

  const handlePrint = () => window.print();

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/reporte/${visitId}` : '';

  const handleWhatsApp = () => {
    const text = `Hola, adjunto el *Reporte Técnico* de la visita realizada.\n\n📍 Cliente: ${visit.clientName}\n🔗 Ver reporte aquí: ${publicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Link copiado al portapapeles');
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
  if (!visit) return (
    <div className="flex h-screen items-center justify-center flex-col gap-3">
      <p className="text-slate-500">Reporte no disponible</p>
      <Link href="/" className="text-blue-600">Volver</Link>
    </div>
  );

  const isComplete = visit.status === 'FINALIZADA';

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-card { box-shadow: none !important; border: 1px solid #e2e8f0 !important; break-inside: avoid; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-100 pb-10 print:bg-white">

        {/* Screen-only header */}
        <header className="bg-white border-b border-slate-100 sticky top-0 z-30 no-print">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href={`/visita/${visitId}`}>
                <button className="p-2 rounded-full hover:bg-slate-100">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              </Link>
              <h1 className="font-bold text-slate-800">Reporte de Visita</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                title="Copiar Link"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#20bd5a] transition-colors"
              >
                <Share2 className="w-4 h-4" /> WhatsApp
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden print-card">

            {/* Report Header */}
            <div className="bg-slate-800 text-white px-6 py-5">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">Reporte Técnico de Visita</h2>
                  <p className="text-slate-400 text-sm mt-0.5">#{visitId.split('-')[0].toUpperCase()}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${isComplete ? 'bg-emerald-500 text-white' : 'bg-amber-400 text-slate-900'}`}>
                  {isComplete ? '✓ Completada' : '⏳ En curso'}
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">

              {/* Client & Technician */}
              <div className="px-6 py-5 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Cliente</p>
                  <p className="font-bold text-slate-800 text-lg">{visit.clientName}</p>
                  {visit.clientAddress && (
                    <p className="text-slate-500 text-sm flex items-start gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" /> {visit.clientAddress}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Técnico Asignado</p>
                  <p className="font-bold text-slate-800 text-lg">{profile?.companyName || profile?.name || visit.technicianName}</p>
                  
                  {profile && (
                    <div className="mt-1 space-y-0.5">
                      {profile.companyName && profile.name && (
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Rep: {profile.name}
                        </p>
                      )}
                      {profile.ruc && (
                        <p className="text-slate-500 text-sm font-mono">RUC: {profile.ruc}</p>
                      )}
                      {profile.phone && (
                        <p className="text-slate-500 text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {profile.phone}
                        </p>
                      )}
                    </div>
                  )}
                  {/* Fallback si no hay perfil configurado */}
                  {!profile && <p className="text-slate-500 text-sm">{visit.technicianId}</p>}
                </div>
              </div>

              {/* Time Summary */}
              <div className="px-6 py-5">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">Registro de Tiempos</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-slate-500">Llegada</p>
                      <p className="font-semibold text-slate-800">{formatDateTime(visit.arrival.localTime)}</p>
                      {visit.arrival.location && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${visit.arrival.location.lat},${visit.arrival.location.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700 hover:underline mt-0.5 flex items-center gap-1 w-fit transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          Ver ubicación GPS en mapa
                          {visit.arrival.location.accuracy && ` (Precisión: ±${visit.arrival.location.accuracy}m)`}
                        </a>
                      )}
                    </div>
                    <p className="font-mono text-slate-700 font-medium">{formatTime(visit.arrival.localTime)}</p>
                  </div>

                  {visit.departure && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-500">Salida</p>
                        <p className="font-semibold text-slate-800">{formatDateTime(visit.departure.localTime)}</p>
                        {visit.departure.location && (
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${visit.departure.location.lat},${visit.departure.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 hover:underline mt-0.5 flex items-center gap-1 w-fit transition-colors"
                          >
                            <MapPin className="w-3 h-3" />
                            Ver ubicación GPS en mapa
                          </a>
                        )}
                      </div>
                      <p className="font-mono text-slate-700 font-medium">{formatTime(visit.departure.localTime)}</p>
                    </div>
                  )}
                </div>

                {visit.totalDurationMin !== null && visit.totalDurationMin !== undefined && (
                  <div className="mt-4 bg-slate-50 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Tiempo total trabajado</span>
                    <span className="text-2xl font-bold text-slate-800">{formatDuration(visit.totalDurationMin)}</span>
                  </div>
                )}
              </div>

              {/* Activities */}
              {visit.activities.length > 0 && (
                <div className="px-6 py-5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-3">
                    Actividades Realizadas ({visit.activities.length})
                  </p>
                  <div className="space-y-4">
                    {visit.activities.map((act, i) => (
                      <div key={act.id} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-800 text-sm leading-relaxed">{act.description}</p>
                          <p className="text-xs text-slate-400 mt-1">{formatDateTime(act.timestamp)}</p>
                          {act.photoUrls.length > 0 && (
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {act.photoUrls.map((url, pi) => (
                                <img key={pi} src={url} alt="" className="w-20 h-20 rounded-lg object-cover border border-slate-100" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {visit.summary && (
                <div className="px-6 py-5">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Resumen General</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{visit.summary}</p>
                </div>
              )}

              {/* Footer */}
              <div className="px-6 py-6 bg-slate-50 text-center border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
                  {profile?.companyName || 'Bitácora Técnica Profesional'}
                </p>
                <p className="text-xs text-slate-400">
                  Reporte de servicio técnico emitido el {new Date().toLocaleDateString('es-EC')}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Los tiempos de atención y coordenadas GPS en este reporte son generados automáticamente por el sistema como respaldo de transparencia.
                </p>
              </div>

            </div>
          </div>
        </main>
      </div>
    </>
  );
}
