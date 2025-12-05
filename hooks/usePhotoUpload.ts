import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Analysis, PesoConFoto } from '@/lib/types';
import { updateAnalysisField } from '@/lib/analysisUtils';
import { uploadWithRetry, generateId, compressImage } from '@/lib/utils';
import { photoStorageService, PendingPhoto } from '@/lib/photoStorageService';

interface UsePhotoUploadProps {
    analysisId: string;
    analyses: Analysis[];
    setAnalyses: React.Dispatch<React.SetStateAction<Analysis[]>>;
    activeAnalysisIndex: number;
    codigo: string;
    lote: string;
    saveDocument: () => Promise<void>;
    globalPesoBruto: PesoConFoto;
    setGlobalPesoBruto: React.Dispatch<React.SetStateAction<PesoConFoto>>;
    ignoreNextSnapshotRef: React.MutableRefObject<boolean>;
}

export const usePhotoUpload = ({
    analysisId,
    analyses,
    setAnalyses,
    activeAnalysisIndex,
    codigo,
    lote,
    saveDocument,
    globalPesoBruto,
    setGlobalPesoBruto,
    ignoreNextSnapshotRef
}: UsePhotoUploadProps) => {
    const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
    const [photoStatus, setPhotoStatus] = useState<Record<string, { photoId: string; status: PendingPhoto['status'] }>>({});


    const handlePhotoCapture = useCallback(async (field: string, file: File) => {
        const targetIndex = activeAnalysisIndex;
        const key = `${targetIndex}-${field}`;
        const photoId = generateId();


        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true);

        // 1. Compress and save photo locally first
        try {
            await photoStorageService.deletePhotosByContext(analysisId, field);

            const compressedBlob = await compressImage(file);
            const batchCode = generateId();

            await photoStorageService.savePhoto({
                id: photoId,
                analysisId,
                field,
                file: compressedBlob,
                fileName: file.name,
                status: 'uploading',
                metadata: {
                    codigo,
                    lote,
                    batchCode,
                    analysisIndex: targetIndex
                }
            });

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'uploading' }
            }));

            console.log('📁 Photo compressed and saved locally, starting upload:', photoId);
        } catch (localError) {
            console.error('Error saving photo locally:', localError);
            toast.error('Error al guardar la foto localmente');
            setIsUploadingGlobal(false);
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            return;
        }

        // 2. Upload to Google Drive
        try {
            const { googleDriveService } = await import('@/lib/googleDriveService');
            await googleDriveService.initialize();

            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            const targetAnalysis = analyses[targetIndex];
            let oldUrl: string | undefined;

            if (field === 'fotoCalidad') {
                oldUrl = targetAnalysis.fotoCalidad;
            } else if (field.startsWith('uniformidad_')) {
                const tipo = field.split('_')[1] as 'grandes' | 'pequenos';
                oldUrl = targetAnalysis.uniformidad?.[tipo]?.fotoUrl;
            } else {
                const currentFieldValue = targetAnalysis[field as keyof Analysis] as any;
                oldUrl = currentFieldValue?.fotoUrl;
            }

            const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
                file,
                codigo,
                lote,
                analysisId,
                `${field}_analysis${targetIndex + 1}`,
                oldUrl,
                user?.email
            ));

            console.log('✅ Google Drive upload successful, URL:', url);

            // 3. Update local state immediately for UI responsiveness
            setAnalyses(prev => updateAnalysisField(prev, targetIndex, field, url));

            // 4. Save to Firestore transactionally - THIS IS THE CONFIRMATION!
            const { saveAnalysisPhotoUrl } = await import('@/lib/analysisService');

            let fieldPath = field;
            if (field.startsWith('uniformidad_')) {
                const tipo = field.split('_')[1];
                fieldPath = `uniformidad.${tipo}.fotoUrl`;
            } else if (['pesoBruto', 'pesoCongelado', 'pesoNeto', 'pesoSinGlaseo', 'pesoSubmuestra'].includes(field)) {
                fieldPath = `${field}.fotoUrl`;
            }

            // 🔄 RETRY FIRESTORE si falla (Drive ya tuvo éxito)
            let firestoreSaved = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    // Use ID instead of index for safety
                    const analysisItemId = analyses[targetIndex].id;
                    // Pass targetIndex as hint for legacy migration
                    ignoreNextSnapshotRef.current = true;
                    await saveAnalysisPhotoUrl(analysisId, analysisItemId, targetIndex, fieldPath, url);
                    console.log(`✅ Firestore confirmed (attempt ${attempt}/3)`);
                    firestoreSaved = true;
                    break;
                } catch (firestoreError) {
                    console.error(`❌ Firestore attempt ${attempt}/3 failed:`, firestoreError);
                    if (attempt === 3) {
                        throw new Error(`Firestore save failed after 3 attempts: ${firestoreError}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Backoff
                }
            }

            if (!firestoreSaved) {
                throw new Error('Failed to save URL to Firestore after retries');
            }

            // 5. ONLY NOW delete from IndexedDB - we have DOUBLE confirmation!
            console.log(`🗑️ ATTEMPTING DELETE - PhotoID: ${photoId}, Field: ${field}`);
            await photoStorageService.deletePhoto(photoId);
            console.log(`✅ SUCCESS - Photo ${photoId} DELETED from IndexedDB`);

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'success' }
            }));

            // ✅ AHORA SÍ mostrar toast de éxito (Drive + Firestore confirmados)
            toast.success('Foto subida exitosamente');

        } catch (error) {
            console.error('Error uploading photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            // Determinar si falló Drive o Firestore
            let userMessage = 'Error al subir la foto.';
            if (errorMessage.includes('Firestore')) {
                userMessage = 'Foto subida a Drive pero falló guardar en base de datos. Se reintentará automáticamente.';
            } else {
                userMessage = 'Error al subir la foto. Se guardó localmente y puedes reintentar.';
            }

            // Mark as error in IndexedDB
            await photoStorageService.updatePhotoStatus(photoId, 'error', undefined, errorMessage);
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'error' }
            }));

            toast.error(userMessage);
        } finally {
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false);
        }
    }, [activeAnalysisIndex, analyses, codigo, lote, analysisId, setAnalyses]);

    const handlePesoBrutoPhotoCapture = useCallback(async (registroId: string, file: File) => {
        const targetIndex = activeAnalysisIndex;
        const key = `${targetIndex}-pesobruto-${registroId}`;
        const photoId = generateId();

        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true);

        // 1. Compress and save photo locally first
        try {
            await photoStorageService.deletePhotosByContext(analysisId, `pesobruto-${registroId}`);

            const compressedBlob = await compressImage(file);
            const batchCode = generateId();

            await photoStorageService.savePhoto({
                id: photoId,
                analysisId,
                field: `pesobruto-${registroId}`,
                file: compressedBlob,
                fileName: file.name,
                status: 'uploading',
                metadata: {
                    codigo,
                    lote,
                    batchCode,
                    analysisIndex: targetIndex
                }
            });

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'uploading' }
            }));

            console.log('📁 Peso bruto compressed and saved locally:', photoId);
        } catch (localError) {
            console.error('Error saving peso bruto locally:', localError);
            toast.error('Error al guardar la foto localmente');
            setIsUploadingGlobal(false);
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            return;
        }

        // 2. Upload to Google Drive
        try {
            const { googleDriveService } = await import('@/lib/googleDriveService');
            await googleDriveService.initialize();

            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            const targetAnalysis = analyses[targetIndex];
            const registro = targetAnalysis.pesosBrutos?.find(r => r.id === registroId);
            const oldUrl = registro?.fotoUrl;

            const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
                file,
                codigo,
                lote,
                analysisId,
                `peso_bruto_${registroId}_analysis${targetIndex + 1}`,
                oldUrl,
                user?.email
            ));

            console.log('✅ Peso bruto uploaded to Drive:', url);

            // 3. Update local state
            setAnalyses(prev => prev.map((analysis, index) => {
                if (index !== targetIndex) return analysis;
                return {
                    ...analysis,
                    pesosBrutos: analysis.pesosBrutos?.map(r =>
                        r.id === registroId ? { ...r, fotoUrl: url } : r
                    )
                };
            }));

            // 4. Save transactionally with retry (using targeted update)
            const { savePesoBrutoPhotoUrl } = await import('@/lib/analysisService');

            let firestoreSaved = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    // Use ID for safe deletion
                    const analysisItemId = analyses[targetIndex].id;
                    ignoreNextSnapshotRef.current = true;
                    await savePesoBrutoPhotoUrl(analysisId, analysisItemId, registroId, url);
                    console.log(`✅ Firestore confirmed - Peso bruto saved (attempt ${attempt}/3)`);
                    firestoreSaved = true;
                    break;
                } catch (firestoreError) {
                    console.error(`❌ Firestore attempt ${attempt}/3 failed:`, firestoreError);
                    if (attempt === 3) {
                        throw new Error(`Firestore save failed after 3 attempts: ${firestoreError}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }

            if (!firestoreSaved) {
                throw new Error('Failed to save peso bruto to Firestore after retries');
            }

            // 5. Delete from IndexedDB after confirmation
            await photoStorageService.deletePhoto(photoId);
            console.log('🗑️ Peso bruto deleted from IndexedDB');

            setPhotoStatus((prev: Record<string, { photoId: string; status: 'error' | 'success' | 'pending' | 'uploading' }>) => ({
                ...prev,
                [key]: { photoId, status: 'success' }
            }));

            // ✅ Toast solo después de confirmación completa
            toast.success('Foto de peso bruto subida exitosamente');

        } catch (error) {
            console.error('Error uploading peso bruto photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            let userMessage = 'Error al subir peso bruto.';
            if (errorMessage.includes('Firestore')) {
                userMessage = 'Foto subida a Drive pero falló guardar en base de datos. Se reintentará automáticamente.';
            } else {
                userMessage = 'Error al subir peso bruto. Se guardó localmente y puedes reintentar.';
            }

            await photoStorageService.updatePhotoStatus(photoId, 'error', undefined, errorMessage);
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'error' }
            }));

            toast.error(userMessage);
        } finally {
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false);
        }
    }, [activeAnalysisIndex, analyses, codigo, lote, analysisId, saveDocument, setAnalyses]);

    const handleGlobalPesoBrutoPhoto = useCallback(async (file: File) => {
        const key = 'global-pesoBruto';
        const photoId = generateId();

        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true);

        // 1. Compress and save photo locally first
        try {
            await photoStorageService.deletePhotosByContext(analysisId, 'global-pesoBruto');

            const compressedBlob = await compressImage(file);
            const batchCode = generateId();

            await photoStorageService.savePhoto({
                id: photoId,
                analysisId,
                field: 'global-pesoBruto',
                file: compressedBlob,
                fileName: file.name,
                status: 'uploading',
                metadata: {
                    codigo,
                    lote,
                    batchCode
                }
            });

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'uploading' }
            }));

            console.log('📁 Global peso bruto compressed and saved locally:', photoId);
        } catch (localError) {
            console.error('Error saving global peso bruto locally:', localError);
            toast.error('Error al guardar la foto localmente');
            setIsUploadingGlobal(false);
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            return;
        }

        // 2. Upload to Google Drive
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
                analysisId,
                'peso_bruto_global',
                oldUrl,
                user?.email
            ));

            console.log('✅ Global peso bruto uploaded to Drive:', url);

            // 3. Update local state
            setGlobalPesoBruto(prev => ({ ...prev, fotoUrl: url }));

            // 4. Save transactionally with retry - THIS IS THE CONFIRMATION!
            const { saveGlobalPhotoUrl } = await import('@/lib/analysisService');

            let firestoreSaved = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    ignoreNextSnapshotRef.current = true;
                    await saveGlobalPhotoUrl(analysisId, url);
                    console.log(`✅ Firestore confirmed - Global peso bruto saved (attempt ${attempt}/3)`);
                    firestoreSaved = true;
                    break;
                } catch (firestoreError) {
                    console.error(`❌ Firestore attempt ${attempt}/3 failed:`, firestoreError);
                    if (attempt === 3) {
                        throw new Error(`Firestore save failed after 3 attempts: ${firestoreError}`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }

            if (!firestoreSaved) {
                throw new Error('Failed to save global photo to Firestore after retries');
            }

            // 5. Delete from IndexedDB after confirmation
            await photoStorageService.deletePhoto(photoId);
            console.log('🗑️ Global peso bruto deleted from IndexedDB');

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'success' }
            }));

            // ✅ Toast solo después de confirmación completa
            toast.success('Foto global subida exitosamente');

        } catch (error) {
            console.error('Error uploading global peso bruto photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            let userMessage = 'Error al subir foto global.';
            if (errorMessage.includes('Firestore')) {
                userMessage = 'Foto subida a Drive pero falló guardar en base de datos. Se reintentará automáticamente.';
            } else {
                userMessage = 'Error al subir foto global. Se guardó localmente y puedes reintentar.';
            }

            await photoStorageService.updatePhotoStatus(photoId, 'error', undefined, errorMessage);
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'error' }
            }));

            toast.error(userMessage);
        } finally {
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false);
        }
    }, [codigo, lote, globalPesoBruto.fotoUrl, analysisId, setGlobalPesoBruto]);

    const isFieldUploading = useCallback((field: string) => {
        const key = `${activeAnalysisIndex}-${field}`;
        return uploadingPhotos.has(key);
    }, [activeAnalysisIndex, uploadingPhotos]);

    const isPesoBrutoUploading = useCallback((registroId: string) => {
        const key = `${activeAnalysisIndex}-pesobruto-${registroId}`;
        return uploadingPhotos.has(key);
    }, [activeAnalysisIndex, uploadingPhotos]);

    const getPhotoStatus = useCallback((field: string) => {
        const key = `${activeAnalysisIndex}-${field}`;
        return photoStatus[key]?.status || null;
    }, [activeAnalysisIndex, photoStatus]);

    const retryPhotoUpload = useCallback(async (photo: PendingPhoto) => {
        console.log(`🔄 RETRY - ID: ${photo.id}, Field: ${photo.field}, Status: ${photo.status}`);

        // ✅ STRICT VALIDATION: Ensure metadata is complete
        if (!photo.metadata.codigo || !photo.metadata.lote || !photo.metadata.batchCode) {
            console.error('⛔ INVALID METADATA: Missing required fields', photo.metadata);
            toast.error('Esta foto no tiene contexto válido y no puede ser subida');
            await photoStorageService.updatePhotoStatus(photo.id, 'error', undefined, 'Metadata incompleta');
            return;
        }

        // 1. Validate Context (Code/Lote)
        // We ensure the photo belongs to the current production batch (Code + Lote)
        if (photo.metadata.codigo !== codigo || photo.metadata.lote !== lote) {
            console.log(`⛔ ABORTING: Photo context mismatch. Photo: ${photo.metadata.codigo}-${photo.metadata.lote}, Current: ${codigo}-${lote}`);
            toast.error('Esta foto pertenece a otro lote o código. No se puede reintentar aquí.');
            return;
        }

        // 2. Determine Target Analysis Index
        // For global photos, there's no analysisIndex
        let targetIndex: number;

        if (photo.field === 'global-pesoBruto' || photo.metadata.batchCode.includes('-global')) {
            // Global photo, no index needed
            targetIndex = -1; // Will be handled separately
        } else {
            // ✅ CRITICAL FIX: NO FALLBACK! Metadata MUST have analysisIndex
            if (photo.metadata.analysisIndex === undefined) {
                console.error('⛔ CRITICAL: Non-global photo missing analysisIndex', photo);
                toast.error('Esta foto no tiene información de muestra y no puede ser subida');
                await photoStorageService.updatePhotoStatus(photo.id, 'error', undefined, 'Missing analysisIndex');
                return;
            }
            targetIndex = photo.metadata.analysisIndex;
        }

        console.log(`🎯 Target Analysis Index: ${targetIndex} (Active: ${activeAnalysisIndex})`);

        try {
            // Skip if already uploading
            if (photo.status === 'uploading') {
                console.log(`⏭️ Skipping ${photo.field} - already uploading`);
                return;
            }

            // We need to call a modified version of the capture handlers that accepts an explicit index
            // Since the original handlers use 'activeAnalysisIndex' from closure, we need to bypass them 
            // or modify them. 
            // Strategy: We will duplicate the core logic here for the retry to ensure we use 'targetIndex'
            // instead of 'activeAnalysisIndex'.

            const key = `${targetIndex}-${photo.field}`;
            setUploadingPhotos(prev => new Set(prev).add(key));
            setIsUploadingGlobal(true);

            // Update status to uploading in DB
            await photoStorageService.updatePhotoStatus(photo.id, 'uploading');
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId: photo.id, status: 'uploading' }
            }));

            // Upload to Drive
            const { googleDriveService } = await import('@/lib/googleDriveService');
            await googleDriveService.initialize();
            const { googleAuthService } = await import('@/lib/googleAuthService');
            const user = googleAuthService.getUser();

            // 🔧 CRITICAL FIX: Load from Firestore instead of using React state
            // This ensures retry works even when user is in a different analysis
            const { getAnalysisById } = await import('@/lib/analysisService');
            const analysisDoc = await getAnalysisById(photo.analysisId);

            if (!analysisDoc) {
                throw new Error('Análisis no encontrado en base de datos');
            }

            let oldUrl: string | undefined;
            let driveFileName = '';

            // Determine filename and oldUrl based on field type
            if (photo.field.startsWith('pesobruto-')) {
                // For peso bruto array items
                const targetAnalysis = analysisDoc.analyses[targetIndex];
                if (!targetAnalysis) {
                    throw new Error(`Muestra #${targetIndex + 1} no existe en este análisis`);
                }

                const registroId = photo.field.replace('pesobruto-', '');
                const registro = targetAnalysis.pesosBrutos?.find(r => r.id === registroId);
                oldUrl = registro?.fotoUrl;
                driveFileName = `peso_bruto_${registroId}_analysis${targetIndex + 1}`;

            } else if (photo.field === 'global-pesoBruto') {
                // For global peso bruto
                oldUrl = analysisDoc.globalPesoBruto?.fotoUrl;
                driveFileName = 'peso_bruto_global';

            } else {
                // For standard analysis fields
                const targetAnalysis = analysisDoc.analyses[targetIndex];
                if (!targetAnalysis) {
                    throw new Error(`Muestra #${targetIndex + 1} no existe en este análisis`);
                }

                if (photo.field === 'fotoCalidad') {
                    oldUrl = targetAnalysis.fotoCalidad;
                } else if (photo.field.startsWith('uniformidad_')) {
                    const tipo = photo.field.split('_')[1] as 'grandes' | 'pequenos';
                    oldUrl = targetAnalysis.uniformidad?.[tipo]?.fotoUrl;
                } else {
                    const currentFieldValue = targetAnalysis[photo.field as keyof Analysis] as any;
                    oldUrl = currentFieldValue?.fotoUrl;
                }
                driveFileName = `${photo.field}_analysis${targetIndex + 1}`;
            }

            console.log(`🚀 Uploading to Drive: ${driveFileName}`);

            const url = await uploadWithRetry(() => googleDriveService.uploadAnalysisPhoto(
                photo.file as File,
                codigo,
                lote,
                photo.analysisId,
                driveFileName,
                oldUrl,
                user?.email
            ));

            console.log('✅ Upload successful:', url);

            // Update State & Firestore
            if (photo.field.startsWith('pesobruto-')) {
                // Update React state
                const registroId = photo.field.replace('pesobruto-', '');
                setAnalyses(prev => prev.map((a, i) => {
                    if (i !== targetIndex) return a;
                    return {
                        ...a,
                        pesosBrutos: a.pesosBrutos?.map(r => r.id === registroId ? { ...r, fotoUrl: url } : r)
                    };
                }));
                // Save to Firestore
                const { savePesoBrutoPhotoUrl } = await import('@/lib/analysisService');
                const analysisItemId = analysisDoc.analyses[targetIndex].id;
                ignoreNextSnapshotRef.current = true;
                await savePesoBrutoPhotoUrl(photo.analysisId, analysisItemId, registroId, url);

            } else if (photo.field === 'global-pesoBruto') {
                // Update React state
                setGlobalPesoBruto(prev => ({ ...prev, fotoUrl: url }));
                // Save to Firestore
                const { saveGlobalPhotoUrl } = await import('@/lib/analysisService');
                ignoreNextSnapshotRef.current = true;
                await saveGlobalPhotoUrl(analysisId, url);

            } else {
                // Update React state
                setAnalyses(prev => updateAnalysisField(prev, targetIndex, photo.field, url));

                // Save to Firestore
                const { saveAnalysisPhotoUrl } = await import('@/lib/analysisService');
                let fieldPath = photo.field;
                if (photo.field.startsWith('uniformidad_')) {
                    const tipo = photo.field.split('_')[1];
                    fieldPath = `uniformidad.${tipo}.fotoUrl`;
                } else if (['pesoBruto', 'pesoCongelado', 'pesoNeto', 'pesoSinGlaseo', 'pesoSubmuestra'].includes(photo.field)) {
                    fieldPath = `${photo.field}.fotoUrl`;
                }

                // Use ID from the fetched analysis document
                const analysisItemId = analysisDoc.analyses[targetIndex].id;
                // Pass targetIndex as hint for legacy migration
                ignoreNextSnapshotRef.current = true;
                await saveAnalysisPhotoUrl(analysisId, analysisItemId, targetIndex, fieldPath, url);
            }

            // Cleanup
            await photoStorageService.deletePhoto(photo.id);

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId: photo.id, status: 'success' }
            }));

            toast.success('Foto reintentada exitosamente');

        } catch (error) {
            console.error('Error retrying photo upload:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            await photoStorageService.updatePhotoStatus(photo.id, 'error', undefined, errorMessage);

            const key = `${targetIndex}-${photo.field}`;
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId: photo.id, status: 'error' }
            }));

            toast.error('Falló el reintento de subida');
        } finally {
            const key = `${targetIndex}-${photo.field}`;
            setUploadingPhotos(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
            setIsUploadingGlobal(false);
        }
    }, [codigo, lote, activeAnalysisIndex, analyses, globalPesoBruto, analysisId, saveDocument, setAnalyses, setGlobalPesoBruto]);

    const retryAllFailedPhotos = useCallback(async () => {
        try {
            await photoStorageService.initialize();
            const failedPhotos = await photoStorageService.getFailedPhotos();

            console.log(`📋 FAILED PHOTOS (${failedPhotos.length} total):`);
            failedPhotos.forEach(p => console.log(`  - ID: ${p.id}, Field: ${p.field}, Status: ${p.status}, BatchCode: ${p.metadata?.batchCode || 'N/A'}`));

            // ✅ FILTER: Only retry photos from THIS analysis
            const currentBatchCode = `${codigo}-${lote}-analysis${activeAnalysisIndex + 1}`;
            const photosToRetry = failedPhotos.filter(p => {
                // Skip if already uploading
                if (p.status === 'uploading') return false;

                // Skip if from different analysis
                if (p.metadata?.batchCode && p.metadata.batchCode !== currentBatchCode) {
                    console.log(`  ⏭️ Skipping ${p.field} from ${p.metadata.batchCode}`);
                    return false;
                }

                return true;
            });

            if (photosToRetry.length === 0) {
                toast.info('No hay fotos fallidas para reintentar');
                return;
            }

            console.log(`🔄 Reintentando ${photosToRetry.length} fotos (${failedPhotos.length - photosToRetry.length} ya en proceso)`);
            toast.info(`Reintentando ${photosToRetry.length} fotos...`);

            for (const photo of photosToRetry) {
                await retryPhotoUpload(photo);
            }
        } catch (error) {
            console.error('Error retrying all photos:', error);
            toast.error('Error al reintentar las fotos');
        }
    }, [retryPhotoUpload, codigo, lote, activeAnalysisIndex]);

    return {
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
    };
};
