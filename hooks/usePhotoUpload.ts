import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Analysis, PesoConFoto } from '@/lib/types';
import { updateAnalysisField } from '@/lib/analysisUtils';
import { uploadWithRetry, generateId, compressImage } from '@/lib/utils';
import { photoStorageService, PendingPhoto } from '@/lib/photoStorageService';

interface UsePhotoUploadProps {
    analysisId: string; // Added analysisId
    analyses: Analysis[];
    setAnalyses: React.Dispatch<React.SetStateAction<Analysis[]>>;
    activeAnalysisIndex: number;
    codigo: string;
    lote: string;
    saveDocument: () => Promise<void>;
    globalPesoBruto: PesoConFoto;
    setGlobalPesoBruto: React.Dispatch<React.SetStateAction<PesoConFoto>>;
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
    setGlobalPesoBruto
}: UsePhotoUploadProps) => {
    const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
    const [photoStatus, setPhotoStatus] = useState<Record<string, { photoId: string; status: PendingPhoto['status'] }>>({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [photos, setPhotos] = useState<Record<string, File>>({});

    const handlePhotoCapture = useCallback(async (field: string, file: File) => {
        const targetIndex = activeAnalysisIndex;
        const key = `${targetIndex}-${field}`;
        const photoId = generateId();

        setPhotos(prev => ({ ...prev, [key]: file }));
        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true);

        // 1. Compress and save photo locally first
        try {
            await photoStorageService.initialize();

            console.log(`🗜️ Comprimiendo imagen: ${file.name}`);
            const compressedBlob = await compressImage(file);

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
            } else if (['pesoBruto', 'pesoCongelado', 'pesoNeto', 'pesoConGlaseo', 'pesoSinGlaseo', 'glaseo'].includes(field)) {
                fieldPath = `${field}.fotoUrl`;
            }

            await saveAnalysisPhotoUrl(analysisId, targetIndex, fieldPath, url);
            console.log('✅ Firestore transaction confirmed - Photo URL saved');

            // 5. ONLY NOW delete from IndexedDB - we have confirmation!
            await photoStorageService.deletePhoto(photoId);
            console.log('🗑️ Photo deleted from IndexedDB after confirmed upload');

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'success' }
            }));

            toast.success('Foto subida exitosamente');

        } catch (error) {
            console.error('Error uploading photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            // Mark as error in IndexedDB
            await photoStorageService.updatePhotoStatus(photoId, 'error', undefined, errorMessage);
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'error' }
            }));

            toast.error('Error al subir la foto. Se guardó localmente y puedes reintentar.');
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
            await photoStorageService.initialize();

            console.log(`🗜️ Comprimiendo peso bruto: ${file.name}`);
            const compressedBlob = await compressImage(file);

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

            // 4. Save transactionally (using saveDocument for array updates)
            await saveDocument();
            console.log('✅ Firestore confirmed - Peso bruto saved');

            // 5. Delete from IndexedDB after confirmation
            await photoStorageService.deletePhoto(photoId);
            console.log('🗑️ Peso bruto deleted from IndexedDB');

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'success' }
            }));

            toast.success('Foto de peso bruto subida exitosamente');

        } catch (error) {
            console.error('Error uploading peso bruto photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            await photoStorageService.updatePhotoStatus(photoId, 'error', undefined, errorMessage);
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'error' }
            }));

            toast.error('Error al subir peso bruto. Se guardó localmente y puedes reintentar.');
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

        setPhotos(prev => ({ ...prev, [key]: file }));
        setUploadingPhotos(prev => new Set(prev).add(key));
        setIsUploadingGlobal(true);

        // 1. Compress and save photo locally first
        try {
            await photoStorageService.initialize();

            console.log(`🗜️ Comprimiendo peso bruto global: ${file.name}`);
            const compressedBlob = await compressImage(file);

            await photoStorageService.savePhoto({
                id: photoId,
                analysisId,
                field: 'global-pesoBruto',
                file: compressedBlob,
                fileName: file.name,
                status: 'uploading',
                metadata: {
                    codigo,
                    lote
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
                'peso_bruto_global',
                oldUrl,
                user?.email
            ));

            console.log('✅ Global peso bruto uploaded to Drive:', url);

            // 3. Update local state
            setGlobalPesoBruto(prev => ({ ...prev, fotoUrl: url }));

            // 4. Save transactionally - THIS IS THE CONFIRMATION!
            const { saveGlobalPhotoUrl } = await import('@/lib/analysisService');
            await saveGlobalPhotoUrl(analysisId, url);
            console.log('✅ Firestore confirmed - Global peso bruto saved');

            // 5. Delete from IndexedDB after confirmation
            await photoStorageService.deletePhoto(photoId);
            console.log('🗑️ Global peso bruto deleted from IndexedDB');

            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'success' }
            }));

            toast.success('Foto global subida exitosamente');

        } catch (error) {
            console.error('Error uploading global peso bruto photo:', error);
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';

            await photoStorageService.updatePhotoStatus(photoId, 'error', undefined, errorMessage);
            setPhotoStatus(prev => ({
                ...prev,
                [key]: { photoId, status: 'error' }
            }));

            toast.error('Error al subir foto global. Se guardó localmente y puedes reintentar.');
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
        try {
            // Skip if already uploading
            if (photo.status === 'uploading') {
                console.log(`⏭️ Skipping ${photo.field} - already uploading`);
                return;
            }

            if (photo.field.startsWith('pesobruto-')) {
                const registroId = photo.field.replace('pesobruto-', '');
                await handlePesoBrutoPhotoCapture(registroId, photo.file as File);
            } else if (photo.field === 'global-pesoBruto') {
                await handleGlobalPesoBrutoPhoto(photo.file as File);
            } else {
                await handlePhotoCapture(photo.field, photo.file as File);
            }
        } catch (error) {
            console.error('Error retrying photo upload:', error);
            toast.error('Error al reintentar la subida');
        }
    }, [handlePhotoCapture, handlePesoBrutoPhotoCapture, handleGlobalPesoBrutoPhoto]);

    const retryAllFailedPhotos = useCallback(async () => {
        try {
            await photoStorageService.initialize();
            const failedPhotos = await photoStorageService.getFailedPhotos();

            // Filter out photos that are already uploading
            const photosToRetry = failedPhotos.filter(p => p.status !== 'uploading');

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
    }, [retryPhotoUpload]);

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
