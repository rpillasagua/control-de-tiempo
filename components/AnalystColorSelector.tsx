'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface AnalystColorSelectorProps {
    selectedColor?: string;
    onSelect: (color: string) => void;
}

const ANALYST_COLORS = [
    '#FF0000', // Rojo
    '#00FF00', // Verde
    '#0000FF', // Azul
    '#FFFF00', // Amarillo
    '#800080', // Púrpura
    '#FFA500', // Naranja
    '#FFC0CB', // Rosa
    '#00FFFF', // Cian
];

export default function AnalystColorSelector({ selectedColor, onSelect }: AnalystColorSelectorProps) {
    return (
        <div className="space-y-4 flex flex-col items-center">
            <div className="flex flex-wrap gap-4 justify-center">
                {ANALYST_COLORS.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onSelect(color)}
                        className={`
              w-16 h-16 rounded-full transition-all duration-200 flex items-center justify-center shadow-sm
              ${selectedColor === color
                                ? 'ring-4 ring-offset-2 scale-110'
                                : 'hover:scale-110 hover:shadow-md'
                            }
            `}
                        style={{
                            backgroundColor: color,
                            borderColor: selectedColor === color ? '#2563eb' : 'transparent'
                        }}
                        title={color}
                    >
                        {selectedColor === color && (
                            <div className="bg-white/20 rounded-full p-1">
                                <Check className="w-6 h-6 text-white drop-shadow-md" strokeWidth={3} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {!selectedColor && (
                <p className="text-sm text-gray-600 mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    💡 Este color te identificará en todos los análisis que realices hoy
                </p>
            )}
        </div>
    );
}
