import { collection, doc, getDoc, getDocs, setDoc, query, where, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Company } from './types';

// Obtiene la compañía administrada por un usuario
export async function getCompanyByAdmin(adminEmail: string): Promise<Company | null> {
  const q = query(collection(db, 'companies'), where('adminEmail', '==', adminEmail));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Company;
}

// Obtiene la compañía a la que pertenece un técnico
export async function getCompanyByTechnician(technicianEmail: string): Promise<Company | null> {
  const q = query(collection(db, 'companies'), where('technicianEmails', 'array-contains', technicianEmail));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as Company;
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
