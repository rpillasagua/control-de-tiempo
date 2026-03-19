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
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => { loadVisit(); }, [loadVisit]);

  const handleDownloadPDF = async () => {
    try {
      setDownloadingPdf(true);
      toast.loading('Generando PDF corporativo...', { id: 'pdf-toast' });

      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const element = document.getElementById('report-content');
      if (!element) throw new Error('Contenedor no encontrado');

      // ── 1. Pre-convert cross-origin images to inline base64 ──
      const images = element.querySelectorAll('img');
      const origSrcs: { img: HTMLImageElement; src: string }[] = [];

      await Promise.all(
        Array.from(images).map(async (img) => {
          const src = img.src;
          if (!src || src.startsWith('data:') || src.startsWith('blob:')) return; 

          try {
            origSrcs.push({ img, src });
            
            // Check if it's the same origin
            const isSameOrigin = src.startsWith(window.location.origin) || src.startsWith('/');
            
            // Fetch directly if same origin, otherwise go through our proxy
            const fetchUrl = isSameOrigin 
              ? src 
              : `/api/proxy-image?url=${encodeURIComponent(src)}`;
              
            const resp = await fetch(fetchUrl);
            
            if (!resp.ok) {
              console.warn(`PDF Proxy error for ${src}: ${resp.status}`);
              return; 
            }

            const blob = await resp.blob();
            const dataUrl: string = await new Promise((res, rej) => {
              const reader = new FileReader();
              reader.onloadend = () => res(reader.result as string);
              reader.onerror = rej;
              reader.readAsDataURL(blob);
            });
            img.src = dataUrl;
          } catch (err) {
            // If fetch fails, leave original src — html2canvas will skip it
            console.warn('PDF: no se pudo convertir imagen (proxy falló):', err);
          }
        })
      );

      // ── 2. Ocultar elementos no-print ──
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach((el) => {
        (el as HTMLElement).style.display = 'none';
      });

      // ── 3. Capturar con html2canvas ──
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      // ── 4. Restaurar elementos ──
      noPrintElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      // Restore original image srcs
      origSrcs.forEach(({ img, src }) => {
        img.src = src;
      });

      // ── 5. Generar PDF multi-página ──
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        // Single page — fits on one A4
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      } else {
        // Multi-page: slice canvas into A4-height chunks
        const sliceHeightPx = (pageHeight / imgWidth) * canvas.width;
        let yOffset = 0;
        let pageIndex = 0;

        while (yOffset < canvas.height) {
          const h = Math.min(sliceHeightPx, canvas.height - yOffset);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = h;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, yOffset, canvas.width, h, 0, 0, canvas.width, h);

          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
          const sliceImgHeight = (h * imgWidth) / canvas.width;

          if (pageIndex > 0) pdf.addPage();
          pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, sliceImgHeight);

          yOffset += h;
          pageIndex++;
        }
      }

      pdf.save(`Reporte_Tecnico_${visit?.clientName?.replace(/\s+/g, '_')}_${visitId.slice(0, 6)}.pdf`);
      toast.success('PDF descargado exitosamente', { id: 'pdf-toast' });
    } catch (err) {
      console.error('Error generando PDF:', err);
      toast.error('Error al generar PDF. Intente de nuevo.', { id: 'pdf-toast' });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/reporte/${visitId}` : '';

  const handleWhatsApp = () => {
    const isCompleteLocal = visit.status === 'FINALIZADA';
    const estadoTexto = isCompleteLocal ? 'realizada' : 'en proceso';
    const text = `Hola, adjunto el *Reporte Técnico* de la visita ${estadoTexto}.\n\n📍 Cliente: ${visit.clientName}\n🔗 Ver reporte aquí: ${publicUrl}`;
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

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out no-print"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Evidencia" 
            className="max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl" 
          />
        </div>
      )}

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
                onClick={handleDownloadPDF}
                disabled={downloadingPdf}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {downloadingPdf ? 'Generando...' : 'Descargar PDF'}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6">
          <div id="report-content" className="bg-white rounded-2xl shadow-sm overflow-hidden print-card">

            {/* Report Header */}
            <div className="bg-slate-800 text-white px-6 py-6 border-b border-slate-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-5">
                  {profile?.logoUrl && (
                    <img 
                      src={profile.logoUrl} 
                      alt="Logo Empresa" 
                      className="w-16 h-16 rounded-xl bg-white object-contain p-1.5 shadow-sm no-print" 
                      crossOrigin="anonymous" 
                    />
                  )}
                  {profile?.logoUrl && (
                    <img 
                      src={profile.logoUrl} 
                      alt="Logo Empresa Print" 
                      className="w-16 h-16 rounded-xl bg-white object-contain p-1.5 shadow-sm hidden print:block pt-0" 
                      crossOrigin="anonymous" 
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Reporte Técnico</h2>
                    <p className="text-slate-400 text-sm mt-0.5 font-medium">#{visitId.split('-')[0].toUpperCase()}</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide shadow-sm ${isComplete ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-amber-400 text-amber-950 shadow-amber-400/20'}`}>
                  {isComplete ? '✓ COMPLETADA' : '⏳ EN CURSO'}
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
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm w-full max-w-sm" data-html2canvas-ignore="true">
                          <iframe 
                            width="100%" 
                            height="150" 
                            frameBorder="0" 
                            scrolling="no" 
                            src={`https://maps.google.com/maps?q=${visit.arrival.location.lat},${visit.arrival.location.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                          />
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${visit.arrival.location.lat},${visit.arrival.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-50 text-xs text-blue-600 hover:text-blue-700 py-2 px-3 flex items-center justify-between w-full transition-colors border-t border-slate-200"
                          >
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Abrir en Google Maps</span>
                            {visit.arrival.location.accuracy && <span className="text-slate-400">±{visit.arrival.location.accuracy}m</span>}
                          </a>
                        </div>
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
                          <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 shadow-sm w-full max-w-sm" data-html2canvas-ignore="true">
                            <iframe 
                              width="100%" 
                              height="150" 
                              frameBorder="0" 
                              scrolling="no" 
                              src={`https://maps.google.com/maps?q=${visit.departure.location.lat},${visit.departure.location.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                            />
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${visit.departure.location.lat},${visit.departure.location.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-slate-50 text-xs text-blue-600 hover:text-blue-700 py-2 px-3 flex items-center justify-between w-full transition-colors border-t border-slate-200"
                            >
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Abrir en Google Maps</span>
                              {visit.departure.location.accuracy && <span className="text-slate-400">±{visit.departure.location.accuracy}m</span>}
                            </a>
                          </div>
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
                                <img 
                                  key={pi} 
                                  src={url} 
                                  alt="Evidencia técnica" 
                                  crossOrigin="anonymous"
                                  onClick={() => setLightboxImage(url)}
                                  className="w-20 h-20 rounded-lg object-cover border border-slate-100 cursor-zoom-in active:scale-95 transition-transform" 
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
        </main>
      </div>
    </>
  );
}
