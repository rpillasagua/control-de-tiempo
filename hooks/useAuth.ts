'use client';
/**
 * useAuth — Firebase Auth hook (persistent session)
 * Uses Firebase signInWithPopup + onAuthStateChanged.
 * Sessions persist for MONTHS without re-login (no more hourly expiry).
 */

import { useState, useEffect } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { db } from '@/lib/firebase';
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
    const auth = getAuth();

    // Firebase persists the session automatically
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
    const auth = getAuth();
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
    const auth = getAuth();
    await signOut(auth);
    void db; // keep db import alive
  };

  return { user, loading, login, logout };
}
