'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTicketMonitor } from '@/hooks/useTicketMonitor';
import {
  getCompaniesByAdmin, createCompany, updateTechnicians,
  transferCompanyOwnership, updateCompanyProfile, uploadCompanyLogo,
  getUserCompany
} from '@/lib/companyService';
import { useTranslation } from '@/lib/i18n';
import { compressImage } from '@/lib/imageCompression';
import { getTicketsByCompany, updateTicketStatus, createTicketByAdmin } from '@/lib/ticketService';
import { getVisit } from '@/lib/visitService';
import { createInvite, getCompanyInvites } from '@/lib/inviteService';
import { getClients, getClientsByCompany, getAllClientsForCompany } from '@/lib/clientService';
import { uploadPhotoToStorage } from '@/lib/storageService';
import { dataUrlToFile } from '@/lib/utils';
import { Company, Ticket, Visit, Invite, TicketPriority, Client } from '@/lib/types';
import {
  Loader2, Plus, Users, Building2, MapPin, Phone,
  Trash2, Link as LinkIcon, Bell, ChevronDown, ChevronUp,
  ArrowRightLeft, ArrowLeft, Ticket as TicketIcon, AlertCircle, Key, Copy, Clock, Camera, Save, Volume2, VolumeX,
  Share2, Eye, CheckCircle, Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

import { onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

// ─────────────────────────────────────────
// Small helper: play a soft ping sound
// ─────────────────────────────────────────
function playPing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not available (e.g. jest / headless)
  }
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Company list + selected
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const activeCompany = companies.find(c => c.id === selectedCompanyId) ?? null;
  const router = useRouter();

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [visitCache, setVisitCache] = useState<Record<string, Visit | null | 'NOT_FOUND'>>({});
  const [ticketFilter, setTicketFilter] = useState<'TODOS'|'PENDIENTE'|'ASIGNADO'|'EN_PROGRESO'|'CERRADO'>('TODOS');
  const [ticketSearch, setTicketSearch] = useState('');
  // Alert badge
  const [newCount, setNewCount] = useState(0);

  // UI state
  const [showCorpPanel, setShowCorpPanel] = useState(false);

  // Clients
  const [clients, setClients] = useState<Client[]>([]);

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);

  // Modals
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);

  // Forms
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newTechEmail, setNewTechEmail] = useState('');
  const [selectedTech, setSelectedTech] = useState('');
  const [transferEmail, setTransferEmail] = useState('');

  // Audio Permissions
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Corporate Data Form
  const [corpRuc, setCorpRuc] = useState('');
  const [corpPhone, setCorpPhone] = useState('');
  const [corpLogoUrl, setCorpLogoUrl] = useState('');
  const [corpLogoFile, setCorpLogoFile] = useState<string | null>(null);
  const [savingCorp, setSavingCorp] = useState(false);

  // Sync Corp Form with Active Company
  useEffect(() => {
    if (activeCompany) {
      setCorpRuc(activeCompany.ruc || '');
      setCorpPhone(activeCompany.phone || '');
      setCorpLogoUrl(activeCompany.logoUrl || '');
      setCorpLogoFile(null);
    }
  }, [activeCompany]);

  const [userRole, setUserRole] = useState<'admin'|'technician'|'none'|null>(null);

  const loadCompanies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { role } = await getUserCompany(user.email);
      setUserRole(role);

      const list = await getCompaniesByAdmin(user.email);
      setCompanies(list);
      if (list.length > 0 && !selectedCompanyId) {
        setSelectedCompanyId(list[0].id);
      }
    } catch {
      toast.error('Error cargando empresas');
    } finally {
      setLoading(false);
    }
  }, [user, selectedCompanyId]);

  useEffect(() => { loadCompanies(); }, [user]);

  // Open modal if ?newTicket=1 is in URL
  useEffect(() => {
    if (!loading && activeCompany) {
      if (typeof window !== 'undefined' && window.location.search.includes('newTicket=1')) {
        setShowNewTicketModal(true);
        // Clean URL to prevent re-opening on reload
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [loading, activeCompany]);

  // ── Load clients + invites when company changes ──
  const loadTickets = useCallback(async () => {
    if (!selectedCompanyId) return;
    try {
      const clientList = await getAllClientsForCompany(selectedCompanyId, activeCompany?.technicianEmails || [user!.email]);
      setClients(clientList);
      const inviteList = await getCompanyInvites(selectedCompanyId);
      setInvites(inviteList);
    } catch {
      toast.error('Error cargando clientes o invitaciones');
    }
  }, [selectedCompanyId]);

  useEffect(() => { loadTickets(); }, [selectedCompanyId]);

  // ── Real-time Tickets Monitor ──
  useEffect(() => {
    if (!selectedCompanyId) return;
    setTicketsLoading(true);
    setExpandedTicketId(null); // reset on company change
    setTicketSearch('');
    const q = query(
      collection(db, 'tickets'),
      where('companyId', '==', selectedCompanyId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
      setTickets(list);
      setTicketsLoading(false);
    }, () => setTicketsLoading(false));
    return () => unsub();
  }, [selectedCompanyId]);

  // ── Real-time alert monitor ─────────────
  const handleNewTicket = useCallback((ticket: Ticket) => {
    if (audioEnabled) playPing();
    setNewCount(prev => prev + 1);
    toast.success(`🔔 Nuevo ticket de ${ticket.clientName}`, { duration: 6000 });
  }, [audioEnabled]);

  useTicketMonitor(selectedCompanyId, handleNewTicket);

  // ── Create company ──────────────────────
  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newCompanyName.trim()) return;
    try {
      const companyId = `${Date.now()}`;
      const now = new Date().toISOString();
      const newCo: Company = {
        id: companyId,
        name: newCompanyName.trim(),
        adminEmail: user.email,
        technicianEmails: [user.email],
        createdAt: now,
        updatedAt: now,
      };
      await createCompany(newCo);
      setCompanies(prev => [newCo, ...prev]);
      setSelectedCompanyId(companyId);
      setShowCompanyModal(false);
      setNewCompanyName('');
      toast.success('Empresa creada correctamente');
    } catch {
      toast.error('Error creando empresa');
    }
  };

  // ── Add tech ────────────────────────────
  const handleAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !newTechEmail.trim()) return;
    const email = newTechEmail.trim().toLowerCase();
    if (activeCompany.technicianEmails.includes(email)) {
      toast.error('Este técnico ya está en tu equipo');
      return;
    }
    try {
      const updated = [...activeCompany.technicianEmails, email];
      await updateTechnicians(activeCompany.id, updated);
      setCompanies(prev => prev.map(c => c.id === activeCompany.id ? { ...c, technicianEmails: updated } : c));
      setNewTechEmail('');
      setShowTeamModal(false);
      toast.success('Técnico añadido');
    } catch {
      toast.error('Error añadiendo técnico');
    }
  };

  // ── Remove tech ─────────────────────────
  const handleRemoveTech = async (email: string) => {
    if (!activeCompany || activeCompany.adminEmail === email) return;
    if (!confirm(`¿Eliminar a ${email} del equipo?`)) return;
    try {
      const updated = activeCompany.technicianEmails.filter(e => e !== email);
      await updateTechnicians(activeCompany.id, updated);
      setCompanies(prev => prev.map(c => c.id === activeCompany.id ? { ...c, technicianEmails: updated } : c));
      toast.success('Técnico removido');
    } catch {
      toast.error('Error removiendo técnico');
    }
  };

  // ── Assign ticket ───────────────────────
  const handleAssignTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAssignModal || !selectedTech) return;
    try {
      await updateTicketStatus(showAssignModal, { status: 'ASIGNADO', assignedTo: selectedTech });
      toast.success('Ticket asignado a ' + selectedTech);

      // Fire native notification to admin browser warning the tech was notified
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('✅ Tarea Asignada', {
          body: `La tarea fue asignada al técnico: ${selectedTech}`,
          icon: '/icon-192.png',
        });
      } else if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      setShowAssignModal(null);
      setSelectedTech('');
    } catch {
      toast.error('Error asignando ticket');
    }
  };

  // ── Create manual ticket ─────────────────
  const handleCreateManualTicket = async (data: {
    clientId?: string;
    clientRuc?: string;
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    issueDescription: string;
    priority: TicketPriority;
    notes?: string;
    photoDataUrl?: string;
    location?: { lat: number; lng: number };
    assignedTo?: string;
  }) => {
    if (!activeCompany) return;
    try {
      let photoUrl: string | undefined;
      if (data.photoDataUrl) {
        const file = dataUrlToFile(data.photoDataUrl, `ticket_admin_${Date.now()}.jpg`);
        photoUrl = await uploadPhotoToStorage(file, `tickets/${activeCompany.id}/${Date.now()}.jpg`);
      }
      await createTicketByAdmin(activeCompany.id, {
        clientId: data.clientId,
        clientRuc: data.clientRuc,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientAddress: data.clientAddress,
        issueDescription: data.issueDescription,
        priority: data.priority,
        notes: data.notes,
        photoUrl,
        location: data.location,
        assignedTo: data.assignedTo || undefined,
      });
      toast.success('✅ Orden creada correctamente');
      setShowNewTicketModal(false);
    } catch {
      toast.error('Error creando la orden');
    }
  };

  // ── Generate invite ─────────────────────────────────────
  const handleGenerateInvite = async () => {
    if (!activeCompany) return;
    setGeneratingInvite(true);
    try {
      const inv = await createInvite(activeCompany.id, activeCompany.name, user!.email);
      setInvites(prev => [inv, ...prev]);
      setShowInvitePanel(true);
      toast.success(`Código ${inv.code} generado (válido 48h)`);
    } catch {
      toast.error('Error generando código');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const url = `${window.location.origin}/unirse/${code}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado'));
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success(`Código ${code} copiado`));
  };

  // ── Transfer ownership ──────────────────
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !transferEmail.trim()) return;
    const newEmail = transferEmail.trim().toLowerCase();
    if (newEmail === user!.email) {
      toast.error('Ingresa un correo diferente al tuyo');
      return;
    }
    if (!confirm(`¿Ceder "${activeCompany.name}" a ${newEmail}? Perderás el acceso de administrador.`)) return;
    try {
      await transferCompanyOwnership(activeCompany.id, newEmail);
      setCompanies(prev => prev.filter(c => c.id !== activeCompany.id));
      setSelectedCompanyId(null);
      setShowTransferModal(false);
      toast.success(`Empresa cedida a ${newEmail}`);
    } catch {
      toast.error('Error transfiriendo empresa');
    }
  };

  const copyPortalLink = () => {
    if (!activeCompany) return;
    const url = `${window.location.origin}/soporte/${activeCompany.id}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Enlace copiado'));
  };

  // ── Loading state ───────────────────────
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-600" /></div>;
  }

  // ── No companies yet ────────────────────
  if (companies.length === 0) {
    if (userRole === 'technician') {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Acceso Denegado</h1>
          <p className="text-slate-500 mb-8 max-w-sm">
            Ingresaste como técnico de una empresa registrada. Este panel es exclusivo para administradores de empresas.
          </p>
          <button onClick={() => router.push('/')} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:bg-blue-700 transition">
            Ir a mi Tablero
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Building2 className="w-16 h-16 text-blue-500 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">{t.adminActivateCompany}</h1>
        <p className="text-slate-500 mb-8 max-w-sm">
          {t.adminActivateDesc}
        </p>
        <button onClick={() => setShowCompanyModal(true)} className="bg-blue-600 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:bg-blue-700 transition">
          {t.adminCreateCompany}
        </button>
        {showCompanyModal && <CompanyFormModal
          value={newCompanyName}
          onChange={setNewCompanyName}
          onSubmit={handleCreateCompany}
          onClose={() => setShowCompanyModal(false)}
        />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* ── Header ── */}
      <header className="bg-blue-700 text-white pt-6 pb-6 px-4">
        <div className="max-w-4xl mx-auto space-y-3">
          <button onClick={() => router.push('/')} className="flex items-center gap-1.5 text-blue-200 hover:text-white transition text-sm font-medium mb-3">
            <ArrowLeft className="w-4 h-4" /> Volver al Inicio
          </button>
          {/* Company selector */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 opacity-80" />
              <div className="relative">
                <select
                  value={selectedCompanyId ?? ''}
                  onChange={e => setSelectedCompanyId(e.target.value)}
                  className="appearance-none bg-blue-600 text-white font-bold text-xl pl-2 pr-8 py-1 rounded-lg cursor-pointer focus:outline-none"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notification badge */}
              <button
                onClick={() => setNewCount(0)}
                className="relative flex items-center gap-1 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-semibold transition"
              >
                <Bell className="w-4 h-4" />
                {newCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center animate-bounce">
                    {newCount}
                  </span>
                )}
                Actualizar
              </button>

              {/* Portal link */}
              <button onClick={copyPortalLink} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-semibold transition">
                <LinkIcon className="w-4 h-4" /> Portal Público
              </button>

              {/* New company */}
              <button onClick={() => setShowCompanyModal(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded-lg text-sm font-semibold transition">
                <Plus className="w-4 h-4" /> {t.adminNewCompany}
              </button>
              
              {/* Sound Toggle */}
              <button 
                onClick={() => setAudioEnabled(!audioEnabled)} 
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition ${audioEnabled ? 'bg-blue-600 hover:bg-blue-500' : 'bg-slate-400/20 hover:bg-slate-400/40 text-blue-200'}`}
                title="Activar/Desactivar Sonido"
              >
                {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-blue-200 text-sm">{t.adminPanel}</p>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-4xl mx-auto px-4 mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Tickets Column (LEFT on mobile, RIGHT on desktop) ── */}
        <div className="md:col-span-2 md:order-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold flex items-center gap-2 text-slate-800"><Users className="w-5 h-5 text-blue-600" /> {t.adminMyTeam}</h3>
              <button onClick={() => setShowTeamModal(true)} className="p-1.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <ul className="space-y-2">
              {activeCompany?.technicianEmails.map(email => (
                <li key={email} className="flex justify-between items-center text-sm bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
                  <span className="truncate pr-2 font-medium text-slate-700 text-xs">{email}</span>
                  {email === activeCompany.adminEmail
                    ? <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex-shrink-0">Admin</span>
                    : (
                      <button onClick={() => handleRemoveTech(email)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  }
                </li>
              ))}
            </ul>
          </div>

          {/* Invite codes panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold flex items-center gap-2 text-slate-800 text-sm">
                <Key className="w-4 h-4 text-indigo-600" /> {t.adminInvites}
              </h3>
              <button
                onClick={handleGenerateInvite}
                disabled={generatingInvite}
                className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {generatingInvite ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                {t.adminGenerateInfo}
              </button>
            </div>

            {invites.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-3">
                Sin códigos activos. Genera uno para invitar técnicos.
              </p>
            ) : (
              <div className="space-y-2">
                {invites.map(inv => {
                  const expiresIn = Math.max(0, Math.round((new Date(inv.expiresAt).getTime() - Date.now()) / 3600000));
                  return (
                    <div key={inv.code} className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-indigo-800 text-lg tracking-widest">{inv.code}</span>
                        <span className="text-[10px] text-indigo-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{expiresIn}h restantes
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyInviteCode(inv.code)}
                          className="flex-1 flex items-center justify-center gap-1 border border-indigo-200 text-indigo-700 text-xs font-semibold py-1.5 rounded-lg hover:bg-indigo-100 transition"
                        >
                          <Copy className="w-3 h-3" /> Código
                        </button>
                        <button
                          onClick={() => copyInviteLink(inv.code)}
                          className="flex-1 flex items-center justify-center gap-1 border border-indigo-200 text-indigo-700 text-xs font-semibold py-1.5 rounded-lg hover:bg-indigo-100 transition"
                        >
                          <LinkIcon className="w-3 h-3" /> Link
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Danger Zone: Transfer */}
          <div className="bg-white rounded-2xl border border-red-100 p-4">
            <h4 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1"><AlertCircle className="w-4 h-4" /> {t.adminDangerZone}</h4>
            <button
              onClick={() => setShowTransferModal(true)}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl py-2 text-sm font-semibold transition"
            >
              <ArrowRightLeft className="w-4 h-4" /> {t.adminTransferCompany}
            </button>
          </div>
        </div>

        {/* ── Sidebar Column (team + invites + settings) ── */}
        <div className="md:col-span-1 md:order-1 space-y-4">

          {/* ── Corporate Data — Collapsible ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <button
              onClick={() => setShowCorpPanel(!showCorpPanel)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition"
            >
              <span className="font-bold text-sm text-slate-700 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" /> Datos de la Empresa
              </span>
              {showCorpPanel
                ? <ChevronUp className="w-4 h-4 text-slate-400" />
                : <ChevronDown className="w-4 h-4 text-slate-400" />
              }
            </button>

            {showCorpPanel && (
              <div className="border-t border-slate-100 p-5 flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0 flex flex-col items-center">
              <h3 className="font-bold text-sm text-slate-800 mb-2">{t.adminSetLogoTitle}</h3>
              <div className="relative w-28 h-28 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 overflow-hidden cursor-pointer hover:bg-slate-100 transition-colors group">
                {(corpLogoFile || corpLogoUrl) ? (
                  <img src={corpLogoFile || corpLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" crossOrigin="anonymous" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <Camera className="w-6 h-6 mb-1" />
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const toastId = toast.loading('Optimizando logo...', { duration: Infinity });
                    try {
                      const fileCompressed = await compressImage(file, { maxWidthOrHeight: 600, quality: 0.8 });
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setCorpLogoFile(reader.result as string);
                        toast.success('Logo listo para guardar', { id: toastId });
                      };
                      reader.readAsDataURL(fileCompressed);
                    } catch {
                      toast.error('Error al procesar el logo', { id: toastId });
                    }
                  }}
                />
              </div>
            </div>
            
            <div className="flex-1 space-y-3">
              <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-2">{t.adminCompanyData}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">RUC Fiscal</label>
                  <input 
                    value={corpRuc} onChange={e => setCorpRuc(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono Fijo / Base</label>
                  <input 
                    value={corpPhone} onChange={e => setCorpPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none"
                  />
                </div>
              </div>
              <button 
                onClick={async () => {
                  if (!activeCompany) return;
                  setSavingCorp(true);
                  try {
                    let finalUrl = corpLogoUrl;
                    if (corpLogoFile) {
                      finalUrl = await uploadCompanyLogo(activeCompany.id, corpLogoFile);
                    }
                    await updateCompanyProfile(activeCompany.id, {
                      ruc: corpRuc, phone: corpPhone, logoUrl: finalUrl
                    });
                    toast.success('Empresa actualizada. Se reflejará en todos los reportes de tu equipo.');
                    setCorpLogoUrl(finalUrl);
                    setCorpLogoFile(null);
                  } catch {
                    toast.error('Error guardando empresa');
                  } finally {
                    setSavingCorp(false);
                  }
                }}
                disabled={savingCorp}
                className="w-full mt-2 py-2 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg hover:bg-blue-100 transition flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {savingCorp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar Empresa
              </button>
            </div>
          </div>
            )}
          </div>

          {/* ── KPI Summary Row ── */}
          {!ticketsLoading && tickets.length > 0 && (() => {
            const open = tickets.filter(t => t.status === 'PENDIENTE' || t.status === 'REVISADO').length;
            const active = tickets.filter(t => t.status === 'ASIGNADO' || t.status === 'EN_CAMINO' || t.status === 'EN_PROGRESO').length;
            const today = new Date(); today.setHours(0,0,0,0);
            const closedToday = tickets.filter(t => t.status === 'CERRADO' && new Date(t.updatedAt) >= today).length;
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-amber-700">{open}</p>
                  <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide mt-0.5">Pendientes</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{active}</p>
                  <p className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mt-0.5">En curso</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{closedToday}</p>
                  <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide mt-0.5">Cerrados hoy</p>
                </div>
              </div>
            );
          })()}

          {/* ── Inbox header ── */}
          <div className="flex items-center gap-2">
            <h3 className="font-bold flex items-center gap-2 text-slate-800">
              <TicketIcon className="w-5 h-5 text-indigo-600" />
              {t.adminTicketInbox}
              {newCount > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  {newCount} nuevo{newCount > 1 ? 's' : ''}
                </span>
              )}
            </h3>
            <button
              onClick={() => setShowNewTicketModal(true)}
              className="ml-auto flex items-center gap-1 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Orden
            </button>
          </div>

          {/* ── Search bar ── */}
          <div className="relative">
            <input
              type="text"
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
              placeholder="🔍 Buscar por cliente, descripción o RUC..."
              className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-white shadow-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">🔍</span>
            {ticketSearch && (
              <button onClick={() => setTicketSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm">×</button>
            )}
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['TODOS', 'PENDIENTE', 'ASIGNADO', 'EN_PROGRESO', 'CERRADO'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTicketFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition border ${
                  ticketFilter === f
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                }`}
              >
                {f === 'TODOS' ? `Todos (${tickets.length})` :
                 f === 'PENDIENTE' ? `Pendientes (${tickets.filter(t=>t.status==='PENDIENTE'||t.status==='REVISADO').length})` :
                 f === 'ASIGNADO' ? `Asignados (${tickets.filter(t=>t.status==='ASIGNADO'||t.status==='EN_CAMINO').length})` :
                 f === 'EN_PROGRESO' ? `En progreso (${tickets.filter(t=>t.status==='EN_PROGRESO').length})` :
                 `Cerrados (${tickets.filter(t=>t.status==='CERRADO').length})`
                }
              </button>
            ))}
          </div>

          {ticketsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <TicketIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{t.adminNoTickets}</p>
              <p className="text-slate-400 text-sm mt-1">{t.adminSharePortalDesc}</p>
            </div>
          ) : (
            tickets
              .filter(ticket => {
                // Status filter
                const statusOk = (
                  ticketFilter === 'TODOS' ||
                  (ticketFilter === 'PENDIENTE' && (ticket.status === 'PENDIENTE' || ticket.status === 'REVISADO')) ||
                  (ticketFilter === 'ASIGNADO' && (ticket.status === 'ASIGNADO' || ticket.status === 'EN_CAMINO')) ||
                  (ticketFilter === 'EN_PROGRESO' && ticket.status === 'EN_PROGRESO') ||
                  (ticketFilter === 'CERRADO' && ticket.status === 'CERRADO')
                );
                // Search filter
                if (!statusOk) return false;
                if (!ticketSearch.trim()) return true;
                const q = ticketSearch.toLowerCase();
                return (
                  ticket.clientName.toLowerCase().includes(q) ||
                  ticket.issueDescription.toLowerCase().includes(q) ||
                  (ticket.clientPhone || '').includes(q) ||
                  ((ticket as any).clientRuc || '').includes(q)
                );
              })
              .map(ticket => {
              const priorityColors: Record<string, string> = {
                ALTA: 'bg-red-100 text-red-700',
                NORMAL: 'bg-blue-100 text-blue-700',
                BAJA: 'bg-slate-100 text-slate-600',
              };
              const priorityLabels: Record<string, string> = {
                ALTA: '🔴 Urgente', NORMAL: '🔵 Normal', BAJA: '⚫ Baja',
              };
              return (
              <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
                {/* Status bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  ticket.status === 'PENDIENTE' ? 'bg-amber-400' :
                  ticket.status === 'ASIGNADO' ? 'bg-blue-500' :
                  ticket.status === 'EN_CAMINO' ? 'bg-indigo-500' :
                  ticket.status === 'EN_PROGRESO' ? 'bg-orange-400' :
                  ticket.status === 'CERRADO' ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />

                {/* ── Collapsed header (always visible) ── */}
                <button
                  type="button"
                  onClick={async () => {
                    const nextId = expandedTicketId === ticket.id ? null : ticket.id;
                    setExpandedTicketId(nextId);
                    // Load visit if we're expanding and ticket has a visitId
                    if (nextId && ticket.visitId && visitCache[ticket.visitId] === undefined) {
                      const v = await getVisit(ticket.visitId);
                      setVisitCache(prev => ({ ...prev, [ticket.visitId!]: v ?? 'NOT_FOUND' }));
                    }
                  }}
                  className="w-full text-left p-5 space-y-1"
                >
                  <div className="flex justify-between items-start pl-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-bold text-slate-800 text-base truncate">{ticket.clientName}</h4>
                      <p className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleString('es-EC')}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          ticket.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                          ticket.status === 'ASIGNADO' ? 'bg-blue-100 text-blue-700' :
                          ticket.status === 'EN_CAMINO' ? 'bg-indigo-100 text-indigo-700 animate-pulse' :
                          ticket.status === 'EN_PROGRESO' ? 'bg-orange-100 text-orange-700 animate-pulse' :
                          ticket.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {ticket.status === 'EN_CAMINO' ? '🚗 En camino' : ticket.status === 'EN_PROGRESO' ? '⚙️ Trabajando' : ticket.status === 'CERRADO' ? '✅ Cerrado' : ticket.status}
                        </span>
                        {ticket.priority && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityColors[ticket.priority] ?? 'bg-slate-100 text-slate-600'}`}>
                            {priorityLabels[ticket.priority]}
                          </span>
                        )}
                      </div>
                      {expandedTicketId === ticket.id
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                      }
                    </div>
                  </div>

                  {/* Preview line — visible when collapsed */}
                  {expandedTicketId !== ticket.id && (
                    <p className="text-xs text-slate-500 pl-2 truncate">{ticket.issueDescription}</p>
                  )}
                </button>

                {/* ── Expanded detail panel ── */}
                {expandedTicketId === ticket.id && (
                  <div className="px-5 pb-5 space-y-3 border-t border-slate-100">
                    <div className="pt-3 pl-2 space-y-1">
                      {ticket.clientPhone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 flex-shrink-0" />{ticket.clientPhone}</p>}
                      {(ticket as any).clientRuc && <p className="text-sm text-slate-600 flex items-center gap-1.5"><span className="text-base flex-shrink-0">🪪</span>RUC: {(ticket as any).clientRuc}</p>}
                      {ticket.clientAddress && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{ticket.clientAddress}</p>}
                      {ticket.notes && (
                        <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">📝 {ticket.notes}</p>
                      )}
                    </div>

                    <div className="pl-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.issueDescription}</p>
                    </div>

                    {ticket.photoUrl && (
                      <div className="pl-2">
                        <img src={ticket.photoUrl} alt="Evidencia" className="w-full h-36 object-cover rounded-xl border border-slate-100 cursor-zoom-in" onClick={() => window.open(ticket.photoUrl, '_blank')} />
                      </div>
                    )}

                    {ticket.assignedTo && (
                      <p className="text-xs font-semibold text-slate-500 pl-2">
                        👤 Asignado a: <span className="text-blue-600">{ticket.assignedTo}</span>
                      </p>
                    )}

                    {/* Visit real-time status */}
                    {ticket.visitId && (() => {
                      const visit = visitCache[ticket.visitId];
                      if (visit === undefined) return (
                        <div className="flex items-center gap-2 pl-2 text-xs text-slate-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando visita...
                        </div>
                      );
                      if (visit === 'NOT_FOUND') return (
                        <p className="text-xs text-slate-400 pl-2">⚠️ Visita no encontrada</p>
                      );
                      const isWorking = visit.status === 'EN_PROGRESO';
                      const isDone = visit.status === 'FINALIZADA';
                      return (
                        <div className="pl-2">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-2">Visita del Técnico</p>
                          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className={`w-4 h-4 ${isWorking || isDone ? 'text-emerald-500' : 'text-slate-300'}`} />
                              <span className={isWorking || isDone ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Llegada registrada</span>
                              {visit.arrival?.localTime && <span className="text-xs text-slate-400 ml-auto">{new Date(visit.arrival.localTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Wrench className={`w-4 h-4 ${isDone ? 'text-emerald-500' : isWorking ? 'text-orange-400' : 'text-slate-300'}`} />
                              <span className={isWorking ? 'text-orange-600 font-semibold animate-pulse' : isDone ? 'text-slate-700 font-semibold' : 'text-slate-400'}>
                                {isWorking ? '⚙️ Trabajando en sitio' : isDone ? 'Trabajo finalizado' : 'Pendiente'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <CheckCircle className={`w-4 h-4 ${isDone ? 'text-emerald-500' : 'text-slate-300'}`} />
                              <span className={isDone ? 'text-slate-700 font-semibold' : 'text-slate-400'}>Visita cerrada</span>
                              {visit.departure?.localTime && <span className="text-xs text-slate-400 ml-auto">{new Date(visit.departure.localTime).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>}
                            </div>
                            {visit.activities && visit.activities.length > 0 && (
                              <div className="pt-2 border-t border-slate-200 space-y-1">
                                <p className="text-xs font-bold text-slate-500">Actividades ({visit.activities.length})</p>
                                {visit.activities.slice(0, 3).map((act, i) => (
                                  <p key={i} className="text-xs text-slate-600 truncate">• {act.description}</p>
                                ))}
                                {visit.activities.length > 3 && <p className="text-xs text-slate-400">+{visit.activities.length - 3} más...</p>}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="pl-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/ticket/${ticket.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Link de seguimiento copiado — envíaselo al cliente por WhatsApp');
                        }}
                        className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-100 transition"
                      >
                        <Share2 className="w-3.5 h-3.5" /> Compartir tracking
                      </button>

                      {/* Revisar (PENDIENTE → REVISADO) */}
                      {ticket.status === 'PENDIENTE' && (
                        <button
                          onClick={async () => {
                            await updateTicketStatus(ticket.id, { status: 'REVISADO' });
                            toast.success('Ticket marcado como Revisado');
                          }}
                          className="flex items-center gap-1 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-100 transition border border-slate-200"
                        >
                          🔍 Marcar Revisado
                        </button>
                      )}

                      {/* Asignar / Reasignar — visible en todos los estados activos */}
                      {ticket.status !== 'CERRADO' && activeCompany && (
                        <button
                          onClick={() => setShowAssignModal(ticket.id)}
                          className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
                        >
                          👤 {ticket.assignedTo ? 'Reasignar' : 'Asignar Técnico'}
                        </button>
                      )}

                      {/* Ver Reporte — cuando la visita está finalizada */}
                      {ticket.visitId && visitCache[ticket.visitId] !== 'NOT_FOUND' && (visitCache[ticket.visitId] as Visit | null)?.status === 'FINALIZADA' && (
                        <a
                          href={`/visita/${ticket.visitId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-100 transition"
                        >
                          📄 Ver Reporte
                        </a>
                      )}

                      {/* Cancelar ticket — solo activos sin visita iniciada */}
                      {(ticket.status === 'PENDIENTE' || ticket.status === 'REVISADO') && !ticket.visitId && (
                        <button
                          onClick={async () => {
                            if (!confirm('¿Cancelar este ticket? No se puede deshacer.')) return;
                            await updateTicketStatus(ticket.id, { status: 'CERRADO' });
                            toast.success('Ticket cancelado');
                          }}
                          className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition"
                        >
                          ✕ Cancelar
                        </button>
                      )}

                      {/* Corregir estado — ticket mal cerrado */}
                      {ticket.status === 'CERRADO' && ticket.visitId && visitCache[ticket.visitId] !== 'NOT_FOUND' && (visitCache[ticket.visitId] as Visit | null)?.status !== 'FINALIZADA' && (
                        <button
                          onClick={async () => {
                            await updateTicketStatus(ticket.id, { status: 'EN_PROGRESO' });
                            toast.success('Ticket reabierto como EN PROGRESO');
                          }}
                          className="flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-100 transition"
                        >
                          ↩ Corregir estado
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {showCompanyModal && (
        <CompanyFormModal
          value={newCompanyName}
          onChange={setNewCompanyName}
          onSubmit={handleCreateCompany}
          onClose={() => setShowCompanyModal(false)}
        />
      )}

      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAddTech} className="m-auto bg-white rounded-2xl p-6 w-full max-w-md text-left shadow-2xl">
            <h2 className="text-lg font-bold mb-1">Invitar técnico</h2>
            <p className="text-sm text-slate-500 mb-4">Agrega el correo de Google que el técnico usará para ingresar a la app.</p>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
            <input
              type="email" autoFocus required value={newTechEmail} onChange={e => setNewTechEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-6"
              placeholder="tecnico@gmail.com"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowTeamModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Invitar</button>
            </div>
          </form>
        </div>
      )}

      {showAssignModal && activeCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={handleAssignTicket} className="m-auto bg-white rounded-2xl p-6 w-full max-w-sm text-left shadow-2xl">
            <h2 className="text-lg font-bold mb-4">Asignar Ticket</h2>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selecciona un técnico:</label>
            <div className="space-y-2 mb-6">
              {activeCompany.technicianEmails.map(email => (
                <label key={email} className="flex items-center gap-3 p-3 border border-slate-100 rounded-xl cursor-pointer hover:bg-blue-50">
                  <input required type="radio" name="tech" value={email} onChange={e => setSelectedTech(e.target.value)} className="w-4 h-4 text-blue-600" />
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

      {showTransferModal && activeCompany && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <form onSubmit={handleTransfer} className="m-auto bg-white rounded-2xl p-6 w-full max-w-sm text-left shadow-2xl">
            <h2 className="text-lg font-bold text-red-600 mb-1 flex items-center gap-2"><ArrowRightLeft className="w-5 h-5" /> Ceder Empresa</h2>
            <p className="text-sm text-slate-500 mb-4">Ingresa el correo Gmail del nuevo administrador de <strong>{activeCompany.name}</strong>. Perderás tu acceso de jefe.</p>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Nuevo Administrador</label>
            <input
              type="email" autoFocus required value={transferEmail} onChange={e => setTransferEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-red-400 outline-none mb-6"
              placeholder="nuevo-jefe@gmail.com"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">Ceder</button>
            </div>
          </form>
        </div>
      )}

      {/* New Manual Ticket Modal */}
      {showNewTicketModal && activeCompany && (
        <NewTicketModal
          technicianEmails={activeCompany.technicianEmails}
          clients={clients}
          onClose={() => setShowNewTicketModal(false)}
          onSubmit={handleCreateManualTicket}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// Reusable Company Form Modal
// ─────────────────────────────────────────
function CompanyFormModal({
  value, onChange, onSubmit, onClose
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={onSubmit} className="mx-auto my-8 bg-white rounded-2xl p-6 w-full max-w-md text-left shadow-2xl">
        <h2 className="text-lg font-bold mb-4">Nueva Empresa</h2>
        <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Comercial</label>
        <input
          type="text" autoFocus required value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none mb-6"
          placeholder="Ej. ACME Services"
        />
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600">Cancelar</button>
          <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Crear</button>
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────
// NewTicketModal — Manual order creation by admin
// ─────────────────────────────────────────
function NewTicketModal({
  technicianEmails,
  clients,
  onClose,
  onSubmit,
}: {
  technicianEmails: string[];
  clients: Client[];
  onClose: () => void;
  onSubmit: (data: {
    clientId?: string;
    clientRuc?: string;
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    issueDescription: string;
    priority: TicketPriority;
    notes?: string;
    photoDataUrl?: string;
    location?: { lat: number; lng: number };
    assignedTo?: string;
  }) => void;
}) {
  const [selectedClientId, setSelectedClientId] = React.useState('');
  const [clientSearch, setClientSearch] = React.useState('');
  const [showClientDropdown, setShowClientDropdown] = React.useState(false);
  const [clientName, setClientName] = React.useState('');
  const [clientPhone, setClientPhone] = React.useState('');
  const [clientRuc, setClientRuc] = React.useState('');
  const [clientAddress, setClientAddress] = React.useState('');
  const [issueDescription, setIssueDescription] = React.useState('');
  const [priority, setPriority] = React.useState<TicketPriority>('NORMAL');
  const [notes, setNotes] = React.useState('');
  const [assignedTo, setAssignedTo] = React.useState('');
  const [photoDataUrl, setPhotoDataUrl] = React.useState<string | undefined>();
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [showMapPicker, setShowMapPicker] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading('Procesando foto...');
    try {
      const { compressImage } = await import('@/lib/utils');
      // Usar compresión html5 canvas que nunca falla en móviles (800x800 Max, 70% calidad = < 300KB)
      const compressedBlob = await compressImage(file, 800, 800, 0.7);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoDataUrl(reader.result as string);
        toast.success('Foto adjuntada correctamente', { id: toastId });
      };
      reader.readAsDataURL(compressedBlob);
    } catch {
      toast.error('Error al procesar la foto', { id: toastId });
    }
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !issueDescription.trim()) return;
    setSaving(true);
    try {
      await onSubmit({
        clientId: selectedClientId !== 'NEW' && selectedClientId !== '' ? selectedClientId : undefined,
        clientRuc: clientRuc.trim() || undefined,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientAddress: clientAddress.trim(),
        issueDescription: issueDescription.trim(),
        priority,
        notes: notes.trim() || undefined,
        photoDataUrl,
        location: location || undefined,
        assignedTo: assignedTo || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="mx-auto my-8 bg-white rounded-2xl p-6 w-full max-w-lg text-left space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">📋 Nueva Orden de Trabajo</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Prioridad</label>
          <div className="flex gap-2">
            {(['ALTA', 'NORMAL', 'BAJA'] as TicketPriority[]).map(p => (
              <button
                key={p} type="button"
                onClick={() => setPriority(p)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition ${
                  priority === p
                    ? p === 'ALTA' ? 'border-red-500 bg-red-50 text-red-700'
                      : p === 'NORMAL' ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-400 bg-slate-50 text-slate-700'
                    : 'border-slate-200 bg-white text-slate-400'
                }`}
              >
                {p === 'ALTA' ? '🔴 Urgente' : p === 'NORMAL' ? '🔵 Normal' : '⚫ Baja'}
              </button>
            ))}
          </div>
        </div>

        {/* Client Selector & Details */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cliente *</label>

          {/* Search bar — solo para buscar clientes existentes */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, RUC o teléfono..."
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
              value={clientSearch}
              onFocus={() => setShowClientDropdown(true)}
              onBlur={() => setTimeout(() => setShowClientDropdown(false), 150)}
              onChange={(e) => {
                const val = e.target.value;
                setClientSearch(val);
                setShowClientDropdown(true);
                // Si borra la búsqueda y no hay cliente seleccionado, resetea
                if (!val.trim() && selectedClientId !== 'NEW') {
                  setSelectedClientId('');
                  setClientName('');
                  setClientPhone('');
                  setClientRuc('');
                  setClientAddress('');
                  setLocation(null);
                }
              }}
            />

            {showClientDropdown && clientSearch.trim() !== '' && (
              <div
                className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()}
              >
                {clients
                  .filter(c => {
                    const q = clientSearch.toLowerCase();
                    return (
                      c.name.toLowerCase().includes(q) ||
                      (c.phone || '').toLowerCase().includes(q) ||
                      (c.ruc || '').toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 4)
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedClientId(c.id);
                        setClientSearch(c.name);
                        setClientName(c.name);
                        setClientPhone(c.phone || '');
                        setClientRuc((c as any).ruc || '');
                        setClientAddress(c.address || '');
                        setLocation(c.location || null);
                        setShowClientDropdown(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100"
                    >
                      <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                      <div className="text-xs text-slate-400 flex gap-3">
                        {c.phone && <span>📞 {c.phone}</span>}
                        {(c as any).ruc && <span>🪪 {(c as any).ruc}</span>}
                      </div>
                    </button>
                  ))}
                {/* Siempre muestra opción de crear nuevo */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedClientId('NEW');
                    setClientName('');
                    setClientPhone('');
                    setClientRuc('');
                    setClientAddress('');
                    setShowClientDropdown(false);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-blue-600 hover:bg-blue-50 bg-slate-50"
                >
                  ➕ Registrar nuevo cliente
                </button>
              </div>
            )}
          </div>

          {/* Indicador cliente seleccionado */}
          {selectedClientId !== '' && selectedClientId !== 'NEW' && (
            <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <span className="text-sm font-bold text-emerald-700">✅ {clientName}</span>
              <button type="button" onClick={() => {
                setSelectedClientId('');
                setClientSearch('');
                setClientName('');
                setClientPhone('');
                setClientRuc('');
                setClientAddress('');
                setLocation(null);
              }} className="text-xs text-slate-400 hover:text-red-500">✕ Cambiar</button>
            </div>
          )}

          {/* Formulario Nuevo Cliente — aparece cuando selectedClientId = NEW */}
          {selectedClientId === 'NEW' && (
            <div className="mt-4 p-4 bg-white border border-blue-100 rounded-xl shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                <Users className="w-4 h-4" /> Nuevo Cliente
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre y Apellido *</label>
                <input required value={clientName} onChange={e => setClientName(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ej: Juan Pérez" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RUC / Cédula</label>
                  <input value={clientRuc} onChange={e => setClientRuc(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej: 0912345678001" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                  <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="099..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección / Link GPS</label>
                <div className="flex flex-col gap-2">
                  <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ej: Mapasingue Este Mz 4..." />
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition ${location ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    <MapPin className="w-4 h-4" />
                    {location ? `Ubicación fijada ✅` : 'Seleccionar en Mapa'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cliente existente — editar datos vinculados */}
          {selectedClientId !== 'NEW' && selectedClientId !== '' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none bg-white font-medium text-slate-700" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RUC / Cédula</label>
                <input value={clientRuc} onChange={e => setClientRuc(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-2.5 text-sm outline-none bg-white font-medium text-slate-700"
                  placeholder="(vacío si no tiene)" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección / Ref</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={clientAddress} onChange={e => setClientAddress(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl p-2.5 text-sm outline-none bg-white font-medium text-slate-700" />
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(true)}
                    className={`whitespace-nowrap flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold border-2 transition ${location ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200'}`}
                  >
                    <MapPin className="w-4 h-4" /> {location ? 'GPS ✅' : '+ GPS'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Issue */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción del Problema *</label>
          <textarea required rows={3} value={issueDescription} onChange={e => setIssueDescription(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Describe el fallo o trabajo a realizar..." />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notas Internas (solo admin)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            placeholder="Ej: Llevar switch 24 puertos, pedir factura..." />
        </div>

        {/* Photo */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Foto de referencia</label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
          {photoDataUrl ? (
            <div className="relative">
              <img src={photoDataUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
              <button type="button" onClick={() => setPhotoDataUrl(undefined)} className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">Eliminar</button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-xl py-4 text-slate-400 text-sm hover:border-blue-300 hover:text-blue-500 transition flex items-center justify-center gap-2">
              <Camera className="w-4 h-4" /> Adjuntar foto
            </button>
          )}
        </div>

        {/* Assign directly */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Asignar directamente a técnico (opcional)</label>
          <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)}
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
            <option value="">— Sin asignar (PENDIENTE) —</option>
            {technicianEmails.map(email => (
              <option key={email} value={email}>{email}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 font-medium">Cancelar</button>
          <button type="submit" disabled={saving}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? 'Creando...' : 'Crear Orden'}
          </button>
        </div>
      </form>

      {/* Map Picker Overlay */}
      {showMapPicker && (
        <MapPicker 
          onLocationSelect={(loc) => { setLocation(loc); setShowMapPicker(false); }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </div>
  );
}
