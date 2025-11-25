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

// 2. Componente Input Reutilizable (Versión Light/Clean)
interface CustomInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

const CleanInput = ({ error, label, id, ...props }: CustomInputProps) => (
    <div className="space-y-1.5 group">
        <label htmlFor={id} className="text-sm font-semibold text-slate-700 ml-1 flex items-center justify-center gap-2">
            {label} {props.required && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
            <input
                id={id}
                {...props}
                style={{ height: '56px' }}
                className={`
                    w-full bg-white border rounded-xl px-4 !h-14 text-slate-900 placeholder-slate-400
                    transition-all duration-200 outline-none text-base shadow-sm pl-4 text-center flex items-center
                    ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                        : 'border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-slate-300'
                    }
                `}
            />
        </div>
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
            window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="w-full max-w-xl mx-auto px-4">
            {/* Card Principal: Blanco con sombra elegante */}
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">

                {/* Header con fondo suave */}
                <div className="bg-slate-50/50 border-b border-slate-100 p-8 pb-6 text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                            Nuevo Análisis de Calidad
                        </h2>
                    </div>
                    <p className="text-slate-500 text-sm ml-1">
                        Ingresa los datos de identificación del lote para comenzar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    {/* Grid de Inputs */}
                    <div className="space-y-6">
                        <CleanInput
                            id="lote"
                            label="Lote de Producción"
                            placeholder="Ej: L-2024-001"
                            value={formData.lote}
                            onChange={(e) => handleChange('lote', e.target.value)}
                            onBlur={() => handleBlur('lote')}
                            error={touched.lote ? errors.lote : undefined}
                            required
                            autoFocus
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CleanInput
                                id="codigo"
                                label="Código Referencia"
                                placeholder="Ej: REF-882"
                                value={formData.codigo}
                                onChange={(e) => handleChange('codigo', e.target.value)}
                                onBlur={() => handleBlur('codigo')}
                                error={touched.codigo ? errors.codigo : undefined}
                                required
                            />
                            <CleanInput
                                id="talla"
                                label="Talla"
                                placeholder="Ej: 40-50"
                                value={formData.talla}
                                onChange={(e) => handleChange('talla', e.target.value)}
                                onBlur={() => handleBlur('talla')}
                                error={touched.talla ? errors.talla : undefined}
                                required
                            />
                        </div>
                    </div>

                    {/* Error Summary - Show if any errors exist and fields have been touched */}
                    {Object.keys(errors).some(key => errors[key as keyof AnalysisData]) && Object.keys(touched).length > 0 && (
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-in fade-in duration-200">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    !
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-red-900 mb-1">No se puede continuar</h4>
                                    <ul className="space-y-1 text-sm text-red-700">
                                        {errors.lote && <li>• {errors.lote}</li>}
                                        {errors.codigo && <li>• {errors.codigo}</li>}
                                        {errors.talla && <li>• {errors.talla}</li>}
                                        {errors.color && <li>• {errors.color}</li>}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Selector de Color (Adaptado a Light Mode) */}
                    <div className={`p-5 rounded-xl border transition-all duration-300 ${errors.color && touched.color ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-200'
                        }`}>
                        <label className="block text-sm font-semibold text-slate-700 mb-4 text-center">
                            Color del Analista <span className="text-red-500">*</span>
                        </label>
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
                        className={`
                            w-full py-4 rounded-xl font-bold text-base shadow-lg shadow-blue-500/20 transition-all transform
                            flex items-center justify-center gap-2
                            ${isSubmitting
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-blue-600/30 active:translate-y-0'
                            }
                        `}
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
