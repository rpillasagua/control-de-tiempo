'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trash2, CheckCircle2, Hash, Package, Ruler, Building2, Tag, Box, Edit, Image as ImageIcon } from 'lucide-react';
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
// import { WeightInputRow } from '@/components/WeightInputRow'; // Currently unused
import { PendingUploadsPanel } from '@/components/PendingUploadsPanel';
import FailedUploadsBanner from '@/components/FailedUploadsBanner';
import { SyncStatus } from '@/components/SyncStatus';
import dynamic from 'next/dynamic';

// Lazy load heavy components
const DeleteConfirmationModal = dynamic(() => import('@/components/DeleteConfirmationModal'), {
    loading: () => null
});

import ViewModeSelector, { ViewMode, useViewMode } from '@/components/ViewModeSelector';
import EditMetadataModal from '@/components/EditMetadataModal';

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
import { useTechnicalSpecs } from '@/hooks/useTechnicalSpecs';
import { useDefectCalculation } from '@/hooks/useDefectCalculation';
import { useWeightValidation } from '@/hooks/useWeightValidation';
import { TechnicalSpecsViewer } from '@/components/TechnicalSpecsViewer';

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
    const [sections, setSections] = useState<{
        weights: boolean;
        uniformity: boolean;
        defects: boolean;
    } | undefined>(undefined);

    // UI State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
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

    // Configuración para Remuestreo
    const [remuestreoConfig, setRemuestreoConfig] = useState<{
        reason?: string;
        linkedAnalysisId?: string;
        activeFields: {
            pesoBruto?: boolean;
            pesoNeto?: boolean;
            pesoCongelado?: boolean;
            peseoSubmuestra?: boolean;
            pesoGlaseo?: boolean;
            conteo?: boolean;
            uniformidad?: boolean;
            defectos?: boolean;
        };
    } | undefined>();

    // New UI State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGalleryMode, setIsGalleryMode] = useState(false);

    // Ref to track uploading state for race condition prevention
    const isUploadingRef = React.useRef(false);
    // Ref to ignore self-triggered snapshots (prevent overwriting local state)
    const ignoreNextSnapshotRef = React.useRef(false);

    // Derived State
    const currentAnalysis = analyses[activeAnalysisIndex] || {};
    const productInfo = PRODUCT_DATA[codigo];
    const clientName = productInfo?.client || '';
    const brandName = productInfo?.brand || '';
    const masterInfo = productInfo?.master || '';
    const weightUnit = productInfo?.unit || 'LB';
    const isDualBag = false;

    const [isDeleting, setIsDeleting] = useState(false);

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

    // Calcular ratio de uniformidad
    const uniformityRatio = React.useMemo(() => {
        const grandes = currentAnalysis.uniformidad?.grandes?.valor;
        const pequenos = currentAnalysis.uniformidad?.pequenos?.valor;
        if (!grandes || !pequenos || pequenos === 0) return null;
        return grandes / pequenos;
    }, [currentAnalysis.uniformidad]);

    // Validar uniformidad
    const uniformityValidation = React.useMemo(() => {
        if (!uniformityRatio || !sizeSpec?.uniformity) {
            return { isValid: true, message: '' };
        }
        const isValid = uniformityRatio <= sizeSpec.uniformity;
        return {
            isValid,
            message: isValid
                ? `✓ Dentro (≤ ${sizeSpec.uniformity.toFixed(2)})`
                : `⚠️ Fuera (límite: ${sizeSpec.uniformity.toFixed(2)})`
        };
    }, [uniformityRatio, sizeSpec]);

    // Validar conteo
    const conteoValidation = React.useMemo(() => {
        const conteo = currentAnalysis.conteo;
        if (!conteo || !sizeSpec?.countFinal) return { isValid: true, message: '' };
        const match = sizeSpec.countFinal.match(/(\d+)-(\d+)/);
        if (!match) return { isValid: true, message: '' };
        const [, min, max] = [null, parseInt(match[1]), parseInt(match[2])];
        const isValid = conteo >= min && conteo <= max;
        return {
            isValid,
            message: isValid ? `✓ Rango OK (${sizeSpec.countFinal})` : `⚠️ Fuera (${sizeSpec.countFinal})`
        };
    }, [currentAnalysis.conteo, sizeSpec]);


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
            id: generateId(),
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
        setSections(data.sections);
        setRemuestreoConfig(data.remuestreoConfig);
        setBasicsCompleted(true);
        setAnalyses([{ id: generateId(), numero: 1 }]);
        setAnalysisId(generateId());
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
                            // 🛡️ RACE CONDITION FIX: Ignore updates while uploading photos
                            // This prevents the server (which has old text + new photo) from overwriting
                            // the local state (which has new text + new photo).
                            if (isUploadingRef.current) {
                                console.log('🛡️ Skipping snapshot update during photo upload to prevent data loss');
                                return;
                            }

                            // 🛡️ IGNORE SELF-TRIGGERED SNAPSHOTS
                            // If we just uploaded a photo, we updated Firestore but the text fields might be pending auto-save.
                            // The snapshot will come back with the new photo URL but OLD text.
                            // We must ignore this specific snapshot to avoid overwriting local text changes.
                            if (ignoreNextSnapshotRef.current) {
                                console.log('🛡️ Ignoring snapshot triggered by local photo upload');
                                ignoreNextSnapshotRef.current = false;
                                return;
                            }

                            // Mark this as a remote update to prevent auto-save
                            markAsRemoteUpdate();

                            setAnalysisId(data.id);
                            setProductType(data.productType);
                            setSections(data.sections);
                            setRemuestreoConfig(data.remuestreoConfig);
                            setCodigo(data.codigo);
                            setLote(data.lote);
                            setTalla(data.talla || '');
                            setAnalystColor(data.analystColor);

                            // Backfill IDs if missing (migration)
                            const analysesWithIds = data.analyses.map(a => ({
                                ...a,
                                id: a.id || generateId()
                            }));
                            setAnalyses(analysesWithIds);

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
        productType
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
                    const index = currentAnalysis.pesosBrutos.findIndex(r => r.id === registro.id);
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

        const checkWeights = productType !== 'REMUESTREO' || (currentAnalysis as any).remuestreoConfig?.activeFields?.pesoNeto || sections?.weights;
        const checkUniformity = productType !== 'REMUESTREO' || (currentAnalysis as any).remuestreoConfig?.activeFields?.uniformidad || sections?.uniformity;
        const checkDefects = productType !== 'REMUESTREO' || (currentAnalysis as any).remuestreoConfig?.activeFields?.defectos || sections?.defects;

        // 1. Validar Pesos
        if (checkWeights && !isDualBag) {
            if (!currentAnalysis.pesoBruto?.valor) missing.push('Peso Bruto (Valor)');
            if (!currentAnalysis.pesoBruto?.fotoUrl) missing.push('Peso Bruto (Foto)');
        }

        if (checkWeights) {
            if (!currentAnalysis.pesoNeto?.valor) missing.push('Peso Neto (Valor)');
            if (!currentAnalysis.pesoNeto?.fotoUrl) missing.push('Peso Neto (Foto)');
        }

        // 2. Validar Conteo (Linked to Uniformity)
        if (checkUniformity && !currentAnalysis.conteo) missing.push('Conteo');

        // 3. Validar Uniformidad
        if (checkUniformity) {
            if (!currentAnalysis.uniformidad?.grandes?.valor) missing.push('Uniformidad Grandes (Valor)');
            if (!currentAnalysis.uniformidad?.grandes?.fotoUrl) missing.push('Uniformidad Grandes (Foto)');
            if (!currentAnalysis.uniformidad?.pequenos?.valor) missing.push('Uniformidad Pequeños (Valor)');
            if (!currentAnalysis.uniformidad?.pequenos?.fotoUrl) missing.push('Uniformidad Pequeños (Foto)');
        }

        // 4. Validar Defectos (Al menos uno > 0)
        if (checkDefects) {
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
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2.5 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-300 hover:scale-110 border-2 border-slate-200 hover:border-slate-300"
                                style={{
                                    borderRadius: '14px',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)'
                                }}
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
                    {/* Appearance Selector & Actions */}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setIsGalleryMode(!isGalleryMode)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${isGalleryMode
                                ? 'bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                            title={isGalleryMode ? "Modo Galería Activo" : "Activar Modo Galería"}
                        >
                            <ImageIcon size={16} />
                            <span className="hidden sm:inline">{isGalleryMode ? 'Galería' : 'Cámara'}</span>
                        </button>

                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-all"
                        >
                            <Edit size={16} />
                            <span className="hidden sm:inline">Editar Info</span>
                        </button>

                        <ViewModeSelector viewMode={viewMode} onModeChange={setViewMode} />
                    </div>

                    {/* Información del Producto - Estilo DailyReportCard */}
                    {(clientName || brandName || masterInfo || codigo || lote || talla) && (
                        <div
                            className="bg-white p-5"
                            style={{
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                                borderRadius: '14px'
                            }}
                        >
                            {/* Grid de toda la información */}
                            <div className="grid grid-cols-3 gap-4">
                                {/* Código */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Código</div>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 ml-5">{codigo}</div>
                                </div>

                                {/* Lote */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Package className="w-4 h-4 text-indigo-600" />
                                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Lote</div>
                                    </div>
                                    <div className="text-sm font-bold text-slate-900 ml-5">{lote}</div>
                                </div>

                                {/* Talla */}
                                {talla && (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Ruler className="w-4 h-4 text-purple-600" />
                                            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Talla</div>
                                        </div>
                                        <div className="text-sm font-bold text-slate-900 ml-5">{talla}</div>
                                    </div>
                                )}

                                {/* Cliente */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="w-4 h-4 text-slate-600" />
                                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Cliente</div>
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 ml-5">{clientName}</div>
                                </div>

                                {/* Marca */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <Tag className="w-4 h-4 text-slate-600" />
                                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Marca</div>
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 ml-5">{brandName}</div>
                                </div>

                                {/* Presentación */}
                                {masterInfo && (
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                            <Box className="w-4 h-4 text-slate-600" />
                                            <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Presentación</div>
                                        </div>
                                        <div className="text-sm font-medium text-slate-900 ml-5">{masterInfo}</div>
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
                                                context={{ analysisId: analysisId || '', field: 'global-pesoBruto' }}
                                                forceGalleryMode={isGalleryMode}
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
                                analysisId={analysisId || ''}
                                forceGalleryMode={isGalleryMode}
                            />
                        )
                    }

                    {/* Content Grid - 2 Columns on Desktop */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* Pesos Section */}
                        {
                            ((productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') || (productType === 'REMUESTREO' && (
                                remuestreoConfig?.activeFields?.pesoBruto ||
                                remuestreoConfig?.activeFields?.pesoNeto ||
                                remuestreoConfig?.activeFields?.pesoCongelado ||
                                remuestreoConfig?.activeFields?.peseoSubmuestra
                            ))) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>⚖️ Control de Pesos</CardTitle>
                                    </CardHeader>
                                    <CardContent className={viewMode === 'COMPACTA' ? 'p-4 space-y-4' : 'p-6 space-y-6 md:p-4 md:space-y-4'}>
                                        <div className={viewMode === 'COMPACTA' ? 'grid grid-cols-3 gap-3' : 'space-y-6 md:space-y-4'}>
                                            {/* Peso Bruto */}
                                            {(!isDualBag && (productType !== 'REMUESTREO' || remuestreoConfig?.activeFields?.pesoBruto)) && (
                                                <div className="space-y-3">
                                                    <div className={`flex items-center justify-between ${viewMode === 'COMPACTA' ? 'min-h-[2.5rem]' : ''}`}>
                                                        <Label className="text-sm">
                                                            {viewMode === 'COMPACTA' ? `P. BRUTO (${weightUnit})` : `Peso Bruto (${weightUnit})`}
                                                        </Label>
                                                        {currentAnalysis.pesoBruto?.valor && (
                                                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={currentAnalysis.pesoBruto?.valor || ''}
                                                        onChange={(e) => handleWeightChange('pesoBruto', parseFloat(e.target.value))}
                                                    />
                                                    {/* Validation Message */}
                                                    {weightValidationResults.pesoBruto.message && currentAnalysis.pesoBruto?.valor && (
                                                        <div className={`text-xs font-medium ${weightValidationResults.pesoBruto.isValid
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                            }`}>
                                                            {weightValidationResults.pesoBruto.message}
                                                        </div>
                                                    )}
                                                    <PhotoCapture
                                                        key={`pesoBruto-${activeAnalysisIndex}`}
                                                        label="Foto Peso Bruto"
                                                        photoUrl={currentAnalysis.pesoBruto?.fotoUrl}
                                                        onPhotoCapture={(file) => handlePhotoCapture('pesoBruto', file)}
                                                        isUploading={isFieldUploading('pesoBruto')}
                                                        context={{ analysisId: analysisId || '', field: 'pesoBruto' }}
                                                        forceGalleryMode={isGalleryMode}
                                                    />
                                                </div>
                                            )}


                                            {/* Peso Congelado */}
                                            {(productType !== 'REMUESTREO' || remuestreoConfig?.activeFields?.pesoCongelado) && (
                                                <div className="space-y-3">
                                                    <div className={`flex items-center justify-between ${viewMode === 'COMPACTA' ? 'min-h-[2.5rem]' : ''}`}>
                                                        <Label className="text-sm">
                                                            {viewMode === 'COMPACTA' ? `P. CONG. (${weightUnit})` : `Peso Congelado (${weightUnit})`}
                                                        </Label>
                                                        {currentAnalysis.pesoCongelado?.valor && (
                                                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={currentAnalysis.pesoCongelado?.valor || ''}
                                                        onChange={(e) => handleWeightChange('pesoCongelado', parseFloat(e.target.value))}
                                                    />
                                                    <PhotoCapture
                                                        key={`pesoCongelado-${activeAnalysisIndex}`}
                                                        label="Foto Peso Congelado"
                                                        photoUrl={currentAnalysis.pesoCongelado?.fotoUrl}
                                                        onPhotoCapture={(file) => handlePhotoCapture('pesoCongelado', file)}
                                                        isUploading={isFieldUploading('pesoCongelado')}
                                                        context={{ analysisId: analysisId || '', field: 'pesoCongelado' }}
                                                        forceGalleryMode={isGalleryMode}
                                                    />
                                                </div>

                                            {/* Campos específicos para VALOR_AGREGADO o REMUESTREO */}
                                            {(productType === 'VALOR_AGREGADO' || productType === 'REMUESTREO') && (
                                                <>
                                                    {/* Peso Submuestra */}
                                                    {(productType === 'VALOR_AGREGADO' || (productType === 'REMUESTREO' && remuestreoConfig?.activeFields?.peseoSubmuestra)) && (
                                                        <div className="space-y-3">
                                                            <div className={`flex items-center justify-between ${viewMode === 'COMPACTA' ? 'min-h-[2.5rem]' : ''}`}>
                                                                <Label className="text-sm">
                                                                    {viewMode === 'COMPACTA' ? `P. SUBMUES. (${weightUnit})` : `Peso Submuestra (${weightUnit})`}
                                                                </Label>
                                                                {currentAnalysis.pesoSubmuestra?.valor && (
                                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={currentAnalysis.pesoSubmuestra?.valor || ''}
                                                                onChange={(e) => handleWeightChange('pesoSubmuestra', parseFloat(e.target.value))}
                                                            />
                                                            <PhotoCapture
                                                                key={`pesoSubmuestra-${activeAnalysisIndex}`}
                                                                label="Foto Peso Submuestra"
                                                                photoUrl={currentAnalysis.pesoSubmuestra?.fotoUrl}
                                                                onPhotoCapture={(file) => handlePhotoCapture('pesoSubmuestra', file)}
                                                                isUploading={isFieldUploading('pesoSubmuestra')}
                                                                context={{ analysisId: analysisId || '', field: 'pesoSubmuestra' }}
                                                                forceGalleryMode={isGalleryMode}
                                                            />
                                                        </div>

                                                    {/* Peso Sin Glaseo */}
                                                    {(productType === 'VALOR_AGREGADO') && (
                                                        <div className="space-y-3">
                                                            <div className={`flex items-center justify-between ${viewMode === 'COMPACTA' ? 'min-h-[2.5rem]' : ''}`}>
                                                                <Label className="text-sm">
                                                                    {viewMode === 'COMPACTA' ? `SIN GLASEO (${weightUnit})` : `Peso Sin Glaseo (${weightUnit})`}
                                                                </Label>
                                                                {currentAnalysis.pesoSinGlaseo?.valor && (
                                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Input
                                                                type="number"
                                                                placeholder="0"
                                                                value={currentAnalysis.pesoSinGlaseo?.valor || ''}
                                                                onChange={(e) => handleWeightChange('pesoSinGlaseo', parseFloat(e.target.value))}
                                                            />
                                                            <PhotoCapture
                                                                key={`pesoSinGlaseo-${activeAnalysisIndex}`}
                                                                label="Foto Peso Sin Glaseo"
                                                                photoUrl={currentAnalysis.pesoSinGlaseo?.fotoUrl}
                                                                onPhotoCapture={(file) => handlePhotoCapture('pesoSinGlaseo', file)}
                                                                isUploading={isFieldUploading('pesoSinGlaseo')}
                                                                context={{ analysisId: analysisId || '', field: 'pesoSinGlaseo' }}
                                                                forceGalleryMode={isGalleryMode}
                                                            />
                                                        </div>
                                                </>
                                            )}

                                            {/* Peso Neto */}
                                            {(productType !== 'REMUESTREO' || remuestreoConfig?.activeFields?.pesoNeto) && (
                                                <div className="space-y-3">
                                                    <div className={`flex items-center justify-between ${viewMode === 'COMPACTA' ? 'min-h-[2.5rem]' : ''}`}>
                                                        <Label className="text-sm">
                                                            {viewMode === 'COMPACTA' ? `P. NETO (${weightUnit})` : `Peso Neto (${weightUnit})`}
                                                        </Label>
                                                        {currentAnalysis.pesoNeto?.valor && (
                                                            <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Input
                                                        type="number"
                                                        placeholder="0"
                                                        value={currentAnalysis.pesoNeto?.valor || ''}
                                                        onChange={(e) => handleWeightChange('pesoNeto', parseFloat(e.target.value))}
                                                    />
                                                    {/* Validation Message */}
                                                    {weightValidationResults.pesoNeto.message && currentAnalysis.pesoNeto?.valor && (
                                                        <div className={`text-xs font-medium ${weightValidationResults.pesoNeto.isValid
                                                            ? 'text-green-600'
                                                            : 'text-red-600'
                                                            }`}>
                                                            {weightValidationResults.pesoNeto.message}
                                                        </div>
                                                    )}
                                                    <PhotoCapture
                                                        key={`pesoNeto-${activeAnalysisIndex}`}
                                                        label="Foto Peso Neto"
                                                        photoUrl={currentAnalysis.pesoNeto?.fotoUrl}
                                                        onPhotoCapture={(file) => handlePhotoCapture('pesoNeto', file)}
                                                        isUploading={isFieldUploading('pesoNeto')}
                                                        context={{ analysisId: analysisId || '', field: 'pesoNeto' }}
                                                        forceGalleryMode={isGalleryMode}
                                                    />
                                                </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        }

                        {/* Uniformidad */}
                        {
                            productType !== 'CONTROL_PESOS' && (productType !== 'REMUESTREO' || remuestreoConfig?.activeFields?.uniformidad) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>📏 Uniformidad</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            {/* Grandes */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Grandes ({weightUnit})</Label>
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
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        updateCurrentAnalysis({
                                                            uniformidad: {
                                                                ...currentAnalysis.uniformidad,
                                                                grandes: { ...currentAnalysis.uniformidad?.grandes, valor: isNaN(val) ? undefined : val }
                                                            }
                                                        });
                                                    }}
                                                />
                                                <PhotoCapture
                                                    label="Foto Grandes"
                                                    photoUrl={currentAnalysis.uniformidad?.grandes?.fotoUrl}
                                                    onPhotoCapture={(file) => handlePhotoCapture('uniformidad_grandes', file)}
                                                    isUploading={isFieldUploading('uniformidad_grandes')}
                                                    context={{ analysisId: analysisId || '', field: 'uniformidad_grandes' }}
                                                    forceGalleryMode={isGalleryMode}
                                                />
                                            </div>

                                            {/* Pequeños */}
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <Label>Pequeños ({weightUnit})</Label>
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
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        updateCurrentAnalysis({
                                                            uniformidad: {
                                                                ...currentAnalysis.uniformidad,
                                                                pequenos: { ...currentAnalysis.uniformidad?.pequenos, valor: isNaN(val) ? undefined : val }
                                                            }
                                                        });
                                                    }}
                                                />
                                                <PhotoCapture
                                                    label="Foto Pequeños"
                                                    photoUrl={currentAnalysis.uniformidad?.pequenos?.fotoUrl}
                                                    onPhotoCapture={(file) => handlePhotoCapture('uniformidad_pequenos', file)}
                                                    isUploading={isFieldUploading('uniformidad_pequenos')}
                                                    context={{ analysisId: analysisId || '', field: 'uniformidad_pequenos' }}
                                                    forceGalleryMode={isGalleryMode}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                                            <Label className="flex-1 font-semibold text-slate-900">Ratio de Uniformidad</Label>
                                            <div className="flex items-center gap-3">
                                                {uniformityRatio && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                                <div className="text-2xl font-bold text-slate-700">
                                                    {typeof uniformityRatio === 'number' ? uniformityRatio.toFixed(2) : '0.00'}
                                                </div>
                                            </div>
                                        </div>
                                        {!uniformityValidation.isValid && (
                                            <span className="text-xs text-red-500 font-medium mt-1 text-center max-w-[150px] block ml-auto">
                                                {uniformityValidation.message}
                                            </span>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        }

                        {/* Conteo Section */}
                        {
                            productType !== 'CONTROL_PESOS' && (productType !== 'REMUESTREO' || remuestreoConfig?.activeFields?.conteo) && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>🔢 Conteo</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between gap-4">
                                            <Label className="flex-1">Número de piezas</Label>
                                            <div className="flex items-center gap-3">
                                                {currentAnalysis.conteo && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={currentAnalysis.conteo || ''}
                                                    onChange={(e) => {
                                                        const count = parseInt(e.target.value) || undefined;
                                                        setAnalyses(prev => {
                                                            const updated = [...prev];
                                                            updated[activeAnalysisIndex] = {
                                                                ...updated[activeAnalysisIndex],
                                                                conteo: count
                                                            };
                                                            return updated;
                                                        });
                                                    }}
                                                    className={`w-[80px] text-center font-bold ${!conteoValidation.isValid ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                />
                                            </div>
                                        </div>
                                        {!conteoValidation.isValid && (
                                            <p className="text-red-500 text-sm mt-2 font-medium text-right">
                                                {conteoValidation.message}
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            )
                        }

                        {/* Defectos de Calidad */}
                        {
                            productType !== 'CONTROL_PESOS' && (productType !== 'REMUESTREO' || remuestreoConfig?.activeFields?.defectos) && (
                                <Card>
                                    <CardContent className="pt-6">
                                        <DefectSelector
                                            productType={productType}
                                            selectedDefects={currentAnalysis.defectos || {}}
                                            onDefectsChange={handleDefectsChange}
                                            validationResults={defectValidationResults}
                                        />
                                    </CardContent>
                                </Card>
                            )
                        }
                        <Card>
                            <CardHeader>
                                <CardTitle>📸 Foto de Calidad General</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={viewMode === 'COMPACTA' ? 'flex justify-center' : ''}>
                                    <div style={{ width: viewMode === 'COMPACTA' ? '32%' : '100%' }}>
                                        <PhotoCapture
                                            key={`fotoCalidad-${activeAnalysisIndex}`}
                                            label="Foto General"
                                            photoUrl={currentAnalysis.fotoCalidad}
                                            onPhotoCapture={(file) => handlePhotoCapture('fotoCalidad', file)}
                                            isUploading={isFieldUploading('fotoCalidad')}
                                            context={{ analysisId: analysisId || '', field: 'fotoCalidad' }}
                                            forceGalleryMode={isGalleryMode}
                                        />
                                    </div>
                                </div>
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

                        {/* Ficha Técnica - Defectos */}
                        <TechnicalSpecsViewer code={codigo} />

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

            {/* Pending Uploads Panel */}
            <PendingUploadsPanel
                isOpen={showPendingUploads}
                onClose={() => setShowPendingUploads(false)}
                onRetryPhoto={retryPhotoUpload}
                onRetryAll={retryAllFailedPhotos}
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
        </div >
    );
}


