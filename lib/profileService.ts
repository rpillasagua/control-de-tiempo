/**
 * Profile Service — Technician Profile CRUD
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
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
