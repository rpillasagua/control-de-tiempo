'use client';

import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Escuchar el evento de PWA Install Prompt
    const handler = (e: Event) => {
      // Prevenir el trigger por defecto del navegador (para mostrar el banner custom)
      e.preventDefault();
      // Guardar el evento para dispararlo más tarde
      setDeferredPrompt(e);
      // Mostrar nuestro banner si el usuario no lo ha descartado
      if (!localStorage.getItem('pwa_prompt_dismissed')) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si la app ya está instalada o estamos en standalone, no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Ocultar banner
    setIsVisible(false);
    
    // Mostrar el prompt nativo
    deferredPrompt.prompt();
    
    // Esperar a que el usuario responda al prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    // Limpiar el guardado actual del evento ya que no se puede usar dos veces
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between gap-3 shadow-md z-40 relative">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{t.installApp}</p>
        <p className="text-xs text-blue-100 line-clamp-2 leading-tight mt-0.5">{t.installPrompt}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button 
          onClick={handleDismiss}
          className="text-xs font-medium text-blue-200 hover:text-white px-2 py-1"
        >
          {t.notNow}
        </button>
        <button 
          onClick={handleInstallClick}
          className="bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors flex items-center gap-1 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" /> {t.installApp}
        </button>
      </div>
    </div>
  );
}
