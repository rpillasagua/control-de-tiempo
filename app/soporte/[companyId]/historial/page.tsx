'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Company, Ticket, Visit } from '@/lib/types';
import { getCompanyById } from '@/lib/companyService';
import { getTicketsByClientPhone } from '@/lib/ticketService';
import { getVisitsByClientPhone } from '@/lib/visitService';
import { useTranslation } from '@/lib/i18n';
import { toast } from 'sonner';
import { Building2, Search, ArrowLeft, Loader2, Calendar, FileText, Wrench, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export default function ClientHistoryPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { t } = useTranslation();

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  const [phone, setPhone] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);

  useEffect(() => {
    if (!companyId) return;
    getCompanyById(companyId)
      .then(data => { setCompany(data); setLoadingConfig(false); })
      .catch(() => { setLoadingConfig(false); });
  }, [companyId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;

    setIsSearching(true);
    try {
      const [ticketsRes, visitsRes] = await Promise.all([
        getTicketsByClientPhone(companyId, phone.trim()),
        getVisitsByClientPhone(companyId, phone.trim())
      ]);
      setTickets(ticketsRes);
      setVisits(visitsRes);
      setHasSearched(true);
    } catch (err) {
      toast.error('Error al consultar historial');
    } finally {
      setIsSearching(false);
    }
  };

  // Combinar tickets y visitas cronológicamente (usando createdAt de ticket y arrival de visit)
  type TimelineItem = 
    | { type: 'ticket'; date: Date; data: Ticket }
    | { type: 'visit'; date: Date; data: Visit };

  const timelineItems: TimelineItem[] = [
    ...tickets.map(t => ({ type: 'ticket' as const, date: new Date(t.createdAt), data: t })),
    ...visits.map(v => ({ type: 'visit' as const, date: new Date(v.arrival.localTime), data: v }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  if (loadingConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <h1 className="text-xl font-bold text-slate-800">Empresa no encontrada</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <div className="bg-blue-600 text-white pt-8 pb-16 px-4 rounded-b-[2.5rem] shadow-sm relative">
        <Link href={`/soporte/${companyId}`} className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors flex items-center justify-center">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="max-w-xl mx-auto text-center mt-2">
          {company.logoUrl ? (
            <img src={company.logoUrl} alt={company.name} className="w-14 h-14 mx-auto rounded-xl bg-white object-contain p-1.5 shadow-sm mb-3" crossOrigin="anonymous" />
          ) : (
            <Building2 className="w-8 h-8 mx-auto opacity-80 mb-3" />
          )}
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p className="opacity-90 mt-1 text-sm">Historial de Servicio al Cliente</p>
        </div>
      </div>

      <div className="relative z-10 max-w-xl mx-auto px-4 -mt-8">
        <form onSubmit={handleSearch} className="bg-white rounded-3xl shadow-lg p-6 mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Ingresa tu RUC o Número Celular exacto</label>
          <div className="flex gap-2">
            <input 
              type="text" required value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Ej. 17... / 099..."
              className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button 
              type="submit" disabled={isSearching}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-60 flex items-center"
            >
              {isSearching ? <Loader2 className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5"/>}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">Solo se mostrarán registros vinculados a este identificador.</p>
        </form>

        {hasSearched && timelineItems.length === 0 && (
          <div className="text-center py-10">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-lg font-bold text-slate-700">No hay registros</p>
            <p className="text-slate-500 text-sm">No encontramos órdenes o visitas para el número {phone}</p>
          </div>
        )}

        {hasSearched && timelineItems.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 px-1 border-b border-slate-200 pb-2 mb-4">Línea de Tiempo Operativa</h2>
            
            {timelineItems.map((item, idx) => {
              if (item.type === 'ticket') {
                const t = item.data as Ticket;
                return (
                  <Link href={`/ticket/${t.id}`} key={`t-${t.id}`} className="block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-sky-100 p-2 rounded-lg text-sky-600">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Solicitud de Soporte</h3>
                          <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                        t.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'ASIGNADO' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 truncate mt-2">{t.issueDescription}</p>
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                      <span className="text-xs font-semibold text-blue-600 flex items-center gap-1">Rastrear <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </Link>
                );
              } else {
                const v = item.data as Visit;
                return (
                  <a href={`/visita/${v.id}/reporte`} target="_blank" rel="noreferrer" key={`v-${v.id}`} className="block bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm">Visita de {v.technicianName.split(' ')[0]}</h3>
                          <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                        v.status === 'FINALIZADA' ? 'bg-emerald-100 text-emerald-700' :
                        v.status === 'PAUSADA' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {v.status}
                      </span>
                    </div>
                    {v.summary && <p className="text-sm text-slate-600 truncate mt-2">{v.summary}</p>}
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">Ver Reporte <ChevronRight className="w-3 h-3" /></span>
                    </div>
                  </a>
                );
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}
