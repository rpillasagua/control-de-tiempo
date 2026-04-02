'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createCompany } from '@/lib/companyService';
import { acceptInvite } from '@/lib/inviteService';
import { Company } from '@/lib/types';
import {
  Building2, Key, Loader2, ArrowRight, CheckCircle2, LogIn
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────
// Tab types
// ─────────────────────────────────────────────────────────────
type Tab = 'create' | 'join';

function BienvenidaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, login } = useAuth();

  const [tab, setTab] = useState<Tab>(
    searchParams.get('action') === 'join' ? 'join' : 'create'
  );
  const [companyName, setCompanyName] = useState('');
  const [inviteCode, setInviteCode] = useState(
    (searchParams.get('code') ?? '').toUpperCase()
  );
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ message: string; route: string } | null>(null);

  // ── Unauthenticated ──────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-700 to-indigo-800 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-3xl mb-8">
          <Building2 className="w-16 h-16 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Bitácora Técnica</h1>
        <p className="text-blue-200 max-w-sm mb-10">
          Gestiona tu equipo de técnicos, recibe tickets de clientes y genera reportes PDF profesionales.
        </p>
        <button
          onClick={login}
          className="flex items-center gap-3 bg-white text-blue-700 font-bold px-8 py-4 rounded-2xl shadow-lg hover:bg-blue-50 transition text-lg"
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuar con Google
        </button>
      </div>
    );
  }

  // ── Success state ─────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-white/20 p-6 rounded-full mb-6">
          <CheckCircle2 className="w-20 h-20" />
        </div>
        <h1 className="text-2xl font-bold mb-3">{done.message}</h1>
        <button
          onClick={() => router.push(done.route)}
          className="mt-8 bg-white text-blue-700 font-bold px-8 py-3 rounded-xl hover:bg-blue-50 transition flex items-center gap-2"
        >
          Continuar <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // ── Create company ────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setBusy(true);
    try {
      const id = `${Date.now()}`;
      const now = new Date().toISOString();
      const newCo: Company = {
        id,
        name: companyName.trim(),
        adminEmail: user.email,
        technicianEmails: [user.email],
        createdAt: now,
        updatedAt: now,
      };
      await createCompany(newCo);
      setDone({ message: `¡Empresa "${newCo.name}" creada!`, route: '/admin' });
    } catch {
      toast.error('Error creando empresa');
    } finally {
      setBusy(false);
    }
  };

  // ── Join with code ────────────────────────────────────────
  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setBusy(true);
    try {
      const result = await acceptInvite(inviteCode, user.email);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setDone({ message: result.message, route: '/' });
    } catch {
      toast.error('Error al procesar el código');
    } finally {
      setBusy(false);
    }
  };

  // ── Main form ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Building2 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">¡Bienvenido, {user.name.split(' ')[0]}!</h1>
        <p className="text-slate-500 mt-1">¿Cómo deseas continuar?</p>
      </div>

      {/* Tab selector */}
      <div className="w-full max-w-md">
        <div className="flex bg-slate-100 rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition ${
              tab === 'create'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🏢 Crear Empresa
          </button>
          <button
            type="button"
            onClick={() => setTab('join')}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition ${
              tab === 'join'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🔑 Unirse con Código
          </button>
        </div>

        {/* Create tab */}
        {tab === 'create' && (
          <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Registra tu empresa. Podrás invitar técnicos y recibir reportes de clientes.
              </p>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Nombre de tu empresa <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Ej. Servi-Tech Aruba"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || !companyName.trim()}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
              {busy ? 'Creando...' : 'Crear Empresa'}
            </button>
          </form>
        )}

        {/* Join tab */}
        {tab === 'join' && (
          <form onSubmit={handleJoin} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div>
              <p className="text-sm text-slate-500 mb-4">
                Tu jefe debe enviarte un código de invitación de 6 dígitos o un enlace directo.
              </p>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Código de Invitación <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="Ej. AB3X9K"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-mono tracking-widest text-lg text-center"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={busy || inviteCode.length < 6}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {busy ? 'Verificando...' : 'Unirme al Equipo'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-400 mt-4">
          Sesión activa como <strong>{user.email}</strong>
        </p>
      </div>
    </div>
  );
}

export default function BienvenidaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    }>
      <BienvenidaForm />
    </Suspense>
  );
}
