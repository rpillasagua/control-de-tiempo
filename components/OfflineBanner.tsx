'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();
  // Show banner with a tiny delay so it doesn't flash on load
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
    } else {
      // Brief "back online" flash, then hide
      const t = setTimeout(() => setShow(false), 2500);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-center transition-colors duration-500 ${
        isOnline
          ? 'bg-emerald-500 text-white'
          : 'bg-slate-800 text-white'
      }`}
    >
      {isOnline ? (
        <>✅ Conexión restaurada — sincronizando datos...</>
      ) : (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          Sin conexión — puedes seguir trabajando, los cambios se sincronizarán al volver online
        </>
      )}
    </div>
  );
}
