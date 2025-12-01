"use client";

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Loader2, Check, AlertCircle, Cloud, CloudOff } from 'lucide-react';

interface SyncStatusProps {
    isSaving: boolean;
    lastSaved: Date | null;
    saveError: string | null;
    isOnline?: boolean;
}

export function SyncStatus({ isSaving, lastSaved, saveError, isOnline = true }: SyncStatusProps) {
    const [, setTick] = useState(0);

    // Update every minute to keep "hace X minutos" fresh
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    if (!isOnline) {
        return (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1.5 rounded-md">
                <CloudOff className="h-4 w-4" />
                <span>Sin conexión - Guardando localmente</span>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
            </div>
        );
    }

    if (saveError) {
        return (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-1.5 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span>{saveError}</span>
            </div>
        );
    }

    if (lastSaved) {
        return (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1.5 rounded-md">
                <Check className="h-4 w-4" />
                <span>
                    Guardado {formatDistanceToNow(lastSaved, { addSuffix: true, locale: es })}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 text-sm text-gray-500 px-3 py-1.5">
            <Cloud className="h-4 w-4" />
            <span>No guardado</span>
        </div>
    );
}
