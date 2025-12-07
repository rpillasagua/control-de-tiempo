
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

    // const fileInputRef = useRef<HTMLInputElement>(null); // Ref replaced by label htmlFor pattern

    if (!isOpen) return null;

    // Helper Component for Modern Input (extracted for reusability within file)
    const ModernInput = ({
        label,
        value,
        onChange,
        placeholder,
        required,
        disabled,
        readOnly,
        type = "text",
        icon
    }: any) => (
        <div className="mb-[16px]">
            <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                className={`flex items-center rounded-[12px] px-[16px] py-[12px] border-2 transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                style={{
                    backgroundColor: '#F3F4F6',
                    borderColor: 'transparent'
                }}
            >
                {icon && <span className="mr-[10px] text-[18px]">{icon}</span>}
                <input
                    type={type}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    required={required}
                    disabled={disabled}
                    readOnly={readOnly}
                    className="border-none bg-transparent w-full text-[15px] outline-none font-[500]"
                    style={{ color: '#1F2937' }}
                />
            </div>
        </div>
    );

    const ModernSelect = ({
        label,
        value,
        onChange,
        options,
        required
    }: any) => (
        <div className="mb-[16px]">
            <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div
                className="flex items-center rounded-[12px] px-[16px] py-[12px] border-2 transition-all"
                style={{
                    backgroundColor: '#F3F4F6',
                    borderColor: 'transparent'
                }}
            >
                <select
                    value={value}
                    onChange={onChange}
                    required={required}
                    className="border-none bg-transparent w-full text-[15px] outline-none font-[500] appearance-none"
                    style={{ color: '#1F2937' }}
                >
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );

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
            // Reset input value to allow re-uploading same file if needed
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
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">

                {/* Header */}
                <div className="flex justify-between items-center px-[24px] py-[20px] border-b border-slate-100 bg-white">
                    <div>
                        <h2 className="text-[20px] font-[700] text-[#111827] tracking-tight">Nuevo Producto</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[12px] font-medium text-slate-500">Código:</span>
                            <span className="text-[12px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                                {initialCode}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-all duration-200 text-slate-400 hover:text-red-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Custom Tabs */}
                <div className="flex px-[6px] pt-[6px]">
                    <button
                        onClick={() => setActiveTab('pdf')}
                        className={`flex-1 py-3 text-[13px] font-[600] rounded-t-[12px] transition-all flex items-center justify-center gap-2 ${activeTab === 'pdf'
                            ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        Subir PDF
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-3 text-[13px] font-[600] rounded-t-[12px] transition-all flex items-center justify-center gap-2 ${activeTab === 'manual'
                            ? 'text-blue-600 bg-blue-50/50 border-b-2 border-blue-600'
                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                    >
                        <Check className="w-4 h-4" />
                        Ingreso Manual
                    </button>
                </div>

                {/* Content */}
                <div className="p-[24px] bg-white">

                    {activeTab === 'pdf' ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-[24px] flex items-center justify-center mb-2 shadow-sm border border-blue-100/50">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-[16px] font-[700] text-[#111827]">Cargar Ficha Técnica</h3>
                                <p className="text-[13px] text-slate-500 max-w-[240px] leading-relaxed mx-auto">
                                    Sube el PDF para extraer automáticamente la información del producto.
                                </p>
                            </div>

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
                                className={`w-full max-w-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white py-[14px] rounded-[14px] text-[15px] font-[600] shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all duration-300 flex items-center justify-center gap-2 active:scale-95 cursor-pointer ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="truncate">Seleccionar Archivo</span>
                                    </>
                                )}
                            </label>

                            <button
                                onClick={() => setActiveTab('manual')}
                                className="text-[13px] font-[500] text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                O ingresar datos manualmente
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-1">

                            <ModernSelect
                                label="Tipo de Producto"
                                value={type}
                                onChange={(e: any) => setType(e.target.value as ProductType)}
                                options={(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((t) => ({
                                    value: t,
                                    label: PRODUCT_TYPE_LABELS[t]
                                }))}
                            />

                            <ModernInput
                                label="Cliente / Importador"
                                value={client}
                                onChange={(e: any) => setClient(e.target.value)}
                                placeholder="Ej: SIN IMPORTADOR"
                            />

                            <ModernInput
                                label="Marca"
                                value={brand}
                                onChange={(e: any) => setBrand(e.target.value)}
                                placeholder="Ej: JIN PAI"
                            />

                            <ModernInput
                                label="Máster / Empaque"
                                value={master}
                                onChange={(e: any) => setMaster(e.target.value)}
                                placeholder="Ej: 6 Und * 1.5 Kg"
                            />

                            <div className="flex justify-end -mt-3 mb-6">
                                <span className="text-[11px] font-medium text-slate-400 px-2 py-1 bg-slate-50 rounded-md">
                                    Unidad detectada: <span className="text-slate-600">{master.toLowerCase().includes('lb') ? 'LB' : 'KG'}</span>
                                </span>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 py-[14px] text-[15px] font-[600] text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-[14px] transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-[14px] text-[15px] font-[600] text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-[14px] shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all active:scale-95"
                                >
                                    Guardar
                                </button>
                            </div>

                        </form>
                    )}

                </div>
            </div>
        </div>
    );
}
