'use client';

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { ProductType } from '@/lib/types';
import { PRODUCT_DATA } from '@/lib/product-data';
import { Loader2, Save, X } from 'lucide-react';
import { useTechnicalSpecs } from '@/hooks/useTechnicalSpecs';

interface EditMetadataModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { lote: string; codigo: string; talla: string }) => Promise<void>;
    initialData: {
        lote: string;
        codigo: string;
        talla: string;
        productType?: ProductType;
    };
}

// Reused from InitialForm (duplicated to avoid refactoring risk)
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

export default function EditMetadataModal({ isOpen, onClose, onSave, initialData }: EditMetadataModalProps) {
    const [formData, setFormData] = useState({
        lote: '',
        codigo: '',
        talla: ''
    });

    const [errors, setErrors] = useState<Partial<Record<'lote' | 'codigo' | 'talla', string>>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { validateSize } = useTechnicalSpecs();

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setFormData({
                lote: initialData.lote,
                codigo: initialData.codigo,
                talla: initialData.talla
            });
            setErrors({});
            setTouched({});
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (field: 'lote' | 'codigo' | 'talla', value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const handleBlur = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
        if (field === 'codigo' && formData.codigo) {
            const normalized = getNormalizedCode(formData.codigo);
            if (normalized !== formData.codigo) {
                handleChange('codigo', normalized);
            }
        }
        validateField(field as 'lote' | 'codigo' | 'talla');
    };

    const getNormalizedCode = (input: string) => {
        const trimmed = input.trim();
        if (!trimmed) return trimmed;
        if (PRODUCT_DATA[trimmed]) return trimmed;
        const padded = trimmed.padStart(5, '0');
        if (PRODUCT_DATA[padded]) return padded;
        return trimmed;
    };

    const getNormalizedLote = (input: string, type?: ProductType) => {
        let trimmed = input.trim().toUpperCase();
        if (!trimmed) return trimmed;

        let mainPart = trimmed.split('-')[0].trim().replace(/\s*VA\s*$/, '');
        let yearPart = trimmed.includes('-') ? trimmed.split('-')[1].trim() : '25';

        if (/^\d+$/.test(mainPart)) {
            mainPart = mainPart.padStart(7, '0');
        }

        let normalized = `${mainPart}-${yearPart}`;

        if (type === 'VALOR_AGREGADO') {
            if (!normalized.endsWith(' VA')) {
                normalized += ' VA';
            }
        }

        return normalized;
    };

    const validateField = (field: 'lote' | 'codigo' | 'talla') => {
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
                }
            }
        }

        if (field === 'talla') {
            if (!formData.talla.trim()) {
                error = 'La talla es requerida';
            } else {
                const normalizedCode = getNormalizedCode(formData.codigo);
                const product = PRODUCT_DATA[normalizedCode];
                const pType = product?.type || initialData.productType || '';

                const sizeValidation = validateSize(normalizedCode, formData.talla, pType);
                if (!sizeValidation.isValid) {
                    error = sizeValidation.message || 'Talla inválida';
                }
            }
        }

        setErrors(prev => ({ ...prev, [field]: error || undefined }));
        return !error;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const isLoteValid = validateField('lote');
        const isCodigoValid = validateField('codigo');
        const isTallaValid = validateField('talla');

        setTouched({ lote: true, codigo: true, talla: true });

        if (!isLoteValid || !isCodigoValid || !isTallaValid) {
            return;
        }

        setIsSubmitting(true);
        try {
            const normalizedCode = getNormalizedCode(formData.codigo);

            let pType = initialData.productType;
            if (!pType && normalizedCode) {
                const product = PRODUCT_DATA[normalizedCode];
                if (product) pType = product.type;
            }

            const normalizedLote = getNormalizedLote(formData.lote, pType);

            await onSave({
                lote: normalizedLote,
                codigo: normalizedCode,
                talla: formData.talla.trim()
            });
            onClose();
        } catch (error) {
            console.error("Error saving metadata:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Use Portal to render at document root, bypassing parent stacking contexts
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/95 backdrop-blur-[3px] animate-in fade-in duration-200"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
        >
            <div
                className="bg-white w-[90%] max-w-[420px] p-[25px] rounded-[24px] relative text-left shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative',
                    zIndex: 100000,
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="m-0 text-[20px] font-[800] text-[#111827] mb-1">
                    Editar Metadatos
                </h2>
                <p className="text-[13px] text-[#6B7280] mb-6">
                    Modificar estos datos moverá automáticamente las carpetas de fotos.
                </p>

                <form onSubmit={handleSubmit}>
                    <ModernInput
                        id="edit-lote"
                        label="Lote de Producción"
                        icon="📦"
                        value={formData.lote}
                        onChange={(e) => handleChange('lote', e.target.value)}
                        onBlur={() => handleBlur('lote')}
                        error={touched.lote ? errors.lote : undefined}
                        required
                    />

                    <ModernInput
                        id="edit-codigo"
                        label="Código Referencia"
                        icon="🔢"
                        value={formData.codigo}
                        onChange={(e) => handleChange('codigo', e.target.value)}
                        onBlur={() => handleBlur('codigo')}
                        error={touched.codigo ? errors.codigo : undefined}
                        required
                    />

                    <ModernInput
                        id="edit-talla"
                        label="Talla"
                        icon="📏"
                        value={formData.talla}
                        onChange={(e) => handleChange('talla', e.target.value)}
                        onBlur={() => handleBlur('talla')}
                        error={touched.talla ? errors.talla : undefined}
                        required
                    />

                    <div className="flex gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-[14px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-3 rounded-[14px] font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-600/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
