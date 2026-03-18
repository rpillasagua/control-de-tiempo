/**
 * Client Service — CRUD for clients in Firestore
 */
import {
  collection, doc, addDoc, updateDoc, getDocs,
  query, where, orderBy, serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Client } from './types';
import { logger } from './logger';

const COLLECTION = 'clients';

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
  logger.log(`✅ Cliente creado: ${docRef.id}`);
  return docRef.id;
}

export async function getClients(technicianId: string): Promise<Client[]> {
  const q = query(
    collection(db, COLLECTION),
    where('createdBy', '==', technicianId),
    orderBy('name', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Client));
}

export async function updateClient(
  clientId: string,
  data: Partial<Omit<Client, 'id' | 'createdBy' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, clientId), data);
}

export async function deleteClient(clientId: string): Promise<void> {
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, COLLECTION, clientId));
  logger.log(`✅ Cliente ${clientId} eliminado`);
}
