'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { getTicketById } from '@/lib/ticketService';
import { Ticket } from '@/lib/types';
import { Loader2, CheckCircle, Clock, Search, MapPin, Calendar, CheckSquare, Share2, Phone, Truck } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function TicketTrackingPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await getTicketById(ticketId);
      if (data) {
        setTicket(data);
        setLastRefresh(new Date());
      } else {
        setError(true);
      }
    } catch {
      if (!ticket) setError(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Initial load
  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  // Auto-refresh every 15 seconds for live tracking
  useEffect(() => {
    const interval = setInterval(fetchTicket, 15000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm text-center">
          <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-700 mb-2">Ticket no encontrado</h2>
          <p className="text-slate-500 text-sm mb-6">El enlace parece ser incorrecto o el ticket ya no existe.</p>
          <Link href="/" className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition">
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const steps = [
    { key: 'PENDIENTE',  label: 'Recibido',   desc: 'Solicitud ingresada al sistema',  icon: <Clock className="w-5 h-5" /> },
    { key: 'REVISADO',   label: 'Revisado',   desc: 'En análisis por el equipo',       icon: <Search className="w-5 h-5" /> },
    { key: 'ASIGNADO',   label: 'Asignado',   desc: 'Técnico asignado a tu solicitud', icon: <MapPin className="w-5 h-5" /> },
    { key: 'EN_CAMINO',  label: 'En Camino',  desc: 'El técnico va en camino 🚗',      icon: <Truck className="w-5 h-5" /> },
    { key: 'CERRADO',    label: 'Resuelto',   desc: 'Visita técnica finalizada',       icon: <CheckSquare className="w-5 h-5" /> },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === ticket.status);
  const normalizedIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  const priorityConfig: Record<string, { text: string; cls: string }> = {
    ALTA:   { text: '🔴 Urgente', cls: 'bg-red-100 text-red-700 border-red-200' },
    NORMAL: { text: '🔵 Normal',  cls: 'bg-blue-100 text-blue-700 border-blue-200' },
    BAJA:   { text: '⚫ Baja',    cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  };

  const handleShareWhatsApp = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = `Hola, puedes ver el estado de mi solicitud técnica aquí:\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex flex-col items-center">

      {/* Header */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4 text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-full flex justify-center items-center mx-auto mb-3">
          <img src="/icon-192.png" alt="Logo" className="w-9 h-9 opacity-80" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">Estado de tu Solicitud</h1>
        <p className="text-slate-400 text-sm flex items-center gap-1 mt-1 justify-center">
          <Calendar className="w-4 h-4" />
          {format(new Date(ticket.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
        </p>
        {ticket.priority && priorityConfig[ticket.priority] && (
          <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full border ${priorityConfig[ticket.priority].cls}`}>
            {priorityConfig[ticket.priority].text}
          </span>
        )}
      </div>

      {/* Ticket info card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4">
        <h2 className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-3">Detalle del Reporte</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-bold text-slate-800">{ticket.clientName}</p>
            {ticket.clientPhone && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3" /> {ticket.clientPhone}
              </p>
            )}
            {ticket.clientAddress && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" /> {ticket.clientAddress}
              </p>
            )}
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-700">"{ticket.issueDescription}"</p>
          </div>
          {ticket.photoUrl && (
            <img
              src={ticket.photoUrl}
              alt="Evidencia"
              className="w-full h-40 object-cover rounded-xl border border-slate-200"
            />
          )}
          {ticket.assignedTo && (
            <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              👤 Técnico asignado:{' '}
              <span className="font-semibold text-blue-700">
                {ticket.assignedTo.split('@')[0]}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Timeline tracker */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-slate-500 text-xs uppercase tracking-wider font-bold">Progreso</h2>
          <span className="text-[10px] text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Actualizado {lastRefresh.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="relative">
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100 -z-10" />
          <div className="space-y-6">
            {steps.map((step, idx) => {
              const isCompleted = idx <= normalizedIndex;
              const isCurrent   = idx === normalizedIndex;
              const isWaiting   = idx > normalizedIndex;
              let iconBg = 'bg-slate-100 text-slate-400';
              if (isCompleted) iconBg = 'bg-blue-500 text-white';
              if (isCurrent)   iconBg = 'bg-blue-600 text-white shadow-md ring-4 ring-blue-50';
              // Special pulsing green for EN_CAMINO when active
              if (isCurrent && step.key === 'EN_CAMINO') iconBg = 'bg-emerald-500 text-white shadow-md ring-4 ring-emerald-50 animate-pulse';
              return (
                <div key={step.key} className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${iconBg}`}>
                    {isCompleted && !isCurrent ? <CheckCircle className="w-6 h-6" /> : step.icon}
                  </div>
                  <div className="pt-2">
                    <h3 className={`font-bold ${isWaiting ? 'text-slate-400' : 'text-slate-800'}`}>{step.label}</h3>
                    <p className="text-xs text-slate-500">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Share via WhatsApp */}
      <button
        onClick={handleShareWhatsApp}
        className="w-full max-w-md flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-4 rounded-2xl hover:bg-[#20bd5a] transition mb-4 shadow-sm"
      >
        <Share2 className="w-5 h-5" /> Compartir por WhatsApp
      </button>

      <p className="text-xs text-slate-400 text-center">Generado por Bitácora Técnica</p>
    </div>
  );
}
