import { useState, useCallback, useEffect, useRef } from 'react';
import { Analysis, QualityAnalysis, AnalystColor, PesoConFoto } from '@/lib/types';
import { getWorkShift, getProductionDate } from '@/lib/utils';

interface UseAnalysisSaveProps {
    analysisId: string | null;
    basicsCompleted: boolean;
    analyses: Analysis[];
    codigo: string;
    lote: string;
    talla: string;
    productType: any;
    analystColor: AnalystColor | null;
    originalAnalystColor: AnalystColor | null;
    originalCreatedAt: string | null;
    originalCreatedBy: string | null;
    originalDate: string | null;
    originalShift: 'DIA' | 'NOCHE' | null;
    globalPesoBruto: PesoConFoto;
    isCompleted: boolean;
    setIsCompleted: (completed: boolean) => void;
    isDeleting?: boolean;
    sections?: {
        weights: boolean;
        uniformity: boolean;
        defects: boolean;
    };
    remuestreoConfig?: any; // Keep prop but ignore in save if strictly typed
}

export const useAnalysisSave = ({
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
    isDeleting = false,
    sections,
    remuestreoConfig
}: UseAnalysisSaveProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Refs for auto-save
    const timeoutRef = useRef<NodeJS.Timeout>();
    const previousDataRef = useRef<string>('');
    const saveInProgressRef = useRef<boolean>(false);
    const lastKeyPressRef = useRef<number>(Date.now());
    const isRemoteUpdateRef = useRef<boolean>(false);
    const lastSavedDataRef = useRef<string>('');

    // Helper function for deterministic JSON serialization
    const deterministicStringify = useCallback((obj: any): string => {
        if (obj === null || obj === undefined) return JSON.stringify(obj);
        if (typeof obj !== 'object') return JSON.stringify(obj);
        if (Array.isArray(obj)) {
            return '[' + obj.map((item: any) => deterministicStringify(item)).join(',') + ']';
        }
        const sortedKeys = Object.keys(obj).sort();
        const pairs = sortedKeys.map(key => {
            return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
        });
        return '{' + pairs.join(',') + '}';
    }, []);

    // 1. Core Saving Logic
    const saveDocumentLogic = useCallback(async (data: any, status: string) => {
        if (saveInProgressRef.current) return;

        saveInProgressRef.current = true;
        setIsSaving(true);
        setSaveError(null);

        try {
            const { saveAnalysis } = await import('@/lib/analysisService');
            // Remove remuestreoConfig if not present in type
            // or cast to any if we force save it (but Firestore might clean it if cleanDataForFirestore is strict? No, cleanDataForFirestore is generic)
            // But TypeScript fails. So we simply don't include it in strict Document if not in Type.
            // If user needs it, we should add to Type. But user said "download latest", suggesting remote type is authoritative.
            await saveAnalysis(data);

            setLastSaved(new Date());
            lastSavedDataRef.current = deterministicStringify(data);

            if (status === 'COMPLETADO') {
                setIsCompleted(true);
            }
            console.log('✅ Document saved');
        } catch (error) {
            console.error('Error auto-saving:', error);
            setSaveError('Error al guardar cambios');
        } finally {
            setIsSaving(false);
            saveInProgressRef.current = false;
        }
    }, [deterministicStringify, setIsCompleted]);

    // 2. Debouncer
    const debouncedSave = useCallback((data: any, status: string, dataString: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Check if data actually changed
        if (dataString === lastSavedDataRef.current && status === 'EN_PROGRESO') {
            return;
        }

        // Set new timeout (2 seconds)
        timeoutRef.current = setTimeout(() => {
            saveDocumentLogic(data, status);
        }, 2000);
    }, [saveDocumentLogic]);

    // 3. Immediate Save (for unmount/unload)
    const saveImmediate = useCallback(async () => {
        if (!previousDataRef.current) return;

        // Prevent duplicate saves
        if (previousDataRef.current === lastSavedDataRef.current) return;

        try {
            const dataToSave = JSON.parse(previousDataRef.current);
            await saveDocumentLogic(dataToSave, 'EN_PROGRESO');
        } catch (error) {
            console.error('Error in saveImmediate:', error);
        }
    }, [saveDocumentLogic]);

    // 4. Effects for Immediate Save
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') saveImmediate();
        };
        const handleBeforeUnload = () => {
            saveImmediate();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            saveImmediate();
        };
    }, [saveImmediate]);

    // 5. Main Save Function (Gathers Data and Triggers Debounce)
    const saveDocument = useCallback(async (status: 'EN_PROGRESO' | 'COMPLETADO' = 'EN_PROGRESO') => {
        if (!analysisId || !basicsCompleted) return;

        const now = new Date();
        const productionDate = getProductionDate(now);

        const { googleAuthService } = await import('@/lib/googleAuthService');
        const user = googleAuthService.getUser();

        let finalStatus = status;
        if (isCompleted && status === 'EN_PROGRESO') finalStatus = 'COMPLETADO';

        let completedAtValue: string | undefined = undefined;
        if (finalStatus === 'COMPLETADO') {
            if (status === 'COMPLETADO') {
                completedAtValue = now.toISOString();
            } else {
                const { getAnalysisById } = await import('@/lib/analysisService');
                const existingData = await getAnalysisById(analysisId);
                completedAtValue = existingData?.completedAt || now.toISOString();
            }
        }

        const document: QualityAnalysis = {
            id: analysisId,
            codigo,
            lote,
            talla,
            productType: productType!,
            status: finalStatus,
            completedAt: completedAtValue,
            analystColor: originalAnalystColor || analystColor!,
            sections,
            remuestreoConfig, // Now included - matches QualityAnalysis type
            analyses: analyses.map(a => {
                const hasUniformidadData = a.uniformidad && (
                    (a.uniformidad.grandes?.valor || a.uniformidad.grandes?.fotoUrl) ||
                    (a.uniformidad.pequenos?.valor || a.uniformidad.pequenos?.fotoUrl)
                );
                const cleanUniformidad = hasUniformidadData ? {
                    grandes: (a.uniformidad?.grandes?.valor || a.uniformidad?.grandes?.fotoUrl) ? a.uniformidad.grandes : undefined,
                    pequenos: (a.uniformidad?.pequenos?.valor || a.uniformidad?.pequenos?.fotoUrl) ? a.uniformidad.pequenos : undefined,
                } : undefined;

                return {
                    ...a,
                    pesoBruto: (a.pesoBruto?.valor || a.pesoBruto?.fotoUrl) ? a.pesoBruto : undefined,
                    pesoCongelado: (a.pesoCongelado?.valor || a.pesoCongelado?.fotoUrl) ? a.pesoCongelado : undefined,
                    pesoNeto: (a.pesoNeto?.valor || a.pesoNeto?.fotoUrl) ? a.pesoNeto : undefined,
                    pesoConGlaseo: (a.pesoConGlaseo?.valor || a.pesoConGlaseo?.fotoUrl) ? a.pesoConGlaseo : undefined,
                    pesoSinGlaseo: (a.pesoSinGlaseo?.valor || a.pesoSinGlaseo?.fotoUrl) ? a.pesoSinGlaseo : undefined,
                    uniformidad: cleanUniformidad,
                    fotoCalidad: (typeof a.fotoCalidad === 'string' && a.fotoCalidad.trim() !== '') ? a.fotoCalidad : undefined,
                };
            }),
            createdAt: originalCreatedAt || now.toISOString(),
            updatedAt: now.toISOString(),
            createdBy: originalCreatedBy || user?.email || 'unknown',
            date: originalDate || productionDate,
            shift: originalShift || getWorkShift(now),
            globalPesoBruto: globalPesoBruto.fotoUrl ? globalPesoBruto : undefined,
        };

        const { validateAnalysisData, getValidationErrors } = await import('@/lib/validation');
        const result = validateAnalysisData(document);
        if (!result.success) {
            const errors = getValidationErrors(result.error);
            console.error('🔴 VALIDACIÓN FALLIDA - Bloqueando guardado:', errors);
            setSaveError(`Validación fallida: ${errors.length} errores`);
            setIsSaving(false);
            return;
        }

        const sanitizeForFirestore = (obj: any): any => {
            if (obj === undefined || obj === null) return null;
            if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
            if (typeof obj === 'object') {
                const newObj: any = {};
                for (const key in obj) {
                    const val = sanitizeForFirestore(obj[key]);
                    if (val !== undefined) newObj[key] = val;
                }
                return newObj;
            }
            return obj;
        };

        const sanitizedDocument = sanitizeForFirestore(document);
        const currentDataString = deterministicStringify(sanitizedDocument);
        previousDataRef.current = currentDataString;

        debouncedSave(sanitizedDocument, status, currentDataString);

    }, [
        analysisId, basicsCompleted, analyses, codigo, lote, talla, productType,
        analystColor, originalAnalystColor, originalCreatedAt, originalCreatedBy,
        originalDate, originalShift, globalPesoBruto, sections, remuestreoConfig,
        debouncedSave, deterministicStringify, isCompleted
    ]);

    // 6. Track keypreses
    useEffect(() => {
        const handleKeyDown = () => {
            lastKeyPressRef.current = Date.now();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // 7. Auto-save Monitor
    useEffect(() => {
        if (!basicsCompleted || !analysisId || isCompleted || isDeleting) return;

        const dataToCheck = {
            analyses,
            globalPesoBruto,
            codigo,
            lote,
            talla,
            analystColor,
            productType,
            sections,
            remuestreoConfig
        };

        const currentDataString = deterministicStringify(dataToCheck);
        const hasChanges = currentDataString !== previousDataRef.current;

        if (hasChanges) {
            // Change detected
        }

        if (isRemoteUpdateRef.current) {
            isRemoteUpdateRef.current = false;
            return;
        }

        if (hasChanges) {
            saveDocument('EN_PROGRESO');
        }

    }, [
        analyses, globalPesoBruto, codigo, lote, talla, analystColor, productType,
        basicsCompleted, analysisId, isCompleted, isDeleting, sections,
        saveDocument, deterministicStringify
    ]);

    const dismissError = useCallback(() => {
        setSaveError(null);
    }, []);

    const markAsRemoteUpdate = useCallback(() => {
        isRemoteUpdateRef.current = true;
    }, []);

    return {
        isSaving,
        saveError,
        lastSaved,
        saveDocument,
        dismissError,
        markAsRemoteUpdate
    };
};
