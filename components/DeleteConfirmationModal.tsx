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
    title?: string;
    description?: string;
}

export default function DeleteConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    analysisCode,
    analysisLote,
    type = 'confirmar',
    title = 'Eliminar Análisis',
    description = 'Esta acción es irreversible'
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
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/95 backdrop-blur-[3px] animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[340px] p-[25px] rounded-[24px] relative text-left overflow-hidden"
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out',
                    zIndex: 1000000
                }}
            >
                {/* Botón Cerrar (X) */}
                <button
                    onClick={onClose}
                    className="absolute top-[20px] right-[20px] bg-[#F3F4F6] border-none w-[32px] h-[32px] rounded-full text-[#6B7280] text-[16px] cursor-pointer flex items-center justify-center transition-colors hover:bg-[#E5E7EB] hover:text-black"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Títulos */}
                <h2 className="m-0 text-[22px] font-[800] text-[#111827]">{title}</h2>
                <p className="mt-[5px] mb-[25px] text-[14px] text-[#6B7280]">{description}</p>

                {/* Warning Box */}
                <div className="bg-red-50 border border-red-100 rounded-[16px] p-[16px] mb-[20px]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <p className="text-[13px] font-[600] text-red-800 m-0">
                            Estás a punto de eliminar:
                        </p>
                    </div>
                    <div className="pl-[44px]">
                        {analysisCode && (
                            <div className="text-[13px] text-red-700 mb-1">
                                Código: <span className="font-mono font-bold bg-white/50 px-1 rounded">{analysisCode}</span>
                            </div>
                        )}
                        {analysisLote && (
                            <div className="text-[13px] text-red-700">
                                Lote: <span className="font-mono font-bold bg-white/50 px-1 rounded">{analysisLote}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Confirmación */}
                <div className="mb-[20px]">
                    <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">
                        Escribe <span className="font-mono text-red-500">confirmar</span> para continuar
                    </label>
                    <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-red-500 focus-within:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]">
                        <span className="mr-[10px] text-[18px]">✍️</span>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="confirmar"
                            className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500]"
                            autoFocus
                        />
                    </div>
                </div>

                {/* Botón Eliminar */}
                <button
                    onClick={handleConfirm}
                    disabled={!isConfirmEnabled || isDeleting}
                    className={`w-full border-none p-[16px] rounded-[14px] text-[16px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed ${isConfirmEnabled
                        ? 'bg-red-500 text-white shadow-[0_4px_12px_rgba(239,68,68,0.3)] hover:bg-red-600'
                        : 'bg-gray-200 text-gray-400'
                        }`}
                >
                    {isDeleting ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Eliminando...</span>
                        </>
                    ) : (
                        <>
                            <span>Eliminar Definitivamente</span>
                        </>
                    )}
                </button>
            </div>
        </div>,
        document.body
    );
}
