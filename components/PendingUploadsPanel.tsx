import React, { useState, useEffect } from 'react';

import { RefreshCw, ChevronDown, Image as ImageIcon, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[450px] p-[25px] rounded-[24px] relative text-left max-h-[90vh] overflow-y-auto"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Close Button (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-[20px] right-[20px] bg-[#F3F4F6] border-none w-[32px] h-[32px] rounded-full text-[#6B7280] text-[16px] cursor-pointer flex items-center justify-center transition-colors hover:bg-[#E5E7EB] hover:text-black"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="mb-6">
                    <h2 className="m-0 text-[22px] font-[800] text-[#111827] flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-[#2563EB]" />
                        Fotos Pendientes
                    </h2>
                    <p className="mt-[5px] text-[14px] text-[#6B7280]">
                        {totalIssues === 0 ? '✨ Todo sincronizado' : `📤 ${totalIssues} fotos require${totalIssues === 1 ? '' : 'n'} atención`}
                    </p>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {totalIssues === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="p-6 bg-green-100 rounded-full mb-4">
                                <CheckCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <p className="text-xl font-bold text-gray-800">¡Todo listo!</p>
                            <p className="text-sm text-gray-500 mt-2">No hay fotos pendientes</p>
                        </div>
                    ) : (
                        <>
                            {/* Global Actions */}
                            <div className="mb-[16px] flex gap-3">
                                {failedPhotos.length > 0 && (
                                    <button
                                        onClick={handleRetryAll}
                                        disabled={isRetrying}
                                        className="flex-1 bg-[#2563EB] text-white border-none p-[14px] rounded-[14px] text-[15px] font-[600] cursor-pointer flex justify-center items-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                        style={{ boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                                        {isRetrying ? 'Reintentando...' : 'Reintentar Todo'}
                                    </button>
                                )}
                                <button
                                    onClick={handleDeleteAll}
                                    className="px-4 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#6B7280] hover:text-[#EF4444] border-none rounded-[14px] transition-all flex items-center justify-center"
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
                                            <div className="flex items-center justify-between px-2 mb-2">
                                                <span className="text-[11px] font-[700] text-[#1F2937] uppercase tracking-wider bg-[#FEF3C7] px-3 py-1 rounded-lg">
                                                    📦 {batchCode}
                                                </span>
                                                <button
                                                    onClick={() => handleDeleteByAnalysis(batchCode)}
                                                    className="text-xs text-[#EF4444] hover:text-[#DC2626] font-[600] transition-colors"
                                                >
                                                    Borrar grupo
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {/* Failed Items */}
                                                {failed.map((photo) => (
                                                    <div key={photo.id} className="bg-[#FEF2F2] p-4 rounded-[16px] border border-[#FCA5A5] flex gap-3">
                                                        <div className="w-12 h-12 bg-[#EF4444] rounded-[12px] flex items-center justify-center flex-shrink-0">
                                                            <AlertCircle className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-[700] text-[#111827] text-[14px] mb-1">
                                                                {getFieldLabel(photo.field)}
                                                            </h4>
                                                            <p className="text-[12px] text-[#DC2626] bg-white px-2 py-1 rounded-md w-fit mb-2">
                                                                {photo.lastError || 'Error de conexión'}
                                                            </p>
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={() => handleRetryPhoto(photo)}
                                                                    className="text-[13px] font-[600] text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                                                                >
                                                                    🔄 Reintentar
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePhoto(photo.id)}
                                                                    className="text-[13px] font-[600] text-[#6B7280] hover:text-[#EF4444] transition-colors"
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
