'use client';

import React from 'react';
import { AnalystColor, ANALYST_COLOR_HEX } from '@/lib/types';
import { Plus, CheckCircle2 } from 'lucide-react';

interface AnalysisTabsProps {
    analysesCount: number;
    activeTab: number;
    onTabChange: (index: number) => void;
    onAddAnalysis: () => void;
    analystColor: AnalystColor;
}

export default function AnalysisTabs({
    analysesCount,
    activeTab,
    onTabChange,
    onAddAnalysis,
    analystColor
}: AnalysisTabsProps) {
    const colorHex = analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9';

    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-3">
            {Array.from({ length: analysesCount }, (_, index) => {
                const isActive = activeTab === index;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onTabChange(index)}
                        className={`
                            relative flex items-center justify-center px-6 py-4
                            transition-all duration-300 font-bold text-base
                            ${isActive
                                ? 'text-white shadow-lg scale-105'
                                : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:scale-105 border-2 border-slate-200'
                            }
                        `}
                        style={{
                            borderRadius: '14px',
                            backgroundColor: isActive ? colorHex : undefined,
                            boxShadow: isActive
                                ? '0 8px 24px rgba(0, 0, 0, 0.15)'
                                : undefined,
                            background: isActive
                                ? `linear-gradient(135deg, ${colorHex} 0%, ${colorHex}dd 100%)`
                                : undefined
                        }}
                    >
                        <span>Análisis {index + 1}</span>
                    </button>
                );
            })}

            <button
                type="button"
                onClick={onAddAnalysis}
                className="flex items-center justify-center min-w-14 h-14 bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all duration-300 border-2 border-slate-200 hover:border-transparent hover:scale-105 hover:shadow-lg"
                style={{ borderRadius: '14px' }}
                title="Agregar nuevo análisis"
            >
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>
    );
}
