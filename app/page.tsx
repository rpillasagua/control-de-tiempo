'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader2, Plus, Clock, MapPin, CheckCircle, ChevronRight, Calendar, User, Users, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getActiveVisit, getVisitsByTechnician } from '@/lib/visitService';
import { Visit } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { SyncHubIndicator } from '@/components/SyncHubIndicator';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long'
  });
}

function elapsed(sinceIso: string): string {
  const ms = Date.now() - new Date(sinceIso).getTime();
  const min = Math.floor(ms / 60000);
  return formatDuration(min);
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

const OVERDUE_HOURS = 4;

function ActiveVisitBanner({ visit }: { visit: Visit }) {
  const [elapsedDisplay, setElapsedDisplay] = useState(elapsed(visit.arrival.localTime));
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    const check = () => {
      const ms = Date.now() - new Date(visit.arrival.localTime).getTime();
      setElapsedDisplay(elapsed(visit.arrival.localTime));
      setIsOverdue(ms > OVERDUE_HOURS * 60 * 60 * 1000);
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, [visit.arrival.localTime]);

  return (
    <div className="space-y-2">
      {isOverdue && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-lg leading-none">⚠️</span>
          <div>
            <p className="text-amber-800 font-semibold text-sm">Llevas más de {OVERDUE_HOURS}h en esta visita</p>
            <p className="text-amber-600 text-xs mt-0.5">¿Olvidaste registrar la salida?</p>
          </div>
        </div>
      )}
      <Link href={`/visita/${visit.id}`}>
        <div className="bg-emerald-500 text-white rounded-2xl p-5 shadow-lg flex items-center justify-between hover:bg-emerald-600 transition-colors active:scale-[0.98] cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
            <div>
              <p className="font-bold text-lg">{visit.clientName}</p>
              <p className="text-emerald-100 text-sm">
                Desde {formatTimestamp(visit.arrival.localTime)} · {elapsedDisplay} en curso
              </p>
            </div>
          </div>
          <ChevronRight className="w-6 h-6 text-emerald-200" />
        </div>
      </Link>
    </div>
  );
}

function VisitCard({ visit }: { visit: Visit }) {
  const isClosed = visit.status === 'FINALIZADA';
  return (
    <Link href={`/visita/${visit.id}`}>
      <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] cursor-pointer">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isClosed
                ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
              }
              <p className="font-semibold text-slate-800 truncate">{visit.clientName}</p>
            </div>
            {visit.clientAddress && (
              <div className="flex items-center gap-1 text-slate-500 text-sm mb-2">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{visit.clientAddress}</span>
              </div>
            )}
            <p className="text-xs text-slate-400">
              {formatTimestamp(visit.arrival.localTime)}
              {visit.departure && ` → ${formatTimestamp(visit.departure.localTime)}`}
            </p>
          </div>
          <div className="text-right ml-3 flex-shrink-0">
            {visit.totalDurationMin !== undefined && visit.totalDurationMin !== null ? (
              <p className="font-bold text-slate-700">{formatDuration(visit.totalDurationMin)}</p>
            ) : null}
            <p className="text-xs text-slate-400">{visit.activities.length} actividades</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// Login Page
// ─────────────────────────────────────────────────────────
function LoginPage({ onLogin, loading }: { onLogin: () => void; loading: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-800 to-slate-900">
      <div className="w-full max-w-[380px] bg-white rounded-2xl shadow-2xl p-10">
        <div className="flex justify-center mb-6">
          <img src="/icon-192.png" alt="Bitácora Técnica Logo" className="w-20 h-20 rounded-2xl shadow-lg border-2 border-slate-100" />
        </div>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Bitácora Técnica</h1>
          <p className="text-slate-500 text-sm mt-1">Registro de visitas y evidencia de trabajo</p>
        </div>
        <button
          onClick={onLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </>
          )}
        </button>
        <p className="text-xs text-center text-slate-400 mt-6">Sesión persistente — no expira cada hora</p>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, loading: authLoading, login } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [metrics, setMetrics] = useState({ total: 0, completed: 0, hours: 0 });
  const [dataLoading, setDataLoading] = useState(false);

  const loadVisits = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayISO = todayStart.toISOString();

      const [active, recentVisits] = await Promise.all([
        getActiveVisit(user.email),
        getVisitsByTechnician(user.email, weekAgo.toISOString())
      ]);
      
      setActiveVisit(active);

      let completed = 0;
      let totalTime = 0;
      const todayList: Visit[] = [];

      for (const v of recentVisits) {
        if (v.status === 'FINALIZADA') {
          completed++;
          if (v.totalDurationMin) totalTime += v.totalDurationMin;
        }
        if (v.createdAt >= todayISO && v.status !== 'EN_PROGRESO') {
          todayList.push(v);
        }
      }

      setMetrics({
        total: recentVisits.length,
        completed,
        hours: Math.round(totalTime / 60)
      });
      setVisits(todayList);
    } catch (err: any) {
      console.error(err);
      toast.error(`Error cargando visitas: ${err.message || 'Desconocido'}`);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) loadVisits();
  }, [user, loadVisits]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLogin={async () => {
          setLoginLoading(true);
          try { await login(); } catch { /* handled internally */ }
          finally { setLoginLoading(false); }
        }}
        loading={loginLoading}
      />
    );
  }

  const today = formatDate(new Date().toISOString());

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon-192.png" alt="Logo" className="w-7 h-7 rounded-sm shadow-sm" />
            <h1 className="font-bold text-slate-800 text-lg">Bitácora Técnica</h1>
          </div>
          <div className="flex items-center gap-2">
            <SyncHubIndicator />
            {user.picture
              ? <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border border-slate-200" />
              : <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
            }
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Date + greeting */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {today}
          </p>
          <h2 className="text-2xl font-bold text-slate-800 mt-1">
            Hola, {user.name.split(' ')[0]} 👋
          </h2>
        </div>

        {/* Dashboard Metrics */}
        {!dataLoading && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <Calendar className="w-5 h-5 text-blue-500 mb-1" />
              <p className="text-2xl font-bold text-blue-700">{metrics.total}</p>
              <p className="text-[10px] text-blue-600 uppercase font-semibold tracking-wide mt-0.5">Visitas 7D</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-500 mb-1" />
              <p className="text-2xl font-bold text-emerald-700">{metrics.completed}</p>
              <p className="text-[10px] text-emerald-600 uppercase font-semibold tracking-wide mt-0.5">Culminadas</p>
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
              <Clock className="w-5 h-5 text-purple-500 mb-1" />
              <p className="text-2xl font-bold text-purple-700">{metrics.hours}h</p>
              <p className="text-[10px] text-purple-600 uppercase font-semibold tracking-wide mt-0.5">Horas Trab.</p>
            </div>
          </div>
        )}

        {/* Active visit banner */}
        {activeVisit && <ActiveVisitBanner visit={activeVisit} />}

        {/* New visit CTA */}
        {!dataLoading && !activeVisit && (
          <Link href="/visita/nueva">
            <div className="bg-blue-600 text-white rounded-2xl p-5 flex items-center justify-between shadow-md hover:bg-blue-700 transition-colors active:scale-[0.98] cursor-pointer">
              <div>
                <p className="font-bold text-lg">Nueva Visita Técnica</p>
                <p className="text-blue-200 text-sm flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> Iniciar registro con GPS</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Plus className="w-7 h-7" />
              </div>
            </div>
          </Link>
        )}

        {/* Quick Actions Menu */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Link href="/clientes" className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Mis Clientes</span>
          </Link>
          
          <Link href="/perfil" className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-slate-700">Mi Perfil</span>
          </Link>
        </div>

        {/* Today's visits */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700">Visitas de hoy</h3>
            <Link href="/historial" className="text-sm text-blue-600 hover:underline">Ver historial</Link>
          </div>

          {dataLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
            </div>
          ) : visits.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              <p>Aún no hay visitas registradas hoy</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visits.map(v => <VisitCard key={v.id} visit={v} />)}
            </div>
          )}
        </div>

      </main>

    </div>
  );
}
