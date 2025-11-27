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
        logger.log('🚀 Iniciando inicialización de Auth en page.tsx');
        await googleAuthService.initialize();
        logger.log('✅ Inicialización completada en page.tsx');

        // La suscripción actualiza el estado automáticamente cuando el servicio cambia
        const unsubscribe = googleAuthService.subscribe((user) => {
          logger.log('📥 Recibida actualización de usuario en page.tsx:', user ? user.name : 'null');
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
                  className="relative h-12 w-12 overflow-hidden shadow-md transition-all duration-200 hover:scale-105"
                  style={{ borderRadius: '14px' }}
                >
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-full w-full object-cover"
                    style={{ borderRadius: '14px' }}
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
                  <span
                    className="absolute inset-0 flex items-center justify-center text-lg font-bold text-blue-600 bg-blue-100 hidden fallback-text"
                    style={{ borderRadius: '14px' }}
                  >
                    {user.name.charAt(0)}
                  </span>
                </div>
              ) : (
                <div
                  className="w-12 h-12 bg-blue-100 flex items-center justify-center text-blue-600 shadow-md hover:scale-105 transition-transform duration-200"
                  style={{ borderRadius: '14px' }}
                >
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
                <div
                  className="absolute right-0 mt-3 w-[200px] bg-white p-[16px] z-[100] animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-[12px]"
                  style={{
                    borderRadius: '14px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                    transform: 'translateX(-40%)'
                  }}
                >
                  <div className="flex flex-col items-center text-center">
                    <p className="text-[14px] font-[700] text-[#111827] truncate w-full">{user.name}</p>
                    <p className="text-[12px] text-[#6B7280] truncate w-full mt-[2px]">{user.email}</p>
                  </div>

                  <hr className="border-t border-[#E5E7EB] w-full m-0" />

                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-[13px] font-[600] rounded-[12px] flex items-center justify-center gap-[6px] transition-all"
                    style={{
                      padding: '10px 12px',
                      backgroundColor: '#FEF2F2',
                      color: '#EF4444',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEE2E2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FEF2F2';
                    }}
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
      let unsubscribe: (() => void) | undefined;

      const setupSubscription = async () => {
        setLoadingAnalyses(true);
        try {
          const { subscribeToRecentAnalyses } = await import('@/lib/analysisService');

          unsubscribe = subscribeToRecentAnalyses((analyses, lastDoc) => {
            if (isMounted) {
              setInitialAnalyses(analyses);
              setInitialLastDoc(lastDoc);
              setLoadingAnalyses(false);
            }
          });
        } catch (error) {
          logger.error('Error setting up analysis subscription:', error);
          if (isMounted) setLoadingAnalyses(false);
        }
      };

      setupSubscription();

      return () => {
        isMounted = false;
        if (unsubscribe) unsubscribe();
      };
    }

    return () => { isMounted = false; };
  }, [isAuthenticated, user]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <LoginPage onLoginTrigger={login} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <AppHeader user={user} onLogout={logout} />

      <main className="animate-fade-in mt-6">
        {loadingAnalyses ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
            <p className="text-slate-400 text-sm font-medium">Obteniendo registros recientes...</p>
          </div>
        ) : (
          <AnalysisDashboard initialAnalyses={initialAnalyses} initialLastDoc={initialLastDoc} />
        )}
      </main>
    </div>
  );
}
