'use client';

import { useState } from 'react';
import { AnalystColor, ProductType } from '@/lib/types';
import { PRODUCT_DATA } from '@/lib/product-data';
import AnalystColorSelector from './AnalystColorSelector';
import { Loader2, ArrowRight } from 'lucide-react';

// 1. Tipado estricto y reutilizable
interface AnalysisData {
    lote: string;
    codigo: string;
    talla: string;
    color: AnalystColor | null;
    productType?: ProductType;
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

export default function InitialForm({ onComplete, initialData }: InitialFormProps) {
    // 3. Estado unificado
    const [formData, setFormData] = useState<AnalysisData>({
        lote: initialData?.lote || '',
        codigo: initialData?.codigo || '',
        talla: initialData?.talla || '',
        color: initialData?.color || null,
    });

    const [errors, setErrors] = useState<Partial<Record<keyof AnalysisData, string>>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const validateField = (field: keyof AnalysisData) => {
        let error = '';
        if (field === 'lote' && !formData.lote.trim()) error = 'El lote es requerido';
        if (field === 'codigo') {
            if (!formData.codigo.trim()) {
                error = 'El código es requerido';
            } else {
                const normalizedCode = getNormalizedCode(formData.codigo);
                const product = PRODUCT_DATA[normalizedCode];

                if (!product) {
                    error = 'Código no encontrado en la base de datos';
                } else if (initialData?.productType && initialData.productType !== 'CONTROL_PESOS' && product.type !== initialData.productType) {
                    error = `El código es de tipo ${product.type} pero seleccionaste ${initialData.productType}`;
                }
            }
        }
        if (field === 'talla' && !formData.talla.trim()) error = 'La talla es requerida';
        if (field === 'color' && !formData.color) error = 'Selecciona un color';

        setErrors(prev => ({ ...prev, [field]: error || undefined }));
        return !error;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validar todo antes de enviar
        const isLoteValid = validateField('lote');
        const isCodigoValid = validateField('codigo');
        const isTallaValid = validateField('talla');
        const isColorValid = validateField('color');

        // Marcar todos los campos como tocados
        setTouched({ lote: true, codigo: true, talla: true, color: true });

        if (!isLoteValid || !isCodigoValid || !isTallaValid || !isColorValid) {
            return;
        }

        setIsSubmitting(true);
        try {
            const normalizedCode = getNormalizedCode(formData.codigo);

            let pType = initialData?.productType;
            if (!pType && normalizedCode) {
                const product = PRODUCT_DATA[normalizedCode];
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

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-[3px] animate-fade-in">
            <style jsx global>{`
                @keyframes floatUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div
                className="bg-white w-[90%] max-w-[480px] p-[25px] rounded-[24px] relative text-left max-h-[90vh] overflow-y-auto"
                style={{
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animation: 'floatUp 0.3s ease-out'
                }}
            >
                {/* Título */}
                <h2 className="m-0 text-[22px] font-[800] text-[#111827]">
                    Nuevo Análisis de Calidad
                </h2>
                <p className="mt-[5px] mb-[25px] text-[14px] text-[#6B7280]">
                    Ingresa los datos de identificación del lote para comenzar.
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

                    <ModernInput
                        id="codigo"
                        label="Código Referencia"
                        placeholder="Ej: REF-882"
                        icon="🔢"
                        value={formData.codigo}
                        onChange={(e) => handleChange('codigo', e.target.value)}
                        onBlur={() => handleBlur('codigo')}
                        error={touched.codigo ? errors.codigo : undefined}
                        required
                    />

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

                    {/* Error Summary */}
                    {Object.keys(errors).some(key => errors[key as keyof AnalysisData]) && Object.keys(touched).length > 0 && (
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
                                        {errors.codigo && <li>• {errors.codigo}</li>}
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
