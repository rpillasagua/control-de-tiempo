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
    sections
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
    const lastSavedDataRef = useRef<string>(''); // ✅ FIX #10: Track last saved data for deduplication

    // Helper function for deterministic JSON serialization
    // Recursively sorts object keys to ensure consistent string output
    const deterministicStringify = useCallback((obj: any): string => {
        if (obj === null || obj === undefined) return JSON.stringify(obj);
        if (typeof obj !== 'object') return JSON.stringify(obj);
        if (Array.isArray(obj)) {
            return '[' + obj.map(item => deterministicStringify(item)).join(',') + ']';
        }
        // Sort keys and serialize in alphabetical order
        const sortedKeys = Object.keys(obj).sort();
        const pairs = sortedKeys.map(key => {
            return JSON.stringify(key) + ':' + deterministicStringify(obj[key]);
        });
        return '{' + pairs.join(',') + '}';
    }, []); // Empty deps - pure function

    const saveDocument = useCallback(async (status: 'EN_PROGRESO' | 'COMPLETADO' = 'EN_PROGRESO') => {
        if (!analysisId || !basicsCompleted) return;

        setIsSaving(true);
        try {
            const now = new Date();
            const productionDate = getProductionDate(now);

            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            // Determine final status
            let finalStatus = status;
            if (isCompleted && status === 'EN_PROGRESO') {
                finalStatus = 'COMPLETADO';
            }

            // Get existing completedAt if already completed
            let completedAtValue: string | undefined = undefined;
            if (finalStatus === 'COMPLETADO') {
                if (status === 'COMPLETADO') {
                    // Explicit completion action - set new time
                    completedAtValue = now.toISOString();
                } else {
                    // Auto-save on already completed analysis - preserve existing time
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
                sections, // Add sections to document
                analyses: analyses.map(a => {
                    // Limpiar uniformidad: solo guardar si tiene valores o fotos
                    const hasUniformidadData = a.uniformidad && (
                        (a.uniformidad.grandes?.valor || a.uniformidad.grandes?.fotoUrl) ||
                        (a.uniformidad.pequenos?.valor || a.uniformidad.pequenos?.fotoUrl)
                    );

                    // Limpiar sub-objetos de uniformidad
                    const cleanUniformidad = hasUniformidadData ? {
                        grandes: (a.uniformidad?.grandes?.valor || a.uniformidad?.grandes?.fotoUrl)
                            ? a.uniformidad.grandes
                            : undefined,
                        pequenos: (a.uniformidad?.pequenos?.valor || a.uniformidad?.pequenos?.fotoUrl)
                            ? a.uniformidad.pequenos
                            : undefined,
                    } : undefined;

                    return {
                        ...a,
                        pesoBruto: (a.pesoBruto?.valor || a.pesoBruto?.fotoUrl) ? a.pesoBruto : undefined,
                        pesoCongelado: (a.pesoCongelado?.valor || a.pesoCongelado?.fotoUrl) ? a.pesoCongelado : undefined,
                        pesoNeto: (a.pesoNeto?.valor || a.pesoNeto?.fotoUrl) ? a.pesoNeto : undefined,
                        pesoConGlaseo: (a.pesoConGlaseo?.valor || a.pesoConGlaseo?.fotoUrl) ? a.pesoConGlaseo : undefined,
                        pesoSinGlaseo: (a.pesoSinGlaseo?.valor || a.pesoSinGlaseo?.fotoUrl) ? a.pesoSinGlaseo : undefined,
                        uniformidad: cleanUniformidad,
                        // Convert null or empty string to undefined for fotoCalidad
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
                console.error('🔴 VALIDACIÓN FALLIDA - Bloqueando guardado:', {
                    totalErrors: errors.length,
                    errors: errors,
                    document: document
                });

                // CRÍTICO: NO guardar si la validación falla
                setSaveError(`Validación fallida: ${errors.length} errores`);
                setIsSaving(false);
                saveInProgressRef.current = false;
                return; // ❌ BLOQUEAR guardado
            }

            // Sanitize document to remove undefined values (Firestore rejects undefined)
            const sanitizeForFirestore = (obj: any): any => {
                if (obj === undefined) return null;
                if (obj === null) return null;
                if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
                if (typeof obj === 'object') {
                    const newObj: any = {};
                    for (const key in obj) {
                        const val = sanitizeForFirestore(obj[key]);
                        if (val !== undefined) {
                            newObj[key] = val;
                        }
                    }
                    return newObj;
                }
                return obj;
            };

            const sanitizedDocument = sanitizeForFirestore(document);

            // ✅ FIX #10: Deduplication - skip save if data hasn't changed
            const currentDataString = deterministicStringify(sanitizedDocument);
            if (currentDataString === lastSavedDataRef.current) {
                console.log('⏭️ Skipping save - no changes detected');
                setIsSaving(false);
                saveInProgressRef.current = false;
                return;
            }

            const { saveAnalysis } = await import('@/lib/analysisService');
            await saveAnalysis(sanitizedDocument);
            setLastSaved(now);
            setSaveError(null);

            // ✅ FIX #10: Update last saved data ref after successful save
            lastSavedDataRef.current = currentDataString;

            // Update completion state
            if (status === 'COMPLETADO') {
                setIsCompleted(true);
            }

            console.log('✅ Document saved');
        } catch (error) {
            console.error('Error saving:', error);
            setSaveError('Error al guardar');
        } finally {
            setIsSaving(false);
            saveInProgressRef.current = false;
        }
    }, [analysisId, basicsCompleted, isCompleted, codigo, lote, talla, productType, originalAnalystColor, analystColor, analyses, originalCreatedAt, originalCreatedBy, originalDate, originalShift, globalPesoBruto, setIsCompleted, sections]);

    // 🔧 FIX #2: Force save before page unload
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // If there's a pending save, try to execute it synchronously
            if (timeoutRef.current && !saveInProgressRef.current) {
                clearTimeout(timeoutRef.current);
                saveInProgressRef.current = true;

                // Use sendBeacon for more reliable fire-and-forget
                // This is a backup - the regular save below is primary
                saveDocument();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []); // Empty deps - handler uses refs which are stable

    // Track key presses for adaptive debounce
    useEffect(() => {
        const handleKeyDown = () => {
            lastKeyPressRef.current = Date.now();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Auto-save Effect with Adaptive Debounce
    useEffect(() => {
        if (!basicsCompleted || !analysisId || isCompleted || isDeleting) return;

        // Create a data object to check for changes
        const dataToCheck = {
            analyses,
            globalPesoBruto,
            codigo,
            lote,
            talla,
            analystColor,
            productType,
            sections // Add sections to check
        };

        // Use deterministic serialization to avoid false positives from property order changes
        const currentDataString = deterministicStringify(dataToCheck);

        // Check if data changed and update ref FIRST (before remote check)
        const hasChanges = currentDataString !== previousDataRef.current;

        if (hasChanges) {
            // DEBUG: Log what changed
            if (previousDataRef.current) {
                console.log('[AUTO-SAVE] Data changed!');
                console.log('[AUTO-SAVE] Previous:', previousDataRef.current.substring(0, 200) + '...');
                console.log('[AUTO-SAVE] Current:', currentDataString.substring(0, 200) + '...');
            }

            // Update ref immediately to prevent multiple schedules for same data
            previousDataRef.current = currentDataString;
        }

        // THEN check if this is a remote update from Firestore
        if (isRemoteUpdateRef.current) {
            console.log('[AUTO-SAVE] Skipping - remote update from Firestore');
            isRemoteUpdateRef.current = false; // Reset flag
            return; // Skip save (previousDataRef already updated above)
        }

        // If data hasn't changed (local check), don't schedule a save
        if (!hasChanges) {
            console.log('[AUTO-SAVE] No changes detected, skipping save');
            return;
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Adaptive debounce: longer delay if user is typing
        const timeSinceLastKeyPress = Date.now() - lastKeyPressRef.current;
        const isTyping = timeSinceLastKeyPress < 3000; // User typed in last 3 seconds
        const debounceTime = isTyping ? 2000 : 500; // 2s if typing, 500ms if idle

        console.log(`[AUTO-SAVE] Scheduling save in ${debounceTime}ms (isTyping: ${isTyping})`);

        timeoutRef.current = setTimeout(() => {
            if (!saveInProgressRef.current) {
                console.log('[AUTO-SAVE] Executing save...');
                saveInProgressRef.current = true;
                saveDocument();
            } else {
                console.log('[AUTO-SAVE] Save already in progress, skipping');
            }
        }, debounceTime);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [
        analyses,
        globalPesoBruto,
        codigo,
        lote,
        talla,
        analystColor,
        productType,
        basicsCompleted,
        analysisId,
        isCompleted,
        isDeleting,
        sections
        // 🔧 deterministicStringify and saveDocument excluded to prevent infinite loops
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
