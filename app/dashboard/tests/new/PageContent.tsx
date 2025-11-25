'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Textarea } from '@/components/ui';

// Existing Components
import ProductTypeSelector from '@/components/ProductTypeSelector';
import InitialForm from '@/components/InitialForm';
import AnalysisTabs from '@/components/AnalysisTabs';
import PhotoCapture from '@/components/PhotoCapture';
import ControlPesosBrutos from '@/components/ControlPesosBrutos';
import DefectSelector from '@/components/DefectSelector';
import { WeightInputRow } from '@/components/WeightInputRow';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const DeleteConfirmationModal = dynamic(() => import('@/components/DeleteConfirmationModal'), {
    loading: () => null
});

import ViewModeSelector, { ViewMode, useViewMode } from '@/components/ViewModeSelector';

// Types and Utils
import {
    ProductType,
    AnalystColor,
    Analysis,
    PesoBrutoRegistro,
    ANALYST_COLOR_HEX,
    PesoConFoto
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useWeightInput } from '@/hooks/useWeightInput';
import { PRODUCT_DATA } from '@/lib/product-data';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useAnalysisSave } from '@/hooks/useAnalysisSave';

export default function NewMultiAnalysisPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [productType, setProductType] = useState<ProductType | null>(null);
    const [basicsCompleted, setBasicsCompleted] = useState(false);

    // Analysis State
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [analyses, setAnalyses] = useState<Analysis[]>([]);
    const [activeAnalysisIndex, setActiveAnalysisIndex] = useState(0);

    // Global Fields
    const [codigo, setCodigo] = useState('');
    const [lote, setLote] = useState('');
    const [talla, setTalla] = useState('');
    const [analystColor, setAnalystColor] = useState<AnalystColor | null>(null);

    // UI State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteModalConfig, setDeleteModalConfig] = useState<{
        title: string;
        description: string;
        action: () => Promise<void>;
    }>({
        title: 'Eliminar Análisis',
        description: 'Esta acción eliminará el análisis permanentemente',
        action: async () => { }
    });
    const { viewMode, setViewMode } = useViewMode();
    const [globalPesoBruto, setGlobalPesoBruto] = useState<PesoConFoto>({});
    const [isCompleted, setIsCompleted] = useState(false);
    const [codeValidationError, setCodeValidationError] = useState<string | null>(null);

    // Original metadata for editing (to preserve creation time/date/shift/color)
    const [originalCreatedAt, setOriginalCreatedAt] = useState<string | null>(null);
    const [originalCreatedBy, setOriginalCreatedBy] = useState<string | null>(null);
    const [originalDate, setOriginalDate] = useState<string | null>(null);
    const [originalShift, setOriginalShift] = useState<'DIA' | 'NOCHE' | null>(null);
    const [originalAnalystColor, setOriginalAnalystColor] = useState<AnalystColor | null>(null);

    // Derived State
    const currentAnalysis = analyses[activeAnalysisIndex] || {};
    const productInfo = PRODUCT_DATA[codigo];
    const clientName = productInfo?.client || '';
    const brandName = productInfo?.brand || '';
    const masterInfo = productInfo?.master || '';
    const weightUnit = productInfo?.unit || 'LB';
    const isDualBag = false;

    // Hooks
    const {
        isSaving,
        saveError,
        saveDocument
    } = useAnalysisSave({
        analysisId,
        basicsCompleted,
        analyses,
        codigo,
        lote,
        talla,
        productType,
        analystColor,
        originalAnalystColor,
        originalCreatedAt,
        originalCreatedBy,
        originalDate,
        originalShift,
        globalPesoBruto,
        isCompleted,
        setIsCompleted,
    });

    const {
        isUploadingGlobal,
        uploadingPhotos,
        handlePhotoCapture,
        handlePesoBrutoPhotoCapture,
        handleGlobalPesoBrutoPhoto,
        isFieldUploading,
        isPesoBrutoUploading
    } = usePhotoUpload({
        analysisId: analysisId!,
        analyses,
        setAnalyses,
        activeAnalysisIndex,
        codigo,
        lote,
        saveDocument,
        globalPesoBruto,
        setGlobalPesoBruto
    });

    // Auto-save effect (moved from hook to allow coordination with upload state)
    useEffect(() => {
        // No guardar si se está subiendo una foto (evita race condition)
        // No guardar si el análisis ya está completado
        if (basicsCompleted && analysisId && !isUploadingGlobal && !isCompleted) {
            const timer = setTimeout(() => {
                saveDocument();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [analyses, basicsCompleted, isUploadingGlobal, isCompleted, analysisId, saveDocument]);

    // Prevenir cierre de pestaña si hay subidas en progreso
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isUploadingGlobal) {
                e.preventDefault();
                e.returnValue = ''; // Mensaje estándar del navegador
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isUploadingGlobal]);

    // Helper Functions
    const updateAnalysisAtIndex = (index: number, updates: Partial<Analysis>) => {
        setAnalyses(prev => prev.map((a, i) => i === index ? { ...a, ...updates } : a));
    };

    const updateCurrentAnalysis = (updates: Partial<Analysis>) => {
        updateAnalysisAtIndex(activeAnalysisIndex, updates);
    };

    const handleAddAnalysis = () => {
        const newAnalysis: Analysis = {
            numero: analyses.length + 1,
        };
        setAnalyses(prev => [...prev, newAnalysis]);
        setActiveAnalysisIndex(analyses.length);
    };

    const handleInitialFormComplete = (data: any) => {
        setCodigo(data.codigo);
        setLote(data.lote);
        setTalla(data.talla);
        setAnalystColor(data.color);
        setBasicsCompleted(true);
        setAnalyses([{ numero: 1 }]);
        setAnalysisId(generateId());
    };

    // Handle full analysis deletion
    const handleDeleteAnalysis = async () => {
        if (!analysisId) return;
        try {
            const { deleteAnalysis } = await import('@/lib/analysisService');
            await deleteAnalysis(analysisId);
            toast.success('Análisis eliminado');
            router.push('/');
        } catch (error) {
            console.error('Error deleting analysis:', error);
            toast.error('Error al eliminar el análisis');
        }
    };

    const handleDeleteIndividualAnalysis = async (index: number) => {
        setDeleteModalConfig({
            title: `Eliminar Análisis #${index + 1}`,
            description: `¿Estás seguro? Esta acción eliminará solo el análisis #${index + 1} y sus fotos asociadas.`,
            action: async () => {
                const analysisToDelete = analyses[index];

                // 1. Collect all photo URLs to delete
                const photosToDelete: string[] = [];

                // Helper to add if exists
                const addIfUrl = (url?: string) => {
                    if (url && url.includes('drive.google.com')) {
                        const match = url.match(/id=([^&]+)/);
                        if (match && match[1]) photosToDelete.push(match[1]);
                    }
                };

                addIfUrl(analysisToDelete.fotoCalidad);
                analysisToDelete.pesosBrutos?.forEach(p => addIfUrl(p.fotoUrl));
                addIfUrl(analysisToDelete.uniformidad?.grandes?.fotoUrl);
                addIfUrl(analysisToDelete.uniformidad?.pequenos?.fotoUrl);

                // 2. Delete photos from Drive
                if (photosToDelete.length > 0) {
                    try {
                        const { googleDriveService } = await import('@/lib/googleDriveService');
                        await Promise.all(photosToDelete.map(id => googleDriveService.deleteFile(id)));
                        toast.success(`${photosToDelete.length} fotos eliminadas`);
                    } catch (error) {
                        console.error('Error deleting photos:', error);
                        toast.error('Error al eliminar algunas fotos');
                    }
                }

                // 3. Update State
                const newAnalyses = [...analyses];
                newAnalyses.splice(index, 1);

                // Re-assign numbers
                const updatedAnalyses = newAnalyses.map((a, i) => ({ ...a, numero: i + 1 }));

                setAnalyses(updatedAnalyses);

                // Adjust active index if needed
                if (activeAnalysisIndex >= updatedAnalyses.length) {
                    setActiveAnalysisIndex(Math.max(0, updatedAnalyses.length - 1));
                }

                toast.success(`Análisis #${index + 1} eliminado`);
            }
        });
        setShowDeleteModal(true);
    };

    const handleSmartDelete = () => {
        if (analyses.length <= 1) {
            // Delete entire report
            setDeleteModalConfig({
                title: 'Eliminar Reporte Completo',
                description: 'Al ser el único análisis, esta acción eliminará todo el reporte, incluyendo todas las fotos y carpetas asociadas.',
                action: handleDeleteAnalysis
            });
        } else {
            // Delete current analysis only
            handleDeleteIndividualAnalysis(activeAnalysisIndex);
        }
        setShowDeleteModal(true);
    };

    // Load initial data effect with real-time subscription
    useEffect(() => {
        let unsubscribe: (() => void) | undefined;

        const loadAnalysis = async () => {
            const id = searchParams.get('id');
            if (id) {
                try {
                    const { subscribeToAnalysis } = await import('@/lib/analysisService');

                    unsubscribe = subscribeToAnalysis(id, (data) => {
                        if (data) {
                            setAnalysisId(data.id);
                            setProductType(data.productType);
                            setCodigo(data.codigo);
                            setLote(data.lote);
                            setTalla(data.talla || '');
                            setAnalystColor(data.analystColor);
                            setAnalyses(data.analyses);
                            setGlobalPesoBruto(data.globalPesoBruto || {});
                            setBasicsCompleted(true);

                            setOriginalCreatedAt(data.createdAt);
                            setOriginalCreatedBy(data.createdBy);
                            setOriginalDate(data.date);
                            setOriginalShift(data.shift);
                            setOriginalAnalystColor(data.analystColor);

                            if (data.status === 'COMPLETADO') {
                                setIsCompleted(true);
                            }
                        } else {
                            toast.error('Análisis no encontrado');
                            router.push('/');
                        }
                        setIsLoading(false);
                    });

                } catch (error) {
                    console.error('Error setting up analysis subscription:', error);
                    toast.error('Error al cargar el análisis');
                    setIsLoading(false);
                }
            } else {
                setIsLoading(false);
            }
        };

        loadAnalysis();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [searchParams, router]);

    // Handler for pesos brutos
    const handlePesosBrutosChange = (registros: PesoBrutoRegistro[]) => {
        updateCurrentAnalysis({ pesosBrutos: registros });
    };

    // Handler for defects
    const handleDefectsChange = (defects: { [key: string]: number }) => {
        updateCurrentAnalysis({ defectos: defects });
    };

    // Use the new hook for weight inputs
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { handleWeightChange } = useWeightInput(currentAnalysis, updateCurrentAnalysis);

    // Handler for deleting peso bruto registro (including Drive cleanup)
    const handlePesoBrutoDelete = async (registro: PesoBrutoRegistro) => {
        // Si el registro tiene foto, intentar eliminarla de Google Drive
        if (registro?.fotoUrl && !registro.fotoUrl.startsWith('blob:')) {
            try {
                const { googleDriveService } = await import('@/lib/googleDriveService');

                // Helper para extraer ID de archivo de URL de Google Drive
                const extractFileIdFromUrl = (url: string): string | null => {
                    if (!url) return null;
                    const customMatch = url.match(/[?&]x-file-id=([^&]+)/);
                    if (customMatch) return customMatch[1];
                    const googleUserContentMatch = url.match(/googleusercontent\.com\/d\/([^=?&]+)/);
                    if (googleUserContentMatch) return googleUserContentMatch[1];
                    const match = url.match(/[?&]id=([^&]+)/);
                    if (match) return match[1];
                    const match2 = url.match(/\/file\/d\/([^/]+)/);
                    if (match2) return match2[1];
                    return null;
                };

                const fileId = extractFileIdFromUrl(registro.fotoUrl);

                if (fileId) {
                    await googleDriveService.deleteFile(fileId);
                    console.log('✅ Foto de peso bruto eliminada de Google Drive');
                }

                // 🔥 Transactional delete from Firestore
                if (analysisId && currentAnalysis.pesosBrutos) {
                    const index = currentAnalysis.pesosBrutos.findIndex(r => r.id === registro.id);
                    if (index !== -1) {
                        const { deleteAnalysisPhoto } = await import('@/lib/analysisService');
                        await deleteAnalysisPhoto(analysisId, activeAnalysisIndex, `pesosBrutos.${index}.fotoUrl`);
                        console.log('✅ Foto eliminada de Firestore transaccionalmente');
                    }
                }

            } catch (error) {
                console.warn('⚠️ No se pudo eliminar la foto de Google Drive:', error);
                // No lanzamos error para permitir que la UI elimine el registro visualmente
            }
        }
    };

    const validateCurrentAnalysis = (): { isValid: boolean; missingFields: string[] } => {
        if (productType === 'CONTROL_PESOS') return { isValid: true, missingFields: [] };

        const missing: string[] = [];

        // 1. Validar Pesos
        if (!isDualBag) {
            if (!currentAnalysis.pesoBruto?.valor) missing.push('Peso Bruto (Valor)');
            if (!currentAnalysis.pesoBruto?.fotoUrl) missing.push('Peso Bruto (Foto)');
        }

        if (!currentAnalysis.pesoNeto?.valor) missing.push('Peso Neto (Valor)');
        if (!currentAnalysis.pesoNeto?.fotoUrl) missing.push('Peso Neto (Foto)');



        // 2. Validar Conteo
        if (!currentAnalysis.conteo) missing.push('Conteo');

        // 3. Validar Uniformidad
        if (!currentAnalysis.uniformidad?.grandes?.valor) missing.push('Uniformidad Grandes (Valor)');
        if (!currentAnalysis.uniformidad?.grandes?.fotoUrl) missing.push('Uniformidad Grandes (Foto)');
        if (!currentAnalysis.uniformidad?.pequenos?.valor) missing.push('Uniformidad Pequeños (Valor)');
        if (!currentAnalysis.uniformidad?.pequenos?.fotoUrl) missing.push('Uniformidad Pequeños (Foto)');

        // 4. Validar Defectos (Al menos uno > 0)
        const hasDefects = currentAnalysis.defectos && Object.values(currentAnalysis.defectos as Record<string, number>).some((val: number) => val > 0);
        if (!hasDefects) missing.push('Defectos (Al menos uno)');

        return {
            isValid: missing.length === 0,
            missingFields: missing
        };
    };

    const handleCompleteAnalysis = async () => {
        if (!analysisId) return;

        const validation = validateCurrentAnalysis();
        if (!validation.isValid) {
            toast.error('Faltan campos requeridos para completar el análisis', {
                description: (
                    <ul className="list-disc pl-4 mt-2 text-sm">
                        {validation.missingFields.map(field => (
                            <li key={field}>{field}</li>
                        ))}
                    </ul>
                ),
                duration: 5000,
            });
            return;
        }

        try {
            await saveDocument('COMPLETADO');
            toast.success('¡Análisis completado exitosamente!');
            setTimeout(() => {
                router.push('/');
                router.refresh();
            }, 1000);
        } catch (error) {
            console.error('Error completing analysis:', error);
            toast.error('Error al completar el análisis');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
                    <div className="text-slate-400 font-medium">Cargando análisis...</div>
                </div>
            </div>
        );
    }

    if (!productType) {
        return (
            <div className="min-h-screen p-4">
                <div className="max-w-4xl mx-auto">
                    <ProductTypeSelector
                        selectedType={productType || undefined}
                        onSelect={(type) => setProductType(type)}
                    />
                </div>
            </div>
        );
    }

    if (!basicsCompleted) {
        return (
            <div className="min-h-screen p-4">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={() => router.push('/')}
                        className="flex items-center gap-2 px-4 py-2.5 mb-6 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all border border-slate-800 hover:border-slate-700"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Volver al Dashboard</span>
                    </button>

                    <InitialForm
                        onComplete={handleInitialFormComplete}
                        initialData={{ productType }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Floating Save Indicator (top-right corner) */}
            {(isSaving || saveError) && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in duration-200">
                    {isSaving ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg shadow-lg text-xs font-medium">
                            <Clock className="w-3.5 h-3.5 animate-spin" />
                            <span>Guardando...</span>
                        </div>
                    ) : saveError ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg shadow-lg text-xs font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Error al guardar</span>
                        </div>
                    ) : null}
                </div>
            )}

            <div className="max-w-4xl mx-auto space-y-6 p-4">
                {/* Minimalist Header */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all"
                                title="Volver"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="h-5 w-px bg-slate-800"></div>
                            <h1 className="text-sm font-semibold text-slate-100">
                                {productType === 'CONTROL_PESOS' ? (
                                    <span className="text-lg font-bold">CONTROL DE PESOS</span>
                                ) : (
                                    <>
                                        Análisis de Calidad {' '}
                                        <span className="text-slate-300">
                                            {productType === 'ENTERO' ? 'Entero' : productType === 'COLA' ? 'Cola' : 'Valor Agregado'}
                                        </span>
                                    </>
                                )}
                            </h1>
                        </div>

                        {/* Sample number badge and analyst color */}
                        <div className="flex items-center gap-3">
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                                style={{ backgroundColor: analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9' }}
                            >
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span>Muestra {activeAnalysisIndex + 1}/{analyses.length}</span>
                            </div>

                            <div
                                className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9' }}
                                title={`Color del analista: ${analystColor}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Analysis Tabs */}
                <AnalysisTabs
                    analysesCount={analyses.length}
                    activeTab={activeAnalysisIndex}
                    onTabChange={setActiveAnalysisIndex}
                    onAddAnalysis={handleAddAnalysis}
                    analystColor={analystColor!}
                />

                {/* Current Analysis Form */}
                <div className="space-y-6">
                    {/* Appearance Selector */}
                    <div className="flex justify-end">
                        <ViewModeSelector viewMode={viewMode} onModeChange={setViewMode} />
                    </div>

                    {/* Información del Producto */}
                    {(clientName || brandName || masterInfo || codigo || lote || talla) && (
                        <div className="bg-white border-l-4 border-blue-600 shadow-sm rounded-sm p-3" style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                            <div className="grid grid-cols-3 gap-x-3 gap-y-2" style={{ margin: 0, padding: 0 }}>
                                {/* Código */}
                                <div style={{ margin: 0, padding: 0 }}>
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase" style={{ lineHeight: 1, marginBottom: '2px' }}>CÓDIGO</div>
                                    <div className="text-sm font-black text-slate-800" style={{ lineHeight: 1 }}>
                                        {codigo}
                                    </div>
                                </div>

                                {/* Lote */}
                                <div style={{ margin: 0, padding: 0 }}>
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase" style={{ lineHeight: 1, marginBottom: '2px' }}>LOTE</div>
                                    <div className="text-sm font-black text-slate-800" style={{ lineHeight: 1 }}>
                                        {lote}
                                    </div>
                                </div>

                                {/* Talla */}
                                {talla && (
                                    <div style={{ margin: 0, padding: 0 }}>
                                        <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase" style={{ lineHeight: 1, marginBottom: '2px' }}>TALLA</div>
                                        <div className="text-sm font-black text-slate-800" style={{ lineHeight: 1 }}>
                                            {talla}
                                        </div>
                                    </div>
                                )}

                                {/* Separator */}
                                <div className="col-span-3 my-1 border-t border-slate-200"></div>

                                {/* Cliente */}
                                <div style={{ margin: 0, padding: 0 }}>
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase" style={{ lineHeight: 1, marginBottom: '2px' }}>CLIENTE</div>
                                    <div className="text-sm font-bold text-slate-700 truncate" style={{ lineHeight: 1 }}>
                                        {clientName}
                                    </div>
                                </div>

                                {/* Marca */}
                                <div className="col-span-2" style={{ margin: 0, padding: 0 }}>
                                    <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase" style={{ lineHeight: 1, marginBottom: '2px' }}>MARCA</div>
                                    <div className="text-sm font-bold text-slate-700 truncate" style={{ lineHeight: 1 }}>
                                        {brandName}
                                    </div>
                                </div>

                                {/* Presentación */}
                                {masterInfo && (
                                    <div className="col-span-3" style={{ margin: 0, padding: 0, marginTop: '4px' }}>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase" style={{ lineHeight: 1 }}>PRESENTACIÓN:</span>
                                            <span className="text-sm font-bold text-slate-700 truncate" style={{ lineHeight: 1 }}>
                                                {masterInfo}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Alerta de Error de Validación */}
                    {
                        codeValidationError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 font-medium">⚠️ {codeValidationError}</p>
                            </div>
                        )
                    }

                    {/* GLOBAL PESO BRUTO (Solo para códigos especiales) */}
                    {
                        isDualBag && (productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') && (
                            <Card className="border-blue-200 bg-blue-50/30">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-blue-800">
                                        ⚖️ Peso Bruto Global (Cartón)
                                        <span className="text-xs font-normal bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                                            Aplica a todos los análisis
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-blue-900">Peso Bruto Cartón ({weightUnit.toLowerCase()})</Label>
                                                {globalPesoBruto.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={globalPesoBruto.valor || ''}
                                                onChange={(e) => setGlobalPesoBruto(prev => ({ ...prev, valor: parseFloat(e.target.value) || undefined }))}
                                                className="border-blue-200 focus:border-blue-400 focus:ring-blue-400/20"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <PhotoCapture
                                                label="Foto Peso Bruto Global"
                                                photoUrl={globalPesoBruto.fotoUrl}
                                                onPhotoCapture={handleGlobalPesoBrutoPhoto}
                                                isUploading={uploadingPhotos.has('global-pesoBruto')}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* Control de Pesos Brutos (Solo para CONTROL_PESOS) */}
                    {
                        productType === 'CONTROL_PESOS' && (
                            <ControlPesosBrutos
                                registros={currentAnalysis.pesosBrutos || []}
                                onChange={handlePesosBrutosChange}
                                onDeleteRequest={handlePesoBrutoDelete}
                                onPhotoCapture={handlePesoBrutoPhotoCapture}
                                isPhotoUploading={isPesoBrutoUploading}
                                viewMode={viewMode}
                            />
                        )
                    }

                    {/* Pesos Section */}
                    {
                        (productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>⚖️ Control de Pesos</CardTitle>
                                </CardHeader>
                                <CardContent className={viewMode === 'COMPACTA' ? 'p-4 space-y-4' : 'p-6 space-y-6 md:p-4 md:space-y-4'}>
                                    <div className={viewMode === 'COMPACTA' ? 'grid grid-cols-3 gap-4' : 'space-y-6 md:space-y-4'}>
                                        {/* Peso Bruto */}
                                        {!isDualBag && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Peso Bruto ({weightUnit})</Label>
                                                    {currentAnalysis.pesoBruto?.valor && (
                                                        <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={currentAnalysis.pesoBruto?.valor || ''}
                                                    onChange={(e) => handleWeightChange('pesoBruto', parseFloat(e.target.value))}
                                                />
                                                <PhotoCapture
                                                    key={`pesoBruto-${activeAnalysisIndex}`}
                                                    label="Foto Peso Bruto"
                                                    photoUrl={currentAnalysis.pesoBruto?.fotoUrl}
                                                    onPhotoCapture={(file) => handlePhotoCapture('pesoBruto', file)}
                                                    isUploading={isFieldUploading('pesoBruto')}
                                                />
                                            </div>
                                        )}

                                        {/* Peso Congelado */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Peso Congelado ({weightUnit})</Label>
                                                {currentAnalysis.pesoCongelado?.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentAnalysis.pesoCongelado?.valor || ''}
                                                onChange={(e) => handleWeightChange('pesoCongelado', parseFloat(e.target.value))}
                                            />
                                            <PhotoCapture
                                                key={`pesoCongelado-${activeAnalysisIndex}`}
                                                label="Foto Peso Congelado"
                                                photoUrl={currentAnalysis.pesoCongelado?.fotoUrl}
                                                onPhotoCapture={(file) => handlePhotoCapture('pesoCongelado', file)}
                                                isUploading={isFieldUploading('pesoCongelado')}
                                            />
                                        </div>

                                        {/* Peso Neto */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Peso Neto ({weightUnit})</Label>
                                                {currentAnalysis.pesoNeto?.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentAnalysis.pesoNeto?.valor || ''}
                                                onChange={(e) => handleWeightChange('pesoNeto', parseFloat(e.target.value))}
                                            />
                                            <PhotoCapture
                                                key={`pesoNeto-${activeAnalysisIndex}`}
                                                label="Foto Peso Neto"
                                                photoUrl={currentAnalysis.pesoNeto?.fotoUrl}
                                                onPhotoCapture={(file) => handlePhotoCapture('pesoNeto', file)}
                                                isUploading={isFieldUploading('pesoNeto')}
                                            />
                                        </div>

                                        {/* Glaseo (Solo para COLA y VALOR_AGREGADO) */}
                                        {(productType === 'COLA' || productType === 'VALOR_AGREGADO') && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Glaseo (%)</Label>
                                                    {currentAnalysis.glaseo?.valor && (
                                                        <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={currentAnalysis.glaseo?.valor || ''}
                                                    onChange={(e) => handleWeightChange('glaseo', parseFloat(e.target.value))}
                                                />
                                                <PhotoCapture
                                                    key={`glaseo-${activeAnalysisIndex}`}
                                                    label="Foto Glaseo"
                                                    photoUrl={currentAnalysis.glaseo?.fotoUrl}
                                                    onPhotoCapture={(file) => handlePhotoCapture('glaseo', file)}
                                                    isUploading={isFieldUploading('glaseo')}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* Uniformidad Section */}
                    {
                        (productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>📏 Uniformidad</CardTitle>
                                </CardHeader>
                                <CardContent className={viewMode === 'COMPACTA' ? 'p-4 space-y-4' : 'p-6 space-y-6 md:p-4 md:space-y-4'}>
                                    <div className={viewMode === 'COMPACTA' ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4'}>
                                        {/* Grandes */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Grandes (kg)</Label>
                                                {currentAnalysis.uniformidad?.grandes?.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentAnalysis.uniformidad?.grandes?.valor || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                    uniformidad: {
                                                        ...currentAnalysis.uniformidad,
                                                        grandes: {
                                                            ...currentAnalysis.uniformidad?.grandes,
                                                            valor: parseFloat(e.target.value) || undefined
                                                        }
                                                    }
                                                })}
                                            />
                                            <PhotoCapture
                                                key={`uniformidad-grandes-${activeAnalysisIndex}`}
                                                label="Foto Grandes"
                                                photoUrl={currentAnalysis.uniformidad?.grandes?.fotoUrl}
                                                onPhotoCapture={(file) => handlePhotoCapture('uniformidad_grandes', file)}
                                                isUploading={isFieldUploading('uniformidad_grandes')}
                                            />
                                        </div>

                                        {/* Pequeños */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Pequeños (kg)</Label>
                                                {currentAnalysis.uniformidad?.pequenos?.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentAnalysis.uniformidad?.pequenos?.valor || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                    uniformidad: {
                                                        ...currentAnalysis.uniformidad,
                                                        pequenos: {
                                                            ...currentAnalysis.uniformidad?.pequenos,
                                                            valor: parseFloat(e.target.value) || undefined
                                                        }
                                                    }
                                                })}
                                            />
                                            <PhotoCapture
                                                key={`uniformidad-pequenos-${activeAnalysisIndex}`}
                                                label="Foto Pequeños"
                                                photoUrl={currentAnalysis.uniformidad?.pequenos?.fotoUrl}
                                                onPhotoCapture={(file) => handlePhotoCapture('uniformidad_pequenos', file)}
                                                isUploading={isFieldUploading('uniformidad_pequenos')}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* Defectos de Calidad */}
                    {
                        productType !== 'CONTROL_PESOS' && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>🐛 Defectos de Calidad</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DefectSelector
                                        key={`defects-${activeAnalysisIndex}-${analysisId}`}
                                        productType={productType}
                                        selectedDefects={currentAnalysis.defectos || {}}
                                        onDefectsChange={handleDefectsChange}
                                    />
                                </CardContent>
                            </Card>
                        )
                    }

                    {/* Foto de Calidad General */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📸 Foto de Calidad General</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <PhotoCapture
                                key={`fotoCalidad-${activeAnalysisIndex}`}
                                label="Foto General"
                                photoUrl={currentAnalysis.fotoCalidad}
                                onPhotoCapture={(file) => handlePhotoCapture('fotoCalidad', file)}
                                isUploading={isFieldUploading('fotoCalidad')}
                            />
                        </CardContent>
                    </Card>

                    {/* Observaciones */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📝 Observaciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                placeholder="Escribe cualquier observación adicional aquí..."
                                value={currentAnalysis.observations || ''}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateCurrentAnalysis({ observations: e.target.value })}
                            />
                        </CardContent>
                    </Card>

                    {/* Complete Analysis Button */}
                    {
                        !isCompleted && (
                            <div className="pt-8 flex justify-center">
                                <button
                                    onClick={handleCompleteAnalysis}
                                    className="group relative flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                                    <CheckCircle2 className="w-6 h-6" />
                                    <span>Completar Análisis</span>
                                </button>
                            </div>
                        )
                    }

                    {/* Delete Section - Styled like DailyReportCard */}
                    <div className="pt-8 pb-4 flex justify-center">
                        <div
                            className="bg-white p-[25px] rounded-[24px] w-full max-w-[340px] text-center"
                            style={{
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                            }}
                        >


                            <button
                                type="button"
                                onClick={handleSmartDelete}
                                className="w-full bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100 hover:border-red-200 p-[16px] rounded-[14px] text-[16px] font-[600] cursor-pointer flex justify-center items-center gap-[8px] transition-all active:scale-[0.98]"
                            >
                                <Trash2 className="w-5 h-5" />
                                <span>Borrar Análisis</span>
                            </button>
                        </div>
                    </div>
                </div >
            </div >

            {/* Global Upload Indicator */}
            {
                uploadingPhotos.size > 0 && (
                    <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 border border-blue-400/30 backdrop-blur-md">
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm">Subiendo {uploadingPhotos.size} foto{uploadingPhotos.size > 1 ? 's' : ''}...</span>
                            <span className="text-xs text-blue-100">Por favor espera</span>
                        </div>
                    </div>
                )
            }

            <DeleteConfirmationModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={deleteModalConfig.action}
                analysisCode={codigo}
                analysisLote={lote}
                title={deleteModalConfig.title}
                description={deleteModalConfig.description}
            />
        </div >
    );
}

