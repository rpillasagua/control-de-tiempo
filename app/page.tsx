'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image'; // Optimización de Next.js
import { User, LogOut, Loader2 } from 'lucide-react';
import { googleAuthService, UserProfile } from '@/lib/googleAuthService';
import GoogleLoginButton from '@/components/GoogleLoginButton';
import AnalysisDashboard from '@/components/AnalysisDashboard';
import DriveDiagnostic from '@/components/DriveDiagnostic';
import { QualityAnalysis } from '@/lib/types';
import { logger } from '@/lib/logger';

interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  loading: boolean;
}

// --- Custom Hook ---
const useGoogleAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    loading: true
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        await googleAuthService.initialize();

        // La suscripción actualiza el estado automáticamente cuando el servicio cambia
        const unsubscribe = googleAuthService.subscribe((user) => {
          setAuthState({
            isAuthenticated: !!user,
            user: user,
            loading: false
          });
        });

        return unsubscribe;
      } catch (error) {
        logger.error('Error inicializando Google Auth:', error);
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    };

    // Ejecutar y limpiar
    const cleanupPromise = initAuth();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, []);

  const login = async () => {
    try {
      await googleAuthService.login();
    } catch (error) {
      logger.error('Error en login:', error);
    }
  };

  const logout = () => {
    googleAuthService.logout();
  };
  return { ...authState, login, logout };
};

// --- Components ---

const LoginPage = ({ onLoginTrigger }: { onLoginTrigger: () => void }) => {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-slate-100 to-slate-300">
      <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-2xl p-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
            <User className="h-8 w-8 text-white" />
          </div>
        </div>
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Control de Calidad</h1>
          <h2 className="text-xl font-semibold text-slate-800">Análisis en Descongelado</h2>
          <p className="text-sm text-slate-500 mt-2">Accede con tu cuenta corporativa para gestionar los análisis</p>
        </div>
        <div className="mb-8"><GoogleLoginButton onLoginSuccess={onLoginTrigger} /></div>
        <p className="text-xs text-center text-slate-400">&copy; {new Date().getFullYear()} Aquagold S.A. Todos los derechos reservados.</p>
      </div>
    </main>
  );
};

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
    <div className="relative">
      <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
      <Loader2 className="h-16 w-16 text-blue-500 animate-spin relative z-10" />
    </div>
    <p className="mt-6 text-lg font-medium text-blue-400 animate-pulse">Iniciando sistema...</p>
  </div>
);

const AppHeader = ({ user, onLogout }: { user: UserProfile; onLogout: () => void }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 transition-all" style={{ borderBottom: 'none' }}>
      <div className="max-w-5xl mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
            Análisis en <span className="text-blue-600">Descongelado</span>
          </h1>
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="focus:outline-none group transition-transform active:scale-95 flex items-center gap-2"
            >
              {user.picture ? (
                <div
                  className="relative h-12 w-12 rounded-full overflow-hidden shadow-md transition-transform duration-200 hover:scale-105"
                  style={{ borderRadius: '50%' }}
                >
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    style={{ borderRadius: '50%' }}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const parent = e.currentTarget.parentElement;
                      if (parent) {
                        parent.classList.add('fallback-avatar');
                        const fallback = parent.querySelector('.fallback-text');
                        if (fallback) fallback.classList.remove('hidden');
                      }
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-blue-600 bg-blue-100 rounded-full hidden fallback-text">
                    {user.name.charAt(0)}
                  </span>
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-md hover:scale-105 transition-transform duration-200">
                  <span className="text-lg font-bold">{user.name.charAt(0)}</span>
                </div>
              )}
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsDropdownOpen(false)}
                ></div>
                <div className="absolute right-4 mt-3 w-[160px] bg-white rounded-xl p-3 z-[100] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-2"
                  style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>

                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm font-bold text-slate-800 truncate w-full">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate w-full mt-0.5">{user.email}</p>
                  </div>

                  <hr className="border-t border-slate-100 w-full" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center gap-1.5 transition-colors duration-200"
                  >
                    <LogOut size={14} />
                    Cerrar Sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// --- Main Page ---

export default function Home() {
  const { isAuthenticated, user, loading, login, logout } = useGoogleAuth();
  const [initialAnalyses, setInitialAnalyses] = useState<QualityAnalysis[]>([]);
  const [initialLastDoc, setInitialLastDoc] = useState<any>(null);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);

  // Efecto para cargar datos SOLO cuando el usuario se autentica
  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated && user) {
      const fetchAnalyses = async () => {
        setLoadingAnalyses(true);
        try {
          const { getPaginatedAnalyses } = await import('@/lib/analysisService');
          const { analyses, lastDoc } = await getPaginatedAnalyses(30);

          if (isMounted) {
            setInitialAnalyses(analyses);
            setInitialLastDoc(lastDoc);
          }
        } catch (error) {
          logger.error('Error fetching initial analyses:', error);
        } finally {
          if (isMounted) {
            setLoadingAnalyses(false);
          }
        }
      };

      fetchAnalyses();
    }

    return () => { isMounted = false; };
  }, [isAuthenticated, user]);

  if (loading) return <LoadingScreen />;

          </div >
        ) : (
    <AnalysisDashboard initialAnalyses={initialAnalyses} initialLastDoc={initialLastDoc} />
  )
}
      </main >
    </div >
  );
}
