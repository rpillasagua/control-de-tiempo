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
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b-2 border-gray-700">
            {Array.from({ length: analysesCount }, (_, index) => {
                const isActive = activeTab === index;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onTabChange(index)}
                        className={`
                            relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                            ${isActive
                                ? 'text-white shadow-lg scale-110 ring-2 ring-offset-2 ring-offset-[#0f172a]'
                                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                            }
                        `}
                        style={{
                            backgroundColor: isActive ? colorHex : undefined,
                            borderColor: isActive ? colorHex : undefined,
                            boxShadow: isActive ? `0 0 15px ${colorHex}60` : undefined
                        }}
                    >
                        <span className="font-bold text-sm">{index + 1}</span>
                        {isActive && (
                            <div className="absolute -top-1 -right-1 bg-white text-black rounded-full p-[2px]">
                                <CheckCircle2 size={10} />
                            </div>
                        )}
                    </button>
                );
            })}

            <button
                onClick={onAddAnalysis}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-all border border-slate-700 hover:border-slate-600"
                title="Agregar nuevo análisis"
            >
                <Plus size={20} />
            </button>
        </div>
    );
}
