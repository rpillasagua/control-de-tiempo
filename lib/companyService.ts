import { collection, doc, getDoc, getDocs, setDoc, query, where, updateDoc, getDocsFromCache } from 'firebase/firestore';
import { db } from './firebase';
import { Company } from './types';

// Obtiene las compañías administradas por un usuario (Offline tolerante)
export async function getCompaniesByAdmin(adminEmail: string): Promise<Company[]> {
  const q = query(collection(db, 'companies'), where('adminEmail', '==', adminEmail));
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      getDocs(q).catch(() => {});
      return cacheSnap.docs.map(doc => doc.data() as Company);
    }
  } catch { /* cache miss */ }
  
  try {
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as Company);
  } catch (err: any) {
    if (err?.code !== 'failed-precondition') console.error(err);
    return []; // Return empty gracefully if offline and no cache
  }
}

// Obtiene la compañía a la que pertenece un técnico (Offline tolerante)
export async function getCompanyByTechnician(technicianEmail: string): Promise<Company | null> {
  const q = query(collection(db, 'companies'), where('technicianEmails', 'array-contains', technicianEmail));
  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      getDocs(q).catch(() => {});
      return cacheSnap.docs[0].data() as Company;
    }
  } catch { /* cache miss */ }

  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Company;
  } catch (err: any) {
    if (err?.code !== 'failed-precondition') console.error(err);
    return null;
  }
}

// Determina el rol del usuario: ¿es admin, técnico, o nuevo?
export async function getUserCompany(email: string): Promise<{
  company: Company | null;
  role: 'admin' | 'technician' | 'none';
}> {
  // Check admin first
  const adminList = await getCompaniesByAdmin(email);
  if (adminList.length > 0) {
    return { company: adminList[0], role: 'admin' };
  }
  // Check technician
  const techCompany = await getCompanyByTechnician(email);
  if (techCompany) {
    return { company: techCompany, role: 'technician' };
  }
  return { company: null, role: 'none' };
}


// Obtiene una compañía por su ID (útil para la carga del portal público)
export async function getCompanyById(companyId: string): Promise<Company | null> {
  const ref = doc(db, 'companies', companyId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as Company;
}

// Crea una nueva compañía para el administrador
export async function createCompany(company: Company): Promise<void> {
  const ref = doc(db, 'companies', company.id);
  await setDoc(ref, company);
}

// Actualiza los técnicos de una compañía
export async function updateTechnicians(companyId: string, technicianEmails: string[]): Promise<void> {
  const ref = doc(db, 'companies', companyId);
  await updateDoc(ref, { technicianEmails, updatedAt: new Date().toISOString() });
}

// Transfiere la propiedad de la empresa a otro admin
export async function transferCompanyOwnership(companyId: string, newAdminEmail: string): Promise<void> {
  const ref = doc(db, 'companies', companyId);
  await updateDoc(ref, { adminEmail: newAdminEmail, updatedAt: new Date().toISOString() });
}

// Actualiza los datos base de la empresa (ruc, phone, name)
export async function updateCompanyProfile(companyId: string, data: Partial<Company>): Promise<void> {
  const ref = doc(db, 'companies', companyId);
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
}

// Sube el logo corporativo maestro
export async function uploadCompanyLogo(companyId: string, base64Image: string): Promise<string> {
  const { ref: storageRef, uploadString, getDownloadURL, getStorage } = await import('firebase/storage');
  const filePath = `companies/${companyId}_logo.webp`;
  const storage = getStorage();
  const fileRef = storageRef(storage, filePath);
  
  await uploadString(fileRef, base64Image, 'data_url');
  const downloadUrl = await getDownloadURL(fileRef);
  
  await updateCompanyProfile(companyId, { logoUrl: downloadUrl });
  
  return downloadUrl;
}
