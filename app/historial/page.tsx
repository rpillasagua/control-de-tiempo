'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Clock, MapPin, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getVisitsByTechnician } from '@/lib/visitService';
import { Visit } from '@/lib/types';
import { toast } from 'sonner';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}
function formatDuration(min: number): string {
  const h = Math.floor(min / 60); const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function HistorialPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const all = await getVisitsByTechnician(user.email);
      setVisits(all);
    } catch {
      toast.error('Error cargando historial');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/"><button className="p-2 rounded-full hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-slate-600" /></button></Link>
          <h1 className="font-bold text-slate-800 text-lg">Historial de Visitas</h1>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : visits.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>Aún no hay visitas registradas</p>
            <Link href="/visita/nueva"><button className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Nueva Visita</button></Link>
          </div>
        ) : (
          visits.map(v => (
            <Link key={v.id} href={`/visita/${v.id}`}>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${v.status === 'FINALIZADA' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                  {v.status === 'FINALIZADA'
                    ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                    : <Clock className="w-5 h-5 text-amber-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{v.clientName}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(v.arrival.localTime)} · {formatTime(v.arrival.localTime)}
                    {v.totalDurationMin !== undefined && v.totalDurationMin !== null && ` · ${formatDuration(v.totalDurationMin)}`}
                  </p>
                  <p className="text-xs text-slate-400">{v.activities.length} actividades</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            </Link>
          ))
        )}
      </main>
    </div>
  );
}
