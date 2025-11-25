import { useState, useCallback } from 'react';
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
}: UseAnalysisSaveProps) => {
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
                console.warn('⚠️ Validación fallida en auto-save:', errors);
            }

            const { saveAnalysis } = await import('@/lib/analysisService');
            await saveAnalysis(document);
            setLastSaved(now);
            setSaveError(null);

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
        }
    }, [analysisId, basicsCompleted, isCompleted, codigo, lote, talla, productType, originalAnalystColor, analystColor, analyses, originalCreatedAt, originalCreatedBy, originalDate, originalShift, globalPesoBruto, setIsCompleted]);

    return {
        isSaving,
        saveError,
        lastSaved,
        saveDocument
    };
};
