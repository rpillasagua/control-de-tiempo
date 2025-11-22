'use client';

import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import PhotoCapture from './PhotoCapture';
import { PesoBrutoRegistro } from '@/lib/types';

interface PesoItemProps {
    registro: PesoBrutoRegistro;
    index: number;
    isEditMode: boolean;
    isCompact: boolean;
    isUploading: boolean;
    onUpdate: (id: string, val: number) => void;
    onDelete: (id: string) => void;
    onPhotoCapture: (id: string, file: File) => void;
    isDeleting?: boolean;
}

// Usamos memo para que solo se renderice si sus props cambian
export const PesoItem = memo(({
    registro,
    index,
    isEditMode,
    isCompact,
    isUploading,
    onUpdate,
    onDelete,
    onPhotoCapture,
    isDeleting
}: PesoItemProps) => {
    return (
        <div className={`${isCompact ? 'p-3' : 'p-5'} glass-card rounded-xl border border-white/5 transition-all`}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                    Registro #{index + 1}
                </span>
                {isEditMode && (
                    <button
                        type="button"
                        onClick={() => onDelete(registro.id)}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Eliminar registro"
                    >
                        <Trash2 className={`w-4 h-4 ${isDeleting ? 'animate-pulse' : ''}`} />
                    </button>
                )}
            </div>

            <div className={isCompact ? 'space-y-3' : 'space-y-4'}>
                <div className="space-y-2">
                    <label htmlFor={`peso-${registro.id}`} className="text-xs sm:text-sm font-medium text-gray-300">
                        Peso Bruto *
                    </label>
                    <div className="relative">
                        <input
                            id={`peso-${registro.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={registro.peso || ''}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                // Si es NaN (vacío), enviamos 0. Si es negativo, 0.
                                onUpdate(registro.id, isNaN(val) ? 0 : (val < 0 ? 0 : val));
                            }}
                            style={{ height: '56px' }}
                            className="flex !h-14 w-full rounded-lg border border-[#dbdbdb] bg-white text-[#262626] px-3 py-2 font-mono text-lg focus:outline-none focus:border-gray-400 shadow-sm pl-4 text-center"
                        />
                    </div>
                </div>

                <PhotoCapture
                    label={`Peso Bruto #${index + 1}`}
                    photoUrl={registro.fotoUrl}
                    onPhotoCapture={(file) => onPhotoCapture(registro.id, file)}
                    isUploading={isUploading}
                    compact={isCompact}
                />
            </div>
        </div>
    );
});

PesoItem.displayName = 'PesoItem';
