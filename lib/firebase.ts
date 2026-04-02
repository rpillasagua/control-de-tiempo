/**
 * firebase.ts — Inicialización segura de Firebase para Next.js (SSR + Cliente)
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore, initializeFirestore,
  persistentLocalCache, persistentMultipleTabManager
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

// ── Singleton app ─────────────────────────────────────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Firestore con persistencia offline multi-tab (nueva API 2024) ─────────
// initializeFirestore solo se puede llamar UNA vez antes de getFirestore.
// En SSR (servidor de Next.js) no existe IndexedDB, usamos getFirestore simple.
export const db = (() => {
  if (typeof window !== 'undefined') {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      // Ya inicializado (hot-reload en dev): usar la instancia existente
      return getFirestore(app);
    }
  }
  return getFirestore(app);
})();

export const auth = getAuth(app);

// ── Suprimir logs de desconexión de Firebase (ruido innecesario en offline) ─
if (typeof window !== 'undefined') {
  const _cw = console.warn.bind(console);
  console.warn = (...args: any[]) => {
    const msg = args.join(' ');
    if (
      msg.includes('Could not reach Cloud Firestore') ||
      msg.includes('@firebase/firestore') ||
      msg.includes('WebChannel')
    ) return;
    _cw(...args);
  };
}