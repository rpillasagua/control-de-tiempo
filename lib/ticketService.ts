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
    clientId?: string;
    clientRuc?: string;
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

  // If new client was created, auto-save them to the clients collection
  if (data.clientId === 'NEW' || !data.clientId) {
    if (data.clientPhone || data.clientRuc) {
      try {
        const clientRef = doc(collection(db, 'clients'));
        await setDoc(clientRef, {
          id: clientRef.id,
          name: data.clientName,
          phone: data.clientPhone,
          ruc: data.clientRuc || null,
          address: data.clientAddress || '',
          companyId,
          createdBy: 'ADMIN',
          createdAt: now,
        });
        // Update ticket with the real clientId
        await updateDoc(newRef, { clientId: clientRef.id });
      } catch (e) { console.warn('Error auto-saving client', e); }
    }
  } else {
    // Existing client — update ruc if provided
    if (data.clientRuc) {
      try {
        await updateDoc(doc(db, 'clients', data.clientId), { ruc: data.clientRuc });
      } catch {}
    }
  }

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

// Obteniendo tickets por número de teléfono o RUC en una empresa
export async function getTicketsByClientPhone(companyId: string, query_value: string): Promise<Ticket[]> {
  const col = collection(db, 'tickets');
  
  // Try searching by phone first
  const byPhone = query(col,
    where('companyId', '==', companyId),
    where('clientPhone', '==', query_value),
    orderBy('createdAt', 'desc')
  );
  
  // Also try searching by RUC
  const byRuc = query(col,
    where('companyId', '==', companyId),
    where('clientRuc', '==', query_value),
    orderBy('createdAt', 'desc')
  );

  try {
    const [phoneSnap, rucSnap] = await Promise.all([getDocs(byPhone), getDocs(byRuc)]);
    const seenIds = new Set<string>();
    const results: Ticket[] = [];
    for (const snap of [phoneSnap, rucSnap]) {
      for (const d of snap.docs) {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push({ ...(d.data() as Ticket), id: d.id });
        }
      }
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const filterAssigned = (tickets: Ticket[]) => tickets.filter(t => t.status === 'ASIGNADO' || t.status === 'EN_CAMINO' || t.status === 'EN_PROGRESO');

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
