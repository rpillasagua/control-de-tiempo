'use client';

import { useState } from 'react';
import { AnalystColor, ProductType } from '@/lib/types';
import { PRODUCT_DATA } from '@/lib/product-data';
import AnalystColorSelector from './AnalystColorSelector';
import { Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import ImportNewProductModal from './NewProductModal';

// 1. Tipado estricto y reutilizable
interface AnalysisData {
    lote: string;
    codigo: string;
    talla: string;
    color: AnalystColor | null;
    productType?: ProductType;
    sections?: {
        weights: boolean;
        uniformity: boolean;
        defects: boolean;
    };
}

interface InitialFormProps {
    onComplete: (data: AnalysisData) => Promise<void> | void;
    initialData?: Partial<AnalysisData>;
}

// 2. Componente Input Reutilizable (Estilo DailyReportCard)
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    icon?: string;
}

const ModernInput = ({ error, label, id, icon, ...props }: CustomInputProps) => (
    <div className="mb-[16px]">
        <label className="block text-[13px] font-[600] text-[#374151] mb-[8px]">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <div
            className="flex items-center rounded-[12px] px-[16px] py-[12px] border-2 transition-all"
            style={{
                backgroundColor: error ? '#FEF2F2' : '#F3F4F6',
                borderColor: error ? '#FCA5A5' : 'transparent'
            }}
        >
            {icon && <span className="mr-[10px] text-[18px]">{icon}</span>}
            <input
                id={id}
                {...props}
                className="border-none bg-transparent w-full text-[15px] outline-none font-[500]"
                style={{ color: '#1F2937' }}
            />
        </div>
        {error && (
            <p className="text-[12px] text-red-600 mt-[4px] ml-[4px] font-[500]">
                {error}
            </p>
        )}
    </div>
);

import { useTechnicalSpecs } from '@/hooks/useTechnicalSpecs';

export default function InitialForm({ onComplete, initialData }: InitialFormProps) {
    // 3. Estado unificado
    const [formData, setFormData] = useState<AnalysisData>({
        lote: initialData?.lote || '',
        codigo: initialData?.codigo || '',
        talla: initialData?.talla || '',
        color: initialData?.color || null,
        sections: { weights: true, uniformity: true, defects: true }
    });

    const [errors, setErrors] = useState<Partial<Record<keyof AnalysisData, string>>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { validateSize } = useTechnicalSpecs();

    // Actualizar campos y limpiar errores
    const handleChange = (field: keyof AnalysisData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    // Marcar campo como tocado al salir (onBlur)
    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));

        // Si es el campo código, normalizarlo visualmente también
        if (field === 'codigo' && formData.codigo) {
            const normalized = getNormalizedCode(formData.codigo);
            if (normalized !== formData.codigo) {
                handleChange('codigo', normalized);
            }
        }

        validateField(field as keyof AnalysisData);
    };

    // Helper para normalizar código (agregar ceros a la izquierda si es necesario)
    const getNormalizedCode = (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return trimmed;
        if (PRODUCT_DATA[trimmed]) return trimmed;

        // Intentar con padding de ceros (asumiendo 5 dígitos como en la BD)
        const padded = trimmed.padStart(5, '0');
        if (PRODUCT_DATA[padded]) return padded;

        return trimmed;
    };

    // Helper para normalizar lote
    const getNormalizedLote = (input: string, type?: ProductType) => {
        let trimmed = input.trim().toUpperCase();
        if (!trimmed) return trimmed;

        // Limpiar mainPart de 'VA' si lo tiene pegado o separado
        let mainPart = trimmed.split('-')[0].trim().replace(/\s*VA\s*$/, '');
        let yearPart = trimmed.includes('-') ? trimmed.split('-')[1].trim() : '25';

        // Si mainPart es numérico, hacer padding a 7 dígitos
        if (/^\d+$/.test(mainPart)) {
            mainPart = mainPart.padStart(7, '0');
        }

        // Reconstruir
        let normalized = `${mainPart}-${yearPart}`;

        // Agregar VA si es Valor Agregado
        if (type === 'VALOR_AGREGADO') {
            if (!normalized.endsWith(' VA')) {
                normalized += ' VA';
            }
        }

        return normalized;
    };

    // 4. Custom Products Logic
    const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
    const [customProducts, setCustomProducts] = useState<Record<string, import('@/lib/types').ProductInfo>>({});
    const [tempCodeForModal, setTempCodeForModal] = useState('');

    const handleNewProductSubmit = (info: import('@/lib/types').ProductInfo) => {
        // Use the code that was originally entered
        const code = tempCodeForModal || formData.codigo.trim();
        const normalizedCode = getNormalizedCode(code); // Or just use raw input if we want

        // Update custom products
        setCustomProducts(prev => ({
            ...prev,
            [normalizedCode]: info
        }));

        // Update form data with the Type
        if (info.type) {
            handleChange('productType', info.type);
        }

        setIsNewProductModalOpen(false);
        setErrors(prev => ({ ...prev, codigo: undefined })); // Clear code error
        toast.success(`Producto ${code} agregado temporalmente`);
    };

    const validateField = (field: keyof AnalysisData) => {
        let error = '';
        if (field === 'lote' && !formData.lote.trim()) error = 'El lote es requerido';
        if (field === 'codigo') {
            if (formData.codigo.trim()) {
                const normalizedCode = getNormalizedCode(formData.codigo);
                const product = PRODUCT_DATA[normalizedCode] || customProducts[normalizedCode];

                if (!product) {
                    error = 'NOT_FOUND'; // Special flag for UI
                } else if (
                    initialData?.productType &&
                    initialData.productType !== 'CONTROL_PESOS' &&
                    initialData.productType !== 'REMUESTREO' &&
                    product.type !== initialData.productType
                ) {
                    error = `El código es de tipo ${product.type} pero seleccionaste ${initialData.productType}`;
                }
            } else {
                error = 'El código es requerido';
            }
        }
        if (field === 'talla') {
            if (!formData.talla.trim()) {
                error = 'La talla es requerida';
            } else {
                const normalizedCode = getNormalizedCode(formData.codigo);
                const product = PRODUCT_DATA[normalizedCode] || customProducts[normalizedCode];
                // Validate size using technical specs if we have a product type
                const pType = product?.type || initialData?.productType || '';

                const sizeValidation = validateSize(normalizedCode, formData.talla, pType);
                if (!sizeValidation.isValid) {
                    error = sizeValidation.message || 'Talla inválida';
                }
            }
        }
        if (field === 'color' && !formData.color) error = 'Selecciona un color';

        setErrors(prev => ({ ...prev, [field]: error || undefined }));
        return !error || error === 'NOT_FOUND'; // NOT_FOUND is technically invalid for submit but handled in UI
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar todo antes de enviar
        validateField('lote');
        validateField('codigo');
        validateField('talla');
        validateField('color');

        // Check if code is valid (exists in either DB or custom)
        const normalizedCode = getNormalizedCode(formData.codigo);
        const product = PRODUCT_DATA[normalizedCode] || customProducts[normalizedCode];

        if (!product) {
            // If not found, prevent submit and ensure error is shown
            setErrors(prev => ({ ...prev, codigo: 'NOT_FOUND' }));
            setTouched(prev => ({ ...prev, codigo: true }));
            return;
        }

        // Marcar todos los campos como tocados
        setTouched({ lote: true, codigo: true, talla: true, color: true });

        // Re-check blocking errors
        const currentErrors = { ...errors }; // Capture current state logic
        // We know 'product' exists now, so 'codigo' error should be cleared if it was NOT_FOUND
        if (currentErrors.codigo === 'NOT_FOUND') currentErrors.codigo = undefined;

        if (Object.values(currentErrors).some(e => e && e !== 'NOT_FOUND')) {
            return;
        }
        if (!formData.lote || !formData.talla || !formData.color) return;


        setIsSubmitting(true);
        try {
            let pType = initialData?.productType;
            if (!pType && normalizedCode) {
                if (product) pType = product.type;
            }

            const normalizedLote = getNormalizedLote(formData.lote, pType);

            await onComplete({
                ...formData,
                lote: normalizedLote,
                talla: formData.talla.trim(),
                codigo: normalizedCode
            });
        } catch (error) {
            console.error("Error submitting form:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to check if current type is REMUESTREO
    const isRemuestreo = initialData?.productType === 'REMUESTREO';

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <ImportNewProductModal
                isOpen={isNewProductModalOpen}
                onClose={() => setIsNewProductModalOpen(false)}
                onSubmit={handleNewProductSubmit}
                initialCode={tempCodeForModal}
            />

            <div
                className="bg-white w-[90%] max-w-[480px] p-[25px] rounded-[24px] relative text-left max-h-[90vh] overflow-y-auto"
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Título */}
                <h2 className="m-0 text-[22px] font-[800] text-[#111827]">
                    {isRemuestreo ? 'Configurar Remuestreo' : 'Nuevo Análisis de Calidad'}
                </h2>
                <p className="mt-[5px] mb-[25px] text-[14px] text-[#6B7280]">
                    {isRemuestreo ? 'Selecciona las secciones a analizar e ingresa los datos.' : 'Ingresa los datos de identificación del lote para comenzar.'}
                </p>

                <form onSubmit={handleSubmit}>
                    {/* Inputs */}
                    <ModernInput
                        id="lote"
                        label="Lote de Producción"
                        placeholder="Ej: L-2024-001"
                        icon="📦"
                        value={formData.lote}
                        onChange={(e) => handleChange('lote', e.target.value)}
                        onBlur={() => handleBlur('lote')}
                        error={touched.lote ? errors.lote : undefined}
                        required
                        autoFocus
                    />

                    <div className="mb-[16px]">
                        <ModernInput
                            id="codigo"
                            label="Código Referencia"
                            placeholder="Ej: REF-882"
                            icon="🔢"
                            value={formData.codigo}
                            onChange={(e) => handleChange('codigo', e.target.value)}
                            onBlur={() => handleBlur('codigo')}
                            error={touched.codigo && errors.codigo !== 'NOT_FOUND' ? errors.codigo : undefined}
                            required
                        />
                        {/* Error Alternativo con Botón de Agregar */}
                        {touched.codigo && errors.codigo === 'NOT_FOUND' && (
                            <div className="mt-[-10px] mb-[16px] p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in slide-in-from-top-2 duration-200">
                                <div className="text-[13px] text-blue-700 font-medium flex items-center gap-2">
                                    <span className="text-lg">🤔</span>
                                    <span>¿Código nuevo?</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTempCodeForModal(getNormalizedCode(formData.codigo));
                                        setIsNewProductModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold rounded-lg transition-colors shadow-sm"
                                >
                                    Agregar Ficha +
                                </button>
                            </div>
                        )}
                    </div>

                    <ModernInput
                        id="talla"
                        label="Talla"
                        placeholder="Ej: 40-50"
                        icon="📏"
                        value={formData.talla}
                        onChange={(e) => handleChange('talla', e.target.value)}
                        onBlur={() => handleBlur('talla')}
                        error={touched.talla ? errors.talla : undefined}
                        required
                    />

                    {/* SECCIÓN DE REMUESTREO: Checkboxes */}
                    {isRemuestreo && (
                        <div className="mb-[20px] p-[16px] bg-blue-50 border-2 border-blue-100 rounded-[14px]">
                            <label className="block text-[13px] font-[700] text-blue-900 mb-[12px]">
                                Secciones a Analizar <span className="text-red-500">*</span>
                            </label>
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={formData.sections?.weights}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            sections: { ...prev.sections!, weights: e.target.checked }
                                        }))}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">⚖️ Pesos y Glaseo</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={formData.sections?.uniformity}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            sections: { ...prev.sections!, uniformity: e.target.checked }
                                        }))}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">📏 Uniformidad</span>
                                </label>
                                <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-blue-100 cursor-pointer hover:border-blue-300 transition-all">
                                    <input
                                        type="checkbox"
                                        checked={formData.sections?.defects}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            sections: { ...prev.sections!, defects: e.target.checked }
                                        }))}
                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-medium text-slate-700">🔍 Defectos y Calidad</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Error Summary */}
                    {Object.keys(errors).some(key => errors[key as keyof AnalysisData] && errors[key as keyof AnalysisData] !== 'NOT_FOUND') && Object.keys(touched).length > 0 && (
                        <div className="mb-[20px] p-[16px] bg-red-50 border-2 border-red-200 rounded-[14px]">
                            <div className="flex items-start gap-[12px]">
                                <div
                                    className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold text-[14px]"
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: '#EF4444'
                                    }}
                                >
                                    !
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-[700] text-red-900 mb-[6px] text-[14px] m-0">No se puede continuar</h4>
                                    <ul className="space-y-[4px] text-[13px] text-red-700 m-0 p-0 list-none">
                                        {errors.lote && <li>• {errors.lote}</li>}
                                        {errors.codigo && errors.codigo !== 'NOT_FOUND' && <li>• {errors.codigo}</li>}
                                        {errors.codigo === 'NOT_FOUND' && <li>• Código no registrado (agrégalo arriba)</li>}
                                        {errors.talla && <li>• {errors.talla}</li>}
                                        {errors.color && <li>• {errors.color}</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Selector de Color */}
                    <div
                        className="mb-[20px] p-[16px] rounded-[14px] border-2 transition-all"
                        style={{
                            backgroundColor: errors.color && touched.color ? '#FEF2F2' : '#F3F4F6',
                            borderColor: errors.color && touched.color ? '#FCA5A5' : '#E5E7EB'
                        }}
                    >
                        <label className="block text-[13px] font-[700] text-[#374151] mb-[12px] text-center">
                            Color del Analista <span className="text-red-500">*</span>
                        </label>
                        <p className="text-[11px] text-[#6B7280] text-center mb-[12px] m-0">
                            💡 Este color te identificará en todos los análisis que realices hoy
                        </p>
                        <AnalystColorSelector
                            selectedColor={formData.color || ''}
                            onSelect={(c) => {
                                handleChange('color', c);
                                if (touched.color) validateField('color');
                            }}
                        />
                    </div>

                    {/* Botón Principal */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full text-white border-none rounded-[14px] text-[16px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-all"
                        style={{
                            backgroundColor: isSubmitting ? '#E5E7EB' : '#2563EB',
                            color: isSubmitting ? '#9CA3AF' : 'white',
                            padding: '16px',
                            boxShadow: isSubmitting ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                            if (!isSubmitting) {
                                e.currentTarget.style.backgroundColor = '#1D4ED8';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSubmitting) {
                                e.currentTarget.style.backgroundColor = '#2563EB';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                Comenzar Análisis
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
