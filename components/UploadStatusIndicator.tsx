import React from 'react';
import { CheckCircle2, Loader2, AlertCircle, HardDrive } from 'lucide-react';

interface UploadStatusIndicatorProps {
    status: 'pending' | 'uploading' | 'success' | 'error';
    onRetry?: () => void;
    errorMessage?: string;
    size?: 'sm' | 'md' | 'lg';
}

export const UploadStatusIndicator: React.FC<UploadStatusIndicatorProps> = ({
    status,
    onRetry,
    errorMessage,
    size = 'md'
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    const iconSize = sizeClasses[size];

    if (status === 'success') {
        return (
            <div className="flex items-center gap-1.5 text-green-600" title="Foto subida exitosamente">
                <CheckCircle2 className={iconSize} />
                <span className="text-xs font-medium">Subida</span>
            </div>
        );
    }

    if (status === 'uploading') {
        return (
            <div className="flex items-center gap-1.5 text-blue-600" title="Subiendo...">
                <Loader2 className={`${iconSize} animate-spin`} />
                <span className="text-xs font-medium">Subiendo...</span>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-red-600" title={errorMessage || 'Error al subir'}>
                    <AlertCircle className={iconSize} />
                    <span className="text-xs font-medium">Error</span>
                </div>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                        title="Reintentar subida"
                    >
                        Reintentar
                    </button>
                )}
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="flex items-center gap-1.5 text-amber-600" title="Guardado localmente, esperando subida">
                <HardDrive className={iconSize} />
                <span className="text-xs font-medium">Guardado localmente</span>
            </div>
        );
    }

    return null;
};
