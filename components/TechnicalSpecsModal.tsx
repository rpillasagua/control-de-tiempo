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
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div
                className="relative bg-white w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 slide-in-from-bottom-2"
            >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-slate-100 bg-white z-10 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-50 p-2 rounded-lg">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Ficha Técnica</h2>
                            <p className="text-sm text-slate-500">Especificaciones detalladas</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="flex items-center gap-2 flex-1 max-w-md">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type="text"
                                value={activeCode}
                                onChange={(e) => setActiveCode(e.target.value)}
                                placeholder="Buscar otro código..."
                                className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all absolute top-2 right-2 sm:static"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    <TechnicalSpecsViewer code={activeCode} />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
