'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCompanyByAdmin, createCompany, updateTechnicians } from '@/lib/companyService';
import { getTicketsByCompany, updateTicketStatus } from '@/lib/ticketService';
import { Company, Ticket } from '@/lib/types';
import { Loader2, Plus, Users, Ticket as TicketIcon, Building2, UserPlus, MapPin, Phone, Trash2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  // Modals state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null); // ticket id
  const [showTeamModal, setShowTeamModal] = useState(false);

  // Forms
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTechEmail, setNewTechEmail] = useState('');
  const [selectedTech, setSelectedTech] = useState('');

  const loadAdminData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const myCompany = await getCompanyByAdmin(user.email);
      setCompany(myCompany);
      if (myCompany) {
        const myTickets = await getTicketsByCompany(myCompany.id);
        setTickets(myTickets);
      }
    } catch (err) {
      console.error(err);
      toast.error('Error cargando datos de administrador');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCompanyName.trim()) return;
    try {
      const companyId = Date.now().toString(); // simple ID
      const newCompany: Company = {
        id: companyId,
        name: newCompanyName.trim(),
        adminEmail: user.email,
        technicianEmails: [user.email], // By default, the admin is also a technician
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createCompany(newCompany);
      setCompany(newCompany);
      setShowCompanyModal(false);
      toast.success('Empresa registrada correctamente');
    } catch (err) {
      toast.error('Error creando empresa');
    }
  };

  const handeAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !newTechEmail.trim()) return;
    const email = newTechEmail.trim().toLowerCase();
    if (company.technicianEmails.includes(email)) {
      toast.error('Este técnico ya está en tu equipo');
      return;
    }
    try {
      const updatedList = [...company.technicianEmails, email];
      await updateTechnicians(company.id, updatedList);
      setCompany({ ...company, technicianEmails: updatedList });
      setNewTechEmail('');
      toast.success('Técnico añadido');
    } catch (err) {
      toast.error('Error añadiendo técnico');
    }
  };

  const handleRemoveTech = async (email: string) => {
    if (!company || company.adminEmail === email) return;
    if (!confirm(`¿Eliminar a ${email} del equipo?`)) return;
    try {
      const updatedList = company.technicianEmails.filter(e => e !== email);
      await updateTechnicians(company.id, updatedList);
      setCompany({ ...company, technicianEmails: updatedList });
      toast.success('Técnico removido');
    } catch (err) {
      toast.error('Error al remover técnico');
    }
  };

  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal || !selectedTech) return;
    try {
      await updateTicketStatus(showAssignModal, { 
        status: 'ASIGNADO', 
        assignedTo: selectedTech 
      });
      toast.success('Ticket asignado a ' + selectedTech);
      setShowAssignModal(null);
      setSelectedTech('');
      loadAdminData();
    } catch (err) {
      toast.error('Error asignando ticket');
    }
  };

  const copyPortalLink = () => {
    if (!company) return;
    const url = `${window.location.origin}/soporte/${company.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace de soporte copiado');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600"/></div>;
  }

  // --- No Company State ---
  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Building2 className="w-16 h-16 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Activa tu Empresa</h1>
        <p className="text-slate-500 mb-8 max-w-sm">
          Convierte tu cuenta en administradora para invitar técnicos y recibir tickets de tus clientes.
        </p>
        <button 
          onClick={() => setShowCompanyModal(true)}
          className="bg-blue-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:bg-blue-700 transition"
        >
          Crear Organización
        </button>

        {showCompanyModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <form onSubmit={handleCreateCompany} className="bg-white rounded-2xl p-6 w-full max-w-md text-left">
              <h2 className="text-lg font-bold mb-4">Registro de Empresa</h2>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Comercial</label>
              <input 
                type="text" autoFocus required value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-6"
                placeholder="Ej. ACME Services"
              />
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCompanyModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Crear</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // --- Main Admin Dashboard ---
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-blue-700 text-white pt-10 pb-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6"/> {company.name}</h1>
            <p className="opacity-80 text-sm mt-1">Panel de Control General</p>
          </div>
          <button 
            onClick={copyPortalLink}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition px-4 py-2 rounded-lg text-sm font-semibold"
          >
            <LinkIcon className="w-4 h-4"/> Portal Público
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Team Column */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-slate-800"><Users className="w-5 h-5 text-blue-600"/> Mi Equipo</h3>
              <button 
                onClick={() => setShowTeamModal(true)}
                className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100"
              ><Plus className="w-4 h-4"/></button>
            </div>
            <ul className="space-y-3">
              {company.technicianEmails.map(email => (
                <li key={email} className="flex justify-between items-center text-sm bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span className="truncate pr-2 font-medium text-slate-700">{email}</span>
                  {email !== company.adminEmail && (
                    <button onClick={() => handleRemoveTech(email)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {email === company.adminEmail && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">Admin</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Tickets Column */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 mb-2"><TicketIcon className="w-5 h-5 text-indigo-600"/> Bandeja de Tickets</h3>
          {tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
               <p className="text-slate-500">No hay tickets reportados por el momento.</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 relative overflow-hidden">
                {/* Visual Status Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  ticket.status === 'PENDIENTE' ? 'bg-amber-400' : 
                  ticket.status === 'ASIGNADO' ? 'bg-blue-500' : 'bg-emerald-500'
                }`} />

                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{ticket.clientName}</h4>
                    <p className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleString('es-EC')}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    ticket.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : 
                    ticket.status === 'ASIGNADO' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="pl-2 space-y-1">
                  {ticket.clientPhone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5"/> {ticket.clientPhone}</p>}
                  {ticket.clientAddress && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5"/> {ticket.clientAddress}</p>}
                </div>

                <div className="pl-2 bg-slate-50 p-3 rounded-xl border border-slate-100 mt-2">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.issueDescription}</p>
                  {ticket.photoUrl && (
                    <a href={ticket.photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 mt-2 inline-block font-semibold hover:underline">
                      📎 Ver evidencia fotográfica
                    </a>
                  )}
                </div>

                {ticket.assignedTo && (
                  <p className="text-xs font-semibold text-slate-500 pl-2">👤 Asignado a: <span className="text-blue-600">{ticket.assignedTo}</span></p>
                )}

                {(ticket.status === 'PENDIENTE' || ticket.status === 'REVISADO') && (
                  <div className="pl-2 pt-2 border-t border-slate-100 flex justify-end">
                    <button 
                      onClick={() => setShowAssignModal(ticket.id)}
                      className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition"
                    >
                      Asignar a Técnico
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Team Manage Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handeAddTech} className="bg-white rounded-2xl p-6 w-full max-w-md text-left">
            <h2 className="text-lg font-bold mb-4">Invitar nuevo técnico</h2>
            <p className="text-sm text-slate-500 mb-4">Ingresa el correo de Google que utilizará tu técnico para iniciar sesión en la app.</p>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input 
              type="email" autoFocus required value={newTechEmail} onChange={e => setNewTechEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-6"
              placeholder="tecnico@gmail.com"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">Cerrar</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Invitar</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Ticket Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAssignTicket} className="bg-white rounded-2xl p-6 w-full max-w-sm text-left">
            <h2 className="text-lg font-bold mb-4">Asignar Ticket</h2>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selecciona un técnico:</label>
            <div className="space-y-2 mb-6">
              {company.technicianEmails.map(email => (
                <label key={email} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-blue-50">
                  <input required type="radio" name="tech" value={email} onChange={e => setSelectedTech(e.target.value)} className="w-4 h-4 text-blue-600"/>
                  <span className="text-sm font-medium text-slate-700">{email}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAssignModal(null)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold">Asignar</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
