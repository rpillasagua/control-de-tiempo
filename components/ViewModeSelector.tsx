'use client';

import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export type ViewMode = 'SUELTA' | 'COMPACTA';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}

/**
 * Componente para seleccionar el modo de vista - MODERNIZADO
 */
export default function ViewModeSelector({ viewMode, onModeChange }: ViewModeSelectorProps) {
  return (
    <div
      className="flex p-1 rounded-[14px] border-2"
      style={{
        background: 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)',
        borderColor: '#CBD5E1'
      }}
    >
      <button
        type="button"
        onClick={() => onModeChange('SUELTA')}
        className={`px-4 py-2.5 rounded-[10px] transition-all duration-300 flex items-center gap-2 font-[600] text-sm ${viewMode === 'SUELTA'
          ? 'text-white shadow-lg scale-105'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        style={
          viewMode === 'SUELTA'
            ? {
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              boxShadow: '0 6px 12px -3px rgba(59, 130, 246, 0.4)'
            }
            : undefined
        }
        title="Vista Detallada"
      >
        <Maximize2 size={18} />
        <span className="hidden sm:inline">Detallada</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('COMPACTA')}
        className={`px-4 py-2.5 rounded-[10px] transition-all duration-300 flex items-center gap-2 font-[600] text-sm ${viewMode === 'COMPACTA'
          ? 'text-white shadow-lg scale-105'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        style={
          viewMode === 'COMPACTA'
            ? {
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 6px 12px -3px rgba(99, 102, 241, 0.4)'
            }
            : undefined
        }
        title="Vista Compacta"
      >
        <Minimize2 size={18} />
        <span className="hidden sm:inline">Compacta</span>
      </button>
    </div>
  );
}

/**
 * Hook para manejar la persistencia del modo de vista
 */
export function useViewMode() {
  const [viewMode, setViewMode] = useState<ViewMode>('COMPACTA');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Cargar modo guardado
    const saved = localStorage.getItem('viewMode_v2');
    if (saved === 'SUELTA' || saved === 'COMPACTA') {
      setViewMode(saved);
    }
    setIsLoaded(true);
  }, []);

  const updateViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode_v2', mode);
  };

  return { viewMode, setViewMode: updateViewMode, isLoaded };
}
