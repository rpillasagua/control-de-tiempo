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
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import ViewModeSelector, { ViewMode } from '@/components/ViewModeSelector';

// Types and Utils
import {
    ProductType,
    QualityAnalysis,
    AnalystColor,
    Analysis,
    PesoBrutoRegistro,
    ANALYST_COLOR_HEX,
    PesoConFoto
} from '@/lib/types';
import { getWorkShift, formatDate, getProductionDate, generateId } from '@/lib/utils';
import { useWeightInput } from '@/hooks/useWeightInput';
import { PRODUCT_DATA } from '@/lib/product-data';

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
    const [color, setColor] = useState('');
    const [analystColor, setAnalystColor] = useState<AnalystColor | null>(null);

    // UI State
    const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
    const [photos, setPhotos] = useState<Record<string, File>>({});
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('COMPACTA');
    const [globalPesoBruto, setGlobalPesoBruto] = useState<PesoConFoto>({});
    const [codeValidationError, setCodeValidationError] = useState<string | null>(null);

    // Derived State
    const currentAnalysis = analyses[activeAnalysisIndex] || {};
    const productInfo = PRODUCT_DATA[codigo];
    const clientName = productInfo?.client || '';
    const brandName = productInfo?.brand || '';
    const masterInfo = productInfo?.master || '';
    const weightUnit = 'lb';
    const isDualBag = false;

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
        setColor(data.color);
        setAnalystColor(data.analystColor);
        setBasicsCompleted(true);
        setAnalyses([{ numero: 1 }]);
        setAnalysisId(generateId());
    };

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

    // Load initial data effect
    useEffect(() => {
        const id = searchParams.get('id');
        if (id) {
            // Logic to load existing analysis would go here
            // For now, just stop loading
            setIsLoading(false);
        } else {
            setIsLoading(false);
        }
    }, [searchParams]);

    const saveDocument = async (status: 'EN_PROGRESO' | 'COMPLETADO' = 'EN_PROGRESO') => {
        if (!analysisId || !basicsCompleted) return;

        setIsSaving(true);
        try {
            const now = new Date();
            const productionDate = getProductionDate(now);

            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            const document: QualityAnalysis = {
                id: analysisId,
                codigo,
                lote,
                talla,
                productType: productType!,
                status,
                analystColor: analystColor!,
                analyses: analyses.map(a => ({
                    ...a,
                    pesoBruto: a.pesoBruto?.valor ? a.pesoBruto : undefined,
                    pesoCongelado: a.pesoCongelado?.valor ? a.pesoCongelado : undefined,
                    pesoNeto: a.pesoNeto?.valor ? a.pesoNeto : undefined,
                    pesoConGlaseo: a.pesoConGlaseo?.valor ? a.pesoConGlaseo : undefined,
                    pesoSinGlaseo: a.pesoSinGlaseo?.valor ? a.pesoSinGlaseo : undefined,
                })),
                createdAt: now.toISOString(),
                updatedAt: now.toISOString(),
                createdBy: user?.email || 'unknown',
                date: productionDate,
                shift: getWorkShift(now),
                globalPesoBruto: globalPesoBruto.fotoUrl ? globalPesoBruto : undefined,
            };

            const { validateAnalysisData, getValidationErrors } = await import('@/lib/validation');
            const result = validateAnalysisData(document);
            if (!result.success) {
                const errors = getValidationErrors(result.error);
                console.warn('⚠️ Validación fallida en auto-save:', errors);
            }

            const { saveAnalysis } = await import('@/lib/analysisService');
            await saveAnalysis(document);
            setLastSaved(now);
            setSaveError(null);
            console.log('✅ Document saved');
        } catch (error) {
            console.error('Error saving:', error);
            setSaveError('Error al guardar');
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save when analyses change
    useEffect(() => {
        // No guardar si se está subiendo una foto (evita race condition)
        if (basicsCompleted && analysisId && !isUploadingGlobal) {
            const timer = setTimeout(() => {
                saveDocument();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [analyses, basicsCompleted, isUploadingGlobal]);

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

    // Helper para reintentar subidas
    const uploadWithRetry = async (uploadFn: () => Promise<string>, retries = 3) => {
        for (let i = 0; i < retries; i++) {
            try {
                return await uploadFn();
            } catch (error) {
                if (i === retries - 1) throw error;
                const delay = Math.min(1000 * Math.pow(2, i), 5000); // Exponential backoff
                console.log(`⚠️ Error subiendo foto, reintentando en ${delay}ms... (Intento ${i + 1}/${retries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw new Error('Max retries reached');
    };

    // Photo upload handlers
    const handlePhotoCapture = async (field: string, file: File) => {
        const targetIndex = activeAnalysisIndex; // Capturar índice actual
        const key = `${targetIndex}-${field}`;
        setPhotos(prev => ({ ...prev, [key]: file }));
        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true); // Bloquear auto-save

        try {
            const { googleDriveService } = await import('@/lib/googleDriveService');
            await googleDriveService.initialize();

            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            // Obtener URL anterior para limpieza
            // Usamos analyses[targetIndex] para asegurar consistencia
            const targetAnalysis = analyses[targetIndex];
            let oldUrl: string | undefined;

            if (field === 'fotoCalidad') {
                oldUrl = targetAnalysis.fotoCalidad;
            } else if (field.startsWith('uniformidad_')) {
                const tipo = field.split('_')[1] as 'grandes' | 'pequenos';
                oldUrl = targetAnalysis.uniformidad?.[tipo]?.fotoUrl;
            } else {
                // pesoBruto, pesoCongelado, pesoNeto
                const currentFieldValue = targetAnalysis[field as keyof Analysis] as any;
                oldUrl = currentFieldValue?.fotoUrl;
            }

            const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
                file,
                codigo,
                lote,
                `${field}_analysis${targetIndex + 1}`,
                oldUrl, // Pasar URL anterior
                user?.email
            ));

            // Update analysis with photo URL using targetIndex
            if (field === 'fotoCalidad') {
                updateAnalysisAtIndex(targetIndex, { fotoCalidad: url });
            } else if (field.startsWith('uniformidad_')) {
                const tipo = field.split('_')[1] as 'grandes' | 'pequenos';
                // Necesitamos leer el estado MÁS RECIENTE del análisis para no sobrescribir otros campos de uniformidad
                // Usamos el callback de setAnalyses dentro de updateAnalysisAtIndex o leemos de 'analyses' (que podría ser stale en closure, pero updateAnalysisAtIndex usa functional update para el array)
                // PERO, para objetos anidados como uniformidad, necesitamos cuidado.
                // updateAnalysisAtIndex hace merge shallow: { ...analysis, ...updates }
                // Así que debemos pasar el objeto uniformidad completo actualizado.

                // Como estamos en una función async, 'analyses' puede ser viejo.
                // Lo mejor es pasar una función a updateAnalysisAtIndex si fuera posible, pero por simplicidad y dado que uniformidad solo tiene 2 campos,
                // podemos reconstruirlo con setAnalyses directo o mejorar updateAnalysisAtIndex.
                // Vamos a usar setAnalyses directo aquí para máxima seguridad con nested state.

                setAnalyses(prev => prev.map((analysis, index) => {
                    if (index !== targetIndex) return analysis;

                    const currentUniformidad = analysis.uniformidad || {};
                    const currentTipo = currentUniformidad[tipo] || {};

                    return {
                        ...analysis,
                        uniformidad: {
                            ...currentUniformidad,
                            [tipo]: {
                                ...currentTipo,
                                fotoUrl: url
                            }
                        }
                    };
                }));

            } else {
                // pesoBruto, pesoCongelado, pesoNeto
                // Aquí también hay riesgo si el campo tiene otras propiedades (valor).
                // updateAnalysisAtIndex hace shallow merge del root.
                // Si pasamos { pesoBruto: { ...old, fotoUrl } }, necesitamos 'old'.
                // Usaremos setAnalyses funcional para acceder al estado más reciente.

                setAnalyses(prev => prev.map((analysis, index) => {
                    if (index !== targetIndex) return analysis;

                    const currentFieldValue = analysis[field as keyof Analysis] as any || {};
                    return {
                        ...analysis,
                        [field]: {
                            ...currentFieldValue,
                            fotoUrl: url
                        }
                    };
                }));
            }
        } catch (error) {
            console.error('Error uploading photo:', error);
            toast.error('Error al subir la foto. Intenta de nuevo.');
        } finally {
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false); // Desbloquear auto-save (disparará el useEffect)
        }
    };

    const isFieldUploading = (field: string) => {
        const key = `${activeAnalysisIndex}-${field}`;
        return uploadingPhotos.has(key);
    };

    // Handler for pesos brutos
    const handlePesosBrutosChange = (registros: PesoBrutoRegistro[]) => {
        updateCurrentAnalysis({ pesosBrutos: registros });
    };

    const handlePesoBrutoPhotoCapture = async (registroId: string, file: File) => {
        const targetIndex = activeAnalysisIndex; // Capturar índice actual
        const key = `${targetIndex}-pesobruto-${registroId}`;
        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true); // Bloquear auto-save

        try {
            const { googleDriveService } = await import('@/lib/googleDriveService');
            await googleDriveService.initialize();

            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            // Obtener URL anterior
            // Usamos analyses[targetIndex]
            const targetAnalysis = analyses[targetIndex];
            const registro = targetAnalysis.pesosBrutos?.find(r => r.id === registroId);
            const oldUrl = registro?.fotoUrl;

            const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
                file,
                codigo,
                lote,
                `peso_bruto_${registroId}_analysis${targetIndex + 1}`,
                oldUrl, // Pasar URL anterior
                user?.email
            ));

            // Update the specific registro using functional update on setAnalyses
            setAnalyses(prev => prev.map((analysis, index) => {
                if (index !== targetIndex) return analysis;

                return {
                    ...analysis,
                    pesosBrutos: analysis.pesosBrutos?.map(r =>
                        r.id === registroId ? { ...r, fotoUrl: url } : r
                    )
                };
            }));
        } catch (error) {
            console.error('Error uploading peso bruto photo:', error);
            toast.error('Error al subir la foto del peso bruto');
        } finally {
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false); // Desbloquear auto-save
        }
    };

    const isPesoBrutoUploading = (registroId: string) => {
        const key = `${activeAnalysisIndex}-pesobruto-${registroId}`;
        return uploadingPhotos.has(key);
    };

    // Helper para extraer ID de archivo de URL de Google Drive
    const extractFileIdFromUrl = (url: string): string | null => {
        if (!url) return null;

        // Formato: https://drive.google.com/uc?export=view&id=FILE_ID
        // o https://drive.google.com/thumbnail?id=FILE_ID&sz=w800
        const match = url.match(/[?&]id=([^&]+)/);
        if (match) return match[1];

        // Formato: https://drive.google.com/file/d/FILE_ID/view
        const match2 = url.match(/\/file\/d\/([^/]+)/);
        if (match2) return match2[1];

        return null;
    };

    // Handler for deleting peso bruto registro (including Drive cleanup)
    const handlePesoBrutoDelete = async (registro: PesoBrutoRegistro) => {
        // Si el registro tiene foto, intentar eliminarla de Google Drive
        if (registro?.fotoUrl && !registro.fotoUrl.startsWith('blob:')) {
            try {
                const { googleDriveService } = await import('@/lib/googleDriveService');

                // Extraer el ID del archivo desde la URL
                const fileId = extractFileIdFromUrl(registro.fotoUrl);

                if (fileId) {
                    await googleDriveService.deleteFile(fileId);
                    console.log('✅ Foto de peso bruto eliminada de Google Drive');
                }
            } catch (error) {
                console.warn('⚠️ No se pudo eliminar la foto de Google Drive:', error);
                // Continuar aunque falle la eliminación de la foto
                throw error; // Re-throw para que el componente maneje el error
            }
        }
    };

    // Handler for defects
    const handleDefectsChange = (defects: { [key: string]: number }) => {
        updateCurrentAnalysis({ defectos: defects });
    };

    // Use the new hook for weight inputs
    const { handleWeightChange } = useWeightInput(currentAnalysis, updateCurrentAnalysis);

    const handleCompleteAnalysis = async () => {
        if (!analysisId) return;

        try {
            // Guardar como completado
            await saveDocument('COMPLETADO');
            toast.success('¡Análisis completado exitosamente!');

            // Pequeño delay para asegurar que el toast se vea antes de redirigir
            setTimeout(() => {
                router.push('/');
                router.refresh();
            }, 1000);
        } catch (error) {
            console.error('Error completing analysis:', error);
            toast.error('Error al completar el análisis');
        }
    };

    // Loading state
    // Handler especial para foto global de peso bruto
    const handleGlobalPesoBrutoPhoto = async (file: File) => {
        const key = 'global-pesoBruto';
        setPhotos(prev => ({ ...prev, [key]: file }));
        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true);

        try {
            const { googleDriveService } = await import('@/lib/googleDriveService');
            await googleDriveService.initialize();
            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            const oldUrl = globalPesoBruto.fotoUrl;

            const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
                file,
                codigo,
                lote,
                'peso_bruto_global',
                oldUrl,
                user?.email
            ));

            setGlobalPesoBruto(prev => ({ ...prev, fotoUrl: url }));
        } catch (error) {
            console.error('Error uploading global peso bruto photo:', error);
            toast.error('Error al subir la foto global');
        } finally {
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false);
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

    // Step 1: Product Type Selection
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

    // Step 2: Initial Form (Lote, Código, Talla, Color)
    if (!basicsCompleted) {
        return (
            <div className="min-h-screen p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Botón Volver al Dashboard */}
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

    // Step 3: Multi-Analysis Form with Tabs
    const colorHex = analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9';

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
                            {/* Sample badge */}
                            <div
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-sm"
                                style={{ backgroundColor: analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9' }}
                            >
                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                <span>Muestra {activeAnalysisIndex + 1}/{analyses.length}</span>
                            </div>

                            {/* Analyst color indicator */}
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
                    {codeValidationError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 font-medium">⚠️ {codeValidationError}</p>
                        </div>
                    )}

                    {/* GLOBAL PESO BRUTO (Solo para códigos especiales) */}
                    {isDualBag && (productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') && (
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
                    )}

                    {/* Pesos Section */}
                    {(productType === 'ENTERO' || productType === 'COLA' || productType === 'VALOR_AGREGADO') && (
                        <Card>
                            <CardHeader>
                                <CardTitle>⚖️ Pesos {isDualBag ? '(Por Funda)' : ''}</CardTitle>
                                <CardDescription>Registra los pesos con fotos</CardDescription>
                            </CardHeader>
                            <CardContent className={viewMode === 'COMPACTA' ? 'p-4 space-y-4' : 'p-6 space-y-6'}>
                                <div className={viewMode === 'COMPACTA' ? 'grid grid-cols-3 gap-4' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}>
                                    {/* Peso Bruto (Ocultar si es Dual Bag) */}
                                    {!isDualBag && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label required>Peso Bruto ({weightUnit.toLowerCase()})</Label>
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
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                    pesoBruto: {
                                                        ...currentAnalysis.pesoBruto,
                                                        valor: parseFloat(e.target.value) || undefined
                                                    }
                                                })}
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
                                            <Label>Peso Congelado ({weightUnit.toLowerCase()})</Label>
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
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                pesoCongelado: {
                                                    ...currentAnalysis.pesoCongelado,
                                                    valor: parseFloat(e.target.value) || undefined
                                                }
                                            })}
                                        />
                                        <PhotoCapture
                                            key={`pesoCongelado-${activeAnalysisIndex}`}
                                            label="Foto Peso Congelado"
                                            photoUrl={currentAnalysis.pesoCongelado?.fotoUrl}
                                            onPhotoCapture={(file) => handlePhotoCapture('pesoCongelado', file)}
                                            isUploading={isFieldUploading('pesoCongelado')}
                                        />
                                    </div>

                                    {/* Peso con Glaseo (Solo Valor Agregado) */}
                                    {productType === 'VALOR_AGREGADO' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Peso con Glaseo ({weightUnit.toLowerCase()})</Label>
                                                {currentAnalysis.pesoConGlaseo?.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentAnalysis.pesoConGlaseo?.valor || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                    pesoConGlaseo: {
                                                        ...currentAnalysis.pesoConGlaseo,
                                                        valor: parseFloat(e.target.value) || undefined
                                                    }
                                                })}
                                            />
                                            <PhotoCapture
                                                key={`pesoConGlaseo-${activeAnalysisIndex}`}
                                                label="Foto Peso con Glaseo"
                                                photoUrl={currentAnalysis.pesoConGlaseo?.fotoUrl}
                                                onPhotoCapture={(file) => handlePhotoCapture('pesoConGlaseo', file)}
                                                isUploading={isFieldUploading('pesoConGlaseo')}
                                            />
                                        </div>
                                    )}

                                    {/* Peso sin Glaseo (Solo Valor Agregado) */}
                                    {productType === 'VALOR_AGREGADO' && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <Label>Peso sin Glaseo ({weightUnit.toLowerCase()})</Label>
                                                {currentAnalysis.pesoSinGlaseo?.valor && (
                                                    <div className="bg-green-500 rounded-full p-0.5 shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    </div>
                                                )}
                                            </div>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={currentAnalysis.pesoSinGlaseo?.valor || ''}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                    pesoSinGlaseo: {
                                                        ...currentAnalysis.pesoSinGlaseo,
                                                        valor: parseFloat(e.target.value) || undefined
                                                    }
                                                })}
                                            />
                                            <PhotoCapture
                                                key={`pesoSinGlaseo-${activeAnalysisIndex}`}
                                                label="Foto Peso sin Glaseo"
                                                photoUrl={currentAnalysis.pesoSinGlaseo?.fotoUrl}
                                                onPhotoCapture={(file) => handlePhotoCapture('pesoSinGlaseo', file)}
                                                isUploading={isFieldUploading('pesoSinGlaseo')}
                                            />
                                        </div>
                                    )}

                                    {/* Peso Neto */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label>Peso Neto ({weightUnit.toLowerCase()})</Label>
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
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                pesoNeto: {
                                                    ...currentAnalysis.pesoNeto,
                                                    valor: parseFloat(e.target.value) || undefined
                                                }
                                            })}
                                        />
                                        <PhotoCapture
                                            key={`pesoNeto-${activeAnalysisIndex}`}
                                            label="Foto Peso Neto"
                                            photoUrl={currentAnalysis.pesoNeto?.fotoUrl}
                                            onPhotoCapture={(file) => handlePhotoCapture('pesoNeto', file)}
                                            isUploading={isFieldUploading('pesoNeto')}
                                        />
                                    </div>
                                </div>

                                {/* Conteo */}
                                <div className="pt-4 border-t border-slate-800">
                                    <div className="max-w-xs">
                                        <Label htmlFor="conteo">Conteo</Label>
                                        <Input
                                            id="conteo"
                                            type="number"
                                            placeholder="0"
                                            value={currentAnalysis.conteo || ''}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCurrentAnalysis({
                                                conteo: parseInt(e.target.value) || undefined
                                            })}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card >
                    )
                    }

                    {/* Control de Pesos Brutos */}
                    {
                        productType === 'CONTROL_PESOS' && (
                            <ControlPesosBrutos
                                registros={currentAnalysis.pesosBrutos || []}
                                onChange={handlePesosBrutosChange}
                                onPhotoCapture={handlePesoBrutoPhotoCapture}
                                onDeleteRequest={handlePesoBrutoDelete}
                                isPhotoUploading={isPesoBrutoUploading}
                                viewMode={viewMode === 'COMPACTA' ? 'COMPACTA' : 'SUELTA'}
                                unit={weightUnit}
                            />
                        )
                    }

                    {/* Uniformidad (Solo Entero y Cola) */}
                    {
                        (productType === 'ENTERO' || productType === 'COLA') && (
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

                    {/* Delete Button with Inline Confirmation */}
                    <div className="pt-4 flex justify-center">
                        {!showDeleteModal ? (
                            <button
                                type="button"
                                onClick={() => {
                                    console.log('🗑️ Delete button clicked');
                                    if (!analysisId) {
                                        toast.error('Error: No hay análisis cargado para eliminar');
                                        return;
                                    }
                                    setShowDeleteModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium border border-red-200"
                            >
                                <Trash2 className="w-4 h-4" />
                                Borrar Análisis
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200 max-w-2xl w-full">
                                <div className="flex-1 space-y-2">
                                    <p className="text-sm font-medium text-red-800">
                                        Escribe <span className="font-mono font-bold">confirmar</span> para eliminar:
                                    </p>
                                    <input
                                        type="text"
                                        value={confirmText}
                                        onChange={(e) => setConfirmText(e.target.value)}
                                        placeholder="confirmar"
                                        className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && confirmText.toLowerCase() === 'confirmar') {
                                                handleDeleteAnalysis();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setShowDeleteModal(false);
                                            setConfirmText('');
                                        }}
                                        className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleDeleteAnalysis}
                                        disabled={confirmText.toLowerCase() !== 'confirmar'}
                                        className={`px-3 py-2 text-sm font-bold rounded-lg ${confirmText.toLowerCase() === 'confirmar'
                                            ? 'bg-red-500 hover:bg-red-600 text-white'
                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            }`}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </div>
                        )}
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
                onConfirm={handleDeleteAnalysis}
                analysisCode={codigo}
                analysisLote={lote}
                type="confirmar"
            />
        </div >
    );
}
