
import React, { useState, useRef } from 'react';
import { ProductType, ProductInfo } from '../lib/types';
import { PRODUCT_TYPE_LABELS } from '../lib/types';
import { X, Upload, FileText, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NewProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (info: ProductInfo) => void;
    initialCode: string;
}

export default function NewProductModal({ isOpen, onClose, onSubmit, initialCode }: NewProductModalProps) {
    const [activeTab, setActiveTab] = useState<'pdf' | 'manual'>('pdf');
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [client, setClient] = useState('');
    const [brand, setBrand] = useState('');
    const [master, setMaster] = useState('');
    const [type, setType] = useState<ProductType>('ENTERO');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            toast.error('Por favor sube un archivo PDF válido');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/parse-spec', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Error al procesar el PDF');
            }

            const data = await response.json();

            if (data.client) setClient(data.client);
            if (data.brand) setBrand(data.brand);
            if (data.master) setMaster(data.master);
            if (data.type && PRODUCT_TYPE_LABELS[data.type as ProductType]) {
                setType(data.type as ProductType);
            }

            toast.success('Datos extraídos del PDF correctamente');
            setActiveTab('manual'); // Switch to manual so user can review/edit
        } catch (error) {
            console.error(error);
            toast.error('No se pudo leer el PDF. Por favor ingrese los datos manualmente.');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!client || !brand || !master) {
            toast.error('Todos los campos son obligatorios');
            return;
        }

        // Determine unit from master
        const unit = master.toLowerCase().includes('lb') ? 'LB' : 'KG';

        const info: ProductInfo = {
            client: client.toUpperCase(),
            brand: brand.toUpperCase(),
            master,
            type,
            unit
        };

        onSubmit(info);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Nuevo Producto</h2>
                        <p className="text-xs text-slate-500">Código: <span className="font-mono bg-slate-200 px-1 rounded">{initialCode}</span></p>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('pdf')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'pdf'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Subir PDF
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'manual'
                                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                                : 'text-slate-500 hover:bg-slate-50'
                            }`}
                    >
                        <Check className="w-4 h-4" />
                        Ingreso Manual
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">

                    {activeTab === 'pdf' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                                <Upload className="w-8 h-8" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">Cargar Ficha Técnica</h3>
                            <p className="text-xs text-slate-500 max-w-[200px]">
                                Sube el PDF para autocompletar la información del cliente, marca y empaque.
                            </p>

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".pdf"
                                className="hidden"
                                onChange={handleFileUpload}
                            />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="btn btn-primary w-full max-w-xs flex items-center justify-center gap-2"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Procesando...
                                    </>
                                ) : (
                                    'Seleccionar Archivo'
                                )}
                            </button>

                            <button
                                onClick={() => setActiveTab('manual')}
                                className="text-xs text-slate-400 hover:text-blue-600 underline"
                            >
                                O ingresar datos manualmente
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">Tipo de Producto</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as ProductType)}
                                    className="w-full p-2 border rounded-md text-sm bg-white"
                                >
                                    {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((t) => (
                                        <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">Cliente / Importador</label>
                                <input
                                    type="text"
                                    value={client}
                                    onChange={(e) => setClient(e.target.value)}
                                    placeholder="Ej: SIN IMPORTADOR"
                                    className="w-full p-2 border rounded-md text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">Marca</label>
                                <input
                                    type="text"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    placeholder="Ej: JIN PAI"
                                    className="w-full p-2 border rounded-md text-sm"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-700">Máster / Empaque</label>
                                <input
                                    type="text"
                                    value={master}
                                    onChange={(e) => setMaster(e.target.value)}
                                    placeholder="Ej: 6 Und * 1.5 Kg"
                                    className="w-full p-2 border rounded-md text-sm"
                                />
                                <p className="text-[10px] text-slate-400 text-right">
                                    Unidad detectada: {master.toLowerCase().includes('lb') ? 'LB' : 'KG'}
                                </p>
                            </div>

                            <div className="pt-2 flex gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                    Guardar y Continuar
                                </button>
                            </div>

                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
