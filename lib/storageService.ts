/**
 * Firebase Storage Service
 * Handles uploading compressed images directly to the Firebase central storage bucket.
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { logger } from './logger';

export async function uploadPhotoToStorage(
  file: File,
  path: string
): Promise<string> {
  if (!storage) {
    throw new Error('Firebase Storage no inicializado');
  }

  try {
    const storageRef = ref(storage, path);
    
    // Upload the file
    logger.log(`Subiendo foto a Storage en la ruta: ${path}...`);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000', // Browser can cache it essentially forever
    });
    
    // Get the public URL to save in Firestore
    const downloadUrl = await getDownloadURL(snapshot.ref);
    logger.log(`✅ Foto subida exitosamente: ${downloadUrl}`);
    
    return downloadUrl;
  } catch (error) {
    logger.error('❌ Error fatal subiendo foto a Firebase Storage', error);
    throw error;
  }
}
