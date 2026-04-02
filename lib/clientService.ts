/**
 * Client Service — CRUD for clients in Firestore
 * Cache-first offline strategy:
 *  1. Firestore IndexedDB cache (instantaneous)
 *  2. Network fetch
 *  3. localStorage fallback
 */
import {
  collection, doc, addDoc, updateDoc, getDocs, deleteDoc,
  query, where, orderBy, serverTimestamp, getDocsFromCache
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
  const q = query(
    collection(db, COLLECTION),
    where('createdBy', '==', technicianId),
    orderBy('name', 'asc')
  );

  // 1. Try Firestore IndexedDB cache FIRST — instantaneous offline response
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      const clients = cacheSnap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
      logger.log(`⚡ Clientes desde caché Firestore (${clients.length})`);
      setCachedClients(technicianId, clients);
      // Refresh in background without blocking UI
      getDocs(q).then(snap => {
        const fresh = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
        setCachedClients(technicianId, fresh);
      }).catch(() => {});
      return clients;
    }
  } catch {
    // Cache miss or not yet initialized — fall through to network
  }

  // 2. Try network fetch
  try {
    const snap = await getDocs(q);
    const clients = snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
    setCachedClients(technicianId, clients);
    return clients;
  } catch (err) {
    // 3. Offline + Firestore cache empty — use localStorage as last resort
    logger.log('⚠️ Firestore offline, usando caché localStorage de clientes');
    const cached = getCachedClients(technicianId);
    if (cached) return cached;
    throw err;
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
