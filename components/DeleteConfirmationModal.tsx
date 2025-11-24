'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    analysisCode?: string;
    analysisLote?: string;
    type?: 'confirmar';
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    analysisCode,
    analysisLote,
    type = 'confirmar'
}: DeleteConfirmationModalProps) {
    const [mounted, setMounted] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setConfirmText('');
            setIsDeleting(false);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) {
        return null;
    }

    const handleConfirm = async () => {
        if (confirmText.toLowerCase() !== 'confirmar') {
            return;
        }

        setIsDeleting(true);
        await onConfirm();
        setIsDeleting(false);
        onClose();
    };

    const isConfirmEnabled = confirmText.toLowerCase() === 'confirmar';

    return createPortal(
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden border border-[#dbdbdb]">

                {/* Header */}
                <div className="p-6 border-b border-[#efefef] flex items-start justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#262626]">Eliminar Análisis</h3>
                            <p className="text-sm text-[#8e8e8e]">Esta acción no se puede deshacer</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[#8e8e8e] hover:text-[#262626] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 bg-white">
                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                        <p className="text-sm text-red-800 mb-2 font-medium">
                            Estás a punto de eliminar permanentemente el análisis:
                        </p>
                        <div className="flex flex-col gap-1 pl-2 border-l-2 border-red-200">
                            {analysisCode && (
                                <span className="text-sm text-red-700">
                                    Código: <span className="font-mono font-bold">{analysisCode}</span>
                                </span>
                            )}
                            {analysisLote && (
                                <span className="text-sm text-red-700">
                                    Lote: <span className="font-mono font-bold">{analysisLote}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-[#262626]">
                            Escribe <span className="font-mono font-bold text-red-500">confirmar</span> para continuar:
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="confirmar"
                            className="w-full px-3 py-2 border border-[#dbdbdb] rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-sm bg-white text-black"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#fafafa] border-t border-[#efefef] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-[#262626] bg-white border border-[#dbdbdb] rounded-lg hover:bg-gray-50 transition-colors"
                        disabled={isDeleting}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isConfirmEnabled || isDeleting}
                        className={`
                            px-4 py-2 text-sm font-bold text-white rounded-lg transition-all
                            ${isConfirmEnabled
                                ? 'bg-red-500 hover:bg-red-600 shadow-sm'
                                : 'bg-gray-300 cursor-not-allowed'}
                        `}
                    >
                        {isDeleting ? 'Eliminando...' : 'Eliminar permanentemente'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
