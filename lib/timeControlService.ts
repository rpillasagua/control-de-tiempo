import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { TimeLog } from './types';
import { logger } from './logger';

const COLLECTION_NAME = 'time_logs';

/**
 * Guarda un registro de tiempo en Firestore.
 * Si el dispositivo está offline, Firebase Firestore automáticamente
 * lo guarda en caché y lo sincronizará cuando recupere conexión.
 */
export async function saveTimeLog(
  userId: string,
  type: TimeLog['type'],
  location?: { latitude: number; longitude: number }
): Promise<string> {
  try {
    const timeLogData = {
      userId,
      type,
      timestamp: serverTimestamp(),
      localTimestamp: new Date().toISOString(),
      location: location || null,
      deviceAgent: navigator.userAgent
    };

    const docRef = await addDoc(collection(db, COLLECTION_NAME), timeLogData);
    logger.log(`✅ Registro de tiempo guardado: ${type} para usuario ${userId}`);
    return docRef.id;
  } catch (error) {
    logger.error('❌ Error guardando registro de tiempo:', error);
    throw error;
  }
}

/**
 * Obtiene el último registro de un usuario para el día actual
 * Sirve para validar que no marque "Entrada" dos veces seguidas, por ejemplo.
 */
export async function getLastUserLog(userId: string): Promise<TimeLog | null> {
  try {
    // Start of current day
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logsRef = collection(db, COLLECTION_NAME);
    const q = query(
      logsRef,
      where('userId', '==', userId),
      where('localTimestamp', '>=', startOfDay.toISOString()),
      orderBy('localTimestamp', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();
    
    return {
      id: doc.id,
      userId: data.userId,
      type: data.type,
      timestamp: data.localTimestamp,
      location: data.location
    } as TimeLog;
  } catch (error) {
    logger.error('Error fetching last user log:', error);
    return null;
  }
}
