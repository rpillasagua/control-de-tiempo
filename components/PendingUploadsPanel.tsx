import React, { useState, useEffect } from 'react';

import { RefreshCw, ChevronDown, Image as ImageIcon, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { photoStorageService, PendingPhoto } from '@/lib/photoStorageService';
import { UploadStatusIndicator } from './UploadStatusIndicator';

interface PendingUploadsPanelProps {
    onRetryPhoto: (photo: PendingPhoto) => Promise<void>;
    onRetryAll: () => Promise<void>;
    isOpen?: boolean;
    onClose?: () => void;
}

export const PendingUploadsPanel = ({
    onRetryPhoto,
    onRetryAll,
    isOpen,
    onClose
}: PendingUploadsPanelProps) => {
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
                await photoStorageService.cleanupDuplicates();
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
        let retryTimeout: NodeJS.Timeout | null = null;

        const handleOnline = () => {
            console.log('🌐 Conexión restaurada. Preparando auto-retry...');

            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }

            retryTimeout = setTimeout(async () => {
                const totalPending = pendingPhotos.length + failedPhotos.length;

                if (totalPending === 0) {
                    console.log('✅ No hay fotos pendientes para reintentar');
                    return;
                }

                console.log(`🔄 Auto-retry iniciado para ${totalPending} fotos...`);

                try {
                    await handleRetryAll();
                    console.log('✅ Auto-retry completado exitosamente');
                } catch (error) {
                    console.error('❌ Error en auto-retry:', error);
                }
            }, 3000);
        };

        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('online', handleOnline);
            if (retryTimeout) {
                clearTimeout(retryTimeout);
            }
        };
    }, [pendingPhotos.length, failedPhotos.length]);

    const totalIssues = pendingPhotos.length + failedPhotos.length;

    if (!isOpen) {
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-gray-900/80 via-blue-900/60 to-purple-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div
                className="bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 w-[90%] max-w-[450px] rounded-3xl relative text-left max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border-2 border-white/50"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{
                    boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.4), 0 0 100px rgba(99, 102, 241, 0.3)',
                }}
            >
                {/* Decorative gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-10 bg-white/90 hover:bg-white border-2 border-gray-200 w-10 h-10 rounded-full text-gray-600 hover:text-gray-900 cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg"
                >
                    <ChevronDown className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="p-6 pb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/20 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30">
                            <ImageIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="m-0 text-2xl font-black tracking-tight">
                                Fotos Pendientes
                            </h2>
                            <p className="text-sm font-semibold text-blue-100 mt-1">
                                {totalIssues === 0 ? '✨ Todo sincronizado' : `📤 ${totalIssues} fotos requieren atención`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {totalIssues === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-6 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full mb-4 shadow-lg">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <p className="text-xl font-bold text-gray-800">¡Todo listo!</p>
                            <p className="text-sm text-gray-500 mt-2 font-medium">No hay fotos pendientes</p>
                        </div>
                    ) : (
                        <>
                            {/* Global Actions */}
                            <div className="mb-6 flex gap-3">
                                {failedPhotos.length > 0 && (
                                    <button
                                        onClick={handleRetryAll}
                                        disabled={isRetrying}
                                        className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-none py-3.5 px-5 rounded-xl text-sm font-bold cursor-pointer flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                                        {isRetrying ? 'Reintentando...' : 'Reintentar Todo'}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-5 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 text-red-700 border-none rounded-xl transition-all flex items-center justify-center active:scale-95 shadow-md hover:shadow-lg"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-5">
                                {Array.from(photosByBatch.entries()).map(([batchCode, photos]) => {
                                    const failed = photos.filter(p => p.status === 'error');
                                    const pending = photos.filter(p => p.status !== 'error');

                                    return (
                                        <div key={batchCode} className="space-y-3">
                                            <div className="flex items-center justify-between px-2">
                                                <span className="text-xs font-black text-gray-700 uppercase tracking-widest bg-gradient-to-r from-yellow-200 to-amber-200 px-3 py-1.5 rounded-lg shadow-sm">
                                                    {batchCode}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteByAnalysis(batchCode)}
                                                    className="text-xs text-red-600 hover:text-red-700 font-bold transition-colors hover:underline"
                                                >
                                                    Borrar grupo
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Failed Items */}
                                                {failed.map((photo) => (
                                                    <div key={photo.id} className="bg-gradient-to-br from-red-50 to-pink-50 p-4 rounded-2xl shadow-md border-2 border-red-200 flex gap-4 transition-all hover:shadow-xl hover:scale-[1.02]">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                                            <AlertCircle className="w-7 h-7 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="font-black text-gray-900 text-base truncate">
                                                                    {getFieldLabel(photo.field)}
                                                                </h4>
                                                            </div>
                                                            <p className="text-xs text-red-700 font-bold bg-red-100 px-3 py-1.5 rounded-lg w-fit mb-3 shadow-sm">
                                                                {photo.lastError || 'Error de conexión'}
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => handleRetryPhoto(photo)}
                                                                    className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors hover:underline"
                                                                >
                                                                    🔄 Reintentar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                                    className="text-sm font-semibold text-gray-500 hover:text-red-600 transition-colors"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Pending Items */}
                                                {pending.map((photo) => (
                                                    <div key={photo.id} className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-2xl border-2 border-blue-200 flex gap-4 shadow-md hover:shadow-lg transition-all">
                                                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                                            <UploadStatusIndicator status="pending" size="sm" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-black text-gray-800 text-base mb-1">
                                                                {getFieldLabel(photo.field)}
                                                            </h4>
                                                            <p className="text-sm text-blue-700 font-semibold flex items-center gap-2">
                                                                <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                                                                Esperando conexión...
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Gradient */}
                <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            </div>
        </div>
    );

    return panelContent;
};
