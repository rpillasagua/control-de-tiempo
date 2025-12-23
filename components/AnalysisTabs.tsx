'use client';

import React from 'react';
import { ANALYST_COLOR_HEX } from '@/lib/types';
import { Plus } from 'lucide-react';
import { useAnalysisContext } from '@/context/AnalysisContext';
import { generateId } from '@/lib/utils';
import { Analysis } from '@/lib/types';

interface AnalysisTabsProps {
    onAddAnalysis?: () => void; // Optional override
}

export default function AnalysisTabs({
    onAddAnalysis
}: AnalysisTabsProps) {
    const {
        analyses,
        activeAnalysisIndex,
        dispatch,
        analystColor
    } = useAnalysisContext();

    const colorHex = analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9';

    const handleTabChange = (index: number) => {
        dispatch({ type: 'SET_ACTIVE_INDEX', payload: index });
    };

    const handleDefaultAdd = () => {
        const newAnalysis: Analysis = {
            id: generateId(),
            numero: analyses.length + 1,
        };
        dispatch({ type: 'ADD_ANALYSIS', payload: newAnalysis });
    };

    const handleAdd = onAddAnalysis || handleDefaultAdd;

    return (
        <div className="flex items-center gap-3 overflow-x-auto pb-3">
            {Array.from({ length: analyses.length }, (_, index) => {
                const isActive = activeAnalysisIndex === index;
                return (
                    <button
                        key={index}
                        type="button"
                        onClick={() => handleTabChange(index)}
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
                onClick={handleAdd}
                className="flex items-center justify-center min-w-14 h-14 bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all duration-300 border-2 border-slate-200 hover:border-transparent hover:scale-105 hover:shadow-lg"
                style={{ borderRadius: '14px' }}
                title="Agregar nuevo análisis"
            >
                <Plus size={24} strokeWidth={3} />
            </button>
        </div>
    );
}
