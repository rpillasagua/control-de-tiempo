import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ChevronDown, ChevronUp, Image as ImageIcon, Trash2 } from 'lucide-react';
import { photoStorageService, PendingPhoto } from '@/lib/photoStorageService';
import { UploadStatusIndicator } from './UploadStatusIndicator';

interface PendingUploadsPanelProps {
    onRetryPhoto: (photo: PendingPhoto) => Promise<void>;
    onRetryAll: () => Promise<void>;
    isOpen?: boolean;
    onClose?: () => void;
}

export const PendingUploadsPanel: React.FC<PendingUploadsPanelProps> = ({
    onRetryPhoto,
    onRetryAll,
    isOpen,
    onClose
}) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [failedPhotos, setFailedPhotos] = useState<PendingPhoto[]>([]);
    const [isRetrying, setIsRetrying] = useState(false);

    // Sync with external isOpen prop
    useEffect(() => {
        if (isOpen !== undefined) {
            setIsExpanded(isOpen);
        }
    }, [isOpen]);

    const loadPhotos = async () => {
        try {
            const [pending, failed] = await Promise.all([
                photoStorageService.getPendingPhotos(),
                photoStorageService.getFailedPhotos()
            ]);
            setPendingPhotos(pending);
            setFailedPhotos(failed);
        } catch (error) {
            console.error('Error loading pending photos:', error);
        }
    };

    useEffect(() => {
        const init = async () => {
            try {
                await photoStorageService.resetStuckUploads();
            } catch (error) {
                console.error('Error resetting stuck uploads:', error);
            }
            loadPhotos();
        };

        init();

        const interval = setInterval(loadPhotos, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRetryAll = async () => {
        setIsRetrying(true);
        try {
            await onRetryAll();
            await loadPhotos();
        } finally {
            setIsRetrying(false);
        }
    };

    const handleRetryPhoto = async (photo: PendingPhoto) => {
        try {
            await onRetryPhoto(photo);
            await loadPhotos();
        } catch (error) {
            console.error('Error retrying photo:', error);
        }
    };

    // ✅ DELETE HANDLERS
    const handleDeletePhoto = async (photoId: string) => {
        if (!confirm('¿Borrar esta foto pendiente?')) return;

        try {
            await photoStorageService.deletePhoto(photoId);
            await loadPhotos();
        } catch (error) {
            console.error('Error deleting photo:', error);
        }
    };

    const handleDeleteByAnalysis = async (batchCode: string) => {
        const photosInBatch = [...pendingPhotos, ...failedPhotos].filter(
            p => p.metadata?.batchCode === batchCode
        );

        if (!confirm(`¿Borrar ${photosInBatch.length} fotos del análisis "${batchCode}"?`)) return;

        try {
            for (const photo of photosInBatch) {
                await photoStorageService.deletePhoto(photo.id);
            }
            await loadPhotos();
        } catch (error) {
            console.error('Error deleting photos by analysis:', error);
        }
    };

    const handleDeleteAll = async () => {
        const total = pendingPhotos.length + failedPhotos.length;

        if (!confirm(`⚠️ ¿BORRAR TODAS las ${total} fotos pendientes?`)) return;
        if (!confirm(`Esta acción es IRREVERSIBLE. ¿Continuar?`)) return;

        try {
            const allPhotos = [...pendingPhotos, ...failedPhotos];
            for (const photo of allPhotos) {
                await photoStorageService.deletePhoto(photo.id);
            }
            await loadPhotos();
        } catch (error) {
            console.error('Error deleting all photos:', error);
        }
    };

    const getFieldLabel = (field: string): string => {
        const labels: Record<string, string> = {
            fotoCalidad: 'Foto Calidad',
            pesoBruto: 'Peso Bruto',
            pesoCongelado: 'Peso Congelado',
            pesoNeto: 'Peso Neto',
            pesoConGlaseo: 'Peso con Glaseo',
            pesoSinGlaseo: 'Peso sin Glaseo',
            glaseo: 'Glaseo',
            uniformidad_grandes: 'Uniformidad Grandes',
            uniformidad_pequenos: 'Uniformidad Pequeños',
        };
        return labels[field] || field;
    };

    // Auto-retry when connection is restored
    useEffect(() => {
        const handleOnline = () => {
            console.log('🌐 Conexión restaurada. Reintentando subidas...');
            handleRetryAll();
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [onRetryAll]);

    const totalIssues = pendingPhotos.length + failedPhotos.length;

    if (totalIssues === 0) {
        return null;
    }

    // Group photos by batchCode
    const photosByBatch = new Map<string, PendingPhoto[]>();
    [...pendingPhotos, ...failedPhotos].forEach(photo => {
        const batch = photo.metadata?.batchCode || 'Sin Análisis';
        if (!photosByBatch.has(batch)) {
            photosByBatch.set(batch, []);
        }
        photosByBatch.get(batch)!.push(photo);
    });

    const panelContent = (
        <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-amber-50 border-b border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors rounded-t-lg"
                onClick={() => {
                    const newState = !isExpanded;
                    setIsExpanded(newState);
                    if (!newState && onClose) onClose();
                }}
            >
                <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-amber-600" />
                    <span className="font-semibold text-sm text-amber-900">
                        Fotos Pendientes ({totalIssues})
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {failedPhotos.length > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRetryAll();
                            }}
                            disabled={isRetrying}
                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Reintentar todas las fotos fallidas"
                        >
                            <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                            Reintentar Todo
                        </button>
                    )}
                    {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-amber-600" />
                    ) : (
                        <ChevronUp className="w-5 h-5 text-amber-600" />
                    )}
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="max-h-96 overflow-y-auto">
                    {/* ✅ DELETE CONTROLS - Below "Reintentar Todo" button */}
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Gestión de Fotos:</p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleDeleteAll}
                                className="flex-1 text-xs px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center justify-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                Borrar Todo
                            </button>
                        </div>
                    </div>

                    {/* ✅ Grouped by BatchCode */}
                    {Array.from(photosByBatch.entries()).map(([batchCode, photos]) => {
                        const failed = photos.filter(p => p.status === 'error');
                        const pending = photos.filter(p => p.status !== 'error');

                        return (
                            <div key={batchCode} className="border-b border-gray-100">
                                {/* Batch Header */}
                                <div className="p-2 bg-indigo-50 flex items-center justify-between">
                                    <h4 className="text-xs font-semibold text-indigo-800">
                                        {batchCode} ({photos.length})
                                    </h4>
                                    <button
                                        onClick={() => handleDeleteByAnalysis(batchCode)}
                                        className="text-xs px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors flex items-center gap-1"
                                        title={`Borrar todas las fotos de ${batchCode}`}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>

                                {/* Failed in this batch */}
                                {failed.map((photo) => (
                                    <div key={photo.id} className="p-3 hover:bg-red-50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-red-900 truncate">
                                                    {getFieldLabel(photo.field)}
                                                </p>
                                                {photo.lastError && (
                                                    <p className="text-xs text-red-600 mt-1 truncate" title={photo.lastError}>
                                                        {photo.lastError}
                                                    </p>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Intentos: {photo.retryCount}
                                                </p>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleRetryPhoto(photo)}
                                                    className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                                                >
                                                    Reintentar
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                    className="text-xs px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                                                    title="Borrar esta foto"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Pending in this batch */}
                                {pending.map((photo) => (
                                    <div key={photo.id} className="p-3 hover:bg-gray-50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {getFieldLabel(photo.field)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UploadStatusIndicator status="pending" size="sm" />
                                                <button
                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                    className="text-xs px-1.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                                                    title="Borrar esta foto"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );

    return typeof window !== 'undefined' ? createPortal(panelContent, document.body) : null;
};
