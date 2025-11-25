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
                            relative flex items-center justify-center min-w-14 h-14 rounded-2xl
                            transition-all duration-300 font-black text-lg
                            ${isActive
                                ? 'text-white shadow-2xl scale-105 ring-4 ring-offset-4 ring-offset-slate-900'
                                : 'bg-slate-800/90 text-slate-400 hover:bg-slate-700 hover:text-white hover:scale-105 border-2 border-slate-700'
                            }
                        `}
                        style={{
                            backgroundColor: isActive ? colorHex : undefined,
                            boxShadow: isActive
                                ? `0 10px 40px -10px ${colorHex}80, 0 0 30px ${colorHex}40`
                                : undefined,
                            background: isActive
                                ? `linear-gradient(135deg, ${colorHex} 0%, ${colorHex}dd 100%)`
                                : undefined
                        }}
                    >
                        <span className={isActive ? 'drop-shadow-lg' : ''}>{index + 1}</span>
                        {isActive && (
                            <div className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-lg">
                                <CheckCircle2 size={14} className="text-green-600" />
                            </div>
                        )}
                    </button>
                );
            })}

            <button
                type="button"
                onClick={onAddAnalysis}
                className="flex items-center justify-center min-w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 text-slate-300 hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all duration-300 border-2 border-slate-600 hover:border-transparent hover:scale-105 hover:shadow-xl"
                title="Agregar nuevo análisis"
            >
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>
    );
}
