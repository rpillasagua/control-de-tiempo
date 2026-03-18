'use client';

import { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { getPendingPhotos, deletePendingPhoto } from '@/lib/idb';
import { uploadPhotoToStorage } from '@/lib/storageService';
import { dataUrlToFile } from '@/lib/utils';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function OfflinePhotoSync() {
  const isOnline = useNetworkStatus();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isOnline || syncing) return;

    const syncPhotos = async () => {
      setSyncing(true);
      try {
        const pending = await getPendingPhotos();
        if (pending.length === 0) return; // No pending photos

        toast.info(`Sincronizando ${pending.length} fotos pendientes que tomaste sin conexión...`, { duration: 5000 });
        let successCount = 0;

        for (const photo of pending) {
          try {
            // 1. Check if the matching Firestore document still exists FIRST
            // (If the user deleted the visit while offline, we shouldn't upload orphaned photos)
            const visitRef = doc(db, 'visits', photo.visitId);
            const visitSnap = await getDoc(visitRef);
            
            if (!visitSnap.exists()) {
              logger.log(`Visita padre ${photo.visitId} ya no existe. Descartando foto en IDB ${photo.id}`);
              await deletePendingPhoto(photo.id);
              continue; // Skip uploading to Storage
            }

            // 2. Convert Base64 back to a File
            const file = dataUrlToFile(photo.dataUrl, `${photo.id}.jpg`);
            const path = `visits/${photo.visitId}/${photo.id}.jpg`;
            
            // 3. Upload to Firebase Storage
            const realUrl = await uploadPhotoToStorage(file, path);

            // 4. Update the matching Firestore document
            const data = visitSnap.data();
            let updated = false;

            // Check if it's the arrival photo
              if (data.arrival?.photoUrl === photo.id) {
                data.arrival.photoUrl = realUrl;
                updated = true;
              }

              // Check inside all activities for the placeholder URL
              if (Array.isArray(data.activities)) {
                data.activities = data.activities.map((act: any) => {
                  if (Array.isArray(act.photoUrls) && act.photoUrls.includes(photo.id)) {
                    updated = true;
                    return {
                      ...act,
                      photoUrls: act.photoUrls.map((url: string) => url === photo.id ? realUrl : url)
                    };
                  }
                  return act;
                });
              }

            if (updated) {
              await updateDoc(visitRef, {
                arrival: data.arrival,
                activities: data.activities,
                updatedAt: new Date().toISOString()
              });
            }
            
            // 5. Remove from IndexedDB Queue
            await deletePendingPhoto(photo.id);
            successCount++;
          } catch (e) {
            logger.error(`Error sincronizando foto ${photo.id}`, e);
          }
        }
        
        if (successCount > 0) {
          toast.success(`✅ ${successCount} fotos offline sincronizadas con el servidor.`);
        }
      } catch (err) {
        logger.error('Error general sincronizando fotos', err);
      } finally {
        setSyncing(false);
      }
    };

    // Delay the sync slightly to not block the main JS thread right after going online
    const timer = setTimeout(() => {
      syncPhotos();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isOnline, syncing]);

  // This is a headless component (no UI)
  return null;
}
