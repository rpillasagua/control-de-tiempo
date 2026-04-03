'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getTicketById } from '@/lib/ticketService';
import { Ticket } from '@/lib/types';
import { Loader2, CheckCircle, Clock, Search, MapPin, Calendar, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export default function TicketTrackingPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ticketId) return;
    
    getTicketById(ticketId)
      .then(data => {
        if (data) {
          setTicket(data);
        } else {
          setError(true);
        }
      })
      .catch(err => {
        console.error("Error fetching ticket:", err);
        setError(true);
      })
      .finally(() => setLoading(false));
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

  // Stepper logic
  const steps = [
    { key: 'PENDIENTE', label: 'Recibido', desc: 'Solicitud ingresada', icon: <Clock className="w-5 h-5" /> },
    { key: 'REVISADO', label: 'Revisado', desc: 'En análisis', icon: <Search className="w-5 h-5" /> },
    { key: 'ASIGNADO', label: 'Asignado', desc: 'Técnico en camino', icon: <MapPin className="w-5 h-5" /> },
    { key: 'CERRADO', label: 'Resuelto', desc: 'Visita finalizada', icon: <CheckSquare className="w-5 h-5" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === ticket.status);
  // Handling edge case if status doesn't exactly match the linear progression (though it usually does)
  const normalizedIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6 flex flex-col items-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex justify-center items-center mb-4">
          <img src="/icon-192.png" alt="Logo" className="w-10 h-10 opacity-80" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 text-center">Estado de Solicitud</h1>
        <p className="text-slate-400 text-sm flex items-center gap-1 mt-1 justify-center">
          <Calendar className="w-4 h-4" /> 
          {format(new Date(ticket.createdAt), "d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Ticket info card */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-3">Detalle del Reporte</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-slate-800">{ticket.clientName}</p>
            <p className="text-xs text-slate-500">{ticket.clientAddress}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <p className="text-sm text-slate-700">"{ticket.issueDescription}"</p>
          </div>
          {ticket.photoUrl && (
             <img src={ticket.photoUrl} alt="Evidencia" className="w-full h-40 object-cover rounded-xl mt-2 border border-slate-200" />
          )}
        </div>
      </div>

      {/* Timeline tracker */}
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
         <h2 className="text-slate-500 text-xs uppercase tracking-wider font-bold mb-6">Seguimiento</h2>
         
         <div className="relative">
            {/* Connecting Line */}
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-100 -z-10" />

            <div className="space-y-6">
              {steps.map((step, idx) => {
                const isCompleted = idx <= normalizedIndex;
                const isCurrent = idx === normalizedIndex;
                const isWaiting = idx > normalizedIndex;

                let iconBg = 'bg-slate-100 text-slate-400';
                if (isCompleted) iconBg = 'bg-blue-500 text-white';
                if (isCurrent) iconBg = 'bg-blue-600 text-white shadow-md ring-4 ring-blue-50';

                return (
                  <div key={step.key} className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${iconBg}`}>
                       {isCompleted && !isCurrent ? <CheckCircle className="w-6 h-6" /> : step.icon}
                    </div>
                    <div className="pt-2">
                       <h3 className={`font-bold ${isWaiting ? 'text-slate-400' : 'text-slate-800'}`}>
                         {step.label}
                       </h3>
                       <p className="text-xs text-slate-500">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
         </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">Generado por Bitácora Técnica</p>
      </div>

    </div>
  );
}
