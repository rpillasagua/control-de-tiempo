export const DB_NAME = 'bitacora-offline-photos';
export const STORE_NAME = 'photos';

export interface PendingPhoto {
  id: string; // e.g., "pending_arrival_123"
  dataUrl: string; // Base64
  visitId: string;
  type: 'arrival' | 'activity';
}

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Return mock for SSR
    if (typeof window === 'undefined') {
      return reject(new Error('No IndexedDB in SSR'));
    }
    
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePendingPhoto(photo: PendingPhoto): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(photo);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingPhoto(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
