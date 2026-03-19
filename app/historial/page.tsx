'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ArrowLeft, Clock, MapPin, CheckCircle, Loader2, ChevronRight, Search, Calendar, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getVisitsByTechnician, deleteVisit } from '@/lib/visitService';
import { Visit } from '@/lib/types';
import { toast } from 'sonner';

const PAGE_SIZE = 15;

type DateFilter = 'all' | 'today' | 'week' | 'month';

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

function startOfDay(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString();
}
function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonth(): string {
  const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
}

export default function HistorialPage() {
  const { user } = useAuth();
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Client-side pagination state
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);

  const handleExportCSV = (visits: Visit[]) => {
    const header = ['Fecha', 'Cliente', 'Dirección', 'Estado', 'Llegada', 'Salida', 'Duración (min)', 'Actividades'];
    const rows = visits.map(v => [
      new Date(v.arrival.localTime).toLocaleDateString('es-EC'),
      v.clientName,
      v.clientAddress ?? '',
      v.status,
      formatTime(v.arrival.localTime),
      v.departure ? formatTime(v.departure.localTime) : '',
      v.totalDurationMin ?? '',
      v.activities.length,
    ]);
    const csv = [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `visitas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Pull latest 300 visits to memory for instant filtering
      const result = await getVisitsByTechnician(user.email);
      setAllVisits(result);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error cargando historial: ${err.message || 'Desconocido'}`);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Reset pagination limit when filters change
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE);
  }, [search, dateFilter]);

  // Purely client-side, hyper-fast filtering
  const filtered = useMemo(() => {
    return allVisits.filter(v => {
      // 1. Text search
      if (search && !v.clientName.toLowerCase().includes(search.toLowerCase())) return false;
      
      // 2. Date filter
      const localTime = v.arrival.localTime;
      if (dateFilter === 'today' && localTime < startOfDay()) return false;
      if (dateFilter === 'week' && localTime < startOfWeek()) return false;
      if (dateFilter === 'month' && localTime < startOfMonth()) return false;

      return true;
    });
  }, [allVisits, search, dateFilter]);

  const displayedVisits = useMemo(() => {
    return filtered.slice(0, displayLimit);
  }, [filtered, displayLimit]);

  const hasMore = displayLimit < filtered.length;

  const loadMore = () => {
    setDisplayLimit(prev => prev + PAGE_SIZE);
  };

  const handleDelete = async (e: React.MouseEvent, visitId: string) => {
    e.preventDefault(); // Evita que el Link redireccione
    if (!confirm('¿Estás seguro de eliminar este reporte por completo? Se borrarán todas las fotos asociadas. Esta acción no se puede deshacer.')) return;

    setDeletingId(visitId);
    try {
      await deleteVisit(visitId);
      setAllVisits(prev => prev.filter(v => v.id !== visitId));
      toast.success('Visita eliminada correctamente');
    } catch (err) {
      console.error(err);
      toast.error('Ocurrió un error al eliminar la visita');
    } finally {
      setDeletingId(null);
    }
  };

  const DATE_FILTERS: { key: DateFilter; label: string }[] = [
    { key: 'all', label: 'Todo' },
    { key: 'today', label: 'Hoy' },
    { key: 'week', label: 'Esta semana' },
    { key: 'month', label: 'Este mes' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/"><button className="p-2 rounded-full hover:bg-slate-100"><ArrowLeft className="w-5 h-5 text-slate-600" /></button></Link>
          <h1 className="font-bold text-slate-800 text-lg flex-1">Historial de Visitas</h1>
          <button
            onClick={() => handleExportCSV(filtered)}
            className="flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5 hover:bg-emerald-100 transition-colors font-medium"
            title="Descargar CSV para Excel"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
        </div>

        {/* Search bar */}
        <div className="max-w-lg mx-auto px-4 pb-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-xl py-2.5 pl-9 pr-4 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Date filter pills */}
        <div className="max-w-lg mx-auto px-4 pb-3 flex gap-2 overflow-x-auto">
          {DATE_FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setDateFilter(f.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                dateFilter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>{search || dateFilter !== 'all' ? 'No hay visitas con ese filtro' : 'Aún no hay visitas registradas'}</p>
            {!search && dateFilter === 'all' && (
              <Link href="/visita/nueva"><button className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Nueva Visita</button></Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 px-1">{filtered.length} visita{filtered.length !== 1 ? 's' : ''} {search || dateFilter !== 'all' ? 'con este filtro' : 'en total'}</p>
            {displayedVisits.map(v => (
              <Link key={v.id} href={`/visita/${v.id}`}>
                <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${v.status === 'FINALIZADA' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {v.status === 'FINALIZADA'
                      ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                      : <Clock className="w-5 h-5 text-amber-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-slate-800 truncate">{v.clientName}</p>
                    {v.clientAddress && (
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3" /> {v.clientAddress}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {formatDate(v.arrival.localTime)} · {formatTime(v.arrival.localTime)}
                      {v.totalDurationMin !== undefined && v.totalDurationMin !== null && ` · ${formatDuration(v.totalDurationMin)}`}
                    </p>
                    <p className="text-xs text-slate-400">{v.activities.length} actividades</p>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button 
                      onClick={(e) => handleDelete(e, v.id)}
                      disabled={deletingId === v.id}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
                      title="Eliminar Reporte"
                    >
                      {deletingId === v.id ? <Loader2 className="w-5 h-5 animate-spin text-red-500" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </Link>
            ))}

            {/* Load more */}
            {hasMore && (
              <button
                onClick={loadMore}
                className="w-full py-3 border border-slate-200 rounded-xl text-slate-500 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors mt-4"
              >
                Cargar más
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
