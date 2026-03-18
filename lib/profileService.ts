/**
 * Profile Service — Technician Profile CRUD
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, getStorage } from 'firebase/storage';
import { db } from './firebase';
import { logger } from './logger';

export interface Profile {
  email: string;
  name: string;
  companyName?: string;
  ruc?: string;
  phone?: string;
  logoUrl?: string;
}

const COLLECTION = 'profiles';

export async function getProfile(email: string): Promise<Profile | null> {
  const d = await getDoc(doc(db, COLLECTION, email));
  if (!d.exists()) return null;
  return d.data() as Profile;
}

export async function saveProfile(email: string, data: Partial<Profile>): Promise<void> {
  await setDoc(doc(db, COLLECTION, email), {
    ...data,
    email,
    updatedAt: serverTimestamp()
  }, { merge: true });
  logger.log(`✅ Perfil actualizado: ${email}`);
}

export async function uploadLogo(email: string, base64Image: string): Promise<string> {
  const filePath = `profiles/${email.replace(/[^a-zA-Z0-9]/g, '_')}_logo.webp`;
  const storage = getStorage();
  const storageRef = ref(storage, filePath);
  
  // Sube el string base64 que produce el compresor de imágenes
  await uploadString(storageRef, base64Image, 'data_url');
  const downloadUrl = await getDownloadURL(storageRef);
  
  // Actualiza el perfil para enganchar el nuevo logo
  await saveProfile(email, { logoUrl: downloadUrl });
  
  return downloadUrl;
}
