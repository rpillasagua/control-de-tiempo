'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Download, Search } from 'lucide-react';
import { TechnicalSpecsViewer } from './TechnicalSpecsViewer';
import { Input } from '@/components/ui';

interface TechnicalSpecsModalProps {
    isOpen: boolean;
    onClose: () => void;
    code: string;
}

export default function TechnicalSpecsModal({ isOpen, onClose, code }: TechnicalSpecsModalProps) {
    const [mounted, setMounted] = useState(false);
    const [activeCode, setActiveCode] = useState(code);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setActiveCode(code); // Reset to current code when opening
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, code]);

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div
            className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in p-4"
            style={{ zIndex: 999999, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            {/* Backdrop - clickable to close */}
            <div
                className="absolute inset-0"
                style={{ zIndex: 1 }}
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="bg-white w-[95%] max-w-4xl max-h-[90vh] rounded-[24px] flex flex-col overflow-hidden"
                style={{
                    zIndex: 2,
                    position: 'relative',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">📋 Ficha Técnica</h2>
                            <p className="text-sm text-slate-500">Código: {activeCode}</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex items-center gap-2 flex-1 max-w-xs mx-4">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                value={activeCode}
                                onChange={(e) => setActiveCode(e.target.value)}
                                placeholder="Buscar código..."
                                className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                            />
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <TechnicalSpecsViewer code={activeCode} />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
