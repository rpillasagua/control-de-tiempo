'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('🔥 Global Error caught:', error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6 border border-slate-100">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-800">¡Ups! Algo salió mal</h2>
                    <p className="text-slate-500 text-sm">
                        Ha ocurrido un error inesperado en la aplicación. No te preocupes, tus datos deberían estar seguros.
                    </p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4 text-left overflow-hidden">
                    <p className="text-xs font-mono text-slate-600 break-all">
                        {error.message || 'Error desconocido'}
                    </p>
                    {error.digest && (
                        <p className="text-xs font-mono text-slate-400 mt-1">
                            Digest: {error.digest}
                        </p>
                    )}
                </div>

                <button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95"
                >
                    <RefreshCcw className="w-4 h-4" />
                    Intentar de nuevo
                </button>

                <p className="text-xs text-slate-400">
                    Si el problema persiste, contacta a soporte técnico.
                </p>
            </div>
        </div>
    );
}
