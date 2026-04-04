import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, deleteDoc, getDocsFromCache, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Ticket, TicketStatus, TicketPriority, GeoPoint } from './types';

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

  // Auto-registrar cliente si no está en la base de datos de esta empresa
  if (ticket.clientPhone) {
    try {
      const clientSnap = await getDocs(query(
        collection(db, 'clients'), 
        where('phone', '==', ticket.clientPhone),
        where('companyId', '==', ticket.companyId) // Asume que migramos clients a companyId, temporalmente no fallará
      ));
      
      if (clientSnap.empty) {
        await addDoc(collection(db, 'clients'), {
          name: ticket.clientName,
          phone: ticket.clientPhone,
          address: ticket.clientAddress || '',
          companyId: ticket.companyId,
          createdBy: 'PORTAL_PUBLICO', // Marcador para saber su origen
          createdAt: now
        });
      }
    } catch (e) {
      console.warn('Error auto-registrando cliente', e);
    }
  }

  return newRef.id;
}

// Crear ticket manualmente por el administrador (con prioridad, GPS, notas)
export async function createTicketByAdmin(
  companyId: string,
  data: {
    clientName: string;
    clientPhone: string;
    clientAddress: string;
    issueDescription: string;
    priority: TicketPriority;
    notes?: string;
    photoUrl?: string;
    location?: GeoPoint;
    assignedTo?: string;
  }
): Promise<string> {
  const newRef = doc(collection(db, 'tickets'));
  const now = new Date().toISOString();
  const ticketData: Ticket = {
    ...data,
    id: newRef.id,
    companyId,
    status: data.assignedTo ? 'ASIGNADO' : 'PENDIENTE',
    createdByAdmin: true,
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

// Obteniendo tickets por número de teléfono en una empresa y ordenados cronológicamente
export async function getTicketsByClientPhone(companyId: string, phone: string): Promise<Ticket[]> {
  const col = collection(db, 'tickets');
  const constraints = [
    where('companyId', '==', companyId),
    where('clientPhone', '==', phone),
    orderBy('createdAt', 'desc')
  ];
  
  const q = query(col, ...constraints);

  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Ticket);
  } catch (err) {
    console.error('Error in getTicketsByClientPhone', err);
    return [];
  }
}

// Obteniendo tickets asignados a un técnico específico (Offline tolerante)
export async function getTicketsByTechnician(technicianEmail: string): Promise<Ticket[]> {
  const q = query(
    collection(db, 'tickets'),
    where('assignedTo', '==', technicianEmail)
  );

  const filterAssigned = (tickets: Ticket[]) => tickets.filter(t => t.status === 'ASIGNADO' || t.status === 'EN_CAMINO');

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

// Técnico acepta la orden: cambia estado a EN_CAMINO
export async function acceptTicket(ticketId: string): Promise<void> {
  const ref = doc(db, 'tickets', ticketId);
  await updateDoc(ref, {
    status: 'EN_CAMINO',
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
