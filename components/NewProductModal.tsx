import React, { useState } from 'react';
import { ProductType, ProductInfo, PRODUCT_TYPE_LABELS } from '../lib/types';
import { X, Upload, FileText, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { TechnicalSpecForm } from './TechnicalSpecForm';
import { CustomProductSpec } from '../lib/customProductService';

interface NewProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (info: ProductInfo) => void;
    initialCode: string;
}

export default function NewProductModal({ isOpen, onClose, onSubmit, initialCode }: NewProductModalProps) {
    const [step, setStep] = useState<'select' | 'review'>('select');
    const [activeTab, setActiveTab] = useState<'pdf' | 'manual'>('pdf');
    const [isUploading, setIsUploading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [extractedData, setExtractedData] = useState<Partial<CustomProductSpec>>({});

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

            // Transform API data to CustomProductSpec format if needed
            // The API already returns compatible fields
            setExtractedData({
                ...data,
                source: 'pdf'
            });

            toast.success('Datos extraídos. Por favor revise y complete la información.');
            setStep('review');
        } catch (error) {
            console.error(error);
            toast.error('No se pudo leer el PDF. Por favor ingrese los datos manualmente.');
            setStep('review'); // Allow manual entry on fail
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualEntry = () => {
        setExtractedData({ source: 'manual' });
        setStep('review');
    };

    const handleSaveSpec = async (spec: CustomProductSpec) => {
        try {
            const { saveCustomProductSpec } = await import('@/lib/customProductService');

            // Ensure code is set (it comes from props/form)
            const specToSave = {
                ...spec,
                code: initialCode.padStart(5, '0'),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await saveCustomProductSpec(specToSave);
            toast.success('Ficha técnica guardada correctamente');

            const info: ProductInfo = {
                client: specToSave.client,
                brand: specToSave.brand,
                master: specToSave.master || specToSave.packing || '',
                type: specToSave.type,
                unit: specToSave.unit
            };

            onSubmit(info);
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            toast.error('Error al guardar la ficha técnica');
        }
    };

    const handleClose = () => {
        // Reset state on close
        setStep('select');
        setExtractedData({});
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm animate-fade-in">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className={`bg-white w-[95%] ${step === 'review' ? 'max-w-4xl h-[90vh]' : 'max-w-[340px] max-h-[90vh]'} p-[25px] rounded-[24px] relative text-left overflow-y-auto transition-all duration-300`}
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out',
                    backgroundColor: '#ffffff'
                }}
            >
                {step === 'select' ? (
                    <>
                        <button
                            onClick={handleClose}
                            className="absolute top-[20px] right-[20px] bg-[#F3F4F6] border-none w-[32px] h-[32px] rounded-full text-[#6B7280] text-[16px] cursor-pointer flex items-center justify-center transition-colors hover:bg-[#E5E7EB] hover:text-black"
                            aria-label="Cerrar"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <h2 className="m-0 text-[22px] font-[800] text-[#111827]">Ficha Técnica</h2>
                        <p className="mt-[5px] mb-[20px] text-[14px] text-[#6B7280]">
                            Código: <span className="font-bold text-blue-600">{initialCode}</span>
                        </p>

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
                                    onClick={handleManualEntry}
                                    className="mt-4 text-[12px] font-[500] text-[#6B7280] hover:text-[#2563EB] transition-colors"
                                >
                                    O ingresar datos manualmente
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center py-6 text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-[16px] flex items-center justify-center mb-4 border border-blue-100">
                                    <Check className="w-7 h-7" />
                                </div>
                                <h3 className="text-[15px] font-[700] text-[#111827] mb-2">Ingreso Manual</h3>
                                <p className="text-[12px] text-[#6B7280] mb-6 max-w-[220px]">
                                    Ingresa todos los datos de la ficha técnica manualmente.
                                </p>
                                <button
                                    onClick={handleManualEntry}
                                    className="w-full bg-[#2563EB] text-white border-none p-[14px] rounded-[14px] text-[15px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-transform active:scale-[0.98]"
                                    style={{ boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                                >
                                    Continuar al Formulario
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <TechnicalSpecForm
                        code={initialCode}
                        initialData={extractedData}
                        onSave={handleSaveSpec}
                        onCancel={() => setStep('select')}
                    />
                )}
            </div>
        </div>
    );
}
