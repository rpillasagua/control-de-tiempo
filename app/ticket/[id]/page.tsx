'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket, Visit } from '@/lib/types';
import { getVisit } from '@/lib/visitService';
import {
  Loader2, CheckCircle, Clock, Search, MapPin, Calendar,
  CheckSquare, Share2, Phone, UserCheck, Wrench, CircleDot
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function TicketTrackingPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [error, setError] = useState(false);

  // Real-time listener — only fires when Firestore data changes
  useEffect(() => {
    if (!ticketId) return;
    const unsub = onSnapshot(
      doc(db, 'tickets', ticketId),
      async (snap) => {
        if (!snap.exists()) {
          setError(true);
          setLoading(false);
          return;
        }
        const data = snap.data() as Ticket;
        setTicket({ ...data, id: snap.id });

        // If visit exists, load it for sub-step info
        if (data.visitId) {
          try {
            const v = await getVisit(data.visitId);
            setVisit(v);
          } catch {}
        }
        setLoading(false);
      },
      () => {
        setError(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [ticketId]);

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

  // ── Determine current main step ──
  // 0=Recibido, 1=Revisado, 2=Técnico Asignado, 3=Resuelto
  let mainStep = 0;
  if (ticket.status === 'REVISADO') mainStep = 1;
  if (ticket.status === 'ASIGNADO' || ticket.status === 'EN_CAMINO') mainStep = 2;
  if (ticket.status === 'CERRADO') mainStep = 3;

  // ── Sub-status text for "Técnico Asignado" ──
  let techSubStatus = '';
  let techSubIcon: React.ReactNode = null;
  let techSubPulse = false;
  if (mainStep >= 2) {
    if (ticket.status === 'ASIGNADO') {
      techSubStatus = 'Asignado — esperando confirmación';
      techSubIcon = <Clock className="w-3.5 h-3.5" />;
    } else if (ticket.status === 'EN_CAMINO') {
      techSubStatus = '🚗 En camino al punto';
      techSubIcon = <CircleDot className="w-3.5 h-3.5" />;
      techSubPulse = true;
    } else if (ticket.status === 'CERRADO' && visit) {
      techSubStatus = '✅ Llegada registrada';
      techSubIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />;
    }
  }

  // ── Sub-steps for "Resuelto" ──
  const visitStarted = !!visit;
  const visitWorking = visit?.status === 'EN_PROGRESO' && (visit?.activities?.length ?? 0) > 0;
  const visitDone = visit?.status === 'FINALIZADA';

  const steps = [
    {
      label: 'Recibido',
      desc: 'Solicitud ingresada al sistema',
      icon: <Clock className="w-5 h-5" />,
    },
    {
      label: 'En Revisión',
      desc: 'Tu solicitud está siendo analizada por el equipo',
      icon: <Search className="w-5 h-5" />,
    },
    {
      label: 'Técnico Asignado',
      desc: 'Un técnico fue designado para tu solicitud',
      icon: <UserCheck className="w-5 h-5" />,
      subStatus: techSubStatus,
      subIcon: techSubIcon,
      subPulse: techSubPulse,
      assignedTo: ticket.assignedTo,
    },
    {
      label: 'Resuelto',
      desc: 'Visita técnica en proceso o finalizada',
      icon: <CheckSquare className="w-5 h-5" />,
      subSteps: [
        { label: 'Llegada registrada', done: visitStarted },
        { label: 'Trabajando en sitio', done: visitWorking || visitDone },
        { label: 'Trabajo finalizado', done: visitDone },
      ],
    },
  ];

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 py-8 px-4 flex flex-col items-center">

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
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
          Actualización en tiempo real
        </div>
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
            <img src={ticket.photoUrl} alt="Evidencia" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
          )}
        </div>
      </div>

      {/* Timeline tracker */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-4">
        <h2 className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-6">Progreso</h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100" />
          <div className="space-y-5">
            {steps.map((step, idx) => {
              const isCompleted = idx < mainStep;
              const isCurrent   = idx === mainStep;
              const isWaiting   = idx > mainStep;

              let iconBg = 'bg-slate-100 text-slate-400';
              if (isCompleted) iconBg = 'bg-blue-500 text-white';
              if (isCurrent)   iconBg = 'bg-blue-600 text-white shadow-md ring-4 ring-blue-50';

              return (
                <div key={idx} className="relative z-10">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${iconBg}`}>
                      {isCompleted ? <CheckCircle className="w-6 h-6" /> : step.icon}
                    </div>
                    <div className="pt-1.5 flex-1">
                      <h3 className={`font-bold text-sm ${isWaiting ? 'text-slate-400' : 'text-slate-800'}`}>
                        {step.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>

                      {/* Sub-status for Técnico Asignado */}
                      {'subStatus' in step && step.subStatus && (isCurrent || isCompleted) && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                          step.subPulse
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse'
                            : 'bg-slate-50 text-slate-600 border border-slate-200'
                        }`}>
                          {step.subIcon} {step.subStatus}
                        </div>
                      )}

                      {/* Assigned tech name */}
                      {'assignedTo' in step && step.assignedTo && (isCurrent || isCompleted) && (
                        <p className="text-xs text-blue-600 font-medium mt-1.5">
                          👤 {step.assignedTo.split('@')[0]}
                        </p>
                      )}

                      {/* Sub-steps for Resuelto */}
                      {'subSteps' in step && step.subSteps && (isCurrent || isCompleted) && (
                        <div className="mt-3 ml-1 space-y-2 border-l-2 border-slate-100 pl-4">
                          {step.subSteps.map((sub, si) => (
                            <div key={si} className="flex items-center gap-2">
                              {sub.done ? (
                                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-200 flex-shrink-0" />
                              )}
                              <span className={`text-xs font-medium ${sub.done ? 'text-slate-700' : 'text-slate-400'}`}>
                                {sub.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
