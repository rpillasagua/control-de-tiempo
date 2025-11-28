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
                className="bg-[#FEF2F2] backdrop-blur-md border-b-2 border-[#FCA5A5] px-4 py-3 sm:px-6 shadow-md relative overflow-hidden cursor-pointer hover:bg-[#FEE2E2] transition-all group rounded-b-[12px]"
            >
                {/* Decorative background glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#EF4444]/0 via-[#EF4444]/50 to-[#EF4444]/0" />

                <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 bg-[#FEE2E2] p-2 rounded-full animate-pulse group-hover:scale-110 transition-transform">
                            <AlertCircle className="h-5 w-5 text-[#EF4444]" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                            <p className="text-[15px] font-[700] text-[#991B1B]">
                                {failedCount === 1
                                    ? '1 foto pendiente de subir'
                                    : `${failedCount} fotos pendientes de subir`}
                            </p>
                            <p className="text-[13px] sm:text-[14px] text-[#B91C1C] font-[500]">
                                Toca para ver detalles y reintentar
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 text-[12px] font-[600] text-[#991B1B] bg-[#FEE2E2] px-3 py-2 rounded-[10px] border-2 border-[#FCA5A5]">
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Ver lista de errores</span>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsVisible(false);
                            }}
                            className="p-2 hover:bg-[#FEE2E2] rounded-full transition-colors text-[#DC2626] hover:text-[#991B1B] active:scale-95"
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
