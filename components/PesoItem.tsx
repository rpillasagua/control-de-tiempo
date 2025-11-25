'use client';

import { memo, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { PesoBrutoRegistro } from '@/lib/types';
import { WeightInputRow } from './WeightInputRow';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onPhotoCapture(registro.id, file);
        }
        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    return (
        <div className="relative group">
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
            />

            <WeightInputRow
                label={`Registro #${index + 1}`}
                value={registro.peso}
                onChange={(val) => {
                    const numVal = parseFloat(val);
                    onUpdate(registro.id, isNaN(numVal) ? 0 : numVal);
                }}
                photoUrl={registro.fotoUrl}
                onPhotoClick={handlePhotoClick}
                isUploading={isUploading}
                viewMode={isCompact ? 'COMPACTA' : 'SUELTA'}
                error={false}
            />

            {isEditMode && (
                <button
                    type="button"
                    onClick={() => onDelete(registro.id)}
                    disabled={isDeleting}
                    className="absolute -top-2 -right-2 z-10 p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-all disabled:opacity-50 transform hover:scale-110"
                    title="Eliminar registro"
                >
                    <Trash2 className={`w-3 h-3 ${isDeleting ? 'animate-pulse' : ''}`} />
                </button>
            )}
        </div>
    );
});

PesoItem.displayName = 'PesoItem';
