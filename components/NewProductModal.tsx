
import React, { useState } from 'react';
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
            setActiveTab('manual');
        } catch (error) {
            console.error(error);
            toast.error('No se pudo leer el PDF. Por favor ingrese los datos manualmente.');
        } finally {
            setIsUploading(false);
            const input = document.getElementById('technical-spec-upload') as HTMLInputElement;
            if (input) input.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!client || !brand || !master) {
            toast.error('Todos los campos son obligatorios');
            return;
        }

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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[340px] p-[25px] rounded-[24px] relative text-left max-h-[90vh] overflow-y-auto"
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
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
                <h2 className="m-0 text-[22px] font-[800] text-[#111827]">Ficha Técnica</h2>
                <p className="mt-[5px] mb-[20px] text-[14px] text-[#6B7280]">
                    Código: <span className="font-bold text-blue-600">{initialCode}</span>
                </p>

                {/* Tabs */}
                <div className="flex gap-2 mb-[20px]">
                    <button
                        onClick={() => setActiveTab('pdf')}
                        className={`flex-1 py-[10px] text-[13px] font-[600] rounded-[10px] transition-all flex items-center justify-center gap-2 border-2 ${activeTab === 'pdf'
                            ? 'text-[#2563EB] bg-blue-50 border-[#2563EB]'
                            : 'text-[#6B7280] bg-[#F3F4F6] border-transparent hover:bg-[#E5E7EB]'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        PDF
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-[10px] text-[13px] font-[600] rounded-[10px] transition-all flex items-center justify-center gap-2 border-2 ${activeTab === 'manual'
                            ? 'text-[#2563EB] bg-blue-50 border-[#2563EB]'
                            : 'text-[#6B7280] bg-[#F3F4F6] border-transparent hover:bg-[#E5E7EB]'
                            }`}
                    >
                        <Check className="w-4 h-4" />
                        Manual
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'pdf' ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[16px] flex items-center justify-center mb-4 border border-blue-100">
                            <Upload className="w-7 h-7" />
                        </div>
                        <h3 className="text-[15px] font-[700] text-[#111827] mb-2">Cargar Ficha Técnica</h3>
                        <p className="text-[12px] text-[#6B7280] mb-6 max-w-[220px]">
                            Sube el PDF para extraer automáticamente la información.
                        </p>

                        <input
                            id="technical-spec-upload"
                            type="file"
                            accept=".pdf"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />

                        <label
                            htmlFor="technical-spec-upload"
                            className={`w-full bg-[#2563EB] text-white border-none p-[14px] rounded-[14px] text-[15px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-transform active:scale-[0.98] ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                            style={{ boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="text-[18px]">📄</span>
                                    <span>Seleccionar Archivo</span>
                                </>
                            )}
                        </label>

                        <button
                            onClick={() => setActiveTab('manual')}
                            className="mt-4 text-[12px] font-[500] text-[#6B7280] hover:text-[#2563EB] transition-colors"
                        >
                            O ingresar datos manualmente
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {/* Tipo de Producto */}
                        <div className="mb-[16px]">
                            <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">Tipo de Producto</label>
                            <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
                                <span className="mr-[10px] text-[18px]">🦐</span>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value as ProductType)}
                                    className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500] appearance-none cursor-pointer"
                                >
                                    {(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((t) => (
                                        <option key={t} value={t}>{PRODUCT_TYPE_LABELS[t]}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Cliente */}
                        <div className="mb-[16px]">
                            <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">Cliente / Importador</label>
                            <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
                                <span className="mr-[10px] text-[18px]">🏢</span>
                                <input
                                    type="text"
                                    value={client}
                                    onChange={(e) => setClient(e.target.value)}
                                    placeholder="Ej: SIN IMPORTADOR"
                                    className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500]"
                                />
                            </div>
                        </div>

                        {/* Marca */}
                        <div className="mb-[16px]">
                            <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">Marca</label>
                            <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
                                <span className="mr-[10px] text-[18px]">🏷️</span>
                                <input
                                    type="text"
                                    value={brand}
                                    onChange={(e) => setBrand(e.target.value)}
                                    placeholder="Ej: JIN PAI"
                                    className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500]"
                                />
                            </div>
                        </div>

                        {/* Máster */}
                        <div className="mb-[16px]">
                            <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">Máster / Empaque</label>
                            <div className="flex items-center bg-[#F3F4F6] rounded-[12px] px-[16px] py-[12px] border-2 border-transparent transition-all focus-within:bg-white focus-within:border-[#2563EB] focus-within:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]">
                                <span className="mr-[10px] text-[18px]">📦</span>
                                <input
                                    type="text"
                                    value={master}
                                    onChange={(e) => setMaster(e.target.value)}
                                    placeholder="Ej: 6 Und * 1.5 Kg"
                                    className="border-none bg-transparent w-full text-[15px] text-[#1F2937] outline-none font-[500]"
                                />
                            </div>
                            <div className="flex justify-end mt-2">
                                <span className="text-[11px] font-[500] text-[#6B7280] px-2 py-1 bg-[#F3F4F6] rounded-md">
                                    Unidad: <span className="text-[#1F2937] font-bold">{master.toLowerCase().includes('lb') ? 'LB' : 'KG'}</span>
                                </span>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3 mt-[20px]">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-[14px] text-[15px] font-[600] text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-[14px] transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-[14px] text-[15px] font-[600] text-white bg-[#10B981] hover:bg-[#059669] rounded-[14px] transition-transform active:scale-[0.98]"
                                style={{ boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                            >
                                Guardar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
