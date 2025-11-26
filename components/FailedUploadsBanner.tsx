'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';

export default function FailedUploadsBanner({ onClick }: { onClick?: () => void }) {
    const [failedCount, setFailedCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isRetrying, setIsRetrying] = useState(false);

    const checkFailedUploads = async () => {
        try {
            const { photoStorageService } = await import('@/lib/photoStorageService');
            await photoStorageService.initialize();
            const failed = await photoStorageService.getFailedPhotos();
            setFailedCount(failed.length);
            if (failed.length > 0) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        } catch (error) {
            console.error('Error checking failed uploads:', error);
        }
    };

    useEffect(() => {
        // Check immediately
        checkFailedUploads();

        // Poll every 5 seconds
        const interval = setInterval(checkFailedUploads, 5000);
        return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    return (
        <div className="sticky top-0 z-50 animate-in slide-in-from-top duration-500 ease-out">
            <div
                onClick={onClick}
                className="bg-red-500/10 backdrop-blur-md border-b border-red-500/20 px-4 py-3 sm:px-6 shadow-lg relative overflow-hidden cursor-pointer hover:bg-red-500/20 transition-colors group"
            >
                {/* Decorative background glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0 opacity-50" />

                <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 bg-red-100/80 p-1.5 rounded-full animate-pulse group-hover:scale-110 transition-transform">
                            <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                            <p className="text-sm font-bold text-red-900">
                                {failedCount === 1
                                    ? '1 foto pendiente de subir'
                                    : `${failedCount} fotos pendientes de subir`}
                            </p>
                            <p className="text-xs sm:text-sm text-red-700/80 font-medium">
                                Toca para ver detalles y reintentar
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-red-800 bg-red-100/50 px-3 py-1.5 rounded-full border border-red-200/50">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Ver lista de errores</span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsVisible(false);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-full transition-colors text-red-700 hover:text-red-900 active:scale-95"
                            title="Ocultar notificación"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
