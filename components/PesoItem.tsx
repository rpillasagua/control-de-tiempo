'use client';

import { memo, useRef, useState, useEffect } from 'react';
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
    analysisId: string;
    forceGalleryMode?: boolean;
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
    isDeleting,
    analysisId,
    forceGalleryMode = false
}: PesoItemProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

    // Effect to recover offline photo
    useEffect(() => {
        let isMounted = true;

        const checkOfflinePhoto = async () => {
            // If we already have a server URL, we don't need to look for local one
            if (registro.fotoUrl) {
                setLocalPreviewUrl(null);
                return;
            }

            // If we already have a local preview, skip
            if (localPreviewUrl) return;

            if (!analysisId) return;

            try {
                const { photoStorageService } = await import('@/lib/photoStorageService');
                const offlinePhoto = await photoStorageService.getPhotoByContext(analysisId, `pesobruto-${registro.id}`);

                if (isMounted && offlinePhoto && offlinePhoto.file) {
                    const url = URL.createObjectURL(offlinePhoto.file);
                    setLocalPreviewUrl(url);
                }
            } catch (error) {
                console.error('Error checking offline photo for peso item:', error);
            }
        };

        checkOfflinePhoto();

        return () => {
            isMounted = false;
        };
    }, [analysisId, registro.id, registro.fotoUrl, localPreviewUrl]);

    // Cleanup blob URL on unmount or when replaced
    useEffect(() => {
        return () => {
            if (localPreviewUrl) {
                URL.revokeObjectURL(localPreviewUrl);
            }
        };
    }, [localPreviewUrl]);

    const handlePhotoClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Create immediate preview
            const url = URL.createObjectURL(file);
            setLocalPreviewUrl(url);
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
                capture={forceGalleryMode ? undefined : "environment"}
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
                photoUrl={registro.fotoUrl || localPreviewUrl || undefined}
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
