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
    productType?: string;
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
    productType,
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

    // Obtener nombre del tipo de producto
    const getProductTypeName = () => {
        if (!productType) return '';
        switch (productType) {
            case 'ENTERO': return 'Entero';
            case 'COLA': return 'Cola';
            case 'VALOR_AGREGADO': return 'Valor Agregado';
            case 'CONTROL_PESOS': return 'Control de Pesos';
            default: return '';
        }
    };

    return (
        <div className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-[#efefef] shadow-sm transition-all">
            <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Left side - Empty for balance */}
                    <div className="flex-1"></div>

                    {/* Center - Analysis type and sample number */}
                    <div className="flex items-center gap-3">
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: colorHex }}
                        >
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                            <span>Muestra {activeAnalysisIndex + 1}/{totalAnalyses}</span>
                        </div>
                        {productType && productType !== 'CONTROL_PESOS' && (
                            <span className="text-xs font-semibold text-slate-600">
                                Análisis de Calidad - {getProductTypeName()}
                            </span>
                        )}
                        {productType === 'CONTROL_PESOS' && (
                            <span className="text-xs font-bold text-slate-700">
                                CONTROL DE PESOS
                            </span>
                        )}
                    </div>

                    {/* Right side - Save state (only when actively saving or just saved) */}
                    <div className="flex-1 flex justify-end">
                        {getSaveStateDisplay()}
                    </div>
                </div>
            </div>
        </div>
    );
}
