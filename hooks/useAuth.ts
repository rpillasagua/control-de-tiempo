'use client';
/**
 * useAuth — Firebase Auth hook (persistent session)
 * Uses Firebase signInWithPopup + onAuthStateChanged.
 * Sessions persist for MONTHS without re-login.
 *
 * IMPORTANTE: Importamos `auth` desde firebase.ts para garantizar que 
 * usamos SIEMPRE la misma instancia de Firebase App. Si llamamos a
 * `getAuth()` sin la app, Next.js puede crear una segunda instancia vacía,
 * y las reglas de Firestore rechazarán todas las escrituras.
 */

import { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  picture: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Usar la instancia centralizada de auth desde firebase.ts
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          name: firebaseUser.displayName ?? '',
          picture: firebaseUser.photoURL ?? ''
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

    try {
      const result = await signInWithPopup(auth, provider);
      logger.log('✅ Login Firebase exitoso:', result.user.displayName);
    } catch (error) {
      logger.error('❌ Error en login:', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, loading, login, logout };
}
