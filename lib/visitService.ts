/**
 * Visit Service — CRUD for technical field visits in Firestore
 * Offline-first: all writes are cached locally and synced when online
 */

import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs, deleteDoc,
  query, where, orderBy, serverTimestamp, Timestamp,
  limit, startAfter, DocumentSnapshot
} from 'firebase/firestore';
import { getStorage, ref, listAll, deleteObject } from 'firebase/storage';
import { db } from './firebase';
import { Visit, Activity, TimeStamp, VisitStatus } from './types';
import { logger } from './logger';

const COLLECTION = 'visits';

// ──────────────────────────────────────────────
// Helper: generate a simple unique ID
// ──────────────────────────────────────────────
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ──────────────────────────────────────────────
// Create a new visit (registers arrival)
// ──────────────────────────────────────────────
export async function createVisit(
  technicianId: string,
  technicianName: string,
  clientName: string,
  arrival: TimeStamp,
  clientId?: string,
  clientAddress?: string
): Promise<string> {
  const now = new Date().toISOString();
  const visitData = {
    technicianId,
    technicianName,
    clientId: clientId ?? null,
    clientName,
    clientAddress: clientAddress ?? null,
    arrival,
    departure: null,
    activities: [],
    summary: null,
    totalDurationMin: null,
    status: 'EN_PROGRESO' as VisitStatus,
    createdAt: now,
    updatedAt: now,
    _serverCreatedAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, COLLECTION), visitData);
  logger.log(`✅ Visita creada: ${docRef.id}`);
  return docRef.id;
}

// ──────────────────────────────────────────────
// Add an activity to an existing visit
// ──────────────────────────────────────────────
export async function addActivity(
  visitId: string,
  activityData: Omit<Activity, 'id'>
): Promise<void> {
  const ref = doc(db, COLLECTION, visitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Visita ${visitId} no existe`);

  const visit = snap.data();
  const activities: Activity[] = visit.activities ?? [];
  const newActivity: Activity = {
    ...activityData,
    id: generateId()
  };

  await updateDoc(ref, {
    activities: [...activities, newActivity],
    updatedAt: new Date().toISOString()
  });

  logger.log(`✅ Actividad agregada a visita ${visitId}`);
}

// ──────────────────────────────────────────────
// Close a visit (register departure)
// ──────────────────────────────────────────────
export async function closeVisit(
  visitId: string,
  departure: TimeStamp,
  summary?: string
): Promise<void> {
  const ref = doc(db, COLLECTION, visitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Visita ${visitId} no existe`);

  const visit = snap.data();
  const arrivalTime = new Date(visit.arrival.localTime).getTime();
  const departureTime = new Date(departure.localTime).getTime();
  const totalDurationMin = Math.round((departureTime - arrivalTime) / 60000);

  await updateDoc(ref, {
    departure,
    summary: summary ?? null,
    totalDurationMin,
    status: 'FINALIZADA' as VisitStatus,
    updatedAt: new Date().toISOString(),
    _serverUpdatedAt: serverTimestamp()
  });

  logger.log(`✅ Visita ${visitId} cerrada. Duración: ${totalDurationMin} min`);
}

// ──────────────────────────────────────────────
// Get a single visit
// ──────────────────────────────────────────────
export async function getVisit(visitId: string): Promise<Visit | null> {
  const ref = doc(db, COLLECTION, visitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Visit;
}

// ──────────────────────────────────────────────
// Get all visits for a technician (with optional date filter)
// ──────────────────────────────────────────────
export async function getVisitsByTechnician(
  technicianId: string,
  dateFrom?: string
): Promise<Visit[]> {
  const col = collection(db, COLLECTION);
  const constraints = [
    where('technicianId', '==', technicianId),
    orderBy('createdAt', 'desc')
  ];

  const q = query(col, ...constraints);
  const snap = await getDocs(q);

  const visits: Visit[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit));

  // Optional date filter (client-side after query)
  if (dateFrom) {
    return visits.filter(v => v.createdAt >= dateFrom);
  }

  return visits;
}

// ──────────────────────────────────────────────
// Get today's visits
// ──────────────────────────────────────────────
export async function getTodayVisits(technicianId: string): Promise<Visit[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return getVisitsByTechnician(technicianId, todayStart.toISOString());
}

// ──────────────────────────────────────────────
// Get active (in-progress) visit
// ──────────────────────────────────────────────
export async function getActiveVisit(technicianId: string): Promise<Visit | null> {
  const col = collection(db, COLLECTION);
  const q = query(
    col,
    where('technicianId', '==', technicianId),
    where('status', '==', 'EN_PROGRESO')
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Visit;
}

// ──────────────────────────────────────────────
// Update visit summary
// ──────────────────────────────────────────────
export async function updateVisitSummary(visitId: string, summary: string): Promise<void> {
  const ref = doc(db, COLLECTION, visitId);
  await updateDoc(ref, { summary, updatedAt: new Date().toISOString() });
}

// ──────────────────────────────────────────────
// Update an activity description
// ──────────────────────────────────────────────
export async function updateActivity(
  visitId: string,
  activityId: string,
  newDescription: string
): Promise<void> {
  const ref = doc(db, COLLECTION, visitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Visita ${visitId} no existe`);

  const activities: Activity[] = snap.data().activities ?? [];
  const updated = activities.map(a =>
    a.id === activityId ? { ...a, description: newDescription } : a
  );

  await updateDoc(ref, { activities: updated, updatedAt: new Date().toISOString() });
  logger.log(`✅ Actividad ${activityId} actualizada`);
}

// ──────────────────────────────────────────────
// Delete an activity from a visit
// ──────────────────────────────────────────────
export async function deleteActivity(
  visitId: string,
  activityId: string
): Promise<void> {
  const ref = doc(db, COLLECTION, visitId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error(`Visita ${visitId} no existe`);

  const activities: Activity[] = snap.data().activities ?? [];
  const filtered = activities.filter(a => a.id !== activityId);

  await updateDoc(ref, { activities: filtered, updatedAt: new Date().toISOString() });
  logger.log(`✅ Actividad ${activityId} eliminada de visita ${visitId}`);
}

// ──────────────────────────────────────────────
// Paginated visit query (cursor-based)
// ──────────────────────────────────────────────

export async function getPaginatedVisits(
  technicianId: string,
  pageSize: number,
  lastDoc?: DocumentSnapshot
): Promise<{ visits: Visit[]; lastDoc: DocumentSnapshot | null }> {
  const col = collection(db, COLLECTION);
  const constraints = [
    where('technicianId', '==', technicianId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
    ...(lastDoc ? [startAfter(lastDoc)] : [])
  ];

  const q = query(col, ...constraints);
  const snap = await getDocs(q);
  const visits = snap.docs.map(d => ({ id: d.id, ...d.data() } as Visit));
  const newLastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
  return { visits, lastDoc: newLastDoc };
}

// ──────────────────────────────────────────────
// Delete the entire visit
// ──────────────────────────────────────────────
export async function deleteVisit(visitId: string): Promise<void> {
  // 1. Limpiar fotos huérfanas de Firebase Storage en cascada
  try {
    const storage = getStorage();
    const folderRef = ref(storage, `visits/${visitId}`);
    const { items } = await listAll(folderRef);
    if (items.length > 0) {
      await Promise.all(items.map(m => deleteObject(m)));
      logger.log(`🧹 Carpeta de storage (visits/${visitId}) purgada, se borraron ${items.length} fotos`);
    }
  } catch (error: any) {
    if (error.code !== 'storage/object-not-found') {
      logger.error(`Error barriendo carpeta Storage de la visita ${visitId}`, error);
    }
  }

  // 2. Borrar documento maestro en base de datos Firestore
  const refDoc = doc(db, COLLECTION, visitId);
  await deleteDoc(refDoc);
  logger.log(`🗑️ Visita ${visitId} eliminada`);
}

void Timestamp; // keep import alive for future use
