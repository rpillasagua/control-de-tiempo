'use client';

import { useState, useCallback } from 'react';
import { AnalystColor, ProductType, QualityAnalysis } from '@/lib/types';
import { PRODUCT_DATA } from '@/lib/product-data';
import AnalystColorSelector from './AnalystColorSelector';
import { Loader2, ArrowRight } from 'lucide-react';
import { searchAnalyses } from '@/lib/analysisService';
import { debounce } from '@/lib/utils';

// 1. Tipado estricto y reutilizable
interface AnalysisData {
    lote: string;
    codigo: string;
    talla: string;
    color: AnalystColor | null;
    productType?: ProductType;
    // @deprecated
    sections?: {
        weights: boolean;
        uniformity: boolean;
        defects: boolean;
    };
    remuestreoConfig?: {
        reason?: string;
        linkedAnalysisId?: string;
        activeFields: {
            pesoBruto?: boolean;
            pesoNeto?: boolean;
            pesoCongelado?: boolean;
            peseoSubmuestra?: boolean;
            conteo?: boolean;
            uniformidad?: boolean;
            defectos?: boolean;
        };
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
        sections: { weights: true, uniformity: true, defects: true },
        remuestreoConfig: {
            activeFields: {
                pesoBruto: true,
                pesoNeto: true,
                pesoCongelado: true,
                peseoSubmuestra: true,
                conteo: true,
                uniformidad: true,
                defectos: true
            }
        }
    });

    const [errors, setErrors] = useState<Partial<Record<keyof AnalysisData, string>>>({});

    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<QualityAnalysis[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);

    // Debounced search function
    const handleSearch = useCallback(
        debounce(async (term: string) => {
            if (!term || term.length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                // Dynamically import to ensure client-side safety if needed, or just call directly
                const results = await searchAnalyses(term);
                setSearchResults(results);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setIsSearching(false);
            }
        }, 500),
        []
    );

    const selectAnalysis = (analysis: QualityAnalysis) => {
        setFormData(prev => ({
            ...prev,
            remuestreoConfig: {
                ...prev.remuestreoConfig!,
                linkedAnalysisId: analysis.id
            }
        }));
        setSearchTerm(`${analysis.lote} (${analysis.codigo})`);
        setShowResults(false);
    };
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
                } else if (
                    initialData?.productType &&
                    initialData.productType !== 'CONTROL_PESOS' &&
                    initialData.productType !== 'REMUESTREO' && // ✅ Allow any code for REMUESTREO
                    product.type !== initialData.productType
                ) {
                    error = `El código es de tipo ${product.type} pero seleccionaste ${initialData.productType}`;
                }
            }
        }
        if (field === 'talla') {
            if (!formData.talla.trim()) {
                error = 'La talla es requerida';
            } else {
                const normalizedCode = getNormalizedCode(formData.codigo);
                const product = PRODUCT_DATA[normalizedCode];
                // Validate size using technical specs if we have a product type
                // We use the product type from PRODUCT_DATA or initialData if available
                const pType = product?.type || initialData?.productType || '';

                const sizeValidation = validateSize(normalizedCode, formData.talla, pType);
                if (!sizeValidation.isValid) {
                    error = sizeValidation.message || 'Talla inválida';
                }
            }
        }
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

                    {/* SECCIÓN DE REMUESTREO: Configuración Granular */}
                    {isRemuestreo && (
                        <div className="mb-[20px] p-[16px] bg-blue-50 border-2 border-blue-100 rounded-[14px] space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-[13px] font-[700] text-blue-900">
                                    Configuración de Remuestreo
                                </label>
                            </div>

                            {/* Motivo */}
                            <div className="bg-white p-3 rounded-xl border border-blue-100">
                                <label className="block text-[11px] font-[600] text-slate-500 mb-1">Motivo del Remuestreo</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Auditoría Cliente, Rechazo, Verificación"
                                    className="w-full text-sm outline-none text-slate-900 placeholder-slate-400"
                                    value={formData.remuestreoConfig?.reason || ''}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        remuestreoConfig: {
                                            ...prev.remuestreoConfig!,
                                            reason: e.target.value
                                        }
                                    }))}
                                />
                            </div>

                            {/* Vinculación con Búsqueda */}
                            <div className="bg-white p-3 rounded-xl border border-blue-100 relative">
                                <label className="block text-[11px] font-[600] text-slate-500 mb-1">Vincular a Análisis (Buscar por Lote o Código)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="🔍 Escribe lote o código..."
                                        className="w-full text-sm outline-none text-slate-900 placeholder-slate-400 border-b border-dashed border-blue-200 pb-1 focus:border-blue-500 transition-colors"
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            handleSearch(e.target.value);
                                        }}
                                        onFocus={() => setShowResults(true)}
                                    />

                                    {/* Spinner */}
                                    {isSearching && (
                                        <div className="absolute right-0 top-0">
                                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                        </div>
                                    )}
                                </div>

                                {/* Resultados de Búsqueda */}
                                {showResults && searchResults.length > 0 && (
                                    <div className="absolute z-10 left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-blue-100 max-h-48 overflow-y-auto">
                                        {searchResults.map((result) => (
                                            <div
                                                key={result.id}
                                                className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0"
                                                onClick={() => selectAnalysis(result)}
                                            >
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-700">{result.lote}</p>
                                                        <p className="text-[10px] text-slate-500">{result.codigo} • {new Date(result.date).toLocaleDateString()}</p>
                                                    </div>
                                                    {formData.remuestreoConfig?.linkedAnalysisId === result.id && (
                                                        <span className="text-green-500 text-xs">✓</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Análisis Seleccionado (Preview) */}
                                {formData.remuestreoConfig?.linkedAnalysisId && (
                                    <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded flex justify-between items-center">
                                        <span>🔗 Vinculado: <strong>{searchResults.find(r => r.id === formData.remuestreoConfig?.linkedAnalysisId)?.lote || formData.remuestreoConfig?.linkedAnalysisId}</strong></span>
                                        <button
                                            onClick={() => {
                                                setFormData(prev => ({
                                                    ...prev,
                                                    remuestreoConfig: { ...prev.remuestreoConfig!, linkedAnalysisId: undefined }
                                                }));
                                                setSearchTerm('');
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            ✖
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Campos a Analizar */}
                            <div>
                                <label className="block text-[11px] font-[600] text-slate-500 mb-2">Campos a Analizar:</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: 'pesoBruto', label: '⚖️ Peso Bruto' },
                                        { key: 'pesoNeto', label: '⚖️ Peso Neto' },
                                        { key: 'pesoCongelado', label: '❄️ Peso Congelado' },
                                        { key: 'conteo', label: '🔢 Conteo' },
                                        { key: 'uniformidad', label: '📏 Uniformidad' },
                                        { key: 'defectos', label: '🔍 Defectos' },
                                    ].map((field) => (
                                        <label key={field.key} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-blue-100 cursor-pointer hover:border-blue-300">
                                            <input
                                                type="checkbox"
                                                checked={!!formData.remuestreoConfig?.activeFields?.[field.key as keyof typeof formData.remuestreoConfig.activeFields]}
                                                onChange={(e) => setFormData(prev => ({
                                                    ...prev,
                                                    remuestreoConfig: {
                                                        ...prev.remuestreoConfig!,
                                                        activeFields: {
                                                            ...prev.remuestreoConfig!.activeFields,
                                                            [field.key]: e.target.checked
                                                        }
                                                    }
                                                }))}
                                                className="w-4 h-4 rounded text-blue-600"
                                            />
                                            <span className="text-xs font-medium text-slate-700">{field.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

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
