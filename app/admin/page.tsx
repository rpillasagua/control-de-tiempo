'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTicketMonitor } from '@/hooks/useTicketMonitor';
import {
  getCompaniesByAdmin, createCompany, updateTechnicians,
  transferCompanyOwnership, updateCompanyProfile, uploadCompanyLogo
} from '@/lib/companyService';
import { useTranslation } from '@/lib/i18n';
import { compressImage } from '@/lib/imageCompression';
import { getTicketsByCompany, updateTicketStatus } from '@/lib/ticketService';
import { createInvite, getCompanyInvites } from '@/lib/inviteService';
import { Company, Ticket, Invite } from '@/lib/types';
import {
  Loader2, Plus, Users, Building2, MapPin, Phone,
  Trash2, Link as LinkIcon, Bell, ChevronDown,
  ArrowRightLeft, Ticket as TicketIcon, AlertCircle, Key, Copy, Clock, Camera, Save, Volume2, VolumeX
} from 'lucide-react';
import { toast } from 'sonner';

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

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  // Alert badge
  const [newCount, setNewCount] = useState(0);

  // Invites
  const [invites, setInvites] = useState<Invite[]>([]);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);

  // Modals
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

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

  // ── Load companies ──────────────────────
  const loadCompanies = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
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

  // ── Load tickets when company changes ──
  const loadTickets = useCallback(async () => {
    if (!selectedCompanyId) return;
    setTicketsLoading(true);
    try {
      const list = await getTicketsByCompany(selectedCompanyId);
      setTickets(list);
      setNewCount(0);
      // Also refresh active invites
      const inviteList = await getCompanyInvites(selectedCompanyId);
      setInvites(inviteList);
    } catch {
      toast.error('Error cargando tickets');
    } finally {
      setTicketsLoading(false);
    }
  }, [selectedCompanyId]);

  useEffect(() => { loadTickets(); }, [selectedCompanyId]);

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
      setShowAssignModal(null);
      setSelectedTech('');
      loadTickets();
    } catch {
      toast.error('Error asignando ticket');
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
      <header className="bg-blue-700 text-white pt-10 pb-6 px-4">
        <div className="max-w-4xl mx-auto space-y-3">
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
                onClick={loadTickets}
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

        {/* ── Team Column ── */}
        <div className="md:col-span-1 space-y-4">
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

        {/* ── Center/Right Column ── */}
        <div className="md:col-span-2 space-y-6">

          {/* ── Corporate Data UI ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6">
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

          <h3 className="font-bold flex items-center gap-2 text-slate-800 mb-2">
            <TicketIcon className="w-5 h-5 text-indigo-600" />
            {t.adminTicketInbox}
            {newCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {newCount} nuevo{newCount > 1 ? 's' : ''}
              </span>
            )}
          </h3>

          {ticketsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-7 h-7 animate-spin text-blue-500" /></div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
              <TicketIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{t.adminNoTickets}</p>
              <p className="text-slate-400 text-sm mt-1">{t.adminSharePortalDesc}</p>
            </div>
          ) : (
            tickets.map(ticket => (
              <div key={ticket.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-3 relative overflow-hidden">
                {/* Status bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  ticket.status === 'PENDIENTE' ? 'bg-amber-400' :
                  ticket.status === 'ASIGNADO' ? 'bg-blue-500' :
                  ticket.status === 'CERRADO' ? 'bg-emerald-500' : 'bg-slate-300'
                }`} />

                <div className="flex justify-between items-start pl-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{ticket.clientName}</h4>
                    <p className="text-xs text-slate-400">{new Date(ticket.createdAt).toLocaleString('es-EC')}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${
                    ticket.status === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                    ticket.status === 'ASIGNADO' ? 'bg-blue-100 text-blue-700' :
                    ticket.status === 'CERRADO' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {ticket.status}
                  </span>
                </div>

                <div className="pl-2 space-y-1">
                  {ticket.clientPhone && <p className="text-sm text-slate-600 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 flex-shrink-0" />{ticket.clientPhone}</p>}
                  {ticket.clientAddress && <p className="text-sm text-slate-600 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 flex-shrink-0" />{ticket.clientAddress}</p>}
                </div>

                <div className="pl-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.issueDescription}</p>
                  {ticket.photoUrl && (
                    <a href={ticket.photoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 mt-2 inline-block font-semibold hover:underline">
                      📎 Ver evidencia fotográfica
                    </a>
                  )}
                </div>

                {ticket.assignedTo && (
                  <p className="text-xs font-semibold text-slate-500 pl-2">
                    👤 Asignado a: <span className="text-blue-600">{ticket.assignedTo}</span>
                  </p>
                )}

                {(ticket.status === 'PENDIENTE' || ticket.status === 'REVISADO') && activeCompany && (
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddTech} className="bg-white rounded-2xl p-6 w-full max-w-md text-left">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAssignTicket} className="bg-white rounded-2xl p-6 w-full max-w-sm text-left">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={handleTransfer} className="bg-white rounded-2xl p-6 w-full max-w-sm text-left">
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 w-full max-w-md text-left">
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
