import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, deleteDoc, getDocsFromCache } from 'firebase/firestore';
import { db } from './firebase';
import { Ticket, TicketStatus } from './types';

// Crear ticket (Por el cliente público)
export async function createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<string> {
  const newRef = doc(collection(db, 'tickets'));
  const now = new Date().toISOString();
  const ticketData: Ticket = {
    ...ticket,
    id: newRef.id,
    status: 'PENDIENTE',
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(newRef, ticketData);
  return newRef.id;
}

// Admins obteniendo todos los tickets de su empresa (Offline tolerante)
export async function getTicketsByCompany(companyId: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('companyId', '==', companyId)
  );
  
  const sortTickets = (tickets: Ticket[]) => 
    tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      getDocs(q).catch(() => {});
      return sortTickets(cacheSnap.docs.map(doc => doc.data() as Ticket));
    }
  } catch { /* cache miss */ }

  try {
    const snap = await getDocs(q);
    return sortTickets(snap.docs.map(doc => doc.data() as Ticket));
  } catch (err) {
    return [];
  }
}

// Obteniendo tickets asignados a un técnico específico (Offline tolerante)
export async function getTicketsByTechnician(technicianEmail: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('assignedTo', '==', technicianEmail)
  );

  const filterAssigned = (tickets: Ticket[]) => tickets.filter(t => t.status === 'ASIGNADO');

  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      getDocs(q).catch(() => {});
      return filterAssigned(cacheSnap.docs.map(doc => doc.data() as Ticket));
    }
  } catch { /* cache miss */ }

  try {
    const snap = await getDocs(q);
    return filterAssigned(snap.docs.map(doc => doc.data() as Ticket));
  } catch (err) {
    return [];
  }
}

// Actualizar el estado del ticket (ej. pasar a asignado, y colocar assignedTo)
export async function updateTicketStatus(ticketId: string, updates: Partial<Ticket>): Promise<void> {
  const ref = doc(db, 'tickets', ticketId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

export async function deleteTicket(ticketId: string): Promise<void> {
  const ref = doc(db, 'tickets', ticketId);
  await deleteDoc(ref);
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const ref = doc(db, 'tickets', ticketId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Ticket;
}
