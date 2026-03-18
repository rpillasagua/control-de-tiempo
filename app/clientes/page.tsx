'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Plus, Search, MapPin, Loader2, Phone, Mail, Building2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getClients } from '@/lib/clientService';
import { Client } from '@/lib/types';
import { toast } from 'sonner';

export default function ClientListPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getClients(user.email);
      setClients(data);
      setFiltered(data);
    } catch {
      toast.error('Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(clients);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(clients.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.address && c.address.toLowerCase().includes(q))
    ));
  }, [search, clients]);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 rounded-full hover:bg-slate-100">
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
            </Link>
            <h1 className="font-bold text-slate-800 text-lg">Mis Clientes</h1>
          </div>
          <Link href="/clientes/nuevo">
            <button className="px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-full hover:bg-blue-200 transition-colors flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Nuevo Cliente
            </button>
          </Link>
        </div>
        
        {/* Search */}
        <div className="max-w-lg mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar cliente por nombre o dirección..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-100 border-none rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p>{search ? 'No se encontraron clientes' : 'Aún no tienes clientes registrados'}</p>
            {!search && (
              <Link href="/clientes/nuevo">
                <button className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium">
                  Agregar mi primer cliente
                </button>
              </Link>
            )}
          </div>
        ) : (
          filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <h3 className="font-bold text-slate-800 text-lg">{c.name}</h3>
              
              <div className="mt-2 space-y-1.5">
                {c.address && (
                  <p className="text-sm text-slate-600 flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {c.address}
                  </p>
                )}
                {c.phone && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" /> {c.phone}
                  </p>
                )}
                {c.email && (
                  <p className="text-sm text-slate-600 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" /> {c.email}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
