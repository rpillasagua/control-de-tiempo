'use client';

/**
 * Reporte Público — accesible SIN login
 * Cualquier persona con el link puede ver este reporte.
 * Usado para enviar al cliente por WhatsApp.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, MapPin, Clock, CheckCircle, AlertCircle, Building2, Phone } from 'lucide-react';
import { getVisit } from '@/lib/visitService';
import { getProfile, Profile } from '@/lib/profileService';
import { Visit } from '@/lib/types';

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
  const h = Math.floor(min / 60); const m = min % 60;
  return h > 0 ? `${h} hora${h !== 1 ? 's' : ''} ${m > 0 ? `${m} min` : ''}`.trim() : `${m} minutos`;
}

export default function PublicReportPage() {
  const params = useParams();
  const visitId = params.id as string;
  const [visit, setVisit] = useState<Visit | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    try {
      const v = await getVisit(visitId);
      if (!v) { setNotFound(true); return; }
      setVisit(v);
      const p = await getProfile(v.technicianId);
      setProfile(p);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );

  if (notFound || !visit) return (
    <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-3 text-center px-4">
      <AlertCircle className="w-12 h-12 text-slate-300" />
      <p className="text-slate-600 font-medium">Reporte no encontrado</p>
      <p className="text-slate-400 text-sm">El link puede estar incorrecto o el reporte fue eliminado.</p>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:py-0">
        <div className="max-w-2xl mx-auto">

          {/* Print button — screen only */}
          <div className="text-right mb-4 no-print">
            <button
              onClick={() => window.print()}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm hover:bg-slate-50"
            >
              🖨️ Imprimir / PDF
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

            {/* Header */}
            <div className="bg-slate-800 text-white px-6 py-5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold">Reporte de Visita Técnica</h1>
                  <p className="text-slate-400 text-sm mt-0.5">#{visitId.split('-')[0].toUpperCase()}</p>
                </div>
                <span className="bg-emerald-500 text-white text-sm px-3 py-1 rounded-full font-medium">
                  ✓ Completada
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">

              {/* Client & Tech */}
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

              {/* Times */}
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
                          className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 mt-0.5 w-fit transition-colors"
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
                            className="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center gap-1 mt-0.5 w-fit transition-colors"
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

                {visit.totalDurationMin != null && (
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
                  <div className="space-y-5">
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
                                <img
                                  key={pi}
                                  src={url}
                                  alt={`Evidencia ${pi + 1}`}
                                  className="w-24 h-24 rounded-lg object-cover border border-slate-100"
                                />
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
        </div>
      </div>
    </>
  );
}
