"use client";

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Check, AlertCircle, CloudOff, X } from 'lucide-react';

interface SyncStatusProps {
    isSaving: boolean;
    lastSaved: Date | null;
    saveError: string | null;
    isOnline?: boolean;
    onDismissError?: () => void;
}

export function SyncStatus({
    isSaving,
    lastSaved,
    saveError,
    isOnline = true,
    onDismissError
}: SyncStatusProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Auto-hide logic
    useEffect(() => {
        if (isSaving) {
            // Show when saving
            setIsVisible(true);
            setIsExiting(false);
        } else if (saveError) {
            // Show permanently on error
            setIsVisible(true);
            setIsExiting(false);
        } else if (!isOnline) {
            // Show permanently when offline
            setIsVisible(true);
            setIsExiting(false);
        } else if (lastSaved && !isSaving && !saveError && isOnline) {
            // Show "Guardado" for 5 seconds after successful save
            setIsVisible(true);
            setIsExiting(false);

            const timer = setTimeout(() => {
                setIsExiting(true);
                // Actually hide after animation completes
                setTimeout(() => {
                    setIsVisible(false);
                    setIsExiting(false);
                }, 300); // Match animation duration
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [isSaving, lastSaved, saveError, isOnline]);

    if (!isVisible) return null;

    const handleDismiss = () => {
        if (onDismissError) {
            onDismissError();
        }
    };

    const baseClasses = `
        flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition-all duration-300
        ${isExiting ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}
    `;

    // Offline state
    if (!isOnline) {
        return (
            <div className={`${baseClasses} text-orange-600 bg-orange-50 border border-orange-200`}>
                <CloudOff className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Sin conexión</span>
                <span className="text-xs opacity-75">- Guardando localmente</span>
            </div>
        );
    }

    // Saving state
    if (isSaving) {
        return (
            <div className={`${baseClasses} text-blue-600 bg-blue-50 border border-blue-200`}>
                <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                <span className="font-medium">Guardando...</span>
            </div>
        );
    }

    // Error state
    if (saveError) {
        return (
            <div className={`${baseClasses} text-red-600 bg-red-50 border border-red-200`}>
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">{saveError}</span>
                {onDismissError && (
                    <button
                        onClick={handleDismiss}
                        className="ml-auto p-0.5 hover:bg-red-100 rounded transition-colors"
                        aria-label="Dismiss error"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}
            </div>
        );
    }

    // Saved state (shows for 5s)
    if (lastSaved) {
        return (
            <div className={`${baseClasses} text-green-600 bg-green-50 border border-green-200`}>
                <Check className="h-4 w-4 flex-shrink-0" />
                <span className="font-medium">Guardado</span>
            </div>
        );
    }

    return null;
}
