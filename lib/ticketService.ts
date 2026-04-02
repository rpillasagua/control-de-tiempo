import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
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

// Admins obteniendo todos los tickets de su empresa
export async function getTicketsByCompany(companyId: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('companyId', '==', companyId)
  );
  const snap = await getDocs(q);
  const tickets = snap.docs.map(doc => doc.data() as Ticket);
  // Ordenar por createdAt descendente
  return tickets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Obteniendo tickets asignados a un técnico específico
export async function getTicketsByTechnician(technicianEmail: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('assignedTo', '==', technicianEmail)
  );
  const snap = await getDocs(q);
  const allAssigned = snap.docs.map(doc => doc.data() as Ticket);
  // Filtrar en memoria para evitar requerir un índice compuesto en Firestore
  return allAssigned.filter(t => t.status === 'ASIGNADO');
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
