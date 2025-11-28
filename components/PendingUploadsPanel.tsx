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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-in fade-in duration-200">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[400px] p-[25px] rounded-[24px] relative text-left max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-[20px] right-[20px] z-10 bg-[#F3F4F6] border-none w-[32px] h-[32px] rounded-full text-[#6B7280] text-[16px] cursor-pointer flex items-center justify-center transition-colors hover:bg-[#E5E7EB] hover:text-black"
                >
                    <ChevronDown className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="mb-[20px]">
                    <h2 className="m-0 text-[22px] font-[800] text-[#111827] flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-amber-500" />
                        Fotos Pendientes
                    </h2>
                    <p className="mt-[5px] text-[14px] text-[#6B7280]">
                        {totalIssues === 0 ? 'Todo sincronizado' : `${totalIssues} fotos requieren atención`}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto pr-2 -mr-2">
                    {totalIssues === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                            <RefreshCw className="w-12 h-12 opacity-20" />
                            <p>No hay fotos pendientes</p>
                        </div>
                    ) : (
                        <>
                            {/* Global Actions */}
                            <div className="mb-4 flex gap-3">
                                {failedPhotos.length > 0 && (
                                    <button
                                        onClick={handleRetryAll}
                                        disabled={isRetrying}
                                        className="flex-1 bg-[#2563EB] hover:bg-[#1d4ed8] text-white border-none p-[12px] rounded-[14px] text-[14px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-md"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                                        {isRetrying ? 'Reintentando...' : 'Reintentar Todo'}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-4 bg-red-50 hover:bg-red-100 text-red-600 border-none rounded-[14px] text-[14px] font-[600] transition-colors flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* List */}
                            <div className="space-y-4">
                                {Array.from(photosByBatch.entries()).map(([batchCode, photos]) => {
                                    const failed = photos.filter(p => p.status === 'error');
                                    const pending = photos.filter(p => p.status !== 'error');

                                    return (
                                        <div key={batchCode} className="bg-gray-50 rounded-[16px] p-4 border border-gray-100">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[11px] font-[700] text-gray-500 uppercase tracking-wider">
                                                    {batchCode}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteByAnalysis(batchCode)}
                                                    className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    Borrar grupo
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Failed Items */}
                                                {failed.map((photo) => (
                                                    <div key={photo.id} className="bg-white p-3 rounded-[12px] shadow-sm border border-red-100 flex gap-3">
                                                        <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <ImageIcon className="w-5 h-5 text-red-400" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex justify-between items-start">
                                                                <h4 className="font-[600] text-gray-900 text-sm truncate">
                                                                    {getFieldLabel(photo.field)}
                                                                </h4>
                                                            </div>
                                                            <p className="text-[12px] text-red-500 mt-0.5 line-clamp-1 font-medium">
                                                                {photo.lastError || 'Error de conexión'}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <button
                                                                    onClick={() => handleRetryPhoto(photo)}
                                                                    className="text-[11px] font-[600] text-blue-600 hover:text-blue-800"
                                                                >
                                                                    Reintentar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                                    className="text-[11px] font-[600] text-gray-400 hover:text-red-500"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Pending Items */}
                                                {pending.map((photo) => (
                                                    <div key={photo.id} className="bg-white p-3 rounded-[12px] shadow-sm border border-gray-100 flex gap-3 opacity-75">
                                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <UploadStatusIndicator status="pending" size="sm" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className="font-[600] text-gray-900 text-sm">
                                                                {getFieldLabel(photo.field)}
                                                            </h4>
                                                            <p className="text-[12px] text-gray-500 mt-0.5">
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
