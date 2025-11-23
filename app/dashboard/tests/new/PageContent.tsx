'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

// UI Components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Textarea } from '@/components/ui';

// Specialized Components
import SmartInputGroup from '@/components/SmartInputGroup';
import StickyHeader from '@/components/StickyHeader';

// Existing Components
import ProductTypeSelector from '@/components/ProductTypeSelector';
import InitialForm from '@/components/InitialForm';
import AnalysisTabs from '@/components/AnalysisTabs';
import PhotoCapture from '@/components/PhotoCapture';
import ControlPesosBrutos from '@/components/ControlPesosBrutos';
import DefectSelector from '@/components/DefectSelector';
import AutoSaveIndicatorNew from '@/components/AutoSaveIndicatorNew';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

// Types and Utils
import {
    ProductType,
    QualityAnalysis,
    AnalystColor,
    Analysis,
    PesoBrutoRegistro,
    ANALYST_COLOR_HEX
} from '@/lib/types';
import { getWorkShift, formatDate, generateId } from '@/lib/utils';
import { useWeightInput } from '@/hooks/useWeightInput';

// Helper para crear un análisis vacío
const createEmptyAnalysis = (numero: number): Analysis => ({
    numero,
    pesosBrutos: [],
    defectos: {}
});

// Mapping de códigos a unidades de peso
const CODE_UNITS: { [key: string]: 'KG' | 'LB' } = {
    '00010': 'KG', '00012': 'KG', '00016': 'LB', '00017': 'LB', '00018': 'LB', '00020': 'KG',
    '00021': 'KG', '00022': 'KG', '00024': 'KG', '00026': 'LB', '00027': 'KG', '00028': 'KG',
    '00031': 'LB', '00034': 'LB', '00035': 'LB', '00036': 'LB', '00037': 'KG', '00038': 'LB',
    '00039': 'KG', '00041': 'LB', '00042': 'LB', '00043': 'LB', '00044': 'LB', '00045': 'LB',
    '00046': 'LB', '00047': 'KG', '00048': 'KG', '00049': 'LB', '00050': 'LB', '00051': 'KG',
    '00052': 'KG', '00053': 'LB', '00054': 'LB', '00055': 'LB', '00056': 'KG', '00057': 'KG',
    '00058': 'LB', '00059': 'KG', '00060': 'KG', '00062': 'KG', '00063': 'KG', '00064': 'KG',
    '00065': 'LB', '00066': 'KG', '00067': 'KG', '00068': 'KG', '00069': 'KG', '00070': 'KG',
    '00071': 'LB', '00072': 'LB', '00073': 'KG', '00074': 'KG', '00075': 'LB', '00076': 'KG',
    '00077': 'KG', '00078': 'KG', '00079': 'KG', '00080': 'KG', '00081': 'KG', '00082': 'KG',
    '00083': 'LB', '00084': 'KG', '00085': 'KG', '00087': 'KG', '00088': 'KG', '00089': 'LB',
    '00091': 'LB', '00092': 'KG', '00093': 'KG', '00094': 'KG', '00095': 'KG', '00096': 'KG',
    '00097': 'KG', '00098': 'LB', '00099': 'KG', '00100': 'KG', '00102': 'LB', '00103': 'KG',
    '00105': 'LB', '00106': 'KG', '00108': 'KG', '00111': 'LB', '00112': 'KG', '00113': 'KG',
    '00116': 'KG', '00117': 'KG', '00119': 'KG', '00120': 'KG', '00121': 'KG', '00122': 'KG',
    '00123': 'KG', '00124': 'KG', '00125': 'LB', '00126': 'LB', '00127': 'KG', '00128': 'KG',
    '00130': 'LB', '00131': 'KG', '00133': 'LB', '00134': 'LB', '00136': 'LB', '00137': 'KG',
    '00140': 'KG', '00142': 'KG', '00143': 'KG', '00144': 'LB', '00145': 'KG', '00146': 'LB',
    '00147': 'LB', '00148': 'LB', '00149': 'LB', '00150': 'LB', '00152': 'LB', '00153': 'KG',
    '00154': 'KG', '00155': 'LB', '00157': 'KG', '00158': 'KG', '00159': 'KG', '00160': 'KG',
    '00161': 'LB', '00162': 'KG', '00163': 'KG', '00164': 'KG', '00165': 'KG', '00166': 'KG',
    '00168': 'LB', '00169': 'LB', '00170': 'KG', '00171': 'KG', '00172': 'KG', '00173': 'LB',
    '00174': 'LB', '00175': 'KG', '00176': 'LB', '00177': 'KG', '00178': 'LB', '00179': 'KG',
    '00181': 'KG', '00182': 'KG', '00183': 'KG', '00184': 'KG', '00186': 'LB', '00187': 'KG',
    '00192': 'KG', '00194': 'KG', '00195': 'LB', '00196': 'LB', '00197': 'LB', '00198': 'KG',
    '00199': 'LB', '00202': 'KG', '00203': 'LB', '00204': 'KG', '00205': 'KG', '00206': 'KG',
    '00207': 'KG', '00208': 'LB', '00209': 'LB', '00210': 'LB', '00211': 'LB', '00212': 'LB',
    '00213': 'LB', '00214': 'LB', '00215': 'LB', '00216': 'LB', '00217': 'LB', '00218': 'LB',
    '00219': 'LB', '00220': 'KG', '00221': 'KG', '00222': 'KG', '00224': 'KG', '00225': 'KG',
    '00226': 'KG', '00227': 'KG', '00228': 'KG', '00229': 'LB', '00232': 'KG', '00233': 'KG',
    '00234': 'KG', '00235': 'KG', '00236': 'LB', '00237': 'LB', '00238': 'KG', '00239': 'LB',
    '00240': 'KG', '00241': 'KG', '00242': 'KG', '00243': 'KG', '00244': 'KG', '00245': 'KG',
    '00246': 'KG', '00247': 'KG', '00248': 'LB', '00249': 'KG', '00250': 'LB', '00251': 'LB',
    '00252': 'LB', '00253': 'LB', '00254': 'KG', '00255': 'KG', '00256': 'KG', '00257': 'KG',
    '00258': 'KG', '00259': 'LB', '00261': 'LB', '00262': 'KG', '00263': 'KG', '00264': 'KG',
    '00265': 'KG', '00266': 'KG', '00267': 'KG', '00268': 'KG', '00269': 'KG', '00270': 'LB',
    '00271': 'KG', '00272': 'KG', '00273': 'KG', '00274': 'KG', '00275': 'KG', '00276': 'LB',
    '00277': 'KG', '00278': 'KG', '00279': 'LB', '00280': 'KG', '00281': 'KG', '00282': 'KG',
    '00283': 'KG', '00287': 'KG', '00288': 'KG', '00290': 'KG', '00291': 'LB', '00292': 'LB',
    '00293': 'LB', '00294': 'KG', '00295': 'KG', '00296': 'KG', '00297': 'KG', '00298': 'KG',
    '00299': 'KG', '00300': 'KG', '00301': 'KG', '00302': 'LB', '00303': 'LB', '00305': 'KG',
    '00306': 'KG', '00307': 'KG', '00308': 'KG', '00309': 'KG', '00310': 'LB', '00311': 'LB',
    '00312': 'LB', '00313': 'LB', '00314': 'LB', '00315': 'KG', '00319': 'KG', '00321': 'KG',
    '00324': 'KG', '00325': 'KG', '00327': 'KG', '00328': 'KG', '00329': 'KG', '00330': 'KG',
    '00331': 'KG', '00336': 'KG', '00337': 'KG', '00338': 'KG', '00339': 'KG', '00340': 'LB',
    '00341': 'LB', '00342': 'KG', '00343': 'KG', '00344': 'KG', '00345': 'KG', '00346': 'LB',
    '00348': 'KG', '00349': 'KG', '00350': 'KG', '00352': 'KG', '00353': 'LB', '00355': 'LB',
    '00356': 'KG', '00358': 'KG', '00359': 'LB', '00360': 'KG', '00361': 'LB', '00362': 'LB',
    '00366': 'KG', '00367': 'KG', '00372': 'KG', '00373': 'KG', '00375': 'KG', '00378': 'KG',
    '00379': 'KG', '00380': 'KG'
};

// Códigos que requieren flujo especial: 1 Peso Bruto Global -> 2 Análisis (Fundas)
const DUAL_BAG_CODES = [
    '00048', '00051', '00067', '00068', '00069', '00079', '00084', '00103', '00106', '00123',
    '00158', '00170', '00171', '00172', '00177', '00204', '00238', '00240', '00244', '00255',
    '00256', '00263', '00272', '00307', '00308', '00309', '00321', '00342', '00366', '00378',
    '00379', '00380'
];

const ViewModeSelector = ({ mode, onChange }: { mode: 'compact' | 'loose'; onChange: (m: 'compact' | 'loose') => void }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm"
            >
                <span>👁️ Apariencia</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <button
                        onClick={() => { onChange('compact'); setIsOpen(false); }}
                        className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-3 ${mode === 'compact' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="w-5 h-5 flex items-center justify-center border border-current rounded-[4px] bg-white">
                            <span className="w-3 h-3 bg-current rounded-[1.5px]" />
                        </span>
                        Compactado
                    </button>
                    <button
                        onClick={() => { onChange('loose'); setIsOpen(false); }}
                        className={`w-full px-3 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-3 ${mode === 'loose' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                        <span className="w-5 h-5 flex items-center justify-center border border-current rounded-[4px] bg-white gap-[2px]">
                            <span className="w-1.5 h-1.5 bg-current rounded-[1px]" />
                            <span className="w-1.5 h-1.5 bg-current rounded-[1px]" />
                        </span>
                        Suelto
                    </button>
                </div>
            )}
        </div>
    );
};

export default function NewMultiAnalysisPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Basic document info
    const [analysisId, setAnalysisId] = useState<string | null>(null);
    const [productType, setProductType] = useState<ProductType>();

    // Multi-analysis state
    const [basicsCompleted, setBasicsCompleted] = useState(false);
    const [lote, setLote] = useState('');
    const [codigo, setCodigo] = useState('');
    const [talla, setTalla] = useState('');
    const [analystColor, setAnalystColor] = useState<AnalystColor | null>(null);
    const [createdAtState, setCreatedAtState] = useState<string | null>(null);

    // Analyses array and active tab
    const [analyses, setAnalyses] = useState<Analysis[]>([createEmptyAnalysis(1)]);
    const [activeAnalysisIndex, setActiveAnalysisIndex] = useState(0);

    // Photo management
    const [photos, setPhotos] = useState<{ [key: string]: File }>({});
    const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
    const [isUploadingGlobal, setIsUploadingGlobal] = useState(false); // Para bloquear auto-save durante subida

    // Dual Bag Logic State
    const [isDualBag, setIsDualBag] = useState(false);
    const [weightUnit, setWeightUnit] = useState<'KG' | 'LB'>('KG');
    const [globalPesoBruto, setGlobalPesoBruto] = useState<{ valor?: number; fotoUrl?: string }>({});

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(!!searchParams.get('id'));
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [confirmText, setConfirmText] = useState('');
    const [viewMode, setViewMode] = useState<'compact' | 'loose'>('loose');

    const handleDeleteAnalysis = async () => {
        console.log('🗑️ handleDeleteAnalysis called', { analysisId, totalAnalyses: analyses.length, activeIndex: activeAnalysisIndex });

        // Caso 1: Si hay múltiples análisis (tabs), solo eliminar el activo
        if (analyses.length > 1) {
            console.log('🗑️ Multiple analyses detected, removing active tab only');

            // Eliminar el análisis activo del array
            const updatedAnalyses = analyses.filter((_, index) => index !== activeAnalysisIndex);
            setAnalyses(updatedAnalyses);

            // Ajustar el índice activo
            if (activeAnalysisIndex >= updatedAnalyses.length) {
                setActiveAnalysisIndex(updatedAnalyses.length - 1);
            }

            toast.success('Análisis eliminado');
            setShowDeleteModal(false);

            // Guardar cambios automáticamente
            setTimeout(() => saveDocument(), 500);
            return;
        }

        // Caso 2: Solo hay un análisis, eliminar el documento completo
        if (!analysisId) {
            console.error('❌ No analysisId found to delete');
            toast.error('No se puede eliminar: ID de análisis no encontrado');
            return;
        }

        try {
            const { deleteAnalysis } = await import('@/lib/analysisService');
            console.log('Calling deleteAnalysis service for entire document...');
            await deleteAnalysis(analysisId);
            console.log('✅ Analysis deleted successfully');

            // Forzar refresco de datos y redirigir
            router.refresh();
            router.push('/');
            toast.success('Análisis eliminado correctamente');
        } catch (error) {
            console.error('❌ Error deleting analysis:', error);
            toast.error('Error al eliminar el análisis. Por favor intenta de nuevo.');
        }
    };

    // Load existing analysis if id parameter is present
    useEffect(() => {
        const loadExistingAnalysis = async () => {
            const idParam = searchParams.get('id');

            if (idParam) {
                setIsLoading(true);
                try {
                    const { getAnalysisById } = await import('@/lib/analysisService');
                    const existingAnalysis = await getAnalysisById(idParam);

                    if (existingAnalysis) {
                        // Populate all fields with existing data
                        setAnalysisId(existingAnalysis.id);
                        setProductType(existingAnalysis.productType);
                        setLote(existingAnalysis.lote);
                        setCodigo(existingAnalysis.codigo);
                        setTalla(existingAnalysis.talla || '');
                        setAnalystColor(existingAnalysis.analystColor);
                        setCreatedAtState(existingAnalysis.createdAt);

                        // Load analyses array if it exists, otherwise create empty one
                        if (existingAnalysis.analyses && existingAnalysis.analyses.length > 0) {
                            setAnalyses(existingAnalysis.analyses);

                            // Si es un código especial, poblar el peso bruto global desde el primer análisis
                            if (DUAL_BAG_CODES.includes(existingAnalysis.codigo)) {
                                const firstAnalysis = existingAnalysis.analyses[0];
                                if (firstAnalysis?.pesoBruto) {
                                    setGlobalPesoBruto({
                                        valor: firstAnalysis.pesoBruto.valor,
                                        fotoUrl: firstAnalysis.pesoBruto.fotoUrl
                                    });
                                }
                            }
                        }

                        // Mark basics as completed since we loaded existing data
                        setBasicsCompleted(true);

                        console.log('✅ Loaded existing analysis:', existingAnalysis.id);
                    } else {
                        console.warn('⚠️ Analysis not found:', idParam);
                    }
                } catch (error) {
                    console.error('❌ Error loading analysis:', error);
                    setSaveError('Error al cargar el análisis');
                } finally {
                    setIsLoading(false);
                }
            } else {
                // New analysis - generate ID
                if (!analysisId) {
                    setAnalysisId(generateId());
                }
            }
        };

        loadExistingAnalysis();
    }, [searchParams]);

    // Detectar códigos especiales y configurar modo Dual Bag y Unidad de Peso
    useEffect(() => {
        const isSpecialCode = DUAL_BAG_CODES.includes(codigo);
        setIsDualBag(isSpecialCode);

        // Determinar unidad de peso
        const unit = CODE_UNITS[codigo] || 'KG';
        setWeightUnit(unit);

        if (isSpecialCode) {
            // Asegurar que haya exactamente 2 análisis si es un código especial
            if (analyses.length < 2) {
                setAnalyses(prev => {
                    const missing = 2 - prev.length;
                    const newAnalyses = Array(missing).fill(null).map((_, i) => createEmptyAnalysis(prev.length + i + 1));
                    return [...prev, ...newAnalyses];
                });
            }
        }
    }, [codigo]);

    // Handle initial form completion
    const handleInitialFormComplete = async (data: {
        lote: string;
        codigo: string;
        talla: string;
        color: AnalystColor | null;
    }) => {
        if (!data.color) return;
        setLote(data.lote);
        setCodigo(data.codigo);
        setTalla(data.talla);
        setAnalystColor(data.color);
        setBasicsCompleted(true);

        // Trigger auto-save
        setTimeout(() => saveDocument(), 100);
    };

    // Add new analysis tab
    const handleAddAnalysis = () => {
        const newAnalysis = createEmptyAnalysis(analyses.length + 1);
        setAnalyses([...analyses, newAnalysis]);
        setActiveAnalysisIndex(analyses.length);
    };

    // Get current active analysis
    const currentAnalysis = analyses[activeAnalysisIndex];

    // Update current analysis
    const updateCurrentAnalysis = (updates: Partial<Analysis>) => {
        setAnalyses(prev => prev.map((analysis, index) =>
            index === activeAnalysisIndex
                ? { ...analysis, ...updates }
                : analysis
        ));
    };

    // Update specific analysis by index (safe for async operations)
    const updateAnalysisAtIndex = (indexToUpdate: number, updates: Partial<Analysis>) => {
        setAnalyses(prev => prev.map((analysis, index) =>
            index === indexToUpdate
                ? { ...analysis, ...updates }
                : analysis
        ));
    };

    // Auto-save document
    const saveDocument = async () => {
        if (!analysisId || !productType || !analystColor) return;

        try {
            setIsSaving(true);
            const { saveAnalysis } = await import('@/lib/analysisService');
            const { googleAuthService } = await import('@/lib/googleAuthService');
            const { validateAnalysisData, getValidationErrors } = await import('@/lib/validation');

            const user = googleAuthService.getUser();
            const now = new Date();

            // Si ya tenemos un createdAt (porque cargamos un análisis existente), lo mantenemos.
            // Si es nuevo, usamos 'now'.
            // Para asegurarnos, intentamos obtenerlo del estado actual si existe, o del análisis cargado.
            // Pero como 'saveDocument' construye el objeto desde cero con variables de estado,
            // necesitamos persistir el 'createdAt' original.
            // Una forma es guardarlo en un estado al cargar, o simplemente no sobrescribirlo si ya existe en la DB.
            // Como aquí estamos construyendo el objeto completo para 'saveAnalysis',
            // lo mejor es tener un estado para 'createdAt' o leerlo del análisis actual si lo tenemos en memoria.

            // Solución: Usar un estado para createdAt, inicializado cuando se carga el análisis.
            // Si no hay estado (nuevo análisis), usar now.
            const creationDate = createdAtState || now.toISOString();

            // Si es Dual Bag, inyectar el peso bruto global en cada análisis
            const analysesToSave = isDualBag
                ? analyses.map(a => ({
                    ...a,
                    pesoBruto: {
                        valor: globalPesoBruto.valor,
                        fotoUrl: globalPesoBruto.fotoUrl
                    }
                }))
                : analyses;

            const document: QualityAnalysis = {
                id: analysisId,
                productType,
                lote,
                codigo,
                talla: talla || undefined,
                analystColor,
                analyses: analysesToSave,
                createdAt: creationDate,
                updatedAt: now.toISOString(),
                createdBy: user?.email || 'unknown',
                shift: getWorkShift(new Date(creationDate)), // El turno debe basarse en la fecha de creación original
                date: formatDate(new Date(creationDate)),    // La fecha también
                status: 'EN_PROGRESO'
            };

            // Validar datos antes de guardar
            const validation = validateAnalysisData(document);
            if (!validation.success) {
                const errors = getValidationErrors(validation.error);
                console.warn('⚠️ Validación fallida en auto-save:', errors);

                // No bloqueamos el guardado si son errores menores para no perder datos en progreso,
                // pero sí bloqueamos si hay errores críticos de estructura o tipos
                // Por ahora, solo logueamos y permitimos guardar (soft validation)
                // TODO: Implementar bloqueo estricto cuando la UI muestre errores inline
            }

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
                        selectedType={productType}
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

                    <InitialForm onComplete={handleInitialFormComplete} />
                </div>
            </div>
        );
    }

    // Step 3: Multi-Analysis Form with Tabs
    const colorHex = analystColor ? ANALYST_COLOR_HEX[analystColor] : '#0ea5e9';

    return (
        <div className="min-h-screen pb-20">
            {/* Sticky Header */}
            {basicsCompleted && analystColor && (
                <StickyHeader
                    lote={lote}
                    codigo={codigo}
                    talla={talla}
                    analystColor={analystColor}
                    activeAnalysisIndex={activeAnalysisIndex}
                    totalAnalyses={analyses.length}
                    saveState={isSaving ? 'saving' : saveError ? 'error' : 'saved'}
                    lastSaved={lastSaved}
                />
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

                        {/* Solo el indicador de color del analista */}
                        <div className="flex items-center gap-2">
                            <div
                                className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                                style={{ backgroundColor: colorHex }}
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
                        <ViewModeSelector mode={viewMode} onChange={setViewMode} />
                    </div>

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
                            <CardContent className={viewMode === 'compact' ? 'p-4 space-y-4' : 'p-6 space-y-6'}>
                                <div className={viewMode === 'compact' ? 'grid grid-cols-3 gap-4' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}>
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
                                            label="Foto Peso Congelado"
                                            photoUrl={currentAnalysis.pesoCongelado?.fotoUrl}
                                            onPhotoCapture={(file) => handlePhotoCapture('pesoCongelado', file)}
                                            isUploading={isFieldUploading('pesoCongelado')}
                                        />
                                    </div>

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
                                viewMode={viewMode === 'compact' ? 'COMPACTA' : 'SUELTA'}
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
                                <CardContent className={viewMode === 'compact' ? 'p-4 space-y-4' : 'p-6 space-y-6 md:p-4 md:space-y-4'}>
                                    <div className={viewMode === 'compact' ? 'grid grid-cols-2 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-4'}>
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
