/**
 * firebase.ts — Inicialización segura de Firebase para Next.js (SSR + Cliente)
 *
 * REGLA DE ORO: Firebase SDK está diseñado para correr en el navegador.
 * NO lo envolcemos en `typeof window !== 'undefined'` porque eso deja
 * `db` como `null` durante la hidratación de React en Vercel/producción,
 * y todos los servicios de escritura fallan silenciosamente.
 *
 * En cambio, usamos `getApps().length === 0` para detectar si ya existe
 * una instancia (protección de re-inicialización tipo singleton) y
 * manejamos el error gracefully en el servidor.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { logger } from './logger';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// ── Singleton: inicializar solo una vez ────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Exportaciones core ────────────────────────────────────────────────────
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ── Persistencia offline (solo en el navegador) ───────────────────────────
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err: any) => {
    if (err.code === 'failed-precondition') {
      logger.log('⚠️ Persistencia Firestore: múltiples pestañas abiertas');
    } else if (err.code === 'unimplemented') {
      logger.log('⚠️ Persistencia Firestore: navegador no compatible');
    }
  });

  // Suprimir logs de conexión offline de Firebase
  const _cw = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = args.join(' ');
    if (msg.includes('Could not reach Cloud Firestore') || msg.includes('offline')) return;
    _cw(...args);
  };
}