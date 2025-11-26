import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { photoStorageService, PendingPhoto } from '@/lib/photoStorageService';
import { UploadStatusIndicator } from './UploadStatusIndicator';

interface PendingUploadsPanelProps {
    onRetryPhoto: (photo: PendingPhoto) => Promise<void>;
    onRetryAll: () => Promise<void>;
}

export const PendingUploadsPanel: React.FC<PendingUploadsPanelProps> = ({
    onRetryPhoto,
    onRetryAll
}) => {
    const [isExpanded, setIsExpanded] = useState(true); // Expanded by default for visibility
    const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
    const [failedPhotos, setFailedPhotos] = useState<PendingPhoto[]>([]);
    const [isRetrying, setIsRetrying] = useState(false);

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
                // Reset any uploads that were interrupted (e.g. by page reload)
                await photoStorageService.resetStuckUploads();
            } catch (error) {
                console.error('Error resetting stuck uploads:', error);
            }
            // Load photos after reset
            loadPhotos();
        };

        init();

        // Poll for updates every 5 seconds
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
        return null; // Hide panel if no issues
    }

    const panelContent = (
        <div className="fixed bottom-4 right-4 z-[9999] w-96 bg-white rounded-lg shadow-2xl border border-gray-200">
            {/* Header */}
            <div
                className="flex items-center justify-between p-3 bg-amber-50 border-b border-amber-100 cursor-pointer hover:bg-amber-100 transition-colors rounded-t-lg"
                onClick={() => setIsExpanded(!isExpanded)}
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
                    {/* Failed Photos */}
                    {failedPhotos.length > 0 && (
                        <div className="border-b border-gray-100">
                            <div className="p-2 bg-red-50">
                                <h4 className="text-xs font-semibold text-red-800">
                                    Errores ({failedPhotos.length})
                                </h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {failedPhotos.map((photo) => (
                                    <div key={photo.id} className="p-3 hover:bg-gray-50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {getFieldLabel(photo.field)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {photo.metadata?.lote && `Lote: ${photo.metadata.lote}`}
                                                    {photo.metadata?.analysisIndex !== undefined &&
                                                        ` • Análisis ${photo.metadata.analysisIndex + 1}`}
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
                                            <button
                                                onClick={() => handleRetryPhoto(photo)}
                                                className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors flex-shrink-0"
                                            >
                                                Reintentar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Pending Photos */}
                    {pendingPhotos.length > 0 && (
                        <div>
                            <div className="p-2 bg-blue-50">
                                <h4 className="text-xs font-semibold text-blue-800">
                                    Pendientes ({pendingPhotos.length})
                                </h4>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {pendingPhotos.map((photo) => (
                                    <div key={photo.id} className="p-3 hover:bg-gray-50">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">
                                                    {getFieldLabel(photo.field)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    {photo.metadata?.lote && `Lote: ${photo.metadata.lote}`}
                                                    {photo.metadata?.analysisIndex !== undefined &&
                                                        ` • Análisis ${photo.metadata.analysisIndex + 1}`}
                                                </p>
                                            </div>
                                            <UploadStatusIndicator status="pending" size="sm" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Use portal to render directly to body, bypassing any parent overflow constraints
    return typeof window !== 'undefined' ? createPortal(panelContent, document.body) : null;
};
