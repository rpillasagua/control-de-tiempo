import React, { useState, useEffect } from 'react';

import { RefreshCw, ChevronDown, Image as ImageIcon, Trash2 } from 'lucide-react';
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

    // Auto-retry when connection is restored (with debouncing)
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

    // If not open, don't render UI, but keep hooks running
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[400px] p-6 rounded-[24px] relative text-left max-h-[85vh] flex flex-col overflow-hidden border border-gray-100"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-10 bg-gray-50 hover:bg-gray-100 border-none w-8 h-8 rounded-full text-gray-500 hover:text-gray-700 cursor-pointer flex items-center justify-center transition-all active:scale-95"
                >
                    <ChevronDown className="h-5 w-5" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <ImageIcon className="w-6 h-6 text-amber-500" />
                        </div>
                        <h2 className="m-0 text-[20px] font-[800] text-gray-900">
                            Fotos Pendientes
                        </h2>
                    </div>
                    <p className="text-[14px] text-gray-500 font-[500] ml-1">
                        {totalIssues === 0 ? 'Todo sincronizado' : `${totalIssues} fotos requieren atención`}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                    {totalIssues === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-4">
                            <div className="p-4 bg-gray-50 rounded-full">
                                <RefreshCw className="w-8 h-8 opacity-20" />
                            </div>
                            <p className="font-[500]">No hay fotos pendientes</p>
                        </div>
                    ) : (
                        <>
                            {/* Global Actions */}
                            <div className="mb-6 flex gap-3">
                                {failedPhotos.length > 0 && (
                                    <button
                                        onClick={handleRetryAll}
                                        disabled={isRetrying}
                                        className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white border-none py-3 px-4 rounded-[14px] text-[14px] font-[700] cursor-pointer flex justify-center items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                                        {isRetrying ? 'Reintentando...' : 'Reintentar Todo'}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-4 bg-red-50 hover:bg-red-100 text-red-600 border-none rounded-[14px] transition-colors flex items-center justify-center active:scale-95"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-6">
                                {Array.from(photosByBatch.entries()).map(([batchCode, photos]) => {
                                    const failed = photos.filter(p => p.status === 'error');
                                    const pending = photos.filter(p => p.status !== 'error');

                                    return (
                                        <div key={batchCode} className="space-y-3">
                                            <div className="flex items-center justify-between px-1">
                                                <span className="text-[12px] font-[700] text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded-md">
                                                    {batchCode}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteByAnalysis(batchCode)}
                                                    className="text-[12px] text-red-500 hover:text-red-700 font-[600] transition-colors"
                                                >
                                                    Borrar grupo
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Failed Items */}
                                                {failed.map((photo) => (
                                                    <div key={photo.id} className="bg-white p-4 rounded-[16px] shadow-sm border border-red-100 flex gap-4 transition-all hover:shadow-md">
                                                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center flex-shrink-0 border border-red-100">
                                                            <ImageIcon className="w-6 h-6 text-red-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <h4 className="font-[700] text-gray-900 text-[15px] truncate">
                                                                    {getFieldLabel(photo.field)}
                                                                </h4>
                                                            </div>
                                                            <p className="text-[13px] text-red-500 font-[500] line-clamp-1 bg-red-50/50 px-2 py-0.5 rounded-md w-fit mb-3">
                                                                {photo.lastError || 'Error de conexión'}
                                                            </p>
                                                            <div className="flex items-center gap-4">
                                                                <button
                                                                    onClick={() => handleRetryPhoto(photo)}
                                                                    className="text-[13px] font-[700] text-[#2563EB] hover:text-[#1d4ed8] transition-colors"
                                                                >
                                                                    Reintentar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                                    className="text-[13px] font-[600] text-gray-400 hover:text-red-500 transition-colors"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Pending Items */}
                                                {pending.map((photo) => (
                                                    <div key={photo.id} className="bg-gray-50/50 p-4 rounded-[16px] border border-gray-100 flex gap-4">
                                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center flex-shrink-0 border border-gray-100 shadow-sm">
                                                            <UploadStatusIndicator status="pending" size="sm" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-[700] text-gray-700 text-[15px]">
                                                                {getFieldLabel(photo.field)}
                                                            </h4>
                                                            <p className="text-[13px] text-gray-400 font-[500] mt-1">
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
            </div>
        </div>
    );

    return panelContent;
};
