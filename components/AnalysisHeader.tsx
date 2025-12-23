import React from 'react';
import { ArrowLeft, FileText, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { AnalystColor, ProductType, ANALYST_COLOR_HEX } from '@/lib/types';
import { DOUBLE_ANALYSIS_CODES } from '@/lib/product-data';

interface AnalysisHeaderProps {
    productType: ProductType | null;
    isRemuestreo: boolean;
    codigo: string;
    analystColor: AnalystColor | null;
    activeAnalysisIndex: number;
    totalAnalyses: number;
    onBack: () => void;
    onOpenSpecs: () => void;
}

export const AnalysisHeader: React.FC<AnalysisHeaderProps> = ({
    productType,
    isRemuestreo,
    codigo,
    analystColor,
    activeAnalysisIndex,
    totalAnalyses,
    onBack,
    onOpenSpecs
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 hover:scale-110 border-2 border-slate-200 hover:border-slate-300"
                        style={{
                            borderRadius: '14px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                        }}
                        title="Volver"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="h-5 w-px bg-slate-800"></div>
                    <h1 className="text-sm font-semibold text-slate-100">
                        {isRemuestreo ? (
                            <span className="text-lg font-bold text-yellow-300">REMUESTREO</span>
                        ) : productType === 'CONTROL_PESOS' ? (
                            <span className="text-lg font-bold">CONTROL DE PESOS</span>
                        ) : (
                            <>
                                Análisis de Calidad {' '}
                                <span className="text-slate-300">
                                    {productType === 'ENTERO' ? 'Entero' : productType === 'COLA' ? 'Cola' : 'Valor Agregado'}
                                </span>
                            </>
                        )}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onOpenSpecs}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-200 hover:text-indigo-100 rounded-lg border border-indigo-500/30 transition-all"
                        title="Ver Ficha Técnica"
                    >
                        <FileText size={18} />
                        <span className="hidden sm:inline font-medium">Ficha</span>
                    </button>
                    <div
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                        style={{ backgroundColor: analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9' }}
                    >
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span>Muestra {activeAnalysisIndex + 1}/{totalAnalyses}</span>
                    </div>

                    <div
                        className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                        style={{ backgroundColor: analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9' }}
                        title={`Color del analista: ${analystColor}`}
                    />
                </div>
            </div>

            {/* Alerta de Doble Análisis - Solo para códigos específicos */}
            {codigo && DOUBLE_ANALYSIS_CODES.includes(codigo) && (
                <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg animate-pulse mb-6">
                    <span className="text-xl">⚠️</span>
                    <div className="flex flex-col">
                        <span className="font-bold text-amber-600 text-sm">DOBLE ANÁLISIS REQUERIDO</span>
                        <span className="text-amber-600/90 text-xs">
                            Verificar fotos y datos con ficha técnica y fotos de cliente.
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
