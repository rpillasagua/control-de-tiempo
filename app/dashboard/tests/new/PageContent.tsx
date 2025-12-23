'use client';

import React, { useState, useEffect, useReducer } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Textarea } from '@/components/ui';

// Existing Components
import ProductTypeSelector from '@/components/ProductTypeSelector';
import InitialForm from '@/components/InitialForm';
import AnalysisTabs from '@/components/AnalysisTabs';
import ControlPesosBrutos from '@/components/ControlPesosBrutos';
// import { WeightInputRow } from '@/components/WeightInputRow'; // Currently unused
import { PendingUploadsPanel } from '@/components/PendingUploadsPanel';
import FailedUploadsBanner from '@/components/FailedUploadsBanner';
import { SyncStatus } from '@/components/SyncStatus';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const DeleteConfirmationModal = dynamic(() => import('@/components/DeleteConfirmationModal'), {
    loading: () => null
});

const TechnicalSpecsModal = dynamic(() => import('@/components/TechnicalSpecsModal'), {
    loading: () => null
});

import { useViewMode } from '@/components/ViewModeSelector';
import EditMetadataModal from '@/components/EditMetadataModal';
import { AnalysisHeader } from '@/components/AnalysisHeader';
import { AnalysisInfoCard } from '@/components/AnalysisInfoCard';
import { AnalysisActions } from '@/components/AnalysisActions';
import { useAnalysisSubscription } from '@/hooks/useAnalysisSubscription';
import { useAnalysisCalculations } from '@/hooks/useAnalysisCalculations';
import { WeightsSection } from '@/components/WeightsSection';
import { GlobalWeightCard } from '@/components/GlobalWeightCard';
import { ConteoCard } from '@/components/ConteoCard';
import { UniformityCard } from '@/components/UniformityCard';
import { DefectsCard } from '@/components/DefectsCard';
import { CompleteAnalysisCard } from '@/components/CompleteAnalysisCard';
import { DeleteAnalysisSection } from '@/components/DeleteAnalysisSection';
import { analysisReducer, initialState } from '@/reducers/analysisReducer';

// Types and Utils
import {
    ProductType,
    AnalystColor,
    Analysis,
    PesoBrutoRegistro,
    ANALYST_COLOR_HEX,
    PesoConFoto,
    ViewMode,
    QualityAnalysis
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { useWeightInput } from '@/hooks/useWeightInput';
import { PRODUCT_DATA, DOUBLE_ANALYSIS_CODES } from '@/lib/product-data';
import { usePhotoUpload } from '@/hooks/usePhotoUpload';
import { useAnalysisSave } from '@/hooks/useAnalysisSave';
import { useTechnicalSpecs } from '@/hooks/useTechnicalSpecs';
import { useDefectCalculation } from '@/hooks/useDefectCalculation';
import { useWeightValidation } from '@/hooks/useWeightValidation';
import { useSwipe } from '@/hooks/useSwipe';
// import { TechnicalSpecsViewer } from '@/components/TechnicalSpecsViewer';

export default function NewMultiAnalysisPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(true);
    const [productType, setProductType] = useState<ProductType | null>(null);
    const [basicsCompleted, setBasicsCompleted] = useState(false);
    const [analysisId, setAnalysisId] = useState<string | null>(null);

    // Replaced useState for analyses and active index with useReducer
    const [{ analyses, activeAnalysisIndex }, dispatch] = useReducer(analysisReducer, initialState);

    // Compat wrapper for hooks that expect setAnalyses
    const setAnalyses = (args: Analysis[] | ((prev: Analysis[]) => Analysis[])) => {
        if (typeof args === 'function') {
            dispatch({ type: 'SET_ANALYSES_FUNCTIONAL', payload: args });
        } else {
            dispatch({ type: 'SET_ANALYSES', payload: args });
        }
    };

    const [sections, setSections] = useState<{ weights: boolean; uniformity: boolean; defects: boolean } | undefined>(undefined);
    const [remuestreoConfig, setRemuestreoConfig] = useState<QualityAnalysis['remuestreoConfig']>(null);

    // Derived state for Remuestreo Active Fields
    const isRemuestreo = productType === 'REMUESTREO';
    // Helper to check if a section should be active
    const showWeights = !isRemuestreo || (remuestreoConfig?.activeFields?.pesoBruto || remuestreoConfig?.activeFields?.pesoNeto || remuestreoConfig?.activeFields?.pesoCongelado || remuestreoConfig?.activeFields?.pesoSubmuestra || remuestreoConfig?.activeFields?.pesoGlaseo);
    const showUniformity = (!isRemuestreo && productType !== 'CONTROL_PESOS') || (isRemuestreo && remuestreoConfig?.activeFields?.uniformidad);
    const showConteo = (!isRemuestreo && productType !== 'CONTROL_PESOS') || (isRemuestreo && remuestreoConfig?.activeFields?.conteo);
    const showDefects = (!isRemuestreo && productType !== 'CONTROL_PESOS') || (isRemuestreo && remuestreoConfig?.activeFields?.defectos);

    // Global Fields
    const [codigo, setCodigo] = useState('');
    const [lote, setLote] = useState('');
    const [talla, setTalla] = useState('');
    const [analystColor, setAnalystColor] = useState<AnalystColor | null>(null);


    // UI State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showSpecsModal, setShowSpecsModal] = useState(false);
    const [showPendingUploads, setShowPendingUploads] = useState(false);
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

    // New UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGalleryMode, setIsGalleryMode] = useState(false);

    // Ref to track uploading state for race condition prevention
    const isUploadingRef = React.useRef(false);
    // Ref to ignore self-triggered snapshots (prevent overwriting local state)
    const ignoreNextSnapshotRef = React.useRef(false);

    // Derived State
    const currentAnalysis = (analyses[activeAnalysisIndex] || {}) as Analysis;
    const productInfo = PRODUCT_DATA[codigo];
    const clientName = productInfo?.client || '';
    const brandName = productInfo?.brand || '';
    const masterInfo = productInfo?.master || '';
    const weightUnit = productInfo?.unit || 'LB';
    const isDualBag = false;

    const [isDeleting, setIsDeleting] = useState(false);

    // Mobile Gestures for Analysis Switching
    const swipeHandlers = useSwipe({
        onSwipedLeft: () => {
            if (activeAnalysisIndex < analyses.length - 1) {
                dispatch({ type: 'SET_ACTIVE_INDEX', payload: activeAnalysisIndex + 1 });
            }
        },
        onSwipedRight: () => {
            if (activeAnalysisIndex > 0) {
                dispatch({ type: 'SET_ACTIVE_INDEX', payload: activeAnalysisIndex - 1 });
            }
        }
    });

    // Hooks
    const {
        isSaving,
        saveError,
        lastSaved,
        saveDocument,
        dismissError,
        markAsRemoteUpdate
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
        isDeleting,
        sections,
        remuestreoConfig
    });

    const {
        isUploadingGlobal,
        uploadingPhotos,
        handlePhotoCapture,
        handlePesoBrutoPhotoCapture,
        handleGlobalPesoBrutoPhoto,
        isFieldUploading,
        isPesoBrutoUploading,
        photoStatus,
        getPhotoStatus,
        retryPhotoUpload,
        retryAllFailedPhotos
    } = usePhotoUpload({
        analysisId: analysisId!,
        analyses,
        setAnalyses,
        activeAnalysisIndex,
        codigo,
        lote,
        saveDocument,
        globalPesoBruto,
        setGlobalPesoBruto,
        ignoreNextSnapshotRef
    });

    // Technical Specs Hook - Para obtener límites
    const { getSpecs } = useTechnicalSpecs();
    const specs = getSpecs(codigo);
    const sizeSpec = specs?.sizes.find(s => s.sizeMp === talla);

    // Hooks Analysis Calculations (Uniformity, Specs, Glazing)
    const {
        uniformityRatio,
        uniformityValidation,
        conteoValidation,
        calculatedGlazing
    } = useAnalysisCalculations(currentAnalysis, sizeSpec);


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
        // We merge with current because dispatch expects full Analysis or we modify reducer to accept partial
        // But reducer takes "Analysis" in payload for UPDATE_ANALYSIS in my design? 
        // Let's check: { type: 'UPDATE_ANALYSIS'; payload: { index: number; analysis: Analysis } }
        // So we need to construct the full analysis here
        const current = analyses[index];
        if (!current) return;
        dispatch({
            type: 'UPDATE_ANALYSIS',
            payload: { index, analysis: { ...current, ...updates } }
        });
    };

    const updateCurrentAnalysis = (updates: Partial<Analysis>) => {
        // Calculate Glazing Percentage automatically if weights change
        if (updates.pesoNeto || updates.pesoCongelado) {
            const analysis = currentAnalysis as any;
            const netWeight = updates.pesoNeto?.valor ?? analysis.pesoNeto?.valor;
            const frozenWeight = updates.pesoCongelado?.valor ?? analysis.pesoCongelado?.valor;

            if (typeof netWeight === 'number' && typeof frozenWeight === 'number' && frozenWeight !== 0) {
                if (netWeight !== 0) {
                    updates.glazingPercentage = ((frozenWeight - netWeight) / netWeight) * 100;
                }
            } else {
                // If either is missing or 0, clear the percentage
                updates.glazingPercentage = undefined;
            }
        }

        updateAnalysisAtIndex(activeAnalysisIndex, updates);
    };

    const handleAddAnalysis = () => {
        const newAnalysis: Analysis = {
            id: generateId(),
            numero: analyses.length + 1,
        };
        dispatch({ type: 'ADD_ANALYSIS', payload: newAnalysis });
        // dispatch auto-sets active index in reducer
    };

    const handleInitialFormComplete = (data: any) => {
        setCodigo(data.codigo);
        setLote(data.lote);
        setTalla(data.talla);
        setAnalystColor(data.color);
        setSections(data.sections);
        setRemuestreoConfig(data.remuestreoConfig); // 🔥 FIX: Properly initialize Remuestreo Config state
        setBasicsCompleted(true);

        const initialId = generateId();
        dispatch({ type: 'SET_ANALYSES', payload: [{ id: initialId, numero: 1 }] });

        setAnalysisId(initialId);

        // Update URL to include the new ID so back button works correctly
        window.history.replaceState(null, '', `/dashboard/tests/new?id=${initialId}`);
    };

    // Handle full analysis deletion
    const handleDeleteAnalysis = async () => {
        if (!analysisId) return;
        setIsDeleting(true); // Stop auto-save immediately
        try {
            const { deleteAnalysis } = await import('@/lib/analysisService');
            await deleteAnalysis(analysisId);
            toast.success('Análisis eliminado');
            router.push('/');
        } catch (error) {
            console.error('Error deleting analysis:', error);
            toast.error('Error al eliminar el análisis');
            setIsDeleting(false); // Resume if failed
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

                // Foto de calidad general
                addIfUrl(analysisToDelete.fotoCalidad);

                // Fotos de pesos (weight fields)
                addIfUrl(analysisToDelete.pesoBruto?.fotoUrl);
                addIfUrl(analysisToDelete.pesoCongelado?.fotoUrl);
                addIfUrl(analysisToDelete.pesoNeto?.fotoUrl);
                addIfUrl(analysisToDelete.pesoSubmuestra?.fotoUrl);
                addIfUrl(analysisToDelete.pesoSinGlaseo?.fotoUrl);

                // Fotos de pesosBrutos (control de pesos)
                analysisToDelete.pesosBrutos?.forEach(p => addIfUrl(p.fotoUrl));

                // Fotos de uniformidad
                addIfUrl(analysisToDelete.uniformidad?.grandes?.fotoUrl);
                addIfUrl(analysisToDelete.uniformidad?.pequenos?.fotoUrl);

                console.log(`🗑️ Deleting ${photosToDelete.length} photos from analysis #${index + 1}`);

                // 2. Delete photos from Drive
                if (photosToDelete.length > 0) {
                    try {
                        const { googleDriveService } = await import('@/lib/googleDriveService');
                        await googleDriveService.initialize();
                        await Promise.all(photosToDelete.map(id => googleDriveService.deleteFile(id)));
                        console.log(`✅ ${photosToDelete.length} photos deleted successfully`);
                        toast.success(`${photosToDelete.length} fotos eliminadas`);
                    } catch (error) {
                        console.error('❌ Error deleting photos:', error);
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
                    dispatch({ type: 'SET_ACTIVE_INDEX', payload: Math.max(0, updatedAnalyses.length - 1) });
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

    const handleEditMetadata = async (data: { lote: string; codigo: string; talla: string }) => {
        if (!analysisId) return;

        try {
            const { updateAnalysis } = await import('@/lib/analysisService');
            await updateAnalysis(analysisId, {
                lote: data.lote,
                codigo: data.codigo,
                talla: data.talla
            });

            // Update local state
            setLote(data.lote);
            setCodigo(data.codigo);
            setTalla(data.talla);

            toast.success('Metadatos actualizados y carpetas sincronizadas');
        } catch (error) {
            console.error('Error updating metadata:', error);
            toast.error('Error al actualizar metadatos');
        }
    };

    // Sync uploading ref
    useEffect(() => {
        isUploadingRef.current = uploadingPhotos.size > 0;
    }, [uploadingPhotos.size]);

    // Subscription Hook
    useAnalysisSubscription(
        searchParams.get('id'),
        isUploadingRef,
        ignoreNextSnapshotRef,
        {
            setAnalysisId,
            setProductType,
            setSections,
            setRemuestreoConfig,
            setOriginalCreatedBy,
            setOriginalDate,
            setOriginalShift,
            setOriginalAnalystColor,
            setCodigo,
            setLote,
            setTalla,
            setAnalystColor,
            setGlobalPesoBruto,
            setBasicsCompleted,
            setOriginalCreatedAt,
            setAnalyses,
            setIsCompleted,
            setIsLoading,
            markAsRemoteUpdate
        }
    );

    // Handler for pesos brutos
    const handlePesosBrutosChange = (registros: PesoBrutoRegistro[]) => {
        updateCurrentAnalysis({ pesosBrutos: registros });
    };

    // Handler for defects
    const handleDefectsChange = (defects: { [key: string]: number }) => {
        updateCurrentAnalysis({ defectos: defects });
    };

    // Defect Calculation Hook
    const defectValidationResults = useDefectCalculation(
        codigo,
        productType,
        currentAnalysis.pesoNeto?.valor,
        currentAnalysis.conteo,
        currentAnalysis.defectos || {}
    );

    // Weight Validation Hook - CORREGIDO para usar gramos directamente
    const weightValidationResults = useWeightValidation(
        codigo,
        currentAnalysis.pesoBruto?.valor,
        currentAnalysis.pesoNeto?.valor,
        productType,
        weightUnit
    );

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
                    const index = currentAnalysis.pesosBrutos.findIndex((r: PesoBrutoRegistro) => r.id === registro.id);
                    if (index !== -1) {
                        const { deleteAnalysisPhoto } = await import('@/lib/analysisService');
                        // Use ID for safe deletion
                        const analysisItemId = currentAnalysis.id;
                        await deleteAnalysisPhoto(analysisId, analysisItemId, `pesosBrutos.${index}.fotoUrl`);
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

        // Determine which specific fields are active
        const activeFields = isRemuestreo ? remuestreoConfig?.activeFields : null;

        // Default to TRUE for standard analysis, or specific config for Remuestreo
        const needPesoBruto = !isRemuestreo || activeFields?.pesoBruto;
        const needPesoNeto = !isRemuestreo || activeFields?.pesoNeto;
        const needPesoCongelado = !isRemuestreo && !isDualBag; // Standard usually needs this? Or maybe optional. Keeping standard logic conservative.

        const needConteo = !isRemuestreo || (isRemuestreo && activeFields?.conteo);
        const needUniformidad = !isRemuestreo || (isRemuestreo && activeFields?.uniformidad);
        const needDefectos = !isRemuestreo || (isRemuestreo && activeFields?.defectos);

        // 1. Validar Pesos
        // Standard logic for 'weights' section being enabled
        const sectionWeightsEnabled = !isRemuestreo || (activeFields?.pesoBruto || activeFields?.pesoNeto || activeFields?.pesoCongelado);

        if (sectionWeightsEnabled) {
            if (needPesoBruto && !isDualBag) {
                if (!currentAnalysis.pesoBruto?.valor && currentAnalysis.pesoBruto?.valor !== 0) missing.push('Peso Bruto (Valor)');
                if (!currentAnalysis.pesoBruto?.fotoUrl) missing.push('Peso Bruto (Foto)');
            }

            if (needPesoNeto) {
                if (!currentAnalysis.pesoNeto?.valor && currentAnalysis.pesoNeto?.valor !== 0) missing.push('Peso Neto (Valor)');
                if (!currentAnalysis.pesoNeto?.fotoUrl) missing.push('Peso Neto (Foto)');
            }

            // Remuestreo specific checks for other weights if selected
            if (isRemuestreo && activeFields?.pesoCongelado) {
                if (!currentAnalysis.pesoCongelado?.valor && currentAnalysis.pesoCongelado?.valor !== 0) missing.push('Peso Congelado (Valor)');
            }
            if (isRemuestreo && activeFields?.pesoGlaseo) {
                if (!currentAnalysis.pesoConGlaseo?.valor && currentAnalysis.pesoConGlaseo?.valor !== 0) missing.push('Peso Glaseo');
            }
        }

        // 2. Validar Conteo
        if (needConteo && !currentAnalysis.conteo) missing.push('Conteo');

        // 3. Validar Uniformidad
        if (needUniformidad) {
            if (!currentAnalysis.uniformidad?.grandes?.valor) missing.push('Uniformidad Grandes (Valor)');
            if (!currentAnalysis.uniformidad?.grandes?.fotoUrl) missing.push('Uniformidad Grandes (Foto)');
            if (!currentAnalysis.uniformidad?.pequenos?.valor) missing.push('Uniformidad Pequeños (Valor)');
            if (!currentAnalysis.uniformidad?.pequenos?.fotoUrl) missing.push('Uniformidad Pequeños (Foto)');
        }

        // 4. Validar Defectos (Al menos uno > 0)
        if (needDefectos) {
            const hasDefects = currentAnalysis.defectos && Object.values(currentAnalysis.defectos as Record<string, number>).some((val: number) => val > 0);
            if (!hasDefects) missing.push('Defectos (Al menos uno)');
        }

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
                        onClick={() => router.back()}
                        className="flex items-center gap-2 px-4 py-2.5 mb-6 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all border border-slate-800 hover:border-slate-700"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Volver</span>
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
        <div
            className="min-h-screen pb-20 touch-pan-y"
            {...swipeHandlers}
        >
            <FailedUploadsBanner onClick={() => setShowPendingUploads(true)} />
            {/* Sync Status Indicator */}
            <div className="fixed top-4 right-4 z-50">
                <SyncStatus
                    isSaving={isSaving}
                    lastSaved={lastSaved}
                    saveError={saveError}
                    onDismissError={dismissError}
                />
            </div>

            <div className="max-w-7xl mx-auto space-y-6 p-4">
                {/* Minimalist Header */}
                {/* Extracted Header Component */}
                <AnalysisHeader
                    productType={productType}
                    isRemuestreo={isRemuestreo}
                    codigo={codigo}
                    analystColor={analystColor}
                    activeAnalysisIndex={activeAnalysisIndex}
                    totalAnalyses={analyses.length}
                    onBack={() => router.back()}
                    onOpenSpecs={() => setShowSpecsModal(true)}
                />

                {/* Analysis Tabs */}
                <AnalysisTabs
                    analysesCount={analyses.length}
                    activeTab={activeAnalysisIndex}
                    onTabChange={(index) => dispatch({ type: 'SET_ACTIVE_INDEX', payload: index })}
                    onAddAnalysis={handleAddAnalysis}
                    analystColor={analystColor!}
                />

                {/* MOTIVO DEL REMUESTREO (Solo si es Remuestreo) */}
                {isRemuestreo && (
                    <Card className="mb-6 border-blue-200 bg-blue-50/50">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                                📋 Motivo del Remuestreo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Input
                                value={remuestreoConfig?.reason || ''}
                                onChange={(e) => setRemuestreoConfig((prev: any) => ({ ...prev, reason: e.target.value }))}
                                placeholder="Ingrese el motivo del remuestreo..."
                                className="bg-white"
                            // readOnly={isReadOnly} // TODO: Implement readOnly logic if needed
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Current Analysis Form */}
                <div className="space-y-6">
                    {/* Appearance Selector & Actions */}
                    <AnalysisActions
                        isGalleryMode={isGalleryMode}
                        setIsGalleryMode={setIsGalleryMode}
                        onEditInfo={() => setIsEditModalOpen(true)}
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                    />

                    {/* Información del Producto - Estilo DailyReportCard */}
                    <AnalysisInfoCard
                        codigo={codigo}
                        lote={lote}
                        talla={talla}
                        clientName={clientName}
                        brandName={brandName}
                        masterInfo={masterInfo}
                    />


                    {/* Alerta de Error de Validación */}
                    {
                        codeValidationError && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 font-medium">⚠️ {codeValidationError}</p>
                            </div>
                        )
                    }

                    {/* GLOBAL PESO BRUTO (Solo para códigos especiales) */}
                    <GlobalWeightCard
                        isDualBag={isDualBag}
                        productType={productType}
                        weightUnit={weightUnit}
                        globalPesoBruto={globalPesoBruto}
                        onGlobalWeightChange={(val) => setGlobalPesoBruto(prev => ({ ...prev, valor: val }))}
                        handleGlobalPesoBrutoPhoto={handleGlobalPesoBrutoPhoto}
                        isUploading={uploadingPhotos.has('global-pesoBruto')}
                        analysisId={analysisId || ''}
                        isGalleryMode={isGalleryMode}
                    />

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
                                analysisId={analysisId || ''}
                                forceGalleryMode={isGalleryMode}
                            />
                        )
                    }

                    {/* Content Grid - 1 Col in Compact, 2 Cols in Standard on Desktop */}
                    <div className={`${viewMode === 'COMPACTA' ? 'flex flex-col gap-6' : 'grid grid-cols-1 md:grid-cols-2 gap-6 items-start'}`}>
                        {/* Pesos Section */}
                        <WeightsSection
                            currentAnalysis={currentAnalysis}
                            activeAnalysisIndex={activeAnalysisIndex}
                            analysisId={analysisId || ''}
                            productType={productType}
                            weightUnit={weightUnit}
                            isRemuestreo={isRemuestreo}
                            remuestreoConfig={remuestreoConfig}
                            isDualBag={isDualBag}
                            viewMode={viewMode}
                            isGalleryMode={isGalleryMode}
                            handleWeightChange={handleWeightChange}
                            handlePhotoCapture={handlePhotoCapture}
                            isFieldUploading={isFieldUploading}
                            weightValidationResults={weightValidationResults}
                            calculatedGlazing={calculatedGlazing}
                            showWeights={showWeights}
                        />

                        {/* Conteo Section */}
                        <ConteoCard
                            showConteo={showConteo}
                            conteo={currentAnalysis.conteo}
                            onConteoChange={(value) => {
                                updateCurrentAnalysis({
                                    conteo: value
                                });
                            }}
                            validation={conteoValidation}
                        />

                        {/* Uniformidad */}
                        <UniformityCard
                            showUniformity={showUniformity}
                            uniformidad={currentAnalysis.uniformidad}
                            onUniformityChange={(field, value) => {
                                updateCurrentAnalysis({
                                    uniformidad: {
                                        ...currentAnalysis.uniformidad,
                                        [field]: { ...currentAnalysis.uniformidad?.[field], valor: value }
                                    }
                                });
                            }}
                            handlePhotoCapture={handlePhotoCapture}
                            isFieldUploading={isFieldUploading}
                            analysisId={analysisId || ''}
                            activeAnalysisIndex={activeAnalysisIndex}
                            isGalleryMode={isGalleryMode}
                            uniformityRatio={uniformityRatio}
                            validation={uniformityValidation}
                        />

                        {/* Defectos de Calidad & Foto General */}
                        <DefectsCard
                            showDefects={showDefects}
                            productType={productType}
                            currentAnalysis={currentAnalysis}
                            onDefectsChange={(defects) => updateCurrentAnalysis({ defectos: defects })}
                            validationResults={defectValidationResults}
                            handlePhotoCapture={handlePhotoCapture}
                            isFieldUploading={isFieldUploading}
                            analysisId={analysisId || ''}
                            activeAnalysisIndex={activeAnalysisIndex}
                            isGalleryMode={isGalleryMode}
                        />



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

                        {/* Ficha Técnica - Defectos */}


                    </div >

                    {/* Complete Analysis Button */}
                    {
                        !isCompleted ? (
                            <div className="pt-8 flex justify-center">
                                <button
                                    onClick={handleCompleteAnalysis}
                                    className="w-full max-w-[280px] bg-gradient-to-r from-green-500 to-emerald-600 text-white border-2 border-green-400/50 hover:from-green-600 hover:to-emerald-700 hover:border-green-300 p-[12px] rounded-[14px] text-[14px] font-[600] cursor-pointer flex justify-center items-center gap-[6px] transition-all active:scale-[0.98] shadow-lg hover:shadow-xl"
                                    style={{
                                        boxShadow: '0 10px 20px -5px rgba(34, 197, 94, 0.3)'
                                    }}
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>Completar Análisis</span>
                                </button>
                            </div>
                        ) : (
                            <div className="pt-8 flex justify-center">
                                <button
                                    onClick={async () => {
                                        if (!analysisId) return;
                                        try {
                                            setIsCompleted(false);
                                            await saveDocument('EN_PROGRESO');
                                            toast.success('Edición habilitada');
                                        } catch (error) {
                                            console.error('Error enabling editing:', error);
                                            toast.error('Error al habilitar edición');
                                        }
                                    }}
                                    className="w-full max-w-[280px] bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300 p-[12px] rounded-[14px] text-[14px] font-[600] cursor-pointer flex justify-center items-center gap-[6px] transition-all active:scale-[0.98] shadow-sm hover:shadow-md"
                                >
                                    <Edit className="w-4 h-4" />
                                    <span>Habilitar Edición</span>
                                </button>
                            </div>
                        )
                    }

                    {/* Delete Section - Styled like DailyReportCard */}
                    <div className="pt-6 pb-4 flex justify-center">
                        <div
                            className="bg-white p-[18px] rounded-[14px] w-full max-w-[280px] text-center"
                            style={{
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                            }}
                        >
                            <button
                                type="button"
                                onClick={handleSmartDelete}
                                className="w-full bg-red-50 text-red-600 border-2 border-red-100 hover:bg-red-100 hover:border-red-200 p-[10px] rounded-[14px] text-[13px] font-[600] cursor-pointer flex justify-center items-center gap-[6px] transition-all active:scale-[0.98] hover:shadow-md"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>Borrar Análisis</span>
                            </button>
                        </div>


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

                        {/* Pending Uploads Panel */}
                        <PendingUploadsPanel
                            isOpen={showPendingUploads}
                            onClose={() => setShowPendingUploads(false)}
                            onRetryPhoto={retryPhotoUpload}
                            onRetryAll={retryAllFailedPhotos}
                        />

                        <TechnicalSpecsModal
                            isOpen={showSpecsModal}
                            onClose={() => setShowSpecsModal(false)}
                            code={codigo}
                        />

                        <EditMetadataModal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            onSave={handleEditMetadata}
                            initialData={{
                                lote,
                                codigo,
                                talla,
                                productType: productType || undefined
                            }}
                        />
                    </div>
                </div >
            </div >
        </div >
    );
}


