/**
 * Client Service — CRUD for clients in Firestore
 * Includes localStorage cache for offline support
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Client } from './types';
import { logger } from './logger';

const COLLECTION = 'clients';

// ── localStorage cache helpers ──────────────────────────────────
function getCacheKey(technicianId: string): string {
  return `cached_clients_${technicianId}`;
}

function getCachedClients(technicianId: string): Client[] | null {
  try {
    const raw = localStorage.getItem(getCacheKey(technicianId));
    if (!raw) return null;
    return JSON.parse(raw) as Client[];
  } catch {
    return null;
  }
}

function setCachedClients(technicianId: string, clients: Client[]): void {
  try {
    localStorage.setItem(getCacheKey(technicianId), JSON.stringify(clients));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function invalidateClientCache(technicianId: string): void {
  try {
    localStorage.removeItem(getCacheKey(technicianId));
  } catch {
    // ignore
  }
}

// ── CRUD ─────────────────────────────────────────────────────────

export async function createClient(
  technicianId: string,
  data: Pick<Client, 'name' | 'address' | 'phone' | 'email' | 'notes'>
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdBy: technicianId,
    createdAt: now,
    _serverCreatedAt: serverTimestamp()
  });
  invalidateClientCache(technicianId);
  logger.log(`✅ Cliente creado: ${docRef.id}`);
  return docRef.id;
}

export async function getClients(technicianId: string): Promise<Client[]> {
  try {
    const q = query(
      collection(db, COLLECTION),
      where('createdBy', '==', technicianId),
      orderBy('name', 'asc')
    );
    const snap = await getDocs(q);
    const clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    // Update cache on successful fetch
    setCachedClients(technicianId, clients);
    return clients;
  } catch (err) {
    // Offline or network error — try cache
    logger.log('⚠️ Firestore offline, usando caché local de clientes');
    const cached = getCachedClients(technicianId);
    if (cached) return cached;
    throw err; // No cache available either
  }
}

export async function updateClient(
  clientId: string,
  data: Partial<Omit<Client, 'id' | 'createdBy' | 'createdAt'>>,
  technicianId?: string
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, clientId), data);
  if (technicianId) invalidateClientCache(technicianId);
}

export async function deleteClient(clientId: string, technicianId?: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, clientId));
  if (technicianId) invalidateClientCache(technicianId);
  logger.log(`✅ Cliente ${clientId} eliminado`);
}

