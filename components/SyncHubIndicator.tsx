'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { getPendingPhotos } from '@/lib/idb';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function SyncHubIndicator() {
  const isOnline = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const photos = await getPendingPhotos();
        if (!cancelled) setPendingCount(photos.length);
      } catch { /* SSR or IDB unavailable */ }
    };
    check();
    // Re-check every 15s
    const t = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  if (!isOnline) {
    return (
      <div className="flex items-center gap-1 text-xs text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-1">
        <CloudOff className="w-3.5 h-3.5" />
        <span className="font-medium">Sin red</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-1 animate-pulse">
        <RefreshCw className="w-3.5 h-3.5" />
        <span className="font-medium">{pendingCount} pendiente{pendingCount > 1 ? 's' : ''}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
      <Cloud className="w-3.5 h-3.5" />
      <span className="font-medium">Sincronizado</span>
    </div>
  );
}
