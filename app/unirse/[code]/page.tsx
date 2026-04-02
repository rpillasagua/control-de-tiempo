'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { validateInvite, acceptInvite } from '@/lib/inviteService';
import { Invite } from '@/lib/types';
import { Loader2, Building2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function UnirseConLinkPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params.code as string ?? '').toUpperCase();
  const { user, loading: authLoading, login } = useAuth();

  const [invite, setInvite] = useState<Invite | null>(null);
  const [validating, setValidating] = useState(true);
  const [invalidMsg, setInvalidMsg] = useState('');
  const [joining, setJoining] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate invite on load (even before login, to show company name)
  useEffect(() => {
    if (!code) return;
    validateInvite(code).then((inv) => {
      if (!inv) {
        setInvalidMsg('Este enlace es inválido, ha expirado o ya fue utilizado.');
      } else {
        setInvite(inv);
      }
      setValidating(false);
    });
  }, [code]);

  const handleJoin = async () => {
    if (!user || !invite) return;
    setJoining(true);
    try {
      const result = await acceptInvite(code, user.email);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push('/'), 2500);
    } catch {
      toast.error('Error al unirte a la empresa');
    } finally {
      setJoining(false);
    }
  };

  if (validating || authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (invalidMsg) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h1 className="text-xl font-bold text-slate-800">Enlace no válido</h1>
        <p className="text-slate-500 mt-2 max-w-sm">{invalidMsg}</p>
        <button onClick={() => router.push('/bienvenida')} className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700">
          Ir a Bienvenida
        </button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-white/20 p-6 rounded-full mb-6">
          <CheckCircle2 className="w-20 h-20" />
        </div>
        <h1 className="text-2xl font-bold mb-2">¡Te uniste a {invite?.companyName}!</h1>
        <p className="text-blue-200">Redirigiendo a tu Panel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-lg border border-slate-100 p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Invitación al Equipo</p>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">{invite?.companyName}</h1>
        <p className="text-slate-500 text-sm mb-8">
          Fuiste invitado por <strong className="text-slate-700">{invite?.createdBy}</strong> como Técnico.
        </p>

        {!user ? (
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 border border-slate-200 py-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Iniciar sesión con Google para unirme
          </button>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-4">Conectado como <strong>{user.email}</strong></p>
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-60"
            >
              {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {joining ? 'Uniéndome...' : `Unirme a ${invite?.companyName}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
