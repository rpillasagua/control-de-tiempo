import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
    Analysis,
    QualityAnalysis,
    ProductType,
    AnalystColor
} from '@/lib/types';
import { generateId } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeToAnalysis } from '@/lib/analysisService';

export interface AnalysisSetters {
    setAnalysisId: (id: string) => void;
    setProductType: (type: ProductType) => void;
    setSections: (sections: any) => void;
    setRemuestreoConfig: (config: any) => void;
    setOriginalCreatedBy: (by: string) => void;
    setOriginalDate: (date: string) => void;
    setOriginalShift: (shift: any) => void;
    setOriginalAnalystColor: (color: AnalystColor) => void;
    setCodigo: (code: string) => void;
    setLote: (lote: string) => void;
    setTalla: (talla: string) => void;
    setAnalystColor: (color: AnalystColor) => void;
    setGlobalPesoBruto: (weight: any) => void;
    setBasicsCompleted: (completed: boolean) => void;
    setOriginalCreatedAt: (date: string) => void;
    // Using simple function type for setAnalyses to avoid React type complexity in import
    setAnalyses: (value: React.SetStateAction<Analysis[]>) => void;
    setIsCompleted: (completed: boolean) => void;
    setIsLoading: (loading: boolean) => void;
    markAsRemoteUpdate: () => void;
}

export const useAnalysisSubscription = (
    analysisId: string | null,
    isUploadingRef: React.MutableRefObject<boolean>,
    ignoreNextSnapshotRef: React.MutableRefObject<boolean>,
    setters: AnalysisSetters
) => {
    const router = useRouter();

    useEffect(() => {
        let unsubscribe: (() => void) | undefined;
        let unsubscribeAuth: (() => void) | undefined;

        const setupSubscription = async () => {
            // Wait for Firebase Auth to be ready
            if (!auth) {
                console.error('Firebase Auth not initialized in client');
                setters.setIsLoading(false);
                return;
            }

            unsubscribeAuth = onAuthStateChanged(auth, async (user: any) => {
                if (!user) {
                    console.log('⏳ Esperando autenticación de Firebase...');
                    return;
                }

                // If prior subscription exists, clean it up before re-subscribing
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = undefined;
                }

                if (analysisId) {
                    try {
                        console.log('✅ Usuario autenticado, suscribiendo al análisis:', analysisId);

                        unsubscribe = subscribeToAnalysis(analysisId, (data) => {
                            if (data) {
                                // 🛡️ RACE CONDITION FIX: Ignore updates while uploading photos
                                if (isUploadingRef.current) {
                                    console.log('🛡️ Skipping snapshot update during photo upload to prevent data loss');
                                    return;
                                }

                                // 🛡️ IGNORE SELF-TRIGGERED SNAPSHOTS
                                if (ignoreNextSnapshotRef.current) {
                                    console.log('🛡️ Ignoring snapshot triggered by local photo upload');
                                    ignoreNextSnapshotRef.current = false;
                                    return;
                                }

                                // Mark this as a remote update to prevent auto-save
                                setters.markAsRemoteUpdate();

                                setters.setAnalysisId(data.id);
                                setters.setProductType(data.productType);
                                setters.setSections(data.sections);
                                setters.setRemuestreoConfig(data.remuestreoConfig);
                                setters.setOriginalCreatedBy(data.createdBy);
                                setters.setOriginalDate(data.date);
                                setters.setOriginalShift(data.shift);
                                setters.setOriginalAnalystColor(data.analystColor);

                                // Restore missing setters
                                setters.setCodigo(data.codigo);
                                setters.setLote(data.lote);
                                setters.setTalla(data.talla || '');
                                setters.setAnalystColor(data.analystColor);
                                setters.setGlobalPesoBruto(data.globalPesoBruto || {});
                                setters.setBasicsCompleted(true);
                                setters.setOriginalCreatedAt(data.createdAt);

                                // Backfill IDs if missing (migration)
                                const analysesWithIds = data.analyses.map((a: Analysis) => ({
                                    ...a,
                                    id: a.id || generateId()
                                }));

                                // 🔥 FIX: Prevent unnecessary re-renders (and UI jumps) if data hasn't changed
                                setters.setAnalyses((prev: Analysis[]) => {
                                    if (JSON.stringify(prev) === JSON.stringify(analysesWithIds)) {
                                        return prev;
                                    }
                                    return analysesWithIds;
                                });

                                if (data.status === 'COMPLETADO') {
                                    setters.setIsCompleted(true);
                                }
                            } else {
                                toast.error('Análisis no encontrado');
                                router.push('/');
                            }
                            setters.setIsLoading(false);
                        });

                    } catch (error) {
                        console.error('Error suscribiendo al análisis:', error);
                        toast.error('Error al cargar el análisis');
                        setters.setIsLoading(false);
                    }
                } else {
                    setters.setIsLoading(false);
                }
            });
        };

        setupSubscription();

        return () => {
            if (unsubscribe) unsubscribe();
            if (unsubscribeAuth) unsubscribeAuth();
        };
    }, [analysisId]); // Re-subscribe if analysisId changes
};
