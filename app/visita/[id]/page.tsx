'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, Clock, MapPin, Plus, CheckCircle2,
  Loader2, AlertCircle, ChevronRight, Camera,
  MoreVertical, Pencil, Trash2, X, Check,
  PauseCircle, PlayCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  getVisit, closeVisit, updateActivity, deleteActivity,
  pauseVisit, resumeVisit, saveClientSignature
} from '@/lib/visitService';
import { Visit, Activity } from '@/lib/types';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with canvas
const SignatureCanvas = dynamic(() => import('react-signature-canvas'), { ssr: false });

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m < 10 ? '0' : ''}${m}m`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

// ─────────────────────────────────────────────────────────
// Edit Activity Modal
// ─────────────────────────────────────────────────────────
function EditActivityModal({
  activity, onSave, onCancel, saving,
}: {
  activity: Activity; onSave: (text: string) => void; onCancel: () => void; saving: boolean;
}) {
  const [text, setText] = useState(activity.description);
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Editar actividad</h3>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <textarea
          value={text} onChange={e => setText(e.target.value)} rows={5}
          className="w-full border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => onSave(text)} disabled={saving || !text.trim()}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Pause Modal
// ─────────────────────────────────────────────────────────
const PAUSE_REASONS = ['Almuerzo / merienda', 'Esperando materiales', 'Traslado interno', 'Pausa del cliente', 'Otro'];

function PauseModal({ onConfirm, onCancel, pausing }: {
  onConfirm: (reason: string) => void; onCancel: () => void; pausing: boolean;
}) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');

  const finalReason = reason === 'Otro' ? custom.trim() : reason;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">⏸ Pausar Visita</h3>
          <button onClick={onCancel} className="p-1 rounded-full hover:bg-slate-100"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <p className="text-slate-500 text-sm">El tiempo en pausa no contará en la duración total.</p>
        <div className="space-y-2">
          {PAUSE_REASONS.map(r => (
            <label key={r} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
              <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="w-4 h-4 text-amber-500" />
              <span className="text-slate-700 text-sm">{r}</span>
            </label>
          ))}
        </div>
        {reason === 'Otro' && (
          <input
            type="text" value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Describe el motivo..."
            className="w-full border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            autoFocus
          />
        )}
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
          <button
            onClick={() => onConfirm(finalReason)}
            disabled={pausing || !finalReason}
            className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {pausing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PauseCircle className="w-4 h-4" />} Pausar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Close Visit Modal (with optional digital signature)
// ─────────────────────────────────────────────────────────
function CloseVisitModal({
  onConfirm, onCancel, closing
}: { onConfirm: (summary: string, sig: string | null) => void; onCancel: () => void; closing: boolean }) {
  const [summary, setSummary] = useState('');
  const [showSig, setShowSig] = useState(false);
  const sigRef = useRef<any>(null);

  const handleConfirm = () => {
    let sig: string | null = null;
    if (showSig && sigRef.current && !sigRef.current.isEmpty()) {
      sig = sigRef.current.getTrimmedCanvas().toDataURL('image/png');
    }
    onConfirm(summary, sig);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-auto p-6 space-y-4 my-4">
        <h3 className="font-bold text-slate-800 text-lg">🏁 Finalizar visita</h3>
        <p className="text-slate-500 text-sm">Se registrará la hora de salida y tu ubicación GPS actual.</p>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Resumen del trabajo <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={summary} onChange={e => setSummary(e.target.value)} rows={3}
            className="w-full border border-slate-200 rounded-xl p-3 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Ej: Se configuraron 8 cámaras IP, se verificó conectividad en NVR..."
          />
        </div>

        {/* Digital Signature toggle */}
        <button
          onClick={() => setShowSig(v => !v)}
          className="w-full flex items-center gap-2 py-3 border border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors text-sm font-medium"
        >
          ✒️ {showSig ? 'Ocultar firma del cliente' : 'Solicitar firma del cliente (opcional)'}
        </button>

        {showSig && (
          <div className="space-y-2">
            <p className="text-xs text-slate-400">El cliente firma con el dedo en el cuadro de abajo:</p>
            <div className="border-2 border-slate-200 rounded-xl overflow-hidden bg-white">
              <SignatureCanvas
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                {...({ ref: sigRef, penColor: '#1e293b', canvasProps: { className: 'w-full', style: { height: 160, width: '100%' } } } as any)}
              />
            </div>
            <button onClick={() => sigRef.current?.clear()} className="text-xs text-red-500 hover:underline">
              Limpiar firma
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-50">
            Cancelar
          </button>
          <button
            onClick={handleConfirm} disabled={closing}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {closing ? <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando...</> : '🏁 Registrar Salida'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Activity Card
// ─────────────────────────────────────────────────────────
function ActivityCard({
  activity, index, isActive, onEdit, onDelete, onImageClick,
}: {
  activity: Activity; index: number; isActive: boolean;
  onEdit: (a: Activity) => void; onDelete: (id: string) => void; onImageClick?: (url: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm relative">
      <div className="flex gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 text-sm leading-relaxed">{activity.description}</p>
          {activity.photoUrls.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {activity.photoUrls.map((url, i) => (
                <img
                  key={i} src={url} alt={`Evidencia ${i + 1}`}
                  onClick={() => onImageClick?.(url)}
                  className="w-16 h-16 rounded-lg object-cover border border-slate-100 flex-shrink-0 cursor-zoom-in active:scale-95 transition-transform"
                />
              ))}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">{formatTime(activity.timestamp)}</p>
        </div>
        {isActive && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setMenuOpen(v => !v)} className="p-1.5 rounded-full hover:bg-slate-100 transition-colors">
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 bg-white border border-slate-100 rounded-xl shadow-lg z-20 w-36 overflow-hidden">
                  <button onClick={() => { setMenuOpen(false); onEdit(activity); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                    <Pencil className="w-4 h-4 text-blue-500" /> Editar
                  </button>
                  <button onClick={() => { setMenuOpen(false); onDelete(activity.id); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function VisitaPage() {
  const params = useParams();
  const visitId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const { capture: captureGeo } = useGeolocation();

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState('00:00');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const loadVisit = useCallback(async () => {
    try {
      const v = await getVisit(visitId);
      setVisit(v);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error cargando visita: ${err.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [visitId]);

  useEffect(() => { loadVisit(); }, [loadVisit]);

  // Live elapsed timer (only when EN_PROGRESO)
  useEffect(() => {
    if (!visit || visit.status !== 'EN_PROGRESO') return;
    const update = () => {
      const ms = Date.now() - new Date(visit.arrival.localTime).getTime();
      const totalMin = Math.floor(ms / 60000);
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      setElapsed(`${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`);
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [visit]);

  useEffect(() => {
    const onFocus = () => loadVisit();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [loadVisit]);

  const handleClose = async (summary: string, signature: string | null) => {
    if (!user) return;
    setClosing(true);
    try {
      let geoPoint = undefined;
      try { geoPoint = await captureGeo(); } catch { /* GPS optional at exit */ }

      await closeVisit(visitId, {
        localTime: new Date().toISOString(),
        ...(geoPoint ? { location: geoPoint } : {})
      }, summary || undefined);

      // Save signature if provided
      if (signature) {
        await saveClientSignature(visitId, signature);
      }

      toast.success('✅ Visita finalizada correctamente');
      router.push(`/visita/${visitId}/reporte`);
    } catch {
      toast.error('Error al cerrar visita');
      setClosing(false);
    }
  };

  const handlePause = async (reason: string) => {
    setPausing(true);
    try {
      await pauseVisit(visitId, reason);
      toast.success('⏸ Visita pausada');
      setShowPauseModal(false);
      await loadVisit();
    } catch {
      toast.error('Error al pausar la visita');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    setResuming(true);
    try {
      await resumeVisit(visitId);
      toast.success('▶️ Visita reanudada');
      await loadVisit();
    } catch {
      toast.error('Error al reanudar la visita');
    } finally {
      setResuming(false);
    }
  };

  const handleEditSave = async (newDescription: string) => {
    if (!editingActivity) return;
    setEditSaving(true);
    try {
      await updateActivity(visitId, editingActivity.id, newDescription);
      toast.success('Actividad actualizada');
      setEditingActivity(null);
      await loadVisit();
    } catch {
      toast.error('Error al editar la actividad');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteActivity = async (activityId: string) => {
    if (!confirm('¿Eliminar esta actividad? Esta acción no se puede deshacer.')) return;
    try {
      await deleteActivity(visitId, activityId);
      toast.success('Actividad eliminada');
      await loadVisit();
    } catch {
      toast.error('Error al eliminar la actividad');
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  if (!visit) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 flex-col gap-3">
        <AlertCircle className="w-10 h-10 text-slate-300" />
        <p className="text-slate-500">Visita no encontrada</p>
        <Link href="/" className="text-blue-600 hover:underline">Volver al inicio</Link>
      </div>
    );
  }

  const isActive = visit.status === 'EN_PROGRESO';
  const isPaused = visit.status === 'PAUSADA';
  const showActions = isActive || isPaused;

  return (
    <div className="min-h-screen bg-slate-50 pb-36">
      {/* Lightbox */}
      {lightboxImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out" onClick={() => setLightboxImage(null)}>
          <button className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" onClick={(e) => { e.stopPropagation(); setLightboxImage(null); }}>
            <X className="w-6 h-6 text-white" />
          </button>
          <img src={lightboxImage} alt="Evidencia Ampliada" className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl" />
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/"><button className="p-2 rounded-full hover:bg-slate-100 transition-colors"><ArrowLeft className="w-5 h-5 text-slate-600" /></button></Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-slate-800 truncate">{visit.clientName}</h1>
            {visit.clientAddress && (
              <p className="text-xs text-slate-400 flex items-center gap-1 truncate"><MapPin className="w-3 h-3" /> {visit.clientAddress}</p>
            )}
          </div>
          <Link href={`/visita/${visitId}/reporte`}>
            <button className="text-xs text-blue-600 border border-blue-200 rounded-full px-3 py-1 hover:bg-blue-50">Ver reporte</button>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Status card */}
        <div className={`rounded-2xl p-5 text-white ${isActive ? 'bg-emerald-500' : isPaused ? 'bg-amber-500' : 'bg-slate-700'}`}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {isActive ? <><div className="w-2 h-2 rounded-full bg-white animate-pulse" /><span className="text-emerald-100 text-sm font-medium">EN CURSO</span></>
                  : isPaused ? <><PauseCircle className="w-4 h-4" /><span className="text-amber-100 text-sm font-medium">PAUSADA</span></>
                    : <><CheckCircle2 className="w-4 h-4" /><span className="text-slate-300 text-sm font-medium">FINALIZADA</span></>}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-white/80" />
                <p className="text-white/80 text-sm">Llegada: {formatTime(visit.arrival.localTime)}</p>
              </div>
              {visit.departure && <p className="text-white/80 text-sm">Salida: {formatTime(visit.departure.localTime)}</p>}
            </div>
            <div className="text-right">
              {isActive
                ? <p className="text-3xl font-bold font-mono tabular-nums">{elapsed}</p>
                : isPaused
                  ? <p className="text-2xl font-bold">⏸ Pausa</p>
                  : <p className="text-3xl font-bold">{formatDuration((visit.totalDurationMin ?? 0) * 60000)}</p>
              }
              <p className="text-white/70 text-xs mt-0.5">
                {isActive ? 'tiempo en curso' : isPaused ? 'en pausa' : 'tiempo neto'}
              </p>
            </div>
          </div>

          {/* Pauses log */}
          {visit.pauses && visit.pauses.length > 0 && (
            <div className="mt-3 bg-black/20 rounded-xl p-3 space-y-1">
              <p className="text-xs text-white/70 font-semibold uppercase tracking-wide">Pausas Registradas</p>
              {visit.pauses.map((p, i) => (
                <div key={i} className="flex justify-between items-center text-xs text-white/80">
                  <span>⏸ {p.reason}</span>
                  <span>{formatTime(p.startTime)}{p.endTime ? ` → ${formatTime(p.endTime)}` : ' (en curso)'}</span>
                </div>
              ))}
            </div>
          )}

          {/* GPS Map */}
          {visit.arrival.location && (
            <div className="mt-4 bg-slate-800/50 rounded-xl overflow-hidden border border-slate-600">
              <p className="text-white/80 text-xs p-2.5 flex items-center justify-between border-b border-slate-600/50 bg-slate-800">
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-blue-400" /> MAPA DE LLEGADA</span>
                {visit.arrival.location.accuracy && <span className="text-white/50">±{visit.arrival.location.accuracy}m</span>}
              </p>
              <iframe
                width="100%" height="140" frameBorder="0" scrolling="no"
                src={`https://maps.google.com/maps?q=${visit.arrival.location.lat},${visit.arrival.location.lng}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                className="pointer-events-none"
              />
              <div className="bg-slate-800 p-2 text-center">
                <a href={`https://www.google.com/maps/search/?api=1&query=${visit.arrival.location.lat},${visit.arrival.location.lng}`}
                  target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors inline-block">
                  Abrir aplicación de mapas →
                </a>
              </div>
            </div>
          )}

          {/* Arrival photo */}
          {visit.arrival.photoUrl && !visit.arrival.photoUrl.startsWith('pending_') && (
            <div className="mt-4">
              <p className="text-white/70 text-xs mb-2 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> FOTO DE LLEGADA</p>
              <img src={visit.arrival.photoUrl} alt="Foto de llegada" onClick={() => setLightboxImage(visit.arrival.photoUrl!)}
                className="w-full h-40 object-cover rounded-xl cursor-zoom-in border border-white/10 active:scale-95 transition-transform"
              />
            </div>
          )}
        </div>

        {/* Activities */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">Actividades ({visit.activities.length})</h2>
            {isActive && (
              <Link href={`/visita/${visitId}/actividad`}>
                <button className="flex items-center gap-1 text-sm text-blue-600 bg-blue-50 rounded-full px-3 py-1.5 hover:bg-blue-100 font-medium">
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </Link>
            )}
          </div>

          {visit.activities.length === 0 ? (
            <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <Camera className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              <p className="text-sm">Aún no hay actividades registradas</p>
              {isActive && (
                <Link href={`/visita/${visitId}/actividad`}>
                  <button className="mt-3 text-blue-600 text-sm hover:underline flex items-center gap-1 mx-auto">
                    <Plus className="w-4 h-4" /> Registrar primera actividad
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {visit.activities.map((act, i) => (
                <ActivityCard key={act.id} activity={act} index={i} isActive={isActive}
                  onEdit={setEditingActivity} onDelete={handleDeleteActivity} onImageClick={setLightboxImage} />
              ))}
              {isActive && (
                <Link href={`/visita/${visitId}/actividad`}>
                  <button className="w-full border-2 border-dashed border-blue-200 rounded-xl py-3 text-blue-500 text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Agregar otra actividad
                  </button>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Client signature (if completed) */}
        {visit.clientSignature && (
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">✒️ Firma del Cliente</p>
            <img src={visit.clientSignature} alt="Firma del cliente" className="max-h-24 object-contain border border-slate-100 rounded-lg" />
          </div>
        )}

        {/* Summary */}
        {visit.summary && (
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Resumen</p>
            <p className="text-slate-700 text-sm">{visit.summary}</p>
          </div>
        )}

        {/* Link to report */}
        <Link href={`/visita/${visitId}/reporte`}>
          <button className="w-full bg-white border border-slate-200 rounded-xl py-3 text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2">
            Ver Reporte / Factura <ChevronRight className="w-4 h-4" />
          </button>
        </Link>

      </main>

      {/* Fixed action bar */}
      {showActions && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-4">
          <div className="max-w-lg mx-auto space-y-2">
            {isPaused ? (
              <button
                onClick={handleResume} disabled={resuming}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {resuming ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                {resuming ? 'Reanudando...' : '▶️ Reanudar Visita'}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPauseModal(true)}
                  className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 py-4 rounded-2xl font-bold hover:bg-amber-100 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <PauseCircle className="w-5 h-5" /> Pausar
                </button>
                <button
                  onClick={() => setShowCloseModal(true)}
                  className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold hover:bg-red-600 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  🏁 Finalizar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showPauseModal && <PauseModal onConfirm={handlePause} onCancel={() => setShowPauseModal(false)} pausing={pausing} />}
      {showCloseModal && <CloseVisitModal onConfirm={handleClose} onCancel={() => setShowCloseModal(false)} closing={closing} />}
      {editingActivity && <EditActivityModal activity={editingActivity} onSave={handleEditSave} onCancel={() => setEditingActivity(null)} saving={editSaving} />}
    </div>
  );
}
