'use client';

import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { AnalystColor, ANALYST_COLOR_HEX } from '@/lib/types';
import { adjustColor } from '@/lib/colorUtils';

interface StickyHeaderProps {
    lote: string;
    codigo: string;
    talla: string;
    analystColor: AnalystColor;
    activeAnalysisIndex: number;
    totalAnalyses: number;
    saveState?: 'saving' | 'saved' | 'error' | null;
    lastSaved?: Date | null;
}

export default function StickyHeader({
    lote,
    codigo,
    talla,
    analystColor,
    activeAnalysisIndex,
    totalAnalyses,
    saveState = null,
    lastSaved = null
}: StickyHeaderProps) {
    const colorHex = ANALYST_COLOR_HEX[analystColor];

    const getSaveStateDisplay = () => {
        if (!saveState) return null;

        switch (saveState) {
            case 'saving':
                return (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>Guardando...</span>
                    </div>
                );
            case 'saved':
                return (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Guardado {lastSaved && formatTimeAgo(lastSaved)}</span>
                    </div>
                );
            case 'error':
                return (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle className="w-3 h-3" />
                        <span>Error al guardar</span>
                    </div>
                );
            default:
                return null;
        }
    };

    const formatTimeAgo = (date: Date): string => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        if (seconds < 10) return 'ahora';
        if (seconds < 60) return `hace ${seconds}s`;
        if (seconds < 3600) return `hace ${Math.floor(seconds / 60)}m`;
        return `hace ${Math.floor(seconds / 3600)}h`;
    };

    return (
        <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-[#efefef] shadow-sm transition-all">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left side - Save state */}
                    <div className="flex items-center gap-4">
                        {getSaveStateDisplay()}
                    </div>

                    {/* Right side - Analysis number */}
                    <div className="flex items-center gap-4">
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: colorHex }}
                        >
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span>Muestra {activeAnalysisIndex + 1}/{totalAnalyses}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
