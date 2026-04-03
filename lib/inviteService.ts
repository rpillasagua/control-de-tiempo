import {
  doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, getDocsFromCache
} from 'firebase/firestore';
import { db } from './firebase';
import { Invite } from './types';
import { updateTechnicians, getCompanyById } from './companyService';

// ── Generate a random uppercase 6-char code ──────────────────────────────────
function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0, I/1 (confusing)
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

// ── Create invite ─────────────────────────────────────────────────────────────
export async function createInvite(
  companyId: string,
  companyName: string,
  adminEmail: string
): Promise<Invite> {
  const code = randomCode();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(); // +48h
  const invite: Invite = {
    code,
    companyId,
    companyName,
    createdBy: adminEmail,
    role: 'TECHNICIAN',
    expiresAt,
  };
  await setDoc(doc(db, 'invites', code), invite);
  return invite;
}

// ── Validate invite ───────────────────────────────────────────────────────────
export async function validateInvite(code: string): Promise<Invite | null> {
  const ref = doc(db, 'invites', code.toUpperCase().trim());
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const invite = snap.data() as Invite;

  // Expired?
  if (new Date(invite.expiresAt) < new Date()) return null;

  return invite;
}

// ── Accept invite: adds technician to company ─────────────────────────────────
export async function acceptInvite(code: string, techEmail: string): Promise<{
  success: boolean;
  message: string;
  companyId?: string;
  companyName?: string;
}> {
  const invite = await validateInvite(code);
  if (!invite) {
    return { success: false, message: 'Código inválido o ya ha expirado.' };
  }

  // Load the company to get current members
  const company = await getCompanyById(invite.companyId);
  if (!company) {
    return { success: false, message: 'La empresa ya no existe.' };
  }

  // Already a member?
  if (company.technicianEmails.includes(techEmail)) {
    return { success: false, message: 'Ya eres miembro de esta empresa.' };
  }

  // Add technician
  const updatedEmails = [...company.technicianEmails, techEmail];
  await updateTechnicians(invite.companyId, updatedEmails);

  // Mark invite as used
  await updateDoc(doc(db, 'invites', code.toUpperCase().trim()), {
    usedAt: new Date().toISOString(),
    usedBy: techEmail,
  });

  return {
    success: true,
    message: `Bienvenido a ${company.name}`,
    companyId: invite.companyId,
    companyName: company.name,
  };
}

// ── Get active invites for a company (Offline tolerante) ───────────────────
export async function getCompanyInvites(companyId: string): Promise<Invite[]> {
  const q = query(
    collection(db, 'invites'),
    where('companyId', '==', companyId)
  );
  
  const filterActive = (invites: Invite[]) => {
    const now = new Date();
    return invites
      .filter(i => !i.usedAt && new Date(i.expiresAt) > now)
      .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());
  };

  try {
    const cacheSnap = await getDocsFromCache(q);
    if (!cacheSnap.empty) {
      getDocs(q).catch(() => {});
      return filterActive(cacheSnap.docs.map(doc => doc.data() as Invite));
    }
  } catch { /* cache miss */ }

  try {
    const snap = await getDocs(q);
    return filterActive(snap.docs.map(d => d.data() as Invite));
  } catch (err) {
    return [];
  }
}
