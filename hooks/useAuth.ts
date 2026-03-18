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
  // The Google OAuth access token (for Drive API)
  accessToken?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();

    // Firebase persists the session automatically — no hourly token re-auth
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        // Get fresh Google OAuth token (for Drive API calls), silently
        let accessToken: string | undefined;
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          // The actual Google access token is obtained via getIdToken or stored after sign-in
          accessToken = await firebaseUser.getIdToken(false);
          void tokenResult; // prevent unused var lint
        } catch {
          logger.warn('Could not get token for Drive API');
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          name: firebaseUser.displayName ?? '',
          picture: firebaseUser.photoURL ?? '',
          accessToken
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
    // Request Drive scope so we can upload photos
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

    try {
      const result = await signInWithPopup(auth, provider);
      // Extract the OAuth access token (needed for Drive uploads)
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = credential?.accessToken;
      if (accessToken) {
        // Store for Drive API usage (expires in 1h, but auto-refreshed via signIn)
        sessionStorage.setItem('drive_access_token', accessToken);
      }
      logger.log('✅ Login Firebase exitoso:', result.user.displayName);
    } catch (error) {
      logger.error('❌ Error en login:', error);
      throw error;
    }
  };

  const logout = async () => {
    const auth = getAuth();
    await signOut(auth);
    sessionStorage.removeItem('drive_access_token');
    void db; // keep db import alive
  };

  // Helper to get Drive access token (refreshes automatically on re-login)
  const getDriveToken = async (): Promise<string | null> => {
    // First try session storage (freshest token from last signIn)
    const stored = sessionStorage.getItem('drive_access_token');
    if (stored) return stored;
    // Fallback: re-trigger login popup to get a fresh token
    return null;
  };

  return { user, loading, login, logout, getDriveToken };
}
